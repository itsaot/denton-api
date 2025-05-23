const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/user', protect, analyticsController.getUserAnalytics);
router.get('/admin', protect, analyticsController.getAdminAnalytics);

module.exports = router;
