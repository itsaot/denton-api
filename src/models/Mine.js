const mongoose = require('mongoose');

const mineSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  commodityType: { type: String, required: true },
  status: {
    type: String,
    enum: ['Active', 'Idle', 'Exploration', 'Development'],
    default: 'Exploration'
  },
  price: { type: Number, required: true },
  description: String,
  documents: [String],
  media: [String]
}, { timestamps: true });

module.exports = mongoose.model('Mine', mineSchema);
