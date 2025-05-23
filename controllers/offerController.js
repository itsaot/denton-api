const Offer = require('../models/Offer');
const Mine = require('../models/Mine');

exports.submitOffer = async (req, res) => {
  try {
    const { mine, amount, message } = req.body;
    const offer = await Offer.create({
      mine,
      amount,
      message,
      investor: req.user._id
    });
    res.status(201).json(offer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getOffersForMine = async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.mineId);
    if (!mine) return res.status(404).json({ message: 'Mine not found' });
    if (!mine.owner.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });

    const offers = await Offer.find({ mine: req.params.mineId }).populate('investor', 'firstName lastName email');
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ investor: req.user._id }).populate('mine');
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('mine');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    if (!offer.mine.owner.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });

    offer.status = req.body.status;
    await offer.save();
    res.json(offer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
