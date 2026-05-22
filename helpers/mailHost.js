/**
 * cPanel / Roundcube host resolution.
 * Hostnames must contain a dot (full FQDN, e.g. mail.example.co.za).
 */

function extractDomainFromEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 && parts[1].includes('.') ? parts[1] : null;
}

function isValidMailHost(host) {
  return typeof host === 'string' && host.includes('.');
}

function resolveSmtpHost(email, explicitHost) {
  if (isValidMailHost(explicitHost)) return explicitHost.trim();
  const envHost = process.env.SMTP_HOST || process.env.GLOBAL_SMTP_HOST;
  if (isValidMailHost(envHost)) return envHost.trim();
  const domain = extractDomainFromEmail(email);
  if (domain) return `mail.${domain}`;
  return null;
}

function resolveSmtpPort(host, explicitPort) {
  if (explicitPort !== undefined && explicitPort !== null && explicitPort !== '') {
    return Number(explicitPort);
  }
  const envPort = process.env.SMTP_PORT || process.env.GLOBAL_SMTP_PORT;
  if (envPort) return Number(envPort);
  if (host && /^mail\./i.test(host)) return 465;
  return 465;
}

module.exports = {
  extractDomainFromEmail,
  isValidMailHost,
  resolveSmtpHost,
  resolveSmtpPort,
};
