const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, messageController.sendMessage);
router.get('/thread/:userId', protect, messageController.getConversation);
router.get('/mine/:mineId', protect, messageController.getMineMessages);

module.exports = router;
