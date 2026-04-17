const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mine: { type: mongoose.Schema.Types.ObjectId, ref: 'Mine' },
    content: { type: String, required: true },
    seen: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

messageSchema.pre('validate', function (next) {
  if (!this.conversation && !this.receiver) {
    return next(new Error('Either conversation or receiver is required'));
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
