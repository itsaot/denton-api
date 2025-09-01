const mongoose = require('mongoose');

const mineralSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A mineral must have a name'],
    unique: true,
    trim: true,
    maxlength: [50, 'A mineral name must have less than or equal to 50 characters'],
    minlength: [2, 'A mineral name must have more than or equal to 2 characters']
  },
  mineralType: {
    type: String,
    required: [true, 'A mineral must have a type'],
    enum: {
      values: ['metallic', 'non-metallic', 'precious', 'industrial', 'energy', 'gemstone'],
      message: 'Mineral type must be metallic, non-metallic, precious, industrial, energy, or gemstone'
    }
  },
  chemicalFormula: {
    type: String,
    required: [true, 'A mineral must have a chemical formula']
  },
  description: {
    type: String,
    required: [true, 'A mineral must have a description'],
    maxlength: [1000, 'Description must be less than or equal to 1000 characters']
  },
  pricePerTonne: {
    type: Number,
    required: [true, 'A mineral must have a price per tonne'],
    min: [0, 'Price must be a positive number']
  },
  availableTonnes: {
    type: Number,
    required: [true, 'A mineral must have available quantity'],
    min: [0, 'Available tonnes must be a positive number']
  },
  hardness: {
    type: Number,
    min: [1, 'Hardness must be at least 1'],
    max: [10, 'Hardness cannot exceed 10']
  },
  density: {
    type: Number,
    min: [0.1, 'Density must be at least 0.1 g/cm³']
  },
  color: {
    type: String,
    required: [true, 'A mineral must have a color description']
  },
  luster: {
    type: String,
    enum: ['metallic', 'submetallic', 'vitreous', 'pearly', 'resinous', 'silky', 'greasy', 'adamantine', 'dull'],
    default: 'vitreous'
  },
  crystalSystem: {
    type: String,
    enum: ['cubic', 'tetragonal', 'orthorhombic', 'hexagonal', 'trigonal', 'monoclinic', 'triclinic', 'amorphous'],
    default: 'cubic'
  },
  cleavage: {
    type: String,
    enum: ['perfect', 'good', 'distinct', 'imperfect', 'poor', 'none'],
    default: 'none'
  },
  fracture: {
    type: String,
    enum: ['conchoidal', 'uneven', 'fibrous', 'hackly', 'splintery', 'earthy'],
    default: 'uneven'
  },
  streak: String,
  transparency: {
    type: String,
    enum: ['transparent', 'translucent', 'opaque'],
    default: 'opaque'
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'very-rare'],
    default: 'common'
  },
  mineLocation: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      required: [true, 'Please provide coordinates for the mine location']
    },
    address: String,
    country: String
  },
  miningMethod: {
    type: String,
    enum: ['open-pit', 'underground', 'placer', 'in-situ', 'mountaintop-removal'],
    default: 'open-pit'
  },
  uses: [String],
  images: [{
    url: {
      type: String,
      required: [true, 'An image must have a URL']
    },
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  isRadioactive: {
    type: Boolean,
    default: false
  },
  mohsHardness: {
    type: Number,
    min: [1, 'Mohs hardness must be at least 1'],
    max: [10, 'Mohs hardness cannot exceed 10'],
    validate: {
      validator: Number.isInteger,
      message: 'Mohs hardness must be an integer'
    }
  },
  specificGravity: Number,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A mineral must be created by a user']
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    select: false
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now()
  },
  isActive: {
    type: Boolean,
    default: true,
    select: false
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create geospatial index
mineralSchema.index({ mineLocation: '2dsphere' });

// Index for frequently queried fields
mineralSchema.index({ mineralType: 1, pricePerTonne: 1 });
mineralSchema.index({ rarity: 1 });
mineralSchema.index({ createdBy: 1 });

// Virtual property for total value
mineralSchema.virtual('totalValue').get(function() {
  return this.pricePerTonne * this.availableTonnes;
});

// Virtual property for price category
mineralSchema.virtual('priceCategory').get(function() {
  if (this.pricePerTonne < 1000) return 'low';
  if (this.pricePerTonne < 10000) return 'medium';
  return 'high';
});

// Document middleware to update lastUpdatedAt before saving
mineralSchema.pre('save', function(next) {
  this.lastUpdatedAt = Date.now();
  next();
});

// Query middleware to only select active minerals
mineralSchema.pre(/^find/, function(next) {
  this.find({ isActive: { $ne: false } });
  next();
});

// Aggregate middleware to only include active minerals
mineralSchema.pre('aggregate', function(next) {
  this.pipeline().unshift({ $match: { isActive: { $ne: false } } });
  next();
});

const Mineral = mongoose.model('Mineral', mineralSchema);

module.exports = Mineral;