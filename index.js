const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const mineRoutes = require('./routes/mineRoutes');
const offerRoutes = require('./routes/offerRoutes');
const messageRoutes = require('./routes/messageRoutes');
const mineralRoutes = require('./routes/mineralRoutes');
const yellowMachineRoutes = require('./routes/yellowMachineRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/user');
const { protect } = require('./middleware/authMiddleware');
const uploadMiddleware = require('./middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const {
  corsOptions,
  createHelmetMiddleware,
  authRateLimiter,
  apiRateLimiter,
  assertProductionSecrets,
} = require('./middleware/security');

// Load environment variables first
dotenv.config();
assertProductionSecrets();

// Initialize express app
const app = express();

// Render / reverse-proxy: required for rate limits and secure cookies behind TLS
app.set('trust proxy', 1);

// Connect to database
connectDB();

// Security middleware
app.use(createHelmetMiddleware());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.disable('x-powered-by');
app.use('/api/auth', authRateLimiter);
app.use('/api', apiRateLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : ':method :url :status :res[content-length] - :response-time ms')
);

// Ensure uploads directory exists (for local files if needed)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// OpenAPI JSON (download / point generators at http://localhost:<PORT>/openapi.json)
app.get('/openapi.json', (req, res) => {
  res.type('application/json').send(swaggerSpec);
});

// Swagger documentation (frontend-friendly: persist auth, filter, try-it-out)
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Denton API — Frontend Reference',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
    },
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mines', mineRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/minerals', mineralRoutes);
app.use('/api/yellow-machines', yellowMachineRoutes);

// File upload route using GitHub upload
app.post('/api/upload', protect, uploadMiddleware.upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'fail',
        message: 'No file uploaded' 
      });
    }

    // Upload the file to GitHub
    const fileName = uploadMiddleware.generateFileName(req.file.originalname, req.file.mimetype);
    const githubUrl = await uploadMiddleware.uploadFileToGitHub(req.file, fileName, 'uploads');
    
    res.status(200).json({ 
      status: 'success',
      data: {
        fileUrl: githubUrl,
        originalName: req.file.originalname,
        filename: fileName,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'fail',
      message: err.message 
    });
  }
});

// Alternative: Using the pre-built middleware from your upload file
app.post('/api/upload-single', protect, uploadMiddleware.upload.single('file'), uploadMiddleware.uploadSingleToGithub('file', 'uploads'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'fail',
        message: 'No file uploaded' 
      });
    }

    res.status(200).json({ 
      status: 'success',
      data: {
        fileUrl: req.file.githubUrl,
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'fail',
      message: err.message 
    });
  }
});

// Multiple file upload route
app.post('/api/upload-multiple', protect, uploadMiddleware.upload.array('files', 5), uploadMiddleware.uploadMultipleToGithub('files', 'uploads', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        status: 'fail',
        message: 'No files uploaded' 
      });
    }

    const uploadedFiles = req.files.map(file => ({
      fileUrl: file.githubUrl,
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.status(200).json({ 
      status: 'success',
      data: {
        files: uploadedFiles,
        count: uploadedFiles.length
      }
    });
  } catch (err) {
    // Cleanup any files that were uploaded if there's an error
    if (req.files) {
      await uploadMiddleware.cleanupUploadedFiles(req.files);
    }
    res.status(500).json({ 
      status: 'fail',
      message: err.message 
    });
  }
});

// Test routes
app.get('/', (req, res) => res.send('Welcome to Denton Vision Art API'));
app.get('/api/protected', protect, (req, res) =>
  res.json({ 
    status: 'success',
    message: `Hello ${req.user.firstName}, this is a protected route.` 
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err.stack);
  } else {
    console.error('Error:', err.message);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({
        status: 'fail',
        message: 'File too large. Maximum size is 10MB.',
      });
    }
    return res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    status: 'error',
    message:
      process.env.NODE_ENV === 'production' && status === 500
        ? 'Something went wrong!'
        : err.message || 'Something went wrong!',
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));