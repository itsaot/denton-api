const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const mineRoutes = require('./routes/mineRoutes');
const offerRoutes = require('./routes/offerRoutes');
const messageRoutes = require('./routes/messageRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { protect } = require('./middleware/authMiddleware');
const upload = require('./middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const cors = require('cors');

app.use(cors());
app.options('*',cors());
app.disable('x-powered-by');
dotenv.config();
connectDB();

const app = express();
app.use(express.json());

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.use('/api/auth', authRoutes);
app.use('/api/mines', mineRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);

app.post('/api/upload', protect, upload.single('file'), (req, res) => {
  res.status(201).json({ filePath: `/uploads/${req.file.filename}` });
});

app.get('/', (req, res) => res.send('Welcome to Denton Vision Art API'));
app.get('/api/protected', protect, (req, res) =>
  res.json({ message: `Hello ${req.user.firstName}, this is a protected route.` })
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
