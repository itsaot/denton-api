const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  filename: String,
  url: String,
  mimetype: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

// 1. Commodity Specifications
const CommoditySpecSchema = new mongoose.Schema({
  commodityType: { type: String, required: true }, // coal, gold, chrome, etc.
  gradeQuality: { type: String },                 // e.g. anthracite CV, gold purity %
  form: { type: String },                         // raw ore, concentrate, bars, nuggets
  moisture: { type: Number },                     // %
  ash: { type: Number },                          // %
  sulfur: { type: Number },                       // %
  size: { type: String }                          // lump, fines, pellets, etc.
}, { _id: false });

// 2. Quantity
const QuantitySchema = new mongoose.Schema({
  minOrder: { type: Number },     // in tonnes, kg, etc.
  maxOrder: { type: Number },
  stockAvailability: { type: String }, // "ready", "to be mined", "processing"
  supplyConsistency: { type: String }  // "once-off", "long-term"
}, { _id: false });

// 3. Location & Logistics
const LogisticsSchema = new mongoose.Schema({
  location: { type: String },     // mine or warehouse
  transportMethod: { type: String }, // truck, rail, ship, air
  incoterms: { type: String },    // FOB, CIF, EXW
  exportPermissions: { type: String },
  deliveryTime: { type: String }  // e.g. "30 days", "Q1 2025"
}, { _id: false });

// 4. Legal & Compliance
const LegalSchema = new mongoose.Schema({
  ownershipProof: { type: String },
  exportPermits: { type: String },
  certificatesOfOrigin: { type: String },
  inspectionCertificates: { type: String }, // SGS, Bureau Veritas, etc.
  regulatoryNotes: { type: String }
}, { _id: false });

// 5. Pricing & Payment Terms
const PricingSchema = new mongoose.Schema({
  pricePerUnit: { type: Number, required: true }, // ton, kg, ounce
  benchmark: { type: String }, // LME, RBCT, etc.
  currency: { type: String, default: 'USD' },
  paymentMethod: { type: String }, // LC, SBLC, TT, escrow
  upfrontDeposit: { type: String } // e.g. "10% deposit"
}, { _id: false });

// 6. Seller Credibility
const SellerSchema = new mongoose.Schema({
  trackRecord: { type: String },
  previousTransactions: { type: String },
  financialStability: { type: String },
  blacklistingStatus: { type: String }
}, { _id: false });

// 7. Market Considerations
const MarketSchema = new mongoose.Schema({
  currentPriceTrend: { type: String },
  demandOutlook: { type: String },
  storageCosts: { type: String },
  resalePotential: { type: String }
}, { _id: false });

const mineralSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  mineralType: {
    type: String,
    required: true,
    enum: ['metallic', 'non-metallic', 'precious', 'industrial', 'energy', 'gemstone']
  },
  description: { type: String, maxlength: 1000 },

  // Sectioned business data
  commoditySpecs: CommoditySpecSchema,
  quantity: QuantitySchema,
  logistics: LogisticsSchema,
  legalCompliance: LegalSchema,
  pricing: PricingSchema,
  sellerCredibility: SellerSchema,
  market: MarketSchema,

  // Attachments
  attachments: [FileSchema],

  // Metadata
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  lastUpdatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware
mineralSchema.pre('save', function (next) {
  this.lastUpdatedAt = Date.now();
  next();
});

mineralSchema.pre(/^find/, function (next) {
  this.find({ isActive: { $ne: false } });
  next();
});

mineralSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isActive: { $ne: false } } });
  next();
});

const Mineral = mongoose.model('Mineral', mineralSchema);
module.exports = Mineral;
