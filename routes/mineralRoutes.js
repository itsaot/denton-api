const express = require('express');
const router = express.Router();
const Mineral = require('../models/Mineral');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const multer = require('multer');
const { Octokit } = require("@octokit/rest");
require('dotenv').config();

// GitHub configuration
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// File type validation for images
const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

// Multer configuration for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
  fileFilter: (req, file, cb) => {
    if (!FILE_TYPE_MAP[file.mimetype]) {
      return cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
    cb(null, true);
  },
});

// Create a new mineral with image uploads - Updated to handle both 'images' and 'image' field names
const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 10 }
]);

// Helper function to create file path in GitHub repo
const createFilePath = (fileName, type = 'mineral-images') => `public/${type}/${fileName}`;

// Helper function to upload file to GitHub
const uploadFileToGitHub = async (file, fileName, type = 'mineral-images') => {
  try {
    const filePath = createFilePath(fileName, type);
    const content = file.buffer.toString('base64');
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Upload ${fileName}`,
      content,
      branch: process.env.GITHUB_BRANCH || 'main'
    });
    
    // Return the raw GitHub URL
    return `https://raw.githubusercontent.com/${owner}/${repo}/${process.env.GITHUB_BRANCH || 'main'}/${filePath}`;
  } catch (error) {
    console.error('Error uploading file to GitHub:', error);
    throw new Error('Failed to upload file to GitHub');
  }
};

// Helper function to delete file from GitHub
const deleteFileFromGitHub = async (fileUrl) => {
  try {
    // Extract path from GitHub URL
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const urlParts = fileUrl.split('/');
    const branch = process.env.GITHUB_BRANCH || 'main';
    const pathIndex = urlParts.indexOf(branch) + 1;
    
    if (pathIndex > 0 && pathIndex < urlParts.length) {
      const filePath = urlParts.slice(pathIndex).join('/');
      
      // Get the file's SHA (required for deletion)
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch
      });
      
      // Delete the file
      await octokit.repos.deleteFile({
        owner,
        repo,
        path: filePath,
        message: `Delete ${filePath.split('/').pop()}`,
        sha: fileData.sha,
        branch
      });
    }
  } catch (error) {
    console.error('Error deleting file from GitHub:', error);
    // Don't throw, just log the error
  }
};

// Helper function to clean up uploaded files on error
const cleanupUploadedFiles = async (files) => {
  if (!files) return;
  
  try {
    if (files.images) {
      for (const file of files.images) {
        if (file.githubUrl) {
          await deleteFileFromGitHub(file.githubUrl).catch(console.error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
};

// Middleware for validating ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  next();
};

// Helper functions for filtering, sorting, etc.
const filterQuery = (query, filter) => {
  const queryObj = { ...filter };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach((el) => delete queryObj[el]);

  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  return query.find(JSON.parse(queryStr));
};

const sortQuery = (query, sort) => {
  if (sort) {
    const sortBy = sort.split(',').join(' ');
    return query.sort(sortBy);
  }
  return query.sort('-createdAt');
};

const limitFields = (query, fields) => {
  if (fields) {
    const selected = fields.split(',').join(' ');
    return query.select(selected);
  }
  return query.select('-__v');
};

const paginate = (query, page, limit) => {
  const pageNum = page * 1 || 1;
  const limitNum = limit * 1 || 100;
  const skip = (pageNum - 1) * limitNum;
  return query.skip(skip).limit(limitNum);
};

// Validation middleware for mineral creation
const validateCreateMineral = [
  check('name').notEmpty().withMessage('Mineral name is required'),
  check('mineralType').isIn(['metallic', 'non-metallic', 'precious', 'industrial', 'energy', 'gemstone']).withMessage('Invalid mineral type'),
  check('chemicalFormula').notEmpty().withMessage('Chemical formula is required'),
  check('description').notEmpty().withMessage('Description is required'),
  check('pricePerTonne').isNumeric().withMessage('Price per tonne must be a number'),
  check('availableTonnes').isNumeric().withMessage('Available tonnes must be a number'),
  check('color').notEmpty().withMessage('Color description is required'),
  check('mineLocation.coordinates').isArray().withMessage('Coordinates must be an array'),
  check('createdBy').notEmpty().withMessage('CreatedBy user ID is required')
];

// Validation middleware for mineral update
const validateUpdateMineral = [
  check('name').optional().notEmpty().withMessage('Mineral name cannot be empty'),
  check('mineralType').optional().isIn(['metallic', 'non-metallic', 'precious', 'industrial', 'energy', 'gemstone']).withMessage('Invalid mineral type'),
  check('pricePerTonne').optional().isNumeric().withMessage('Price per tonne must be a number'),
  check('availableTonnes').optional().isNumeric().withMessage('Available tonnes must be a number'),
  check('hardness').optional().isInt({ min: 1, max: 10 }).withMessage('Hardness must be between 1 and 10'),
  check('mohsHardness').optional().isInt({ min: 1, max: 10 }).withMessage('Mohs hardness must be between 1 and 10')
];

// Stats route
router.get('/stats', async (req, res) => {
  try {
    const stats = await Mineral.aggregate([
      {
        $group: {
          _id: '$mineralType',
          numMinerals: { $sum: 1 },
          avgPrice: { $avg: '$pricePerTonne' },
          minPrice: { $min: '$pricePerTonne' },
          maxPrice: { $max: '$pricePerTonne' },
          totalQuantity: { $sum: '$availableTonnes' },
        },
      },
      {
        $sort: { avgPrice: 1 },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: { stats },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
});

// Minerals within radius route
router.get('/minerals-within/:distance/center/:latlng/unit/:unit', async (req, res) => {
  try {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide latitude and longitude in the format lat,lng.',
      });
    }

    const minerals = await Mineral.find({
      mineLocation: {
        $geoWithin: { $centerSphere: [[parseFloat(lng), parseFloat(lat)], radius] },
      },
    });

    res.status(200).json({
      status: 'success',
      results: minerals.length,
      data: { data: minerals },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
});

// Get all minerals with filtering
router.get('/', async (req, res) => {
  try {
    let query = Mineral.find();
    query = filterQuery(query, req.query);
    query = sortQuery(query, req.query.sort);
    query = limitFields(query, req.query.fields);
    query = paginate(query, req.query.page, req.query.limit);

    const minerals = await query;

    res.status(200).json({
      status: 'success',
      results: minerals.length,
      data: { minerals },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
});

// Create a new mineral with image uploads
router.post('/', protect, restrictTo('admin', 'mineral-manager'), upload.array('images', 10), validateCreateMineral, async (req, res) => {
  console.log('Request body:', req.body);
  console.log('Request files:', req.files);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Verify createdBy user exists
    const userExists = await mongoose.model('User').exists({ _id: req.body.createdBy });
    if (!userExists) {
      return res.status(400).json({ message: 'CreatedBy user does not exist' });
    }

    // Prepare mineral data
    const mineralData = {
      ...req.body,
      pricePerTonne: Number(req.body.pricePerTonne),
      availableTonnes: Number(req.body.availableTonnes),
      hardness: req.body.hardness ? Number(req.body.hardness) : undefined,
      density: req.body.density ? Number(req.body.density) : undefined,
      mohsHardness: req.body.mohsHardness ? Number(req.body.mohsHardness) : undefined,
      specificGravity: req.body.specificGravity ? Number(req.body.specificGravity) : undefined,
      mineLocation: {
        type: 'Point',
        coordinates: JSON.parse(req.body.coordinates || req.body.mineLocation?.coordinates),
        address: req.body.address,
        country: req.body.country
      },
      uses: req.body.uses ? req.body.uses.split(',').map(use => use.trim()) : [],
      images: []
    };

    // Process uploaded images
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map(async (file, index) => {
        if (!FILE_TYPE_MAP[file.mimetype]) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }
        
        const fileExtension = FILE_TYPE_MAP[file.mimetype];
        const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
        const githubUrl = await uploadFileToGitHub(file, fileName, 'mineral-images');
        
        return {
          url: githubUrl,
          caption: req.body[`caption_${index}`] || file.originalname,
          isPrimary: index === 0 // First image is primary by default
        };
      });

      mineralData.images = await Promise.all(imagePromises);
    }

    const mineral = new Mineral(mineralData);
    await mineral.save();
    
    res.status(201).json({
      status: 'success',
      data: { mineral }
    });
  } catch (err) {
    await cleanupUploadedFiles(req.files);
    res.status(500).json({ 
      status: 'fail',
      message: err.message 
    });
  }
});

// Get a single mineral by ID
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const mineral = await Mineral.findById(req.params.id);
    
    if (!mineral) {
      return res.status(404).json({
        status: 'fail',
        message: 'No mineral found with that ID',
      });
    }

    res.status(200).json({
      status: 'success',
      data: { mineral },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
});

// Update a mineral
router.patch('/:id', protect, restrictTo('admin', 'mineral-manager'), validateObjectId, upload.array('images', 10), validateUpdateMineral, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updateData = { ...req.body };
    
    // Convert numeric fields
    if (updateData.pricePerTonne) updateData.pricePerTonne = Number(updateData.pricePerTonne);
    if (updateData.availableTonnes) updateData.availableTonnes = Number(updateData.availableTonnes);
    if (updateData.hardness) updateData.hardness = Number(updateData.hardness);
    if (updateData.density) updateData.density = Number(updateData.density);
    if (updateData.mohsHardness) updateData.mohsHardness = Number(updateData.mohsHardness);
    if (updateData.specificGravity) updateData.specificGravity = Number(updateData.specificGravity);
    
    // Handle mineLocation update
    if (updateData.coordinates || updateData.address || updateData.country) {
      updateData.mineLocation = {
        type: 'Point',
        coordinates: updateData.coordinates ? JSON.parse(updateData.coordinates) : undefined,
        address: updateData.address,
        country: updateData.country
      };
      delete updateData.coordinates;
      delete updateData.address;
      delete updateData.country;
    }
    
    // Handle uses array
    if (updateData.uses) {
      updateData.uses = updateData.uses.split(',').map(use => use.trim());
    }

    // Process new images if any
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map(async (file, index) => {
        if (!FILE_TYPE_MAP[file.mimetype]) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }
        
        const fileExtension = FILE_TYPE_MAP[file.mimetype];
        const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
        const githubUrl = await uploadFileToGitHub(file, fileName, 'mineral-images');
        
        return {
          url: githubUrl,
          caption: req.body[`caption_${index}`] || file.originalname,
          isPrimary: false
        };
      });

      const newImages = await Promise.all(imagePromises);
      updateData.$push = { images: { $each: newImages } };
    }

    const mineral = await Mineral.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!mineral) {
      await cleanupUploadedFiles(req.files);
      return res.status(404).json({
        status: 'fail',
        message: 'No mineral found with that ID',
      });
    }

    res.status(200).json({
      status: 'success',
      data: { mineral },
    });
  } catch (err) {
    await cleanupUploadedFiles(req.files);
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
});

// Delete a mineral
router.delete('/:id', protect, restrictTo('admin'), validateObjectId, async (req, res) => {
  try {
    const mineral = await Mineral.findById(req.params.id);
    
    if (!mineral) {
      return res.status(404).json({
        status: 'fail',
        message: 'No mineral found with that ID',
      });
    }

    // Delete associated images from GitHub
    const imageDeletePromises = mineral.images.map(image => deleteFileFromGitHub(image.url));
    await Promise.all(imageDeletePromises);
    
    await Mineral.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
});

// Add images to a mineral
router.patch('/:id/images', protect, restrictTo('admin', 'mineral-manager'), validateObjectId, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const imagePromises = req.files.map(async (file, index) => {
      if (!FILE_TYPE_MAP[file.mimetype]) {
        throw new Error(`Invalid file type: ${file.mimetype}`);
      }
      
      const fileExtension = FILE_TYPE_MAP[file.mimetype];
      const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
      const githubUrl = await uploadFileToGitHub(file, fileName, 'mineral-images');
      
      return {
        url: githubUrl,
        caption: req.body[`caption_${index}`] || file.originalname,
        isPrimary: false
      };
    });

    const newImages = await Promise.all(imagePromises);

    const mineral = await Mineral.findByIdAndUpdate(
      req.params.id,
      { $push: { images: { $each: newImages } } },
      { new: true }
    );

    if (!mineral) {
      await cleanupUploadedFiles({ images: req.files.map((file, index) => ({ githubUrl: newImages[index].url })) });
      return res.status(404).json({ message: 'Mineral not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { mineral }
    });
  } catch (err) {
    await cleanupUploadedFiles({ images: req.files });
    res.status(500).json({ message: err.message });
  }
});

// Remove an image from a mineral
router.delete('/:id/images/:imageId', protect, restrictTo('admin', 'mineral-manager'), validateObjectId, async (req, res) => {
  try {
    const mineral = await Mineral.findById(req.params.id);
    if (!mineral) {
      return res.status(404).json({ message: 'Mineral not found' });
    }

    const image = mineral.images.id(req.params.imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete file from GitHub
    await deleteFileFromGitHub(image.url);

    // Remove from array
    mineral.images.pull(req.params.imageId);
    await mineral.save();

    res.status(200).json({
      status: 'success',
      message: 'Image deleted successfully',
      data: { mineral }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Set primary image
router.patch('/:id/images/:imageId/primary', protect, restrictTo('admin', 'mineral-manager'), validateObjectId, async (req, res) => {
  try {
    const mineral = await Mineral.findById(req.params.id);
    if (!mineral) {
      return res.status(404).json({ message: 'Mineral not found' });
    }

    const image = mineral.images.id(req.params.imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Set all images to non-primary
    mineral.images.forEach(img => {
      img.isPrimary = false;
    });
    
    // Set the selected image as primary
    image.isPrimary = true;
    
    await mineral.save();

    res.status(200).json({
      status: 'success',
      data: { mineral }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get minerals by type
router.get('/type/:mineralType', async (req, res) => {
  try {
    const minerals = await Mineral.find({ mineralType: req.params.mineralType });
    res.status(200).json({
      status: 'success',
      results: minerals.length,
      data: { minerals }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search minerals by name or description
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const minerals = await Mineral.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { color: { $regex: query, $options: 'i' } }
      ]
    });
    
    res.status(200).json({
      status: 'success',
      results: minerals.length,
      data: { minerals }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;