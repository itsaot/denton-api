const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  path: String,
  mimetype: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now }
});

const mediaSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  path: String,
  mimetype: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now }
});

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
  documents: [documentSchema], // Updated to store file objects
  media: [mediaSchema] // Updated to store file objects
}, { timestamps: true });

module.exports = mongoose.model('Mine', mineSchema);