const express = require('express');
const router = express.Router();
const Mine = require('../models/Mine'); // Adjust the path as needed
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Middleware for validating ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  next();
};

// Validation middleware for mine creation
const validateCreateMine = [
  check('owner').notEmpty().withMessage('Owner ID is required'),
  check('name').notEmpty().withMessage('Mine name is required'),
  check('location').notEmpty().withMessage('Location is required'),
  check('commodityType').notEmpty().withMessage('Commodity type is required'),
  check('price').isNumeric().withMessage('Price must be a number'),
  check('status').isIn(['Active', 'Idle', 'Exploration', 'Development']).optional()
];

// Validation middleware for mine update
const validateUpdateMine = [
  check('name').notEmpty().optional().withMessage('Mine name cannot be empty'),
  check('location').notEmpty().optional().withMessage('Location cannot be empty'),
  check('commodityType').notEmpty().optional().withMessage('Commodity type cannot be empty'),
  check('price').isNumeric().optional().withMessage('Price must be a number'),
  check('status').isIn(['Active', 'Idle', 'Exploration', 'Development']).optional()
];

// Create a new mine
router.post('/', validateCreateMine, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Verify owner exists (optional - remove if not needed)
    const ownerExists = await mongoose.model('User').exists({ _id: req.body.owner });
    if (!ownerExists) {
      return res.status(400).json({ message: 'Owner user does not exist' });
    }

    const mine = new Mine(req.body);
    await mine.save();
    res.status(201).json(mine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all mines (with optional filtering)
router.get('/', async (req, res) => {
  try {
    const { owner, commodityType, status, minPrice, maxPrice } = req.query;
    const filter = {};
    
    if (owner) filter.owner = owner;
    if (commodityType) filter.commodityType = commodityType;
    if (status) filter.status = status;
    
    // Price range filtering
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const mines = await Mine.find(filter).populate('owner', 'firstName lastName email role');
    res.json(mines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single mine by ID
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.id).populate('owner', 'firstName lastName email role');
    if (!mine) {
      return res.status(404).json({ message: 'Mine not found' });
    }
    res.json(mine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a mine
router.put('/:id', validateObjectId, validateUpdateMine, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const mine = await Mine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email role');

    if (!mine) {
      return res.status(404).json({ message: 'Mine not found' });
    }

    res.json(mine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a mine
router.delete('/:id', validateObjectId, async (req, res) => {
  try {
    const mine = await Mine.findByIdAndDelete(req.params.id);
    if (!mine) {
      return res.status(404).json({ message: 'Mine not found' });
    }
    res.json({ message: 'Mine deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add documents to a mine
router.patch('/:id/documents', validateObjectId, async (req, res) => {
  try {
    const { documents } = req.body;
    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ message: 'Documents array is required' });
    }

    const mine = await Mine.findByIdAndUpdate(
      req.params.id,
      { $push: { documents: { $each: documents } } },
      { new: true }
    );

    if (!mine) {
      return res.status(404).json({ message: 'Mine not found' });
    }

    res.json(mine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add media to a mine
router.patch('/:id/media', validateObjectId, async (req, res) => {
  try {
    const { media } = req.body;
    if (!media || !Array.isArray(media)) {
      return res.status(400).json({ message: 'Media array is required' });
    }

    const mine = await Mine.findByIdAndUpdate(
      req.params.id,
      { $push: { media: { $each: media } } },
      { new: true }
    );

    if (!mine) {
      return res.status(404).json({ message: 'Mine not found' });
    }

    res.json(mine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get mines by owner
router.get('/owner/:ownerId', validateObjectId, async (req, res) => {
  try {
    const mines = await Mine.find({ owner: req.params.ownerId }).populate('owner', 'firstName lastName email role');
    res.json(mines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search mines by name or location
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const mines = await Mine.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } }
      ]
    }).populate('owner', 'firstName lastName email role');
    
    res.json(mines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;