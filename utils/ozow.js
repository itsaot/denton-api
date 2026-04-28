const crypto = require('crypto');
const http = require('http');
const https = require('https');

const DEFAULT_PAYMENT_URL = 'https://pay.ozow.com';
const DEFAULT_API_URL = 'https://api.ozow.com';

const REQUEST_FIELD_ORDER = [
  'SiteCode',
  'CountryCode',
  'CurrencyCode',
  'Amount',
  'TransactionReference',
  'BankReference',
  'Optional1',
  'Optional2',
  'Optional3',
  'Optional4',
  'Optional5',
  'Customer',
  'CancelUrl',
  'ErrorUrl',
  'SuccessUrl',
  'NotifyUrl',
  'IsTest',
];

const RESPONSE_FIELD_ORDER = [
  'SiteCode',
  'TransactionId',
  'TransactionReference',
  'Amount',
  'Status',
  'Optional1',
  'Optional2',
  'Optional3',
  'Optional4',
  'Optional5',
  'CurrencyCode',
  'IsTest',
  'StatusMessage',
];

function clip(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeBoolean(value) {
  return value === true || value === 'true' ? 'true' : 'false';
}

function formatAmount(value) {
  const numericAmount = Number(value);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Ozow amount must be a number greater than 0.');
  }

  return numericAmount.toFixed(2);
}

function getRequiredConfig(name, fallbackValue) {
  const value = fallbackValue || process.env[name];

  if (!value) {
    throw new Error(`Missing required Ozow configuration: ${name}`);
  }

  return value;
}

function generateHash(fields, orderedFields, secretKey) {
  const rawValue = orderedFields.map((field) => String(fields[field] || '')).join('') + secretKey;
  return crypto.createHash('sha512').update(rawValue.toLowerCase(), 'utf8').digest('hex');
}

function safeHashEquals(left, right) {
  const normalizedLeft = String(left || '').toLowerCase();
  const normalizedRight = String(right || '').toLowerCase();

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(normalizedLeft, 'utf8'),
    Buffer.from(normalizedRight, 'utf8')
  );
}

function buildOzowPaymentRequest(options) {
  const secretKey = getRequiredConfig('OZOW_SECRET_KEY', options.secretKey);
  const siteCode = getRequiredConfig('OZOW_SITE_CODE', options.siteCode);
  const countryCode = clip(options.countryCode || process.env.OZOW_COUNTRY_CODE || 'ZA', 2).toUpperCase();
  const currencyCode = clip(options.currencyCode || process.env.OZOW_CURRENCY_CODE || 'ZAR', 3).toUpperCase();

  const payload = {
    SiteCode: clip(siteCode, 50),
    CountryCode: countryCode,
    CurrencyCode: currencyCode,
    Amount: formatAmount(options.amount),
    TransactionReference: clip(options.transactionReference, 50),
    BankReference: clip(options.bankReference, 20),
    Optional1: clip(options.optional1, 50),
    Optional2: clip(options.optional2, 50),
    Optional3: clip(options.optional3, 50),
    Optional4: clip(options.optional4, 50),
    Optional5: clip(options.optional5, 50),
    Customer: clip(options.customer, 100),
    CancelUrl: clip(options.cancelUrl, 150),
    ErrorUrl: clip(options.errorUrl, 150),
    SuccessUrl: clip(options.successUrl, 150),
    NotifyUrl: clip(options.notifyUrl, 150),
    IsTest: normalizeBoolean(options.isTest),
  };

  if (!payload.TransactionReference) {
    throw new Error('TransactionReference is required for Ozow payments.');
  }

  if (!payload.BankReference) {
    throw new Error('BankReference is required for Ozow payments.');
  }

  payload.HashCheck = generateHash(payload, REQUEST_FIELD_ORDER, secretKey);

  return payload;
}

function verifyOzowResponse(payload, secretKey = process.env.OZOW_SECRET_KEY) {
  if (!secretKey) {
    throw new Error('Missing required Ozow configuration: OZOW_SECRET_KEY');
  }

  const expectedHash = generateHash(payload, RESPONSE_FIELD_ORDER, secretKey);
  const providedHash = payload.Hash || payload.hash;

  return {
    isValid: safeHashEquals(expectedHash, providedHash),
    expectedHash,
    providedHash: String(providedHash || ''),
  };
}

function callOzowApi(pathname, query, apiKey = process.env.OZOW_API_KEY) {
  if (!apiKey) {
    throw new Error('Missing required Ozow configuration: OZOW_API_KEY');
  }

  const baseUrl = process.env.OZOW_API_BASE_URL || DEFAULT_API_URL;
  const url = new URL(pathname, `${baseUrl.replace(/\/$/, '')}/`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const client = url.protocol === 'http:' ? http : https;

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: 'GET',
        headers: {
          ApiKey: apiKey,
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`Ozow API request failed with status ${res.statusCode}: ${data}`));
          }

          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Unable to parse Ozow API response: ${error.message}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

function getOzowTransactionByReference({ siteCode, transactionReference, isTest }) {
  const resolvedSiteCode = getRequiredConfig('OZOW_SITE_CODE', siteCode);

  return callOzowApi('/GetTransactionByReference', {
    siteCode: resolvedSiteCode,
    transactionReference,
    isTest: normalizeBoolean(isTest),
  });
}

function getOzowTransactionById({ siteCode, transactionId }) {
  const resolvedSiteCode = getRequiredConfig('OZOW_SITE_CODE', siteCode);

  return callOzowApi('/GetTransaction', {
    siteCode: resolvedSiteCode,
    transactionId,
  });
}

module.exports = {
  DEFAULT_PAYMENT_URL,
  buildOzowPaymentRequest,
  formatAmount,
  getOzowTransactionById,
  getOzowTransactionByReference,
  verifyOzowResponse,
};
