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
const heavyMachineRoutes = require('./routes/heavyMachine');
const userRoutes = require('./routes/user');
const { protect } = require('./middleware/authMiddleware');
const upload = require('./middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const cors = require('cors');

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

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes); //done
app.use('/api/mines', mineRoutes); //done
app.use('/api/offers', offerRoutes); // done
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRoutes); //done
app.use('/api/miniral', mineralRoutes); 
app.use('/api/heavy-machines',heavyMachineRoutes);//done

// File upload route
app.post('/api/upload', protect, upload.single('file'), (req, res) => {
  res.status(201).json({ filePath: `/uploads/${req.file.filename}` });
});

// Test routes
app.get('/', (req, res) => res.send('Welcome to Denton Vision Art API'));
app.get('/api/protected', protect, (req, res) =>
  res.json({ message: `Hello ${req.user.firstName}, this is a protected route.` })
);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));