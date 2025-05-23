const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, offerController.submitOffer);
router.get('/mine/:mineId', protect, offerController.getOffersForMine);
router.get('/my', protect, offerController.getMyOffers);
router.put('/:id/status', protect, offerController.updateOfferStatus);

module.exports = router;
