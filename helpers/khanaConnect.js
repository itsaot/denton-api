/**
 * KhanaConnect API client — Denton uses KhanaConnect for email, newsletter, and analytics.
 * Set KHANA_CONNECT_API_URL, KHANA_CONNECT_CLIENT_ID, and KHANA_CONNECT_TOKEN in env.
 */

const DEFAULT_API_URL = 'https://khanaconnect.onrender.com/api/v1';

function getConfig() {
  const apiUrl = (process.env.KHANA_CONNECT_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
  const clientID = process.env.KHANA_CONNECT_CLIENT_ID || '';
  const token = process.env.KHANA_CONNECT_TOKEN || '';
  return { apiUrl, clientID, token };
}

function isConfigured() {
  const { clientID, token } = getConfig();
  return Boolean(clientID && token);
}

async function kcRequest(path, options = {}) {
  const { apiUrl, clientID, token } = getConfig();

  if (!clientID || !token) {
    throw new Error('KhanaConnect is not configured (KHANA_CONNECT_CLIENT_ID / KHANA_CONNECT_TOKEN)');
  }

  const url = `${apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Client-ID': clientID,
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.error || `KhanaConnect request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

/** Public request — no Bearer (subscribe, tracking batch with clientId in body) */
async function kcPublicRequest(path, options = {}) {
  const { apiUrl, clientID } = getConfig();

  if (!clientID) {
    throw new Error('KhanaConnect client ID is not configured');
  }

  const url = `${apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Client-ID': clientID,
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.error || `KhanaConnect request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function sendTransactionalEmail({ to, subject, html, text }) {
  const recipients = Array.isArray(to) ? to.join(', ') : String(to);
  return kcRequest('/email', {
    method: 'POST',
    body: {
      to: recipients,
      subject,
      html,
      text,
      action: 'send',
    },
  });
}

async function sendContactForm(payload) {
  return kcRequest('/email/contact', {
    method: 'POST',
    body: payload,
  });
}

async function subscribeNewsletter(email, name = '') {
  const { clientID } = getConfig();
  return kcPublicRequest('/email/subscribe', {
    method: 'POST',
    body: { email, name, clientID },
  });
}

async function unsubscribeNewsletter(email) {
  const { clientID } = getConfig();
  return kcPublicRequest('/email/unsubscribe', {
    method: 'POST',
    body: { email, clientID },
  });
}

async function sendNewsletter(payload) {
  return kcRequest('/email/newsletter/send', {
    method: 'POST',
    body: payload,
  });
}

async function getNewsletterStats() {
  return kcRequest('/email/newsletter/stats');
}

async function getNewsletterSubscriberStats() {
  return kcRequest('/email/newsletter/subscribers/stats');
}

async function getSubscribers(query = {}) {
  const params = new URLSearchParams(query).toString();
  return kcRequest(`/email/newsletter/subscribers${params ? `?${params}` : ''}`);
}

async function trackEvents(events, headers = {}) {
  const { clientID } = getConfig();
  const normalized = events.map((event) => ({
    ...event,
    clientId: event.clientId || event.clientID || clientID,
    clientID: event.clientID || event.clientId || clientID,
  }));

  return kcPublicRequest('/events/batch', {
    method: 'POST',
    headers,
    body: { events: normalized },
  });
}

async function getEventsStats(days = 30) {
  const { clientID } = getConfig();
  return kcRequest(`/events/stats/${encodeURIComponent(clientID)}?days=${days}`);
}

async function getAnalyticsOverview() {
  return kcRequest('/analytics/overview');
}

async function getRevenueOverview() {
  return kcRequest('/revenue/overview');
}

async function getEmailHealth() {
  return kcRequest('/email/health');
}

module.exports = {
  getConfig,
  isConfigured,
  kcRequest,
  sendTransactionalEmail,
  sendContactForm,
  subscribeNewsletter,
  unsubscribeNewsletter,
  sendNewsletter,
  getNewsletterStats,
  getNewsletterSubscriberStats,
  getSubscribers,
  trackEvents,
  getEventsStats,
  getAnalyticsOverview,
  getRevenueOverview,
  getEmailHealth,
};
