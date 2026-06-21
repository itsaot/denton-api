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

function formatZar(amount) {
  return `R${Number(amount || 0).toLocaleString('en-ZA')}`;
}

function getOfferAssetInfo(offer, target) {
  const assetName = target.doc.name;
  const assetType = target.type === 'mine' ? 'Mining property' : 'Mineral';
  const listedPrice =
    target.type === 'mine' ? target.doc.price : target.doc.pricePerTonne;
  return { assetName, assetType, listedPrice };
}

/** Notify buyer, seller, and admins when a new offer / purchase request is submitted. */
async function notifyNewOffer(offer, investor, target, seller) {
  const { assetName, assetType, listedPrice } = getOfferAssetInfo(offer, target);
  const amount = formatZar(offer.amount);
  const listed = formatZar(listedPrice);
  const dashboardUrl = `${getFrontendBaseUrl()}/dashboard`;
  const buyerName = `${investor.firstName} ${investor.lastName}`.trim();

  await deliverEmail({
    to: investor.email,
    subject: `Offer submitted: ${assetName}`,
    html: `
      <p>Hi ${investor.firstName},</p>
      <p>Your offer of <strong>${amount}</strong> on <strong>${assetName}</strong> (${assetType}) has been received and is pending review.</p>
      <p>Listed price: ${listed}</p>
      ${offer.message ? `<p><strong>Your message:</strong> ${offer.message}</p>` : ''}
      <p><a href="${dashboardUrl}">View your dashboard</a></p>
      <p>— Denton Vision Art</p>
    `,
  });

  if (seller?.email) {
    await deliverEmail({
      to: seller.email,
      subject: `New offer on ${assetName}`,
      html: `
        <p>Hi ${seller.firstName},</p>
        <p><strong>${buyerName}</strong> (${investor.email}) submitted an offer of <strong>${amount}</strong> on your listing <strong>${assetName}</strong>.</p>
        ${offer.message ? `<p><strong>Message:</strong> ${offer.message}</p>` : ''}
        <p><a href="${dashboardUrl}">Review offers in your dashboard</a></p>
        <p>— Denton Vision Art</p>
      `,
    });
  }

  const recipients = await resolveAdminRecipients();
  if (recipients.length > 0) {
    await deliverEmail({
      to: recipients,
      subject: `New purchase offer: ${assetName}`,
      html: `
        <p>A new offer has been submitted on the platform.</p>
        <ul>
          <li><strong>Asset:</strong> ${assetName} (${assetType})</li>
          <li><strong>Offer amount:</strong> ${amount}</li>
          <li><strong>Listed price:</strong> ${listed}</li>
          <li><strong>Buyer:</strong> ${buyerName} (${investor.email})</li>
          <li><strong>Seller:</strong> ${seller ? `${seller.firstName} ${seller.lastName} (${seller.email})` : 'Unknown'}</li>
          <li><strong>Offer ID:</strong> ${offer._id}</li>
        </ul>
        ${offer.message ? `<p><strong>Message:</strong> ${offer.message}</p>` : ''}
        <p>— Denton Vision Art</p>
      `,
    });
  }
}

/** Notify buyer when offer is accepted or rejected. */
async function notifyOfferStatusChange(offer, investor, status, target) {
  const { assetName, assetType } = getOfferAssetInfo(offer, target);
  const amount = formatZar(offer.amount);
  const dashboardUrl = `${getFrontendBaseUrl()}/dashboard`;
  const accepted = status === 'Accepted';

  await deliverEmail({
    to: investor.email,
    subject: accepted ? `Offer accepted: ${assetName}` : `Offer update: ${assetName}`,
    html: `
      <p>Hi ${investor.firstName},</p>
      <p>Your offer of <strong>${amount}</strong> on <strong>${assetName}</strong> (${assetType}) has been <strong>${accepted ? 'accepted' : 'rejected'}</strong>.</p>
      ${accepted ? '<p>Our team will be in touch regarding next steps and payment arrangements.</p>' : '<p>You may submit a revised offer or explore other listings on the platform.</p>'}
      <p><a href="${dashboardUrl}">View your dashboard</a></p>
      <p>— Denton Vision Art</p>
    `,
  });
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
  notifyNewOffer,
  notifyOfferStatusChange,
  sendEmailSafely,
  isMailConfigured: isEmailConfigured,
};
