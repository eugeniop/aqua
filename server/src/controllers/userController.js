import User, { DEFAULT_TIME_ZONE, SUPPORTED_LANGUAGES, VALID_ROLES } from '../models/User.js';

const formatUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  preferredLanguage: user.preferredLanguage || 'en',
  preferredTimeZone: user.preferredTimeZone || DEFAULT_TIME_ZONE,
  role: user.role || '',
  enabled: user.enabled,
  createdAt: user.createdAt
});

const isValidEmail = (email) => /.+@.+\..+/.test(email);
const allowedRoles = VALID_ROLES;
const isValidLanguage = (value) => SUPPORTED_LANGUAGES.includes((value || '').toLowerCase());
const isValidTimeZone = (value) => {
  if (!value) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch (_error) {
    return false;
  }
};

export const listUsers = async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(formatUser));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load users', error: error.message });
  }
};

export const listOperators = async (_req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    res.json(
      users.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        role: user.role || ''
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Unable to load operators', error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const phone = (req.body.phone || '').trim();
    const role = (req.body.role || 'analyst').trim();
    const preferredLanguage = isValidLanguage(req.body.preferredLanguage)
      ? req.body.preferredLanguage.toLowerCase()
      : 'en';
    const preferredTimeZone = isValidTimeZone(req.body.preferredTimeZone)
      ? req.body.preferredTimeZone
      : DEFAULT_TIME_ZONE;
    const enabled = req.body.enabled != null ? Boolean(req.body.enabled) : true;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role provided' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'A user with that email already exists' });
    }

    const user = await User.create({
      name,
      email,
      phone: phone || undefined,
      role,
      enabled,
      preferredLanguage,
      preferredTimeZone
    });
    res.status(201).json(formatUser(user));
  } catch (error) {
    res.status(500).json({ message: 'Unable to create user', error: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { enabled, role, preferredLanguage, preferredTimeZone } = req.body;

    const hasEnabledChange = enabled != null;
    const hasRoleChange = Boolean(role);
    const hasLanguageChange = preferredLanguage != null;
    const hasTimeZoneChange = preferredTimeZone != null;

    if (!hasEnabledChange && !hasRoleChange && !hasLanguageChange && !hasTimeZoneChange) {
      return res.status(400).json({ message: 'An update payload is required' });
    }

    if (hasRoleChange && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role provided' });
    }

    if (hasLanguageChange && !isValidLanguage(preferredLanguage)) {
      return res.status(400).json({ message: 'Invalid language provided' });
    }

    if (hasTimeZoneChange && !isValidTimeZone(preferredTimeZone)) {
      return res.status(400).json({ message: 'Invalid time zone provided' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (
      req.user?.id &&
      req.user.id === userId &&
      req.user.role === 'superadmin' &&
      (hasRoleChange || hasEnabledChange)
    ) {
      return res.status(400).json({ message: 'Superadmins cannot modify their own account' });
    }

    if (hasEnabledChange) {
      user.enabled = Boolean(enabled);
    }

    if (hasRoleChange) {
      user.role = role;
    }

    if (hasLanguageChange) {
      user.preferredLanguage = preferredLanguage.toLowerCase();
    }

    if (hasTimeZoneChange) {
      user.preferredTimeZone = preferredTimeZone;
    }

    await user.save();

    res.json(formatUser(user));
  } catch (error) {
    res.status(500).json({ message: 'Unable to update user', error: error.message });
  }
};

export const getCurrentUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(formatUser(user));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load profile', error: error.message });
  }
};

export const updateCurrentUserProfile = async (req, res) => {
  try {
    const { preferredLanguage, preferredTimeZone } = req.body;

    if (preferredLanguage == null && preferredTimeZone == null) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (preferredLanguage != null) {
      if (!isValidLanguage(preferredLanguage)) {
        return res.status(400).json({ message: 'Invalid language provided' });
      }
      user.preferredLanguage = preferredLanguage.toLowerCase();
    }

    if (preferredTimeZone != null) {
      if (!isValidTimeZone(preferredTimeZone)) {
        return res.status(400).json({ message: 'Invalid time zone provided' });
      }
      user.preferredTimeZone = preferredTimeZone;
    }

    await user.save();

    return res.json(formatUser(user));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update profile', error: error.message });
  }
};
