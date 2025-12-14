import User from '../models/User.js';

const buildUserManagementLink = () => {
  const baseUrl = (process.env.APP_BASE_URL || process.env.CLIENT_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}/users`;
};

export const notifySuperadminsOfSignup = async ({ email, name }) => {
  const recipients = await User.find({ role: 'superadmin', enabled: true }).select('email name');
  if (!recipients.length) {
    console.info('No superadmins to notify about new signup for', email);
    return;
  }

  const subject = 'New Aqua signup pending approval';
  const managementLink = buildUserManagementLink();
  const bodyLines = [
    `A new user has signed up: ${name || 'New user'} (${email})`,
    '',
    'Please review and enable the account in User management:',
    managementLink
  ];

  recipients.forEach((recipient) => {
    console.info('[MOCK EMAIL]', {
      to: recipient.email,
      subject,
      body: bodyLines.join('\n')
    });
  });
};
