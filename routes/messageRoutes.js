const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, async (req, res) => {
  try {
    const { receiver, content, mine } = req.body;
    const message = await Message.create({
      sender: req.user._id,
      receiver,
      content,
      mine,
    });
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/thread/:userId', protect, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user._id },
      ],
    }).sort('createdAt');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/mine/:mineId', protect, async (req, res) => {
  try {
    const mineId = req.params.mineId;
    const messages = await Message.find({ mine: mineId })
      .sort('createdAt')
      .populate('sender receiver', 'firstName lastName');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
