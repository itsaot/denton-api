const User = require('../models/User');
const { sendEmail, isMailConfigured } = require('./mailer');
const khana = require('./khanaConnect');

function isEmailConfigured() {
  return khana.isConfigured() || isMailConfigured();
}

function getFrontendBaseUrl() {
  return (
    process.env.FRONTEND_BASE_URL ||
    process.env.APP_BASE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function parseAdminEmails() {
  const fromEnv = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  return fromEnv;
}

async function resolveAdminRecipients() {
  const emails = new Set(parseAdminEmails());
  const admins = await User.find({ role: 'admin' }).select('email').lean();
  for (const admin of admins) {
    if (admin.email) emails.add(admin.email);
  }
  return [...emails];
}

async function deliverEmail({ to, subject, html }) {
  if (khana.isConfigured()) {
    await khana.sendTransactionalEmail({ to, subject, html });
    return;
  }
  await sendEmail({ to, subject, html });
}

async function sendVerificationEmail(user, plainToken) {
  const verifyUrl = `${getFrontendBaseUrl()}/verify-email?token=${plainToken}`;
  const subject = 'Verify your Denton Vision Art account';
  const html = `
    <p>Hi ${user.firstName},</p>
    <p>Thanks for registering. Please verify your email address by clicking the link below:</p>
    <p><a href="${verifyUrl}">Verify email address</a></p>
    <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
    <p>— Denton Vision Art</p>
  `;

  await deliverEmail({ to: user.email, subject, html });
}

async function sendPasswordResetEmail(user, plainToken) {
  const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${plainToken}`;
  const subject = 'Reset your Denton Vision Art password';
  const html = `
    <p>Hi ${user.firstName},</p>
    <p>We received a request to reset your password. Click the link below to choose a new password:</p>
    <p><a href="${resetUrl}">Reset password</a></p>
    <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    <p>— Denton Vision Art</p>
  `;

  await deliverEmail({ to: user.email, subject, html });
}

async function notifyAdminsNewMine(mine, owner) {
  const recipients = await resolveAdminRecipients();
  if (recipients.length === 0) return;

  const ownerName = owner
    ? `${owner.firstName} ${owner.lastName} (${owner.email})`
    : 'Unknown owner';

  const subject = `New mine listing: ${mine.name}`;
  const html = `
    <p>A new mine has been added to the platform.</p>
    <ul>
      <li><strong>Name:</strong> ${mine.name}</li>
      <li><strong>Location:</strong> ${mine.location}</li>
      <li><strong>Commodity:</strong> ${mine.commodityType}</li>
      <li><strong>Status:</strong> ${mine.status || 'Exploration'}</li>
      <li><strong>Price:</strong> ${mine.price}</li>
      <li><strong>Owner:</strong> ${ownerName}</li>
      <li><strong>ID:</strong> ${mine._id}</li>
    </ul>
    <p>— Denton Vision Art</p>
  `;

  await deliverEmail({ to: recipients, subject, html });
}

async function notifyAdminsNewMineral(mineral, createdByUser) {
  const recipients = await resolveAdminRecipients();
  if (recipients.length === 0) return;

  const creatorName = createdByUser
    ? `${createdByUser.firstName} ${createdByUser.lastName} (${createdByUser.email})`
    : 'Unknown user';

  const subject = `New mineral added: ${mineral.name}`;
  const html = `
    <p>A new mineral has been added to the platform.</p>
    <ul>
      <li><strong>Name:</strong> ${mineral.name}</li>
      <li><strong>Type:</strong> ${mineral.mineralType}</li>
      <li><strong>Formula:</strong> ${mineral.chemicalFormula}</li>
      <li><strong>Price per tonne:</strong> ${mineral.pricePerTonne}</li>
      <li><strong>Created by:</strong> ${creatorName}</li>
      <li><strong>ID:</strong> ${mineral._id}</li>
    </ul>
    <p>— Denton Vision Art</p>
  `;

  await deliverEmail({ to: recipients, subject, html });
}

function sendEmailSafely(fn, context) {
  if (!isEmailConfigured()) {
    return;
  }
  fn().catch((err) => {
    console.error('[systemEmail]', context || 'send failed:', err.message);
  });
}

module.exports = {
  getFrontendBaseUrl,
  sendVerificationEmail,
  sendPasswordResetEmail,
  notifyAdminsNewMine,
  notifyAdminsNewMineral,
  sendEmailSafely,
  isMailConfigured: isEmailConfigured,
};
