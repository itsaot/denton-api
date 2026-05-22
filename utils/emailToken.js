const crypto = require('crypto');

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const RESET_EXPIRY_MS = 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createEmailToken(expiryMs) {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    hash: hashToken(token),
    expires: new Date(Date.now() + expiryMs),
  };
}

function createVerificationToken() {
  return createEmailToken(VERIFICATION_EXPIRY_MS);
}

function createResetToken() {
  return createEmailToken(RESET_EXPIRY_MS);
}

module.exports = {
  hashToken,
  createVerificationToken,
  createResetToken,
  VERIFICATION_EXPIRY_MS,
  RESET_EXPIRY_MS,
};
