const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  mine: { type: mongoose.Schema.Types.ObjectId, ref: 'Mine', required: true },
  investor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  message: { type: String },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
