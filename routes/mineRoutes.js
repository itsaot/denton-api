const express = require('express');
const router = express.Router();
const Mine = require('../models/Mine');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ------------------------ Multer setup (PDF only) ------------------------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'mine-docs');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^\w\-]+/g, '_');
    cb(null, `${new mongoose.Types.ObjectId()}-${Date.now()}-${safeBase}${path.extname(file.originalname)}`);
  }
});

const pdfOnly = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    return cb(null, true);
  }
  cb(new Error('Only PDF files are allowed'));
};

const upload = multer({
  storage,
  fileFilter: pdfOnly,
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Flexible upload middleware that accepts any field name
const flexibleUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.log('Upload error:', err.message);
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        console.log('Unexpected field, but continuing...');
        return next();
      }
      return res.status(400).json({ 
        message: 'File upload error',
        error: err.message 
      });
    }
    next();
  });
};

// Helper functions
function getAllFiles(req) {
  return req.files || [];
}

function buildAttachmentFromFile(file) {
  if (!file) return null;
  return {
    filename: file.originalname, // Use original name as filename
    url: `/uploads/mine-docs/${file.filename}`,
    mimetype: file.mimetype,
    size: file.size,
    uploadedAt: new Date()
  };
}

// ------------------------ Middleware: validate ObjectId ------------------------
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  next();
};

// ------------------------ Validation ------------------------
const validateCreateMine = [
  check('owner').notEmpty().withMessage('Owner ID is required'),
  check('name').notEmpty().withMessage('Mine name is required'),
  check('location').notEmpty().withMessage('Location is required'),
  check('commodityType').notEmpty().withMessage('Commodity type is required'),
  check('price').isNumeric().withMessage('Price must be a number'),
  check('status').isIn(['Active', 'Idle', 'Exploration', 'Development']).optional()
];

const validateUpdateMine = [
  check('name').notEmpty().optional().withMessage('Mine name cannot be empty'),
  check('location').notEmpty().optional().withMessage('Location cannot be empty'),
  check('commodityType').notEmpty().optional().withMessage('Commodity type cannot be empty'),
  check('price').isNumeric().optional().withMessage('Price must be a number'),
  check('status').isIn(['Active', 'Idle', 'Exploration', 'Development']).optional()
];

// ------------------------ Create a new mine (with optional PDF) ------------------------
router.post('/', flexibleUpload, validateCreateMine, async (req, res) => {
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Files received:', req.files ? req.files.map(f => ({ 
    fieldname: f.fieldname, 
    originalname: f.originalname,
    mimetype: f.mimetype 
  })) : 'None');

  const allFiles = getAllFiles(req);
  
  // Validate maximum of 1 file
  if (allFiles.length > 1) {
    for (const f of allFiles) { 
      try { fs.unlinkSync(f.path); } catch (_) {} 
    }
    return res.status(400).json({ message: 'Only one PDF file can be uploaded' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    for (const f of allFiles) { 
      try { fs.unlinkSync(f.path); } catch (_) {} 
    }
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Parse JSON fields that are sent as strings
    const parsedBody = { ...req.body };
    const jsonFields = ['legalOwnership', 'geologyResource', 'infrastructure', 'financials', 'esg', 'operational', 'market'];
    
    jsonFields.forEach(field => {
      if (parsedBody[field] && typeof parsedBody[field] === 'string') {
        try {
          parsedBody[field] = JSON.parse(parsedBody[field]);
        } catch (e) {
          console.log(`Failed to parse ${field}:`, e.message);
          // If parsing fails, keep the original string value
        }
      }
    });

    // Verify owner exists
    const ownerExists = await mongoose.model('User').exists({ _id: parsedBody.owner });
    if (!ownerExists) {
      for (const f of allFiles) { 
        try { fs.unlinkSync(f.path); } catch (_) {} 
      }
      return res.status(400).json({ message: 'Owner user does not exist' });
    }

    // Handle attachments (not documents)
    const attachments = [];
    if (allFiles.length > 0) {
      const attachment = buildAttachmentFromFile(allFiles[0]);
      if (attachment) {
        attachments.push(attachment);
      }
    }

    const mine = new Mine({
      ...parsedBody,
      ...(attachments.length ? { attachments } : {})
    });

    await mine.save();
    await mine.populate('owner', 'firstName lastName email role');
    
    res.status(201).json({
      message: 'Mine created successfully',
      mine: mine
    });
    
  } catch (err) {
    for (const f of allFiles) { 
      try { fs.unlinkSync(f.path); } catch (_) {} 
    }
    console.error('Error creating mine:', err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------------ Get all mines (with optional filtering) ------------------------
router.get('/', async (req, res) => {
  try {
    const { owner, commodityType, status, minPrice, maxPrice } = req.query;
    const filter = {};
    if (owner) filter.owner = owner;
    if (commodityType) filter.commodityType = commodityType;
    if (status) filter.status = status;

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

// ------------------------ Get a single mine by ID ------------------------
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.id).populate('owner', 'firstName lastName email role');
    if (!mine) return res.status(404).json({ message: 'Mine not found' });
    res.json(mine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ------------------------ Update a mine ------------------------
router.put('/:id', validateObjectId, validateUpdateMine, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const mine = await Mine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email role');

    if (!mine) return res.status(404).json({ message: 'Mine not found' });
    res.json(mine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ------------------------ Delete a mine ------------------------
router.delete('/:id', validateObjectId, async (req, res) => {
  try {
    const mine = await Mine.findByIdAndDelete(req.params.id);
    if (!mine) return res.status(404).json({ message: 'Mine not found' });
    res.json({ message: 'Mine deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ------------------------ Add attachments to a mine (array) ------------------------
router.patch('/:id/attachments', validateObjectId, async (req, res) => {
  try {
    const { attachments } = req.body;
    if (!attachments || !Array.isArray(attachments)) {
      return res.status(400).json({ message: 'Attachments array is required' });
    }

    const mine = await Mine.findByIdAndUpdate(
      req.params.id,
      { $push: { attachments: { $each: attachments } } },
      { new: true }
    );

    if (!mine) return res.status(404).json({ message: 'Mine not found' });
    res.json(mine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ------------------------ Upload & attach a PDF to an existing mine ------------------------
router.post('/:id/attachment', validateObjectId, flexibleUpload, async (req, res) => {
  const allFiles = getAllFiles(req);
  if (allFiles.length === 0) {
    return res.status(400).json({ message: 'PDF file is required' });
  }
  if (allFiles.length > 1) {
    for (const f of allFiles) { try { fs.unlinkSync(f.path); } catch (_) {} }
    return res.status(400).json({ message: 'Only one PDF file can be uploaded' });
  }

  try {
    const f = allFiles[0];
    const attachment = buildAttachmentFromFile(f);

    const mine = await Mine.findByIdAndUpdate(
      req.params.id,
      { $push: { attachments: attachment } },
      { new: true }
    ).populate('owner', 'firstName lastName email role');

    if (!mine) {
      try { fs.unlinkSync(f.path); } catch (_) {}
      return res.status(404).json({ message: 'Mine not found' });
    }

    res.json(mine);
  } catch (err) {
    for (const f of allFiles) { try { fs.unlinkSync(f.path); } catch (_) {} }
    res.status(500).json({ message: err.message });
  }
});

// ------------------------ Add media to a mine ------------------------
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

    if (!mine) return res.status(404).json({ message: 'Mine not found' });
    res.json(mine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ------------------------ Get mines by owner ------------------------
router.get('/owner/:ownerId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.ownerId)) {
      return res.status(400).json({ message: 'Invalid owner ID format' });
    }
    
    const mines = await Mine.find({ owner: req.params.ownerId }).populate('owner', 'firstName lastName email role');
    res.json(mines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ------------------------ Search mines by name or location ------------------------
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