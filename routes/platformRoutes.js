/**
 * KhanaConnect platform routes — proxy email, newsletter, and analytics through Denton API.
 * Frontend calls these; Denton holds the KhanaConnect client token server-side.
 */
const express = require('express');
const router = express.Router();
const khana = require('../helpers/khanaConnect');
const { protect } = require('../middleware/authMiddleware');

function requireKhanaConnect(req, res, next) {
  if (!khana.isConfigured()) {
    return res.status(503).json({
      message: 'KhanaConnect is not configured on this server.',
      hint: 'Set KHANA_CONNECT_API_URL, KHANA_CONNECT_CLIENT_ID, and KHANA_CONNECT_TOKEN.',
    });
  }
  next();
}

/** Health check for KhanaConnect integration */
router.get('/health', requireKhanaConnect, async (req, res) => {
  try {
    const health = await khana.getEmailHealth();
    res.json({
      ok: true,
      provider: 'khanaconnect',
      clientID: khana.getConfig().clientID,
      email: health,
    });
  } catch (error) {
    res.status(error.status || 502).json({
      ok: false,
      message: error.message,
    });
  }
});

/** Public contact form → KhanaConnect business inbox */
router.post('/contact', requireKhanaConnect, async (req, res) => {
  try {
    const { name, email, phone, message, subject } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required.' });
    }

    const result = await khana.sendContactForm({
      name,
      email,
      phone: phone || '',
      message,
      business: subject || 'Denton Vision Art enquiry',
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/** Public newsletter subscribe */
router.post('/newsletter/subscribe', requireKhanaConnect, async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const result = await khana.subscribeNewsletter(email, name || '');
    res.status(result.ok === false ? 409 : 201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/** Public newsletter unsubscribe */
router.post('/newsletter/unsubscribe', requireKhanaConnect, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const result = await khana.unsubscribeNewsletter(email);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/** Public analytics event batch (site tracking) */
router.post('/events/batch', requireKhanaConnect, async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ message: 'events array is required.' });
    }

    const headers = {};
    if (req.headers['x-session-id']) headers['X-Session-ID'] = req.headers['x-session-id'];
    if (req.headers['x-anonymous-id']) headers['X-Anonymous-ID'] = req.headers['x-anonymous-id'];

    const result = await khana.trackEvents(events, headers);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/** Admin: site analytics from KhanaConnect (GA4 + event stats) */
router.get('/analytics/overview', protect, requireKhanaConnect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const days = parseInt(req.query.days, 10) || 30;
    const [overview, events, newsletter] = await Promise.all([
      khana.getAnalyticsOverview().catch(() => null),
      khana.getEventsStats(days).catch(() => null),
      khana.getNewsletterSubscriberStats().catch(() => null),
    ]);

    res.json({
      provider: 'khanaconnect',
      clientID: khana.getConfig().clientID,
      analytics: overview,
      events,
      newsletter,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/** Admin: newsletter campaign stats */
router.get('/newsletter/stats', protect, requireKhanaConnect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const [stats, subscribers] = await Promise.all([
      khana.getNewsletterStats(),
      khana.getNewsletterSubscriberStats(),
    ]);

    res.json({ stats, subscribers });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/** Admin: send newsletter (HTML body) */
router.post('/newsletter/send', protect, requireKhanaConnect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { subject, html, text, useSubscribers } = req.body;
    if (!subject || (!html && !text)) {
      return res.status(400).json({ message: 'Subject and html (or text) are required.' });
    }

    const result = await khana.sendNewsletter({
      subject,
      html,
      text,
      useSubscribers: useSubscribers !== false,
    });

    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

module.exports = router;
