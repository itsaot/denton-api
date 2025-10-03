// models/HeavyMachine.js
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: String,
  isPrimary: { type: Boolean, default: false }
}, { _id: false });

const rentalSchema = new mongoose.Schema({
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: Date,
  pricePerDay: { type: Number, min: 0, required: true },
  notes: String,
  returnedAt: Date,
  status: { type: String, enum: ['active', 'returned', 'cancelled'], default: 'active' },
}, { _id: true, timestamps: true });

const purchaseSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, min: 0, required: true },
  date: { type: Date, default: Date.now },
  notes: String
}, { _id: true, timestamps: true });

const maintenanceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  cost: { type: Number, min: 0, default: 0 },
  performedAt: { type: Date, default: Date.now },
  performedBy: { type: String } // could be a vendor name or user
}, { _id: true, timestamps: true });

const heavyMachineSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Machine name is required'], trim: true },
  category: {
    type: String,
    required: true,
    enum: [
      'excavator','bulldozer','loader','grader','crane','compactor','dump-truck',
      'backhoe','forklift','concrete-mixer','drill','generator','other'
    ],
    index: true
  },
  brand: String,
  model: { type: String, required: true, trim: true },
  year: { type: Number, min: 1950, max: new Date().getFullYear() + 1, required: true },

  // Pricing
  purchasePrice: { type: Number, min: 0 },      // “Buy now” price if available
  rentalPricePerDay: { type: Number, min: 0 },  // Daily rental price

  // Ownership & lifecycle
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['available','rented','sold','maintenance','reserved'],
    default: 'available',
    index: true
  },

  // Inventory & identification
  serialNumber: { type: String, trim: true, unique: false },
  location: {
    address: String,
    country: String,
    gps: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined } // [lng, lat]
    }
  },

  images: { type: [imageSchema], default: [] }, // support 1–2 or more images
  description: { type: String, maxlength: 2000 },
  specs: { type: Map, of: String }, // e.g. {"enginePower":"250kW","weight":"20t"}

  // Activity
  rentals: { type: [rentalSchema], default: [] },
  purchases: { type: [purchaseSchema], default: [] },
  maintenanceHistory: { type: [maintenanceSchema], default: [] },

  // Flags
  isActive: { type: Boolean, default: true, select: false },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedAt: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
heavyMachineSchema.index({ 'location.gps': '2dsphere' });
heavyMachineSchema.index({ category: 1, status: 1 });
heavyMachineSchema.index({ brand: 1, model: 1, year: 1 });

// Virtuals
heavyMachineSchema.virtual('isAvailableForRent').get(function () {
  return this.status === 'available';
});

heavyMachineSchema.virtual('currentRental').get(function () {
  return this.rentals.find(r => r.status === 'active' && !r.returnedAt) || null;
});

// Hooks
heavyMachineSchema.pre('save', function (next) {
  this.lastUpdatedAt = Date.now();
  next();
});

heavyMachineSchema.pre(/^find/, function (next) {
  this.where({ isActive: { $ne: false } });
  next();
});

module.exports = mongoose.model('HeavyMachine', heavyMachineSchema);
