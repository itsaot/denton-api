const express = require('express');
const router = express.Router();
const Mine = require('../models/Mine');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const multer = require('multer');
const { Octokit } = require("@octokit/rest");
require('dotenv').config();

// GitHub configuration
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// File type validation
const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt'
};

// Multer configuration for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
  fileFilter: (req, file, cb) => {
    if (!FILE_TYPE_MAP[file.mimetype]) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  },
});

// Helper function to create file path in GitHub repo
const createFilePath = (fileName, type = 'uploads') => `public/${type}/${fileName}`;

// Helper function to upload file to GitHub
const uploadFileToGitHub = async (file, fileName, type = 'uploads') => {
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
    const fileUrls = [];
    
    if (files.documents) {
      fileUrls.push(...files.documents.map(file => file.githubUrl));
    }
    if (files.media) {
      fileUrls.push(...files.media.map(file => file.githubUrl));
    }
    if (files.file) {
      fileUrls.push(files.file.githubUrl);
    }
    
    for (const fileUrl of fileUrls) {
      if (fileUrl) {
        await deleteFileFromGitHub(fileUrl).catch(console.error);
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

// Create a new mine with file uploads
router.post('/', upload.fields([
  { name: 'documents', maxCount: 10 },
  { name: 'media', maxCount: 10 }
]), validateCreateMine, async (req, res) => {
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Files:', req.files);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Verify owner exists
    const ownerExists = await mongoose.model('User').exists({ _id: req.body.owner });
    if (!ownerExists) {
      return res.status(400).json({ message: 'Owner user does not exist' });
    }

    // Prepare mine data
    const mineData = {
      ...req.body,
      price: Number(req.body.price)
    };

    // Process uploaded documents
    if (req.files && req.files.documents) {
      const documentPromises = req.files.documents.map(async (file) => {
        if (!FILE_TYPE_MAP[file.mimetype]) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }
        
        const fileExtension = FILE_TYPE_MAP[file.mimetype];
        const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
        const githubUrl = await uploadFileToGitHub(file, fileName, 'documents');
        
        return {
          filename: fileName,
          originalName: file.originalname,
          path: githubUrl, // Store GitHub URL instead of local path
          mimetype: file.mimetype,
          size: file.size
        };
      });

      mineData.documents = await Promise.all(documentPromises);
    }

    // Process uploaded media
    if (req.files && req.files.media) {
      const mediaPromises = req.files.media.map(async (file) => {
        if (!FILE_TYPE_MAP[file.mimetype]) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }
        
        const fileExtension = FILE_TYPE_MAP[file.mimetype];
        const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
        const githubUrl = await uploadFileToGitHub(file, fileName, 'media');
        
        return {
          filename: fileName,
          originalName: file.originalname,
          path: githubUrl, // Store GitHub URL instead of local path
          mimetype: file.mimetype,
          size: file.size
        };
      });

      mineData.media = await Promise.all(mediaPromises);
    }

    const mine = new Mine(mineData);
    await mine.save();
    res.status(201).json(mine);
  } catch (err) {
    await cleanupUploadedFiles(req.files);
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
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const mines = await Mine.find(filter).populate('owner', 'firstName lastName email role');
    res.json(mines);
    console.log(mines)
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

// Update a mine with optional file uploads
router.put('/:id', validateObjectId, upload.fields([
  { name: 'documents', maxCount: 10 },
  { name: 'media', maxCount: 10 }
]), validateUpdateMine, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updateData = { ...req.body };
    if (updateData.price) updateData.price = Number(updateData.price);

    // Process new documents if any
    if (req.files && req.files.documents) {
      const documentPromises = req.files.documents.map(async (file) => {
        if (!FILE_TYPE_MAP[file.mimetype]) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }
        
        const fileExtension = FILE_TYPE_MAP[file.mimetype];
        const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
        const githubUrl = await uploadFileToGitHub(file, fileName, 'documents');
        
        return {
          filename: fileName,
          originalName: file.originalname,
          path: githubUrl,
          mimetype: file.mimetype,
          size: file.size
        };
      });

      const newDocuments = await Promise.all(documentPromises);
      updateData.$push = { documents: { $each: newDocuments } };
    }

    // Process new media if any
    if (req.files && req.files.media) {
      const mediaPromises = req.files.media.map(async (file) => {
        if (!FILE_TYPE_MAP[file.mimetype]) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }
        
        const fileExtension = FILE_TYPE_MAP[file.mimetype];
        const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
        const githubUrl = await uploadFileToGitHub(file, fileName, 'media');
        
        return {
          filename: fileName,
          originalName: file.originalname,
          path: githubUrl,
          mimetype: file.mimetype,
          size: file.size
        };
      });

      const newMedia = await Promise.all(mediaPromises);
      updateData.$push = updateData.$push || {};
      updateData.$push.media = { $each: newMedia };
    }

    const mine = await Mine.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email role');

    if (!mine) {
      await cleanupUploadedFiles(req.files);
      return res.status(404).json({ message: 'Mine not found' });
    }

    res.json(mine);
  } catch (err) {
    await cleanupUploadedFiles(req.files);
    res.status(500).json({ message: err.message });
  }
});

// Delete a mine
router.delete('/:id', validateObjectId, async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.id);
    if (!mine) {
      return res.status(404).json({ message: 'Mine not found' });
    }

    // Delete associated files from GitHub
    const fileDeletePromises = [
      ...mine.documents.map(doc => deleteFileFromGitHub(doc.path)),
      ...mine.media.map(media => deleteFileFromGitHub(media.path))
    ];

    await Promise.all(fileDeletePromises);
    await Mine.findByIdAndDelete(req.params.id);

    res.json({ message: 'Mine deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add documents to a mine
router.patch('/:id/documents', validateObjectId, upload.array('documents', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No documents provided' });
    }

    const documentPromises = req.files.map(async (file) => {
      if (!FILE_TYPE_MAP[file.mimetype]) {
        throw new Error(`Invalid file type: ${file.mimetype}`);
      }
      
      const fileExtension = FILE_TYPE_MAP[file.mimetype];
      const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
      const githubUrl = await uploadFileToGitHub(file, fileName, 'documents');
      
      return {
        filename: fileName,
        originalName: file.originalname,
        path: githubUrl,
        mimetype: file.mimetype,
        size: file.size
      };
    });

    const newDocuments = await Promise.all(documentPromises);

    const mine = await Mine.findByIdAndUpdate(
      req.params.id,
      { $push: { documents: { $each: newDocuments } } },
      { new: true }
    );

    if (!mine) {
      // Clean up uploaded files if mine not found
      await cleanupUploadedFiles({ documents: req.files.map((file, index) => ({ githubUrl: newDocuments[index].path })) });
      return res.status(404).json({ message: 'Mine not found' });
    }

    res.json(mine);
  } catch (err) {
    await cleanupUploadedFiles({ documents: req.files });
    res.status(500).json({ message: err.message });
  }
});

// Add media to a mine
router.patch('/:id/media', validateObjectId, upload.array('media', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No media files provided' });
    }

    const mediaPromises = req.files.map(async (file) => {
      if (!FILE_TYPE_MAP[file.mimetype]) {
        throw new Error(`Invalid file type: ${file.mimetype}`);
      }
      
      const fileExtension = FILE_TYPE_MAP[file.mimetype];
      const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
      const githubUrl = await uploadFileToGitHub(file, fileName, 'media');
      
      return {
        filename: fileName,
        originalName: file.originalname,
        path: githubUrl,
        mimetype: file.mimetype,
        size: file.size
      };
    });

    const newMedia = await Promise.all(mediaPromises);

    const mine = await Mine.findByIdAndUpdate(
      req.params.id,
      { $push: { media: { $each: newMedia } } },
      { new: true }
    );

    if (!mine) {
      // Clean up uploaded files if mine not found
      await cleanupUploadedFiles({ media: req.files.map((file, index) => ({ githubUrl: newMedia[index].path })) });
      return res.status(404).json({ message: 'Mine not found' });
    }

    res.json(mine);
  } catch (err) {
    await cleanupUploadedFiles({ media: req.files });
    res.status(500).json({ message: err.message });
  }
});

// Remove a document from a mine
router.delete('/:id/documents/:docId', validateObjectId, async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.id);
    if (!mine) {
      return res.status(404).json({ message: 'Mine not found' });
    }

    const document = mine.documents.id(req.params.docId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from GitHub
    await deleteFileFromGitHub(document.path);

    // Remove from array
    mine.documents.pull(req.params.docId);
    await mine.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove media from a mine
router.delete('/:id/media/:mediaId', validateObjectId, async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.id);
    if (!mine) {
      return res.status(404).json({ message: 'Mine not found' });
    }

    const media = mine.media.id(req.params.mediaId);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    // Delete file from GitHub
    await deleteFileFromGitHub(media.path);

    // Remove from array
    mine.media.pull(req.params.mediaId);
    await mine.save();

    res.json({ message: 'Media deleted successfully' });
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