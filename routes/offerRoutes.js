const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Middleware for validating ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  next();
};

// Validation middleware for offer creation
const validateCreateOffer = [
  check('mine').notEmpty().withMessage('Mine ID is required'),
  check('investor').notEmpty().withMessage('Investor ID is required'),
  check('amount').isNumeric().withMessage('Amount must be a number'),
  check('amount').custom(value => value > 0).withMessage('Amount must be greater than 0'),
  check('status').isIn(['Pending', 'Accepted', 'Rejected']).optional()
];

// Validation middleware for offer update
const validateUpdateOffer = [
  check('amount').isNumeric().optional().withMessage('Amount must be a number'),
  check('amount').custom(value => value > 0).optional().withMessage('Amount must be greater than 0'),
  check('status').isIn(['Pending', 'Accepted', 'Rejected']).optional(),
  check('message').isString().optional()
];

// Create a new offer
router.post('/', validateCreateOffer, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Verify mine and investor exist
    const [mineExists, investorExists] = await Promise.all([
      mongoose.model('Mine').exists({ _id: req.body.mine }),
      mongoose.model('User').exists({ _id: req.body.investor, role: 'investor' })
    ]);

    if (!mineExists) {
      return res.status(400).json({ message: 'Mine does not exist' });
    }
    if (!investorExists) {
      return res.status(400).json({ message: 'Investor does not exist or is not an investor' });
    }

    const offer = new Offer(req.body);
    await offer.save();
    
    // Populate references before returning
    const populatedOffer = await Offer.populate(offer, [
      { path: 'mine', select: 'name location commodityType price' },
      { path: 'investor', select: 'firstName lastName email' }
    ]);

    res.status(201).json(populatedOffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all offers (with optional filtering)
router.get('/', async (req, res) => {
  try {
    const { mine, investor, status } = req.query;
    const filter = {};
    
    if (mine) filter.mine = mine;
    if (investor) filter.investor = investor;
    if (status) filter.status = status;

    const offers = await Offer.find(filter)
      .populate('mine', 'name location commodityType price')
      .populate('investor', 'firstName lastName email');
      
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single offer by ID
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('mine', 'name location commodityType price owner')
      .populate('investor', 'firstName lastName email');
      
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update an offer (basic fields)
router.put('/:id', validateObjectId, validateUpdateOffer, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('mine', 'name location commodityType price')
    .populate('investor', 'firstName lastName email');

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete an offer
router.delete('/:id', validateObjectId, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json({ message: 'Offer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accept an offer (with mine ownership transfer logic)
router.patch('/:id/accept', validateObjectId, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('mine', 'owner')
      .populate('investor');

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending offers can be accepted' });
    }

    // Start transaction for atomic update
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update offer status
      offer.status = 'Accepted';
      await offer.save({ session });

      // Reject all other pending offers for this mine
      await Offer.updateMany(
        { 
          mine: offer.mine._id, 
          status: 'Pending', 
          _id: { $ne: offer._id } 
        },
        { $set: { status: 'Rejected' } },
        { session }
      );

      // Here you would typically add logic to:
      // 1. Transfer mine ownership (if that's your business logic)
      // 2. Create a transaction record
      // 3. Notify both parties
      // Example (uncomment if needed):
      // await mongoose.model('Mine').findByIdAndUpdate(
      //   offer.mine._id,
      //   { owner: offer.investor._id },
      //   { session }
      // );

      await session.commitTransaction();
      session.endSession();

      res.json(offer);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reject an offer
router.patch('/:id/reject', validateObjectId, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected' },
      { new: true }
    )
    .populate('mine', 'name location commodityType price')
    .populate('investor', 'firstName lastName email');

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending offers can be rejected' });
    }

    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get offers by mine owner
router.get('/mine-owner/:ownerId', validateObjectId, async (req, res) => {
  try {
    // First find all mines owned by this user
    const mines = await mongoose.model('Mine').find({ owner: req.params.ownerId });
    const mineIds = mines.map(mine => mine._id);

    // Then find all offers for these mines
    const offers = await Offer.find({ mine: { $in: mineIds } })
      .populate('mine', 'name location commodityType price')
      .populate('investor', 'firstName lastName email');

    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get offers by investor
router.get('/investor/:investorId', validateObjectId, async (req, res) => {
  try {
    const offers = await Offer.find({ investor: req.params.investorId })
      .populate('mine', 'name location commodityType price owner')
      .populate('investor', 'firstName lastName email');

    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;