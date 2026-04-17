const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const validateObjectId = (param = 'id') => (req, res, next) => {
  const id = req.params[param];
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  next();
};

async function loadConversationForUser(conversationId, userId) {
  const conv = await Conversation.findById(conversationId).populate('participants', 'firstName lastName email role');
  if (!conv) return null;
  const allowed = conv.participants.some((p) => p._id.equals(userId));
  return allowed ? conv : null;
}

function dmMatchQuery(userA, userB, mineId) {
  const base = {
    $expr: { $eq: [{ $size: '$participants' }, 2] },
    participants: { $all: [userA, userB] },
  };
  if (mineId) {
    return { ...base, mine: mineId };
  }
  return { ...base, $or: [{ mine: null }, { mine: { $exists: false } }] };
}

async function findOrCreateDirectConversation({ userA, userB, mineId, createdBy }) {
  const q = dmMatchQuery(userA, userB, mineId);
  let conv = await Conversation.findOne(q);
  if (conv) return conv;
  conv = await Conversation.create({
    participants: [userA, userB],
    mine: mineId || null,
    createdBy: createdBy || userA,
  });
  return conv;
}

// List conversations the current user is in
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'firstName lastName email role')
      .populate('mine', 'name location')
      .sort({ lastMessageAt: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start or resume a 1:1 conversation
router.post('/conversations', protect, async (req, res) => {
  try {
    const { participantId, mine: mineId } = req.body;
    if (!participantId || !mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({ message: 'participantId (Mongo ObjectId) is required' });
    }
    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot start a conversation with yourself' });
    }
    const other = await User.findById(participantId);
    if (!other) return res.status(404).json({ message: 'User not found' });

    const conv = await findOrCreateDirectConversation({
      userA: req.user._id,
      userB: other._id,
      mineId: mineId && mongoose.Types.ObjectId.isValid(mineId) ? mineId : null,
      createdBy: req.user._id,
    });
    const populated = await Conversation.findById(conv._id)
      .populate('participants', 'firstName lastName email role')
      .populate('mine', 'name location');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admins in the chat may add another admin as a participant (group)
router.post(
  '/conversations/:conversationId/participants',
  protect,
  validateObjectId('conversationId'),
  async (req, res) => {
    try {
      const { userId: newUserId } = req.body;
      if (!newUserId || !mongoose.Types.ObjectId.isValid(newUserId)) {
        return res.status(400).json({ message: 'userId (Mongo ObjectId) is required' });
      }

      const conv = await Conversation.findById(req.params.conversationId);
      if (!conv) return res.status(404).json({ message: 'Conversation not found' });

      const isParticipant = conv.participants.some((id) => id.equals(req.user._id));
      if (!isParticipant) return res.status(403).json({ message: 'Not a member of this conversation' });
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can add participants' });
      }

      const newUser = await User.findById(newUserId);
      if (!newUser) return res.status(404).json({ message: 'User not found' });
      if (newUser.role !== 'admin') {
        return res.status(400).json({ message: 'Only admin users can be added to admin chats' });
      }
      if (conv.participants.some((id) => id.equals(newUserId))) {
        return res.status(400).json({ message: 'User is already in this conversation' });
      }

      conv.participants.push(newUser._id);
      await conv.save();
      const populated = await Conversation.findById(conv._id).populate(
        'participants',
        'firstName lastName email role'
      );
      res.json(populated);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

router.get('/conversations/:conversationId/messages', protect, validateObjectId('conversationId'), async (req, res) => {
  try {
    const conv = await loadConversationForUser(req.params.conversationId, req.user._id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const messages = await Message.find({ conversation: conv._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'firstName lastName email role')
      .populate('readBy', 'firstName lastName');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export transcript (participants only). format=json | txt
router.get('/conversations/:conversationId/export', protect, validateObjectId('conversationId'), async (req, res) => {
  try {
    const format = (req.query.format || 'json').toLowerCase();
    if (!['json', 'txt'].includes(format)) {
      return res.status(400).json({ message: 'format must be json or txt' });
    }

    const conv = await loadConversationForUser(req.params.conversationId, req.user._id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const messages = await Message.find({ conversation: conv._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'firstName lastName email');

    if (format === 'json') {
      return res.json({
        exportedAt: new Date().toISOString(),
        conversationId: conv._id,
        messages: messages.map((m) => ({
          at: m.createdAt,
          sender: m.sender
            ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() || m.sender.email
            : String(m.sender),
          content: m.content,
        })),
      });
    }

    const lines = messages.map((m) => {
      const name = m.sender
        ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() || m.sender.email
        : 'Unknown';
      return `[${m.createdAt.toISOString()}] ${name}: ${m.content}`;
    });
    const body = `Denton chat export\nConversation: ${conv._id}\n${lines.join('\n')}\n`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="chat-${conv._id}.txt"`);
    return res.send(body);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send on an existing conversation (1:1 or group)
router.post('/conversations/:conversationId/messages', protect, validateObjectId('conversationId'), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'content is required' });
    }

    const conv = await loadConversationForUser(req.params.conversationId, req.user._id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const message = await Message.create({
      conversation: conv._id,
      sender: req.user._id,
      content,
      readBy: [req.user._id],
    });

    await Conversation.findByIdAndUpdate(conv._id, { lastMessageAt: new Date() });

    const populated = await Message.findById(message._id).populate('sender', 'firstName lastName email role');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Legacy + unified send: either { conversation, content } or { receiver, content, mine? }
router.post('/', protect, async (req, res) => {
  try {
    const { conversation: conversationId, receiver, content, mine: mineId } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'content is required' });
    }

    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation id' });
      }
      const conv = await loadConversationForUser(conversationId, req.user._id);
      if (!conv) return res.status(404).json({ message: 'Conversation not found' });

      const message = await Message.create({
        conversation: conv._id,
        sender: req.user._id,
        content,
        readBy: [req.user._id],
      });
      await Conversation.findByIdAndUpdate(conv._id, { lastMessageAt: new Date() });
      const populated = await Message.findById(message._id).populate('sender', 'firstName lastName email role');
      return res.status(201).json(populated);
    }

    if (!receiver || !mongoose.Types.ObjectId.isValid(receiver)) {
      return res.status(400).json({ message: 'Provide conversation or receiver' });
    }
    if (receiver === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot message yourself' });
    }

    const conv = await findOrCreateDirectConversation({
      userA: req.user._id,
      userB: receiver,
      mineId: mineId && mongoose.Types.ObjectId.isValid(mineId) ? mineId : null,
      createdBy: req.user._id,
    });

    const message = await Message.create({
      conversation: conv._id,
      sender: req.user._id,
      receiver,
      mine: mineId && mongoose.Types.ObjectId.isValid(mineId) ? mineId : undefined,
      content,
      readBy: [req.user._id],
    });
    await Conversation.findByIdAndUpdate(conv._id, { lastMessageAt: new Date() });

    const populated = await Message.findById(message._id)
      .populate('sender', 'firstName lastName email role')
      .populate('receiver', 'firstName lastName email role')
      .populate('mine', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Thread with one other user (1:1), same mine context as legacy when ?mine= is provided
router.get('/thread/:userId', protect, validateObjectId('userId'), async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const mineId = req.query.mine;
    const validMine = mineId && mongoose.Types.ObjectId.isValid(mineId) ? mineId : null;

    const legacyQuery = {
      $and: [
        { $or: [{ conversation: null }, { conversation: { $exists: false } }] },
        {
          $or: [
            { sender: req.user._id, receiver: otherUserId },
            { sender: otherUserId, receiver: req.user._id },
          ],
        },
      ],
    };
    if (validMine) legacyQuery.$and.push({ mine: validMine });

    const [conv, legacyMessages] = await Promise.all([
      Conversation.findOne(dmMatchQuery(req.user._id, otherUserId, validMine)),
      Message.find(legacyQuery)
        .sort({ createdAt: 1 })
        .populate('sender', 'firstName lastName email role')
        .populate('receiver', 'firstName lastName email role'),
    ]);

    const threaded = conv
      ? await Message.find({ conversation: conv._id })
          .sort({ createdAt: 1 })
          .populate('sender', 'firstName lastName email role')
          .populate('receiver', 'firstName lastName email role')
      : [];

    const merged = [...legacyMessages, ...threaded].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    res.json(merged);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/mine/:mineId', protect, validateObjectId('mineId'), async (req, res) => {
  try {
    const mineId = req.params.mineId;
    const legacy = await Message.find({
      mine: mineId,
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .sort({ createdAt: 1 })
      .populate('sender receiver', 'firstName lastName');

    const convIds = await Conversation.find({ mine: mineId, participants: req.user._id }).distinct('_id');
    const threaded = await Message.find({ conversation: { $in: convIds } })
      .sort({ createdAt: 1 })
      .populate('sender', 'firstName lastName email role');

    const merged = [...legacy, ...threaded].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    res.json(merged);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
