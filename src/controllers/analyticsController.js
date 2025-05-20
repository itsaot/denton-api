const Mine = require('../models/Mine');
const Offer = require('../models/Offer');
const User = require('../models/User');

exports.getUserAnalytics = async (req, res) => {
  try {
    const mineCount = await Mine.countDocuments({ owner: req.user._id });
    const offerCount = await Offer.countDocuments({ investor: req.user._id });
    const listings = await Mine.find({ owner: req.user._id });

    const offerStats = await Promise.all(
      listings.map(async (mine) => {
        const count = await Offer.countDocuments({ mine: mine._id });
        return { mine: mine.name, offers: count };
      })
    );

    res.json({
      totalListings: mineCount,
      totalOffersMade: offerCount,
      offerStats
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAdminAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    const users = await User.countDocuments();
    const mines = await Mine.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const popularCommodities = await Mine.aggregate([
      { $group: { _id: '$commodityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      totalUsers: users,
      mineStatusBreakdown: mines,
      popularCommodities
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
