const express = require('express');
const router = express.Router();
const YellowMachine = require('../models/YellowMachine');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const multer = require('multer');
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

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

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!FILE_TYPE_MAP[file.mimetype]) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});

const createFilePath = (fileName, type = 'uploads') => `public/${type}/${fileName}`;

const uploadFileToGitHub = async (file, fileName, type = 'uploads') => {
  const filePath = createFilePath(fileName, type);
  const content = file.buffer.toString('base64');
  const [owner, repo] = process.env.GITHUB_REPO.split('/');

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `Upload ${fileName}`,
    content,
    branch: process.env.GITHUB_BRANCH || 'main'
  });

  return `https://raw.githubusercontent.com/${owner}/${repo}/${process.env.GITHUB_BRANCH || 'main'}/${filePath}`;
};

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

const cleanupUploadedFiles = async (files) => {
  if (!files) return;

  const fileUrls = [];
  if (files.documents) {
    fileUrls.push(...files.documents.map((file) => file.githubUrl || file.path).filter(Boolean));
  }
  if (files.media) {
    fileUrls.push(...files.media.map((file) => file.githubUrl || file.path).filter(Boolean));
  }

  for (const fileUrl of fileUrls) {
    if (fileUrl) {
      await deleteFileFromGitHub(fileUrl).catch(console.error);
    }
  }
};

const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  next();
};

const parseIdList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [String(value)];
  } catch {
    return String(value).split(',').map((s) => s.trim()).filter(Boolean);
  }
};

const parseJsonField = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const buildDocumentEntry = async (file) => {
  const fileExtension = FILE_TYPE_MAP[file.mimetype];
  const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExtension}`;
  const githubUrl = await uploadFileToGitHub(file, fileName, 'yellow-machine-documents');
  return {
    filename: fileName,
    originalName: file.originalname,
    path: githubUrl,
    mimetype: file.mimetype,
    size: file.size
  };
};

const buildMediaEntry = async (file) => {
  const fileExtension = FILE_TYPE_MAP[file.mimetype];
  const fileName = `${file.originalname.split(' ').join('-')}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExtension}`;
  const githubUrl = await uploadFileToGitHub(file, fileName, 'yellow-machine-media');
  return {
    filename: fileName,
    originalName: file.originalname,
    path: githubUrl,
    mimetype: file.mimetype,
    size: file.size
  };
};

const validateCreateYellowMachine = [
  check('owner').notEmpty().withMessage('Owner ID is required'),
  check('name').notEmpty().withMessage('Machine name is required'),
  check('establishmentFee').isNumeric().withMessage('Establishment fee must be a number'),
  check('brand').notEmpty().withMessage('Brand is required'),
  check('age').optional().isNumeric().withMessage('Age must be a number'),
  check('mileage').optional().isNumeric().withMessage('Mileage must be a number'),
  check('forSale').optional().isBoolean().withMessage('forSale must be a boolean')
];

const validateUpdateYellowMachine = [
  check('name').optional().notEmpty().withMessage('Machine name cannot be empty'),
  check('establishmentFee').optional().isNumeric().withMessage('Establishment fee must be a number'),
  check('brand').optional().notEmpty().withMessage('Brand cannot be empty'),
  check('age').optional().isNumeric().withMessage('Age must be a number'),
  check('mileage').optional().isNumeric().withMessage('Mileage must be a number'),
  check('forSale').optional().isBoolean().withMessage('forSale must be a boolean')
];

const parseMachineBody = (body) => {
  const data = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.brand !== undefined) data.brand = body.brand;
  if (body.description !== undefined) data.description = body.description;
  if (body.establishmentFee !== undefined) data.establishmentFee = Number(body.establishmentFee);
  if (body.age !== undefined) data.age = Number(body.age);
  if (body.mileage !== undefined) data.mileage = Number(body.mileage);
  if (body.forSale !== undefined) {
    data.forSale = body.forSale === 'true' || body.forSale === true;
  }
  if (body.rates !== undefined) {
    data.rates = parseJsonField(body.rates);
  }

  if (body.rental !== undefined || body.rentalAvailable !== undefined || body.rentalDuration !== undefined) {
    const rental = parseJsonField(body.rental, {});
    if (body.rentalAvailable !== undefined) {
      rental.available = body.rentalAvailable === 'true' || body.rentalAvailable === true;
    }
    if (body.rentalDuration !== undefined) {
      rental.duration = body.rentalDuration;
    }
    data.rental = rental;
  }

  return data;
};

router.post('/', upload.fields([
  { name: 'documents', maxCount: 10 },
  { name: 'media', maxCount: 10 }
]), validateCreateYellowMachine, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const ownerExists = await mongoose.model('User').exists({ _id: req.body.owner });
    if (!ownerExists) {
      return res.status(400).json({ message: 'Owner user does not exist' });
    }

    const machineData = {
      owner: req.body.owner,
      ...parseMachineBody(req.body),
      documents: [],
      media: []
    };

    if (req.files && req.files.documents) {
      machineData.documents = await Promise.all(req.files.documents.map(buildDocumentEntry));
    }

    if (req.files && req.files.media) {
      machineData.media = await Promise.all(req.files.media.map(buildMediaEntry));
    }

    const machine = new YellowMachine(machineData);
    await machine.save();
    res.status(201).json(machine);
  } catch (err) {
    await cleanupUploadedFiles(req.files);
    res.status(500).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { owner, brand, forSale, rentalAvailable, minEstablishmentFee, maxEstablishmentFee } = req.query;
    const filter = {};

    if (owner) filter.owner = owner;
    if (brand) filter.brand = brand;
    if (forSale !== undefined) filter.forSale = forSale === 'true';
    if (rentalAvailable !== undefined) filter['rental.available'] = rentalAvailable === 'true';

    if (minEstablishmentFee || maxEstablishmentFee) {
      filter.establishmentFee = {};
      if (minEstablishmentFee) filter.establishmentFee.$gte = Number(minEstablishmentFee);
      if (maxEstablishmentFee) filter.establishmentFee.$lte = Number(maxEstablishmentFee);
    }

    const machines = await YellowMachine.find(filter).populate('owner', 'firstName lastName email role');
    res.json(machines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const machine = await YellowMachine.findById(req.params.id).populate('owner', 'firstName lastName email role');
    if (!machine) {
      return res.status(404).json({ message: 'Yellow machine not found' });
    }
    res.json(machine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', validateObjectId, upload.fields([
  { name: 'documents', maxCount: 10 },
  { name: 'media', maxCount: 10 }
]), validateUpdateYellowMachine, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const machine = await YellowMachine.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ message: 'Yellow machine not found' });
    }

    for (const docId of parseIdList(req.body.deleteDocumentIds)) {
      const document = machine.documents.id(docId);
      if (document) {
        await deleteFileFromGitHub(document.path);
        machine.documents.pull(docId);
      }
    }

    for (const mediaId of parseIdList(req.body.deleteMediaIds)) {
      const mediaItem = machine.media.id(mediaId);
      if (mediaItem) {
        await deleteFileFromGitHub(mediaItem.path);
        machine.media.pull(mediaId);
      }
    }

    const parsed = parseMachineBody(req.body);
    Object.keys(parsed).forEach((key) => {
      if (parsed[key] !== undefined) {
        machine[key] = parsed[key];
      }
    });

    if (req.files && req.files.documents) {
      const newDocuments = await Promise.all(req.files.documents.map(buildDocumentEntry));
      machine.documents.push(...newDocuments);
    }

    if (req.files && req.files.media) {
      const newMedia = await Promise.all(req.files.media.map(buildMediaEntry));
      machine.media.push(...newMedia);
    }

    await machine.save();
    await machine.populate('owner', 'firstName lastName email role');
    res.json(machine);
  } catch (err) {
    await cleanupUploadedFiles(req.files);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', validateObjectId, async (req, res) => {
  try {
    const machine = await YellowMachine.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ message: 'Yellow machine not found' });
    }

    await Promise.all([
      ...machine.documents.map((doc) => deleteFileFromGitHub(doc.path)),
      ...machine.media.map((media) => deleteFileFromGitHub(media.path))
    ]);

    await YellowMachine.findByIdAndDelete(req.params.id);
    res.json({ message: 'Yellow machine deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/documents', validateObjectId, upload.array('documents', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No documents provided' });
    }

    const newDocuments = await Promise.all(req.files.map(buildDocumentEntry));
    const machine = await YellowMachine.findByIdAndUpdate(
      req.params.id,
      { $push: { documents: { $each: newDocuments } } },
      { new: true }
    );

    if (!machine) {
      await Promise.all(newDocuments.map((doc) => deleteFileFromGitHub(doc.path)));
      return res.status(404).json({ message: 'Yellow machine not found' });
    }

    res.json(machine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/media', validateObjectId, upload.array('media', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No media files provided' });
    }

    const newMedia = await Promise.all(req.files.map(buildMediaEntry));
    const machine = await YellowMachine.findByIdAndUpdate(
      req.params.id,
      { $push: { media: { $each: newMedia } } },
      { new: true }
    );

    if (!machine) {
      await Promise.all(newMedia.map((item) => deleteFileFromGitHub(item.path)));
      return res.status(404).json({ message: 'Yellow machine not found' });
    }

    res.json(machine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/documents/:docId', validateObjectId, async (req, res) => {
  try {
    const machine = await YellowMachine.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ message: 'Yellow machine not found' });
    }

    const document = machine.documents.id(req.params.docId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await deleteFileFromGitHub(document.path);
    machine.documents.pull(req.params.docId);
    await machine.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/media/:mediaId', validateObjectId, async (req, res) => {
  try {
    const machine = await YellowMachine.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ message: 'Yellow machine not found' });
    }

    const mediaItem = machine.media.id(req.params.mediaId);
    if (!mediaItem) {
      return res.status(404).json({ message: 'Media not found' });
    }

    await deleteFileFromGitHub(mediaItem.path);
    machine.media.pull(req.params.mediaId);
    await machine.save();

    res.json({ message: 'Media deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/owner/:ownerId', validateObjectId, async (req, res) => {
  try {
    const machines = await YellowMachine.find({ owner: req.params.ownerId }).populate('owner', 'firstName lastName email role');
    res.json(machines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const machines = await YellowMachine.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }).populate('owner', 'firstName lastName email role');

    res.json(machines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
