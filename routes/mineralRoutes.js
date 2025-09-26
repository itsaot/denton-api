const express = require('express');
const mineralController = require('../controllers/mineralController');
const authController = require('../controllers/authController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// ------------------------ Multer setup for minerals ------------------------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'mineral-docs');
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

// Flexible upload middleware
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

// Routes
router
  .route('/')
  .get(mineralController.getAllMinerals)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'mineral-manager'),
    flexibleUpload, // Add this middleware for file uploads
    mineralController.createMineral
  );

router
  .route('/:id')
  .get(mineralController.getMineral)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'mineral-manager'),
    mineralController.updateMineral
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    mineralController.deleteMineral
  );

// New file upload routes
router
  .route('/:id/attachment')
  .post(
    authController.protect,
    authController.restrictTo('admin', 'mineral-manager'),
    flexibleUpload,
    mineralController.uploadMineralDocument
  );

router
  .route('/:id/attachments')
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'mineral-manager'),
    mineralController.addMineralAttachments
  );

// Existing routes
router.route('/stats').get(mineralController.getMineralStats);
router.route('/minerals-within/:distance/center/:latlng/unit/:unit').get(mineralController.getMineralsWithin);

module.exports = router;