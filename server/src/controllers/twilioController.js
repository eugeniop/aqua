import Site from '../models/Site.js';
import Tank from '../models/Tank.js';
import User, { SUPPORTED_LANGUAGES as USER_LANGUAGES } from '../models/User.js';
import Well from '../models/Well.js';
import OperatorSession from '../models/OperatorSession.js';

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = USER_LANGUAGES;

const MESSAGES = {
  operatorNotFound: {
    en: 'Phone number not recognised. Please contact your administrator.',
    sw: 'Nambari ya simu haijatambuliwa. Tafadhali wasiliana na msimamizi wako.'
  },
  notAuthorised: {
    en: 'This phone number is not authorised for SMS commands.',
    sw: 'Nambari hii ya simu haina ruhusa ya kutumia amri za SMS.'
  },
  missingSiteSelection: {
    en: 'Please pick a site first with "site list" then "site <number>".',
    sw: 'Tafadhali chagua kituo kwa "site list" kisha "site <number>".'
  },
  invalidSiteChoice: {
    en: 'That site number is not valid. Reply "site list" to see available sites.',
    sw: 'Nambari ya kituo si sahihi. Tuma "site list" kuona vituo vinavyopatikana.'
  },
  noSites: {
    en: 'No sites are available yet.',
    sw: 'Hakuna vituo vinavyopatikana kwa sasa.'
  },
  noWells: {
    en: 'No wells found for this site.',
    sw: 'Hakuna visima vilivyopatikana kwa kituo hiki.'
  },
  noTanks: {
    en: 'No tanks found for this site.',
    sw: 'Hakuna matangi yaliyopatikana kwa kituo hiki.'
  },
  help: {
    en: 'Send "site list" to view sites, "site <number>" to select one, then "well list" or "tank list".',
    sw: 'Tuma "site list" kuona vituo, "site <number>" kuchagua, kisha "well list" au "tank list".'
  },
  siteSelected: (siteName, language) => ({
    en: `Site selected: ${siteName}. Send "well list" or "tank list".`,
    sw: `Kituo kimechaguliwa: ${siteName}. Tuma "well list" au "tank list".`
  }[language] ?? `Site selected: ${siteName}.`)
};

const escapeXml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildTwimlResponse = (message) =>
  `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;

const resolveLanguage = (preferred) =>
  SUPPORTED_LANGUAGES.includes((preferred || '').toLowerCase())
    ? preferred.toLowerCase()
    : DEFAULT_LANGUAGE;

const findUserByPhone = async (phone) => {
  const cleanedPhone = (phone || '').trim();
  if (!cleanedPhone) {
    return null;
  }

  const user = await User.findOne({ phone: cleanedPhone });
  return user;
};

const fetchSites = async () => Site.find().sort({ name: 1 });

const formatList = (title, items) => `${title}\n${items.map((item, index) => `${index + 1}. ${item}`).join('\n')}`;

const getOrCreateSession = async (userId, phone) =>
  OperatorSession.findOneAndUpdate(
    { user: userId },
    { phone },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

const respond = (res, message) => {
  res.type('text/xml').send(buildTwimlResponse(message));
};

export const handleIncomingSms = async (req, res) => {
  try {
    const from = req.body.From || req.body.from || '';
    const body = req.body.Body || req.body.body || '';

    const user = await findUserByPhone(from);
    const language = resolveLanguage(user?.preferredLanguage);

    if (!user) {
      return respond(res, MESSAGES.operatorNotFound[language] || MESSAGES.operatorNotFound[DEFAULT_LANGUAGE]);
    }

    if (!user.enabled || user.role !== 'field-operator') {
      return respond(res, MESSAGES.notAuthorised[language] || MESSAGES.notAuthorised[DEFAULT_LANGUAGE]);
    }

    const normalizedBody = (body || '').trim().toLowerCase();
    const session = await getOrCreateSession(user._id, from.trim());

    if (normalizedBody === 'site list') {
      const sites = await fetchSites();
      if (!sites.length) {
        return respond(res, MESSAGES.noSites[language] || MESSAGES.noSites[DEFAULT_LANGUAGE]);
      }

      const list = formatList('Available sites:', sites.map((site) => site.name));
      return respond(res, `${list}\nReply "site <number>" to select.`);
    }

    const siteSelectionMatch = normalizedBody.match(/^site\s+(\d+)$/);
    if (siteSelectionMatch) {
      const selectedIndex = Number.parseInt(siteSelectionMatch[1], 10) - 1;
      const sites = await fetchSites();

      if (Number.isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= sites.length) {
        return respond(
          res,
          MESSAGES.invalidSiteChoice[language] || MESSAGES.invalidSiteChoice[DEFAULT_LANGUAGE]
        );
      }

      const selectedSite = sites[selectedIndex];
      session.selectedSite = selectedSite._id;
      await session.save();

      return respond(res, MESSAGES.siteSelected(selectedSite.name, language));
    }

    if (normalizedBody === 'well list') {
      if (!session.selectedSite) {
        return respond(
          res,
          MESSAGES.missingSiteSelection[language] || MESSAGES.missingSiteSelection[DEFAULT_LANGUAGE]
        );
      }

      const wells = await Well.find({ site: session.selectedSite }).sort({ name: 1 });
      if (!wells.length) {
        return respond(res, MESSAGES.noWells[language] || MESSAGES.noWells[DEFAULT_LANGUAGE]);
      }

      const list = formatList('Wells:', wells.map((well) => well.name));
      return respond(res, list);
    }

    if (normalizedBody === 'tank list') {
      if (!session.selectedSite) {
        return respond(
          res,
          MESSAGES.missingSiteSelection[language] || MESSAGES.missingSiteSelection[DEFAULT_LANGUAGE]
        );
      }

      const tanks = await Tank.find({ site: session.selectedSite }).sort({ name: 1 });
      if (!tanks.length) {
        return respond(res, MESSAGES.noTanks[language] || MESSAGES.noTanks[DEFAULT_LANGUAGE]);
      }

      const list = formatList('Tanks:', tanks.map((tank) => tank.name));
      return respond(res, list);
    }

    return respond(res, MESSAGES.help[language] || MESSAGES.help[DEFAULT_LANGUAGE]);
  } catch (error) {
    return respond(res, 'Unable to process your request right now.');
  }
};
