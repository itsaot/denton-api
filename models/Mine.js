// models/Mine.js
const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  filename: { type: String, required: true }, // original filename
  url:      { type: String, required: true }, // where the file can be fetched (local or S3/CDN)
  mimetype: { type: String, required: true },
  size:     { type: Number, required: true }, // bytes
  uploadedAt:{ type: Date, default: Date.now }
}, { _id: false });

const LegalOwnershipSchema = new mongoose.Schema({
  miningRightsValidTransferable: { type: Boolean, default: false },
  prospectingRights: { type: Boolean, default: false },
  landOrSurfaceRights: { type: Boolean, default: false },
  complianceNotes: { type: String },         // local mining laws / environmental regs
  disputesOrEncumbrances: { type: String }   // describe any issues
}, { _id: false });

const GeologicalResourceSchema = new mongoose.Schema({
  geologicalReports: { type: String },      // summary; attach PDFs in documents
  reservesMeasured: { type: String },       // e.g. "12 Mt" or numeric + unit if you prefer
  reservesIndicated: { type: String },
  reservesInferred: { type: String },
  gradeQuality: { type: String },           // e.g. "Anthracite 25MJ/kg", "Au 4.5 g/t"
  lifeOfMineYears: { type: Number },
  explorationPotentialNotes: { type: String }
}, { _id: false });

const InfrastructureSchema = new mongoose.Schema({
  access: { type: String },                 // roads/rail/ports overview
  processingPlants: { type: String },       // wash plants / mills in place
  equipmentIncluded: { type: String },      // trucks, crushers, conveyors
  powerSupply: { type: String },            // grid/diesel/solar; capacity
  waterAvailability: { type: String },
  logistics: { type: String }               // distance to buyers / export hubs
}, { _id: false });

const FinancialsSchema = new mongoose.Schema({
  currentProductionCapacity: { type: String }, // e.g. "50kt/month" (or Number + unit)
  projectedProductionCapacity:{ type: String },
  operatingCosts: { type: String },            // mining/processing/transport breakdown
  capexRequired: { type: String },             // start/expand
  currentDebtLiabilities: { type: String },
  offtakeAgreements: { type: String },         // list/summary of agreements
  profitabilityRoiNotes: { type: String }
}, { _id: false });

const ESGSchema = new mongoose.Schema({
  eiaStatus: { type: String },                 // EIA done/pending + notes
  rehabilitationPlan: { type: String },        // obligations / provisions
  communityRelations: { type: String },        // social license to operate
  safetyRecords: { type: String },             // incidents, LTIFR, compliance
  labourCompliance: { type: String }
}, { _id: false });

const OperationalSchema = new mongoose.Schema({
  workforce: { type: String },                 // availability & skills
  currentProduction: { type: String },         // volumes, uptime, efficiency
  managementTeam: { type: String },            // key people in place
  productionHistory: { type: String }          // past performance
}, { _id: false });

const MarketSchema = new mongoose.Schema({
  demandOverview: { type: String },            // local & international demand
  priceTrends: { type: String },               // high-level notes; charts can be attachments
  potentialBuyers: { type: String },           // long-term contracts/buyers
  exportRestrictions: { type: String }         // controls or permits needed
}, { _id: false });

const mineSchema = new mongoose.Schema({
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true },
  location: { type: String, required: true },
  commodityType: { type: String, required: true }, // e.g. "Coal (Anthracite)", "Gold"
  status: {
    type: String,
    enum: ['Active', 'Idle', 'Exploration', 'Development'],
    default: 'Exploration'
  },

  // Optional headline "price" you already had (e.g., listing/asking price)
  price: { type: Number, required: true },

  description: String,

  // Sectioned data matching your checklist:
  legalOwnership: LegalOwnershipSchema,
  geologyResource: GeologicalResourceSchema,
  infrastructure: InfrastructureSchema,
  financials: FinancialsSchema,
  esg: ESGSchema,
  operational: OperationalSchema,
  market: MarketSchema,

  // Media & documents
  // Keep your simple arrays if you want (backward compatible),
  // but prefer structured attachments below for PDFs and other files.
  media: [String],          // e.g., image URLs (keep)
  documents: [String],      // legacy simple links (keep)

  // New: structured attachments (PDFs, docs, images, etc.)
  attachments: [FileSchema] // ← where uploaded PDFs go
}, { timestamps: true });

module.exports = mongoose.model('Mine', mineSchema);
