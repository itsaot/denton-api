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

const yellowMachineSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  establishmentFee: { type: Number, required: true, min: 0 },
  brand: { type: String, required: true, trim: true },
  age: { type: Number, min: 0 },
  mileage: { type: Number, min: 0 },
  rental: {
    available: { type: Boolean, default: false },
    duration: { type: String }
  },
  forSale: { type: Boolean, default: false },
  rates: {
    hourly: { type: Number, min: 0 },
    daily: { type: Number, min: 0 },
    weekly: { type: Number, min: 0 },
    monthly: { type: Number, min: 0 }
  },
  description: String,
  documents: [documentSchema],
  media: [mediaSchema]
}, { timestamps: true });

module.exports = mongoose.model('YellowMachine', yellowMachineSchema);
