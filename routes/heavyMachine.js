// routes/heavyMachine.js
const express = require('express');
const { isValidObjectId } = require('mongoose');
const HeavyMachine = require('../models/HeavyMachine');
const authController = require('../controllers/authController');

const router = express.Router();

const validateObjectId = (req, res, next) => {
  const { id, rentalId, purchaseId, maintenanceId } = req.params;
  for (const val of [id, rentalId, purchaseId, maintenanceId]) {
    if (val && !isValidObjectId(val)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid ID format' });
    }
  }
  next();
};

// Helper to clean body (remove empty strings, normalize)
const cleanBody = (obj = {}) => {
  const copy = { ...obj };
  Object.keys(copy).forEach(k => {
    if (copy[k] === '') delete copy[k];
  });
  if (copy.category) copy.category = String(copy.category).toLowerCase();
  if (copy.status) copy.status = String(copy.status).toLowerCase();
  return copy;
};

// CREATE
router.post('/',
  authController.protect,
  authController.restrictTo('admin', 'mineral-manager'), // adjust roles as needed
  async (req, res) => {
    try {
      const payload = cleanBody(req.body);
      payload.createdBy = req.user.id; // enforce
      if (!payload.owner) payload.owner = req.user.id;

      const doc = await HeavyMachine.create(payload);
      res.status(201).json({ status: 'success', data: { machine: doc } });
    } catch (err) {
      const details = err.errors
        ? Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]))
        : undefined;
      res.status(400).json({ status: 'fail', message: err.message, details });
    }
  }
);

// LIST (filter by category, status, availableForRent, brand, q)
router.get('/', async (req, res) => {
  try {
    const { category, status, brand, availableForRent, q } = req.query;
    const filter = {};
    if (category) filter.category = category.toLowerCase();
    if (status) filter.status = status.toLowerCase();
    if (brand) filter.brand = brand;
    if (availableForRent === 'true') filter.status = 'available';

    let query = HeavyMachine.find(filter);

    if (q) {
      // simple text-ish search across name/model/brand
      query = query.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { model: { $regex: q, $options: 'i' } },
          { brand: { $regex: q, $options: 'i' } }
        ]
      });
    }

    query = query.sort('-createdAt');
    const list = await query;
    res.json({ status: 'success', results: list.length, data: { machines: list } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET ONE
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const doc = await HeavyMachine.findById(req.params.id)
      .populate('owner', 'firstName lastName email')
      .populate('rentals.renter', 'firstName lastName email')
      .populate('purchases.buyer', 'firstName lastName email');

    if (!doc) return res.status(404).json({ status: 'fail', message: 'Machine not found' });
    res.json({ status: 'success', data: { machine: doc } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// UPDATE
router.patch('/:id',
  validateObjectId,
  authController.protect,
  authController.restrictTo('admin', 'mineral-manager'),
  async (req, res) => {
    try {
      const payload = cleanBody(req.body);
      const doc = await HeavyMachine.findByIdAndUpdate(
        req.params.id,
        { $set: { ...payload, lastUpdatedAt: Date.now() } },
        { new: true, runValidators: true }
      );
      if (!doc) return res.status(404).json({ status: 'fail', message: 'Machine not found' });
      res.json({ status: 'success', data: { machine: doc } });
    } catch (err) {
      const details = err.errors
        ? Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]))
        : undefined;
      res.status(400).json({ status: 'fail', message: err.message, details });
    }
  }
);

// DELETE (soft or hard — here hard delete)
router.delete('/:id',
  validateObjectId,
  authController.protect,
  authController.restrictTo('admin'),
  async (req, res) => {
    try {
      const doc = await HeavyMachine.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ status: 'fail', message: 'Machine not found' });
      res.status(204).json({ status: 'success', data: null });
    } catch (err) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }
);

/**
 * RENTAL FLOWS
 */

// Start a rental
router.post('/:id/rent',
  validateObjectId,
  authController.protect,
  async (req, res) => {
    try {
      const { startDate, endDate, pricePerDay, notes } = req.body;
      const doc = await HeavyMachine.findById(req.params.id);
      if (!doc) return res.status(404).json({ status: 'fail', message: 'Machine not found' });

      if (doc.status !== 'available') {
        return res.status(400).json({ status: 'fail', message: `Machine not available (status=${doc.status})` });
      }

      doc.rentals.push({
        renter: req.user.id,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
        pricePerDay,
        notes
      });

      doc.status = 'rented';
      await doc.save();

      res.status(201).json({ status: 'success', data: { machine: doc } });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: err.message });
    }
  }
);

// Return rental (by rentalId)
router.post('/:id/return/:rentalId',
  validateObjectId,
  authController.protect,
  async (req, res) => {
    try {
      const { id, rentalId } = req.params;
      const doc = await HeavyMachine.findById(id);
      if (!doc) return res.status(404).json({ status: 'fail', message: 'Machine not found' });

      const rental = doc.rentals.id(rentalId);
      if (!rental) return res.status(404).json({ status: 'fail', message: 'Rental record not found' });

      if (rental.status !== 'active') {
        return res.status(400).json({ status: 'fail', message: 'Rental is not active' });
      }

      rental.status = 'returned';
      rental.returnedAt = new Date();

      // If no other active rentals, set available
      const stillActive = doc.rentals.some(r => r.status === 'active' && !r.returnedAt);
      doc.status = stillActive ? 'rented' : 'available';

      await doc.save();
      res.json({ status: 'success', data: { machine: doc } });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: err.message });
    }
  }
);

/**
 * SALES FLOW
 */

// Mark as sold (record purchase)
router.post('/:id/sell',
  validateObjectId,
  authController.protect,
  authController.restrictTo('admin', 'mineral-manager'),
  async (req, res) => {
    try {
      const { buyer, price, date, notes } = req.body;
      const doc = await HeavyMachine.findById(req.params.id);
      if (!doc) return res.status(404).json({ status: 'fail', message: 'Machine not found' });

      if (doc.status === 'sold') {
        return res.status(400).json({ status: 'fail', message: 'Machine already sold' });
      }

      doc.purchases.push({ buyer, price, date, notes });
      doc.status = 'sold';

      await doc.save();
      res.status(201).json({ status: 'success', data: { machine: doc } });
    } catch (err) {
      const details = err.errors
        ? Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]))
        : undefined;
      res.status(400).json({ status: 'fail', message: err.message, details });
    }
  }
);

/**
 * MAINTENANCE
 */
router.post('/:id/maintenance',
  validateObjectId,
  authController.protect,
  authController.restrictTo('admin', 'mineral-manager'),
  async (req, res) => {
    try {
      const doc = await HeavyMachine.findById(req.params.id);
      if (!doc) return res.status(404).json({ status: 'fail', message: 'Machine not found' });

      const { title, description, cost, performedAt, performedBy, setStatus } = req.body;
      doc.maintenanceHistory.push({ title, description, cost, performedAt, performedBy });

      if (setStatus) doc.status = String(setStatus).toLowerCase(); // e.g., 'maintenance' or 'available'

      await doc.save();
      res.status(201).json({ status: 'success', data: { machine: doc } });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: err.message });
    }
  }
);

// Change status directly (optional)
router.patch('/:id/status',
  validateObjectId,
  authController.protect,
  authController.restrictTo('admin', 'mineral-manager'),
  async (req, res) => {
    try {
      const { status } = req.body;
      const doc = await HeavyMachine.findByIdAndUpdate(
        req.params.id,
        { $set: { status: String(status).toLowerCase(), lastUpdatedAt: Date.now() } },
        { new: true, runValidators: true }
      );
      if (!doc) return res.status(404).json({ status: 'fail', message: 'Machine not found' });
      res.json({ status: 'success', data: { machine: doc } });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: err.message });
    }
  }
);

module.exports = router;
