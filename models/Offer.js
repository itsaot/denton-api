const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    mine: { type: mongoose.Schema.Types.ObjectId, ref: 'Mine' },
    mineral: { type: mongoose.Schema.Types.ObjectId, ref: 'Mineral' },
    investor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    message: { type: String },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

offerSchema.pre('validate', function (next) {
  const hasMine = !!this.mine;
  const hasMineral = !!this.mineral;
  if (!hasMine && !hasMineral) {
    return next(new Error('Either mine or mineral is required'));
  }
  if (hasMine && hasMineral) {
    return next(new Error('Cannot target both mine and mineral on one offer'));
  }
  next();
});

module.exports = mongoose.model('Offer', offerSchema);
