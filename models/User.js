const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String },
  role: {
    type: String,
    enum: ['mine_owner', 'investor', 'consultant', 'admin','mineral_owner ','customer'],
    default: 'customer'
  },
  businessDetails: {
    businessName: String,
    tradeName: String,
    registrationNumber: String,
    address: String,
    contactPerson: { name: String, email: String, phone: String },
    productsOffered: [String],
    documents: [String]
  },
  preferences: {
    interests: [String],
    budgetRange: { min: Number, max: Number }
  },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
