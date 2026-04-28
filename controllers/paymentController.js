const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const {
  DEFAULT_PAYMENT_URL,
  buildOzowPaymentRequest,
  getOzowTransactionById,
  getOzowTransactionByReference,
  verifyOzowResponse,
} = require('../utils/ozow');

function getBaseUrl(req) {
  return process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

function buildDefaultCallbackUrls(req) {
  const baseUrl = getBaseUrl(req);

  return {
    successUrl: `${baseUrl}/api/payments/ozow/callback/success`,
    cancelUrl: `${baseUrl}/api/payments/ozow/callback/cancel`,
    errorUrl: `${baseUrl}/api/payments/ozow/callback/error`,
    notifyUrl: `${baseUrl}/api/payments/ozow/callback/notify`,
  };
}

function resolveCustomerName(req) {
  const fullName = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || req.user?.email || req.user?._id?.toString() || 'Denton Customer';
}

function resolveTransactionReference(value) {
  return String(value || `DENTON-${Date.now()}`).trim().slice(0, 50);
}

function resolveBankReference(value, transactionReference) {
  return String(value || transactionReference).trim().slice(0, 20);
}

async function fetchConfirmedOzowStatus(payload) {
  if (payload.TransactionId) {
    return getOzowTransactionById({
      transactionId: payload.TransactionId,
    });
  }

  if (payload.TransactionReference) {
    return getOzowTransactionByReference({
      transactionReference: payload.TransactionReference,
      isTest: payload.IsTest,
    });
  }

  return null;
}

exports.createPaymentIntent = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: 'Stripe is not configured on this server.' });
    }

    const { amount, currency = 'zar' } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { userId: req.user._id.toString() },
    });

    return res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.createOzowPayment = async (req, res) => {
  try {
    const callbackUrls = buildDefaultCallbackUrls(req);
    const transactionReference = resolveTransactionReference(req.body.transactionReference);
    const bankReference = resolveBankReference(req.body.bankReference, transactionReference);
    const customer = req.body.customer || resolveCustomerName(req);

    const payload = buildOzowPaymentRequest({
      amount: req.body.amount,
      transactionReference,
      bankReference,
      customer,
      optional1: req.body.optional1 || req.user?._id?.toString(),
      optional2: req.body.optional2,
      optional3: req.body.optional3,
      optional4: req.body.optional4,
      optional5: req.body.optional5,
      cancelUrl: req.body.cancelUrl || process.env.OZOW_CANCEL_URL || callbackUrls.cancelUrl,
      errorUrl: req.body.errorUrl || process.env.OZOW_ERROR_URL || callbackUrls.errorUrl,
      successUrl: req.body.successUrl || process.env.OZOW_SUCCESS_URL || callbackUrls.successUrl,
      notifyUrl: req.body.notifyUrl || process.env.OZOW_NOTIFY_URL || callbackUrls.notifyUrl,
      isTest: req.body.isTest ?? process.env.OZOW_IS_TEST,
    });

    return res.status(200).json({
      provider: 'ozow',
      method: 'POST',
      gatewayUrl: process.env.OZOW_BASE_URL || DEFAULT_PAYMENT_URL,
      transactionReference: payload.TransactionReference,
      bankReference: payload.BankReference,
      formFields: payload,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.handleOzowCallback = async (req, res) => {
  try {
    const callbackPayload = { ...req.query, ...req.body };
    const verification = verifyOzowResponse(callbackPayload);

    if (!verification.isValid) {
      return res.status(400).json({
        status: 'fail',
        provider: 'ozow',
        outcome: req.params.outcome,
        verified: false,
        message: 'Invalid Ozow callback hash.',
      });
    }

    let confirmedTransaction = null;
    let confirmationError = null;

    try {
      confirmedTransaction = await fetchConfirmedOzowStatus(callbackPayload);
    } catch (error) {
      confirmationError = error.message;
    }

    return res.status(200).json({
      status: 'success',
      provider: 'ozow',
      outcome: req.params.outcome,
      verified: true,
      callback: callbackPayload,
      transaction: confirmedTransaction,
      confirmationError,
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      provider: 'ozow',
      outcome: req.params.outcome,
      message: err.message,
    });
  }
};

exports.getOzowStatusByReference = async (req, res) => {
  try {
    const transaction = await getOzowTransactionByReference({
      transactionReference: req.params.transactionReference,
      isTest: req.query.isTest,
    });

    return res.status(200).json({
      status: 'success',
      provider: 'ozow',
      transaction,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getOzowStatusById = async (req, res) => {
  try {
    const transaction = await getOzowTransactionById({
      transactionId: req.params.transactionId,
    });

    return res.status(200).json({
      status: 'success',
      provider: 'ozow',
      transaction,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
