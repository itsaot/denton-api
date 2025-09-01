const Mine = require('../models/Mine');

exports.createMine = async (req, res) => {
  console.log('Body : ' + req.body)
  console.log('owner : ' + req.user._id)
  try {
    const mine = await Mine.create({ ...req.body, owner: req.user._id });
    res.status(201).json(mine);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getMines = async (req, res) => {
  try {
    const mines = await Mine.find().populate('owner', 'firstName lastName email');
    res.json(mines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMineById = async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.id);
    if (!mine) return res.status(404).json({ message: 'Mine not found' });
    res.json(mine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMine = async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.id);
    if (!mine) return res.status(404).json({ message: 'Mine not found' });
    if (!mine.owner.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });

    Object.assign(mine, req.body);
    await mine.save();
    res.json(mine);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteMine = async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.id);
    if (!mine) return res.status(404).json({ message: 'Mine not found' });
    if (!mine.owner.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });

    await mine.remove();
    res.json({ message: 'Mine deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
