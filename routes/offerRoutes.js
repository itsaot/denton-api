const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const Mine = require('../models/Mine');
const Mineral = require('../models/Mineral');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const validateObjectId = (param = 'id') => (req, res, next) => {
  const id = req.params[param];
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  next();
};

const BUYER_ROLES = new Set(['investor', 'consultant', 'mine_owner', 'mineral-manager', 'admin']);

async function userCanMakeOffers(userId) {
  const u = await User.findById(userId).select('role');
  return u && BUYER_ROLES.has(u.role);
}

async function resolveOfferTarget(req) {
  const { mine, mineral } = req.body;
  if (mine) {
    const m = await Mine.findById(mine);
    return m ? { type: 'mine', doc: m } : null;
  }
  if (mineral) {
    const m = await Mineral.findById(mineral).select('+isActive');
    return m ? { type: 'mineral', doc: m } : null;
  }
  return null;
}

function isAssetOwner(userId, target) {
  if (target.type === 'mine') {
    return target.doc.owner && target.doc.owner.equals(userId);
  }
  return target.doc.createdBy && target.doc.createdBy.equals(userId);
}

// --- Static paths first (before /:id) ---

router.get('/me', protect, async (req, res) => {
  try {
    const offers = await Offer.find({ investor: req.user._id })
      .populate('mine', 'name location commodityType price owner')
      .populate('mineral', 'name mineralType pricePerTonne availableTonnes createdBy')
      .populate('investor', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/received', protect, async (req, res) => {
  try {
    const [mineIds, mineralIds] = await Promise.all([
      Mine.find({ owner: req.user._id }).distinct('_id'),
      Mineral.find({ createdBy: req.user._id }).distinct('_id'),
    ]);
    const offers = await Offer.find({
      $or: [{ mine: { $in: mineIds } }, { mineral: { $in: mineralIds } }],
    })
      .populate('mine', 'name location commodityType price owner')
      .populate('mineral', 'name mineralType pricePerTonne availableTonnes createdBy')
      .populate('investor', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/mine/:mineId', protect, validateObjectId('mineId'), async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.mineId);
    if (!mine) return res.status(404).json({ message: 'Mine not found' });
    if (!mine.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the mine owner can view these offers' });
    }
    const offers = await Offer.find({ mine: req.params.mineId })
      .populate('investor', 'firstName lastName email role')
      .sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/mineral/:mineralId', protect, validateObjectId('mineralId'), async (req, res) => {
  try {
    const mineral = await Mineral.findById(req.params.mineralId).select('+isActive');
    if (!mineral) return res.status(404).json({ message: 'Mineral not found' });
    if (!mineral.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the listing owner can view these offers' });
    }
    const offers = await Offer.find({ mineral: req.params.mineralId })
      .populate('investor', 'firstName lastName email role')
      .sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/mine-owner/:ownerId', protect, validateObjectId('ownerId'), async (req, res) => {
  try {
    if (req.params.ownerId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const mines = await Mine.find({ owner: req.params.ownerId });
    const mineIds = mines.map((m) => m._id);
    const offers = await Offer.find({ mine: { $in: mineIds } })
      .populate('mine', 'name location commodityType price')
      .populate('investor', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/investor/:investorId', protect, validateObjectId('investorId'), async (req, res) => {
  try {
    if (req.params.investorId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const offers = await Offer.find({ investor: req.params.investorId })
      .populate('mine', 'name location commodityType price owner')
      .populate('mineral', 'name mineralType pricePerTonne createdBy')
      .populate('investor', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// List with optional filters (authenticated). With no filters, returns offers you sent or received (not global).
router.get('/', protect, async (req, res) => {
  try {
    const { mine, mineral, investor, status } = req.query;
    const filter = {};
    if (mine) filter.mine = mine;
    if (mineral) filter.mineral = mineral;
    if (investor) {
      if (investor !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      filter.investor = investor;
    }
    if (status) filter.status = status;

    let finalFilter;
    if (req.user.role === 'admin') {
      finalFilter = Object.keys(filter).length ? filter : {};
    } else {
      const [mineIds, mineralIds] = await Promise.all([
        Mine.find({ owner: req.user._id }).distinct('_id'),
        Mineral.find({ createdBy: req.user._id }).distinct('_id'),
      ]);
      const related = {
        $or: [
          { investor: req.user._id },
          { mine: { $in: mineIds } },
          { mineral: { $in: mineralIds } },
        ],
      };
      finalFilter =
        Object.keys(filter).length > 0 ? { $and: [related, filter] } : related;
    }

    const offers = await Offer.find(finalFilter)
      .populate('mine', 'name location commodityType price owner')
      .populate('mineral', 'name mineralType pricePerTonne createdBy')
      .populate('investor', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', protect, validateObjectId(), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('mine', 'name location commodityType price owner')
      .populate('mineral', 'name mineralType pricePerTonne createdBy')
      .populate('investor', 'firstName lastName email');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isInvestor = offer.investor._id.equals(req.user._id);
    let isSeller = false;
    if (offer.mine) isSeller = offer.mine.owner.equals(req.user._id);
    if (offer.mineral) isSeller = offer.mineral.createdBy.equals(req.user._id);
    if (!isInvestor && !isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const validateCreateOffer = [
  check('amount').isNumeric().withMessage('Amount must be a number'),
  check('amount').custom((v) => Number(v) > 0).withMessage('Amount must be greater than 0'),
  check('mine').optional().isMongoId(),
  check('mineral').optional().isMongoId(),
  check('message').optional().isString(),
];

router.post('/', protect, validateCreateOffer, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { mine, mineral, amount, message } = req.body;
  if ((!mine && !mineral) || (mine && mineral)) {
    return res.status(400).json({ message: 'Provide exactly one of mine or mineral' });
  }

  try {
    if (!(await userCanMakeOffers(req.user._id))) {
      return res.status(403).json({ message: 'Your role cannot create offers' });
    }

    const target = await resolveOfferTarget(req);
    if (!target) {
      return res.status(400).json({ message: mine ? 'Mine not found' : 'Mineral not found' });
    }

    if (isAssetOwner(req.user._id, target)) {
      return res.status(400).json({ message: 'You cannot make an offer on your own listing' });
    }

    const payload = {
      investor: req.user._id,
      amount: Number(amount),
      message,
      ...(target.type === 'mine' ? { mine: target.doc._id } : { mineral: target.doc._id }),
    };

    const offer = new Offer(payload);
    await offer.save();
    const populated = await Offer.populate(offer, [
      { path: 'mine', select: 'name location commodityType price owner' },
      { path: 'mineral', select: 'name mineralType pricePerTonne availableTonnes createdBy' },
      { path: 'investor', select: 'firstName lastName email role' },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const validateUpdateOffer = [
  check('amount').isNumeric().optional().withMessage('Amount must be a number'),
  check('amount').custom((v) => v == null || Number(v) > 0).withMessage('Amount must be greater than 0'),
  check('message').isString().optional(),
];

router.put('/:id', protect, validateObjectId(), validateUpdateOffer, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    if (!offer.investor.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the investor can update this offer' });
    }
    if (offer.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending offers can be updated' });
    }

    if (req.body.amount != null) offer.amount = Number(req.body.amount);
    if (req.body.message !== undefined) offer.message = req.body.message;
    await offer.save();

    const updated = await Offer.findById(offer._id)
      .populate('mine', 'name location commodityType price owner')
      .populate('mineral', 'name mineralType pricePerTonne createdBy')
      .populate('investor', 'firstName lastName email');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, validateObjectId(), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('mine').populate('mineral');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isInvestor = offer.investor.equals(req.user._id);
    let isSeller = false;
    if (offer.mine) isSeller = offer.mine.owner.equals(req.user._id);
    if (offer.mineral) isSeller = offer.mineral.createdBy.equals(req.user._id);
    if (!isInvestor && !isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (offer.status !== 'Pending' && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'Only pending offers can be deleted' });
    }

    await Offer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Offer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function acceptOfferLogic(offerId) {
  const offer = await Offer.findById(offerId).populate('mine').populate('mineral').populate('investor');
  if (!offer) return { error: 404, message: 'Offer not found' };
  if (offer.status !== 'Pending') return { error: 400, message: 'Only pending offers can be accepted' };

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    offer.status = 'Accepted';
    await offer.save({ session });

    const filter = { status: 'Pending', _id: { $ne: offer._id } };
    if (offer.mine) filter.mine = offer.mine._id;
    if (offer.mineral) filter.mineral = offer.mineral._id;

    await Offer.updateMany(filter, { $set: { status: 'Rejected' } }, { session });

    await session.commitTransaction();
    session.endSession();
    return { offer };
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }
}

router.patch('/:id/accept', protect, validateObjectId(), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('mine').populate('mineral');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    let isSeller = false;
    if (offer.mine) isSeller = offer.mine.owner.equals(req.user._id);
    if (offer.mineral) isSeller = offer.mineral.createdBy.equals(req.user._id);
    if (!isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the listing owner can accept' });
    }

    const result = await acceptOfferLogic(req.params.id);
    if (result.error) return res.status(result.error).json({ message: result.message });

    const populated = await Offer.findById(result.offer._id)
      .populate('mine', 'name location commodityType price owner')
      .populate('mineral', 'name mineralType pricePerTonne createdBy')
      .populate('investor', 'firstName lastName email');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reject', protect, validateObjectId(), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('mine').populate('mineral');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    let isSeller = false;
    if (offer.mine) isSeller = offer.mine.owner.equals(req.user._id);
    if (offer.mineral) isSeller = offer.mineral.createdBy.equals(req.user._id);
    if (!isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the listing owner can reject' });
    }

    if (offer.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending offers can be rejected' });
    }

    offer.status = 'Rejected';
    await offer.save();
    const updated = await Offer.findById(offer._id)
      .populate('mine', 'name location commodityType price owner')
      .populate('mineral', 'name mineralType pricePerTonne createdBy')
      .populate('investor', 'firstName lastName email');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
