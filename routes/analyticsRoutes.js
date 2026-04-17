const express = require('express');
const router = express.Router();
const Mine = require('../models/Mine');
const Mineral = require('../models/Mineral');
const Offer = require('../models/Offer');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

router.get('/user', protect, async (req, res) => {
  try {
    const mineCount = await Mine.countDocuments({ owner: req.user._id });
    const offerCount = await Offer.countDocuments({ investor: req.user._id });
    const listings = await Mine.find({ owner: req.user._id });
    const mineralListings = await Mineral.find({ createdBy: req.user._id });

    const offerStats = await Promise.all(
      listings.map(async (mine) => {
        const count = await Offer.countDocuments({ mine: mine._id });
        return { type: 'mine', name: mine.name, offers: count };
      })
    );
    const mineralOfferStats = await Promise.all(
      mineralListings.map(async (mineral) => {
        const count = await Offer.countDocuments({ mineral: mineral._id });
        return { type: 'mineral', name: mineral.name, offers: count };
      })
    );

    res.json({
      totalListings: mineCount,
      totalOffersMade: offerCount,
      offerStats,
      mineralOfferStats,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.countDocuments();
    const mines = await Mine.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const popularCommodities = await Mine.aggregate([
      { $group: { _id: '$commodityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totalUsers: users,
      mineStatusBreakdown: mines,
      popularCommodities,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
