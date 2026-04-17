const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const mineRoutes = require('./routes/mineRoutes');
const offerRoutes = require('./routes/offerRoutes');
const messageRoutes = require('./routes/messageRoutes');
const mineralRoutes = require('./routes/mineralRoutes');
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

// Load environment variables first
dotenv.config();

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware setup
app.use(cors());
app.options('*', cors());
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

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

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mines', mineRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/minerals', mineralRoutes);

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
  console.error('Error:', err.stack);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ 
        status: 'fail',
        message: 'File too large. Maximum size is 10MB.' 
      });
    }
    return res.status(400).json({ 
      status: 'fail',
      message: err.message 
    });
  }
  
  res.status(500).json({ 
    status: 'error',
    message: err.message || 'Something went wrong!' 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));