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

// File type validation for images AND PDFs
const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf'
};

// Multer configuration for memory storage
const storage = multer.memoryStorage();

// Create upload middleware that accepts any field name
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!FILE_TYPE_MAP[file.mimetype]) {
      return cb(new Error(`Invalid file type. Allowed types: images (png, jpeg, jpg, gif, webp) and PDFs. Received: ${file.mimetype}`), false);
    }
    cb(null, true);
  },
});

// Use .any() to accept any field name
const uploadAny = upload.any();

// Helper function to create file path in GitHub repo
const createFilePath = (fileName, type = 'mineral-files') => `public/${type}/${fileName}`;

// Helper function to upload file to GitHub
const uploadFileToGitHub = async (file, fileName, type = 'mineral-files') => {
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
    
    return `https://raw.githubusercontent.com/${owner}/${repo}/${process.env.GITHUB_BRANCH || 'main'}/${filePath}`;
  } catch (error) {
    console.error('Error uploading file to GitHub:', error);
    throw new Error('Failed to upload file to GitHub');
  }
};

// Helper function to delete file from GitHub
const deleteFileFromGitHub = async (fileUrl) => {
  try {
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const urlParts = fileUrl.split('/');
    const branch = process.env.GITHUB_BRANCH || 'main';
    const pathIndex = urlParts.indexOf(branch) + 1;
    
    if (pathIndex > 0 && pathIndex < urlParts.length) {
      const filePath = urlParts.slice(pathIndex).join('/');
      
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch
      });
      
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
  }
};

// Helper function to clean up uploaded files on error
const cleanupUploadedFiles = async (files) => {
  if (!files || files.length === 0) return;
  
  try {
    for (const file of files) {
      if (file.githubUrl) {
        await deleteFileFromGitHub(file.githubUrl).catch(console.error);
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

// Helper function to transform request body to mineral format
const transformToMineralFormat = (body) => {
  // If the data is already in mineral format with chemicalFormula, use it directly
  if (body.chemicalFormula) {
    return {
      name: body.name,
      mineralType: body.mineralType,
      chemicalFormula: body.chemicalFormula,
      description: body.description,
      pricePerTonne: Number(body.pricePerTonne),
      availableTonnes: Number(body.availableTonnes),
      color: body.color,
      createdBy: body.createdBy,
      hardness: body.hardness ? Number(body.hardness) : undefined,
      density: body.density ? Number(body.density) : undefined,
      luster: body.luster,
      crystalSystem: body.crystalSystem,
      cleavage: body.cleavage,
      fracture: body.fracture,
      streak: body.streak,
      transparency: body.transparency,
      rarity: body.rarity,
      miningMethod: body.miningMethod,
      uses: body.uses ? (Array.isArray(body.uses) ? body.uses : body.uses.split(',').map(u => u.trim())) : [],
      isRadioactive: body.isRadioactive === 'true',
      mohsHardness: body.mohsHardness ? Number(body.mohsHardness) : undefined,
      specificGravity: body.specificGravity ? Number(body.specificGravity) : undefined,
      mineLocation: {
        type: 'Point',
        coordinates: body.coordinates ? JSON.parse(body.coordinates) : [0, 0],
        address: body.address || '',
        country: body.country || ''
      }
    };
  }
  
  // Transform from the format you're sending (commodity-like format)
  let commoditySpecs = {};
  let quantity = {};
  let pricing = {};
  
  try {
    commoditySpecs = body.commoditySpecs ? JSON.parse(body.commoditySpecs) : {};
    quantity = body.quantity ? JSON.parse(body.quantity) : {};
    pricing = body.pricing ? JSON.parse(body.pricing) : {};
  } catch (e) {
    console.error('Error parsing JSON fields:', e);
  }
  
  return {
    name: body.name || commoditySpecs.commodityType || 'Unnamed Mineral',
    mineralType: body.mineralType || 'metallic',
    chemicalFormula: commoditySpecs.chemicalComposition || 'Not specified',
    description: body.description || `Mineral: ${commoditySpecs.commodityType || 'Unknown'}`,
    pricePerTonne: pricing.pricePerUnit || 0,
    availableTonnes: quantity.maxOrder || 0,
    color: 'Not specified',
    createdBy: body.createdBy || body.userId,
    uses: [],
    mineLocation: {
      type: 'Point',
      coordinates: [0, 0],
      address: '',
      country: ''
    }
  };
};

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
    let query = Mineral.find().populate('createdBy', 'firstName lastName email role');
    query = filterQuery(query, req.query);
    query = sortQuery(query, req.query.sort);
    query = limitFields(query, req.query.fields);
    query = paginate(query, req.query.page, req.query.limit);

    const minerals = await query;
	console.log(minerals)
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

// Create a new mineral with file uploads (images and PDFs)
router.post('/', protect, restrictTo('admin', 'mineral-manager'), uploadAny, async (req, res) => {
  console.log('Request body:', req.body);
  console.log('Request files:', req.files);
  
  try {
    // Transform the request body to mineral format
    const transformedData = transformToMineralFormat(req.body);
    
    // Validate required fields
    if (!transformedData.name || !transformedData.createdBy) {
      if (req.files && req.files.length > 0) {
        await cleanupUploadedFiles(req.files);
      }
      return res.status(400).json({ 
        status: 'fail',
        message: 'Missing required fields: name and createdBy are required' 
      });
    }

    // Verify createdBy user exists
    const User = mongoose.model('User');
    const userExists = await User.exists({ _id: transformedData.createdBy });
    if (!userExists) {
      if (req.files && req.files.length > 0) {
        await cleanupUploadedFiles(req.files);
      }
      return res.status(400).json({ message: 'CreatedBy user does not exist' });
    }

    // Prepare mineral data
    const mineralData = {
      ...transformedData,
      images: [],
      documents: []
    };

    // Process uploaded files (images and PDFs)
    if (req.files && req.files.length > 0) {
      const imagePromises = [];
      const documentPromises = [];

      for (let index = 0; index < req.files.length; index++) {
        const file = req.files[index];
        const isPDF = file.mimetype === 'application/pdf';
        
        if (!FILE_TYPE_MAP[file.mimetype]) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }
        
        const fileExtension = FILE_TYPE_MAP[file.mimetype];
        const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
        const type = isPDF ? 'mineral-documents' : 'mineral-images';
        const githubUrl = await uploadFileToGitHub(file, fileName, type);
        
        // Store GitHub URL for cleanup if needed
        file.githubUrl = githubUrl;
        
        if (isPDF) {
          // Handle PDF documents
          documentPromises.push({
            url: githubUrl,
            filename: fileName,
            originalName: file.originalname,
            caption: req.body[`doc_caption_${index}`] || file.originalname,
            size: file.size,
            mimetype: file.mimetype
          });
        } else {
          // Handle images
          imagePromises.push({
            url: githubUrl,
            caption: req.body[`img_caption_${index}`] || file.originalname,
            isPrimary: index === 0 // First image is primary by default
          });
        }
      }

      mineralData.images = await Promise.all(imagePromises);
      mineralData.documents = await Promise.all(documentPromises);
    }

    const mineral = new Mineral(mineralData);
    await mineral.save();
    
    res.status(201).json({
      status: 'success',
      data: { mineral }
    });
  } catch (err) {
    console.error('Error creating mineral:', err);
    if (req.files && req.files.length > 0) {
      await cleanupUploadedFiles(req.files);
    }
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
router.patch('/:id', protect, restrictTo('admin', 'mineral-manager'), validateObjectId, uploadAny, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Convert numeric fields if they exist
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
    if (updateData.uses && typeof updateData.uses === 'string') {
      updateData.uses = updateData.uses.split(',').map(use => use.trim());
    }

    // Process new files if any
    if (req.files && req.files.length > 0) {
      const imagePromises = [];
      const documentPromises = [];

      for (let index = 0; index < req.files.length; index++) {
        const file = req.files[index];
        const isPDF = file.mimetype === 'application/pdf';
        
        if (!FILE_TYPE_MAP[file.mimetype]) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }
        
        const fileExtension = FILE_TYPE_MAP[file.mimetype];
        const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
        const type = isPDF ? 'mineral-documents' : 'mineral-images';
        const githubUrl = await uploadFileToGitHub(file, fileName, type);
        
        file.githubUrl = githubUrl;
        
        if (isPDF) {
          documentPromises.push({
            url: githubUrl,
            filename: fileName,
            originalName: file.originalname,
            caption: req.body[`doc_caption_${index}`] || file.originalname,
            size: file.size,
            mimetype: file.mimetype
          });
        } else {
          imagePromises.push({
            url: githubUrl,
            caption: req.body[`img_caption_${index}`] || file.originalname,
            isPrimary: false
          });
        }
      }

      const newImages = await Promise.all(imagePromises);
      const newDocuments = await Promise.all(documentPromises);
      
      if (newImages.length > 0) {
        updateData.$push = updateData.$push || {};
        updateData.$push.images = { $each: newImages };
      }
      if (newDocuments.length > 0) {
        updateData.$push = updateData.$push || {};
        updateData.$push.documents = { $each: newDocuments };
      }
    }

    const mineral = await Mineral.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!mineral) {
      if (req.files && req.files.length > 0) {
        await cleanupUploadedFiles(req.files);
      }
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
    if (req.files && req.files.length > 0) {
      await cleanupUploadedFiles(req.files);
    }
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

    // Delete associated images and documents from GitHub
    const deletePromises = [];
    
    if (mineral.images && mineral.images.length > 0) {
      deletePromises.push(...mineral.images.map(image => deleteFileFromGitHub(image.url)));
    }
    
    if (mineral.documents && mineral.documents.length > 0) {
      deletePromises.push(...mineral.documents.map(doc => deleteFileFromGitHub(doc.url)));
    }
    
    await Promise.all(deletePromises);
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
