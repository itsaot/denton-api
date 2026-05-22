const nodemailer = require('nodemailer');
const { resolveSmtpHost, resolveSmtpPort } = require('./mailHost');

let cachedTransporter = null;
let cachedConfigKey = null;

function getSystemEmailConfig() {
  const email = process.env.SYSTEM_EMAIL;
  const password = process.env.SYSTEM_EMAIL_PASSWORD;
  if (!email || !password) {
    return null;
  }

  const host = resolveSmtpHost(email, process.env.SMTP_HOST);
  if (!host) {
    return null;
  }

  const port = resolveSmtpPort(host, process.env.SMTP_PORT);
  const fromName = process.env.MAIL_FROM_NAME || 'Denton Vision Art';

  return { email, password, host, port, fromName };
}

function getTransporter() {
  const config = getSystemEmailConfig();
  if (!config) return null;

  const configKey = `${config.host}:${config.port}:${config.email}`;
  if (cachedTransporter && cachedConfigKey === configKey) {
    return { transporter: cachedTransporter, config };
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.email,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  cachedConfigKey = configKey;

  return { transporter: cachedTransporter, config };
}

function isMailConfigured() {
  return getSystemEmailConfig() !== null;
}

async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    throw new Error(
      'System email is not configured. Set SYSTEM_EMAIL, SYSTEM_EMAIL_PASSWORD, and SMTP_HOST (full hostname with a dot, e.g. mail.yourdomain.com).'
    );
  }

  const { transporter, config } = transport;
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  const info = await transporter.sendMail({
    from: `"${config.fromName}" <${config.email}>`,
    to: recipients,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  });

  return info;
}

module.exports = {
  getSystemEmailConfig,
  isMailConfigured,
  sendEmail,
};
