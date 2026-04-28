const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createOzowPayment,
  createPaymentIntent,
  getOzowStatusById,
  getOzowStatusByReference,
  handleOzowCallback,
} = require('../controllers/paymentController');

router.post('/create-intent', protect, createPaymentIntent);
router.post('/ozow/initiate', protect, createOzowPayment);
router.all('/ozow/callback/:outcome', handleOzowCallback);
router.get('/ozow/status/reference/:transactionReference', protect, getOzowStatusByReference);
router.get('/ozow/status/transaction/:transactionId', protect, getOzowStatusById);

module.exports = router;
