const Mineral = require('../models/Mineral');
const mongoose = require('mongoose');
const path = require('path');

// ------------------------ Query helpers ------------------------
const filterQuery = (query, filter) => {
  const queryObj = { ...filter };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(el => delete queryObj[el]);

  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
  return query.find(JSON.parse(queryStr));
};

const sortQuery = (query, sort) => {
  if (sort) {
    const sortBy = sort.split(',').join(' ');
    return query.sort(sortBy);
  }
  return query.sort('-createdAt');
};

const limitFields = (query, fields) => {
  if (fields) {
    const selected = fields.split(',').join(' ');
    return query.select(selected);
  }
  return query.select('-__v');
};

const paginate = (query, page, limit) => {
  const pageNum = page * 1 || 1;
  const limitNum = limit * 1 || 100;
  const skip = (pageNum - 1) * limitNum;
  return query.skip(skip).limit(limitNum);
};

// ------------------------ Small helper: build document from req.file ------------------------
function buildDocFromFile(file) {
  if (!file) return null;
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    // this assumes you serve statics at /uploads (see router/app note below)
    url: `/uploads/mineral-docs/${file.filename}`,
    uploadedAt: new Date()
  };
}

// ------------------------ Controllers ------------------------
exports.getAllMinerals = async (req, res) => {
  try {
    let query = Mineral.find();

    // 1) Filtering
    query = filterQuery(query, req.query);

    // 2) Sorting
    query = sortQuery(query, req.query.sort);

    // 3) Field limiting
    query = limitFields(query, req.query.fields);

    // 4) Pagination
    query = paginate(query, req.query.page, req.query.limit);

    const minerals = await query;

    res.status(200).json({
      status: 'success',
      results: minerals.length,
      data: { minerals }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getMineral = async (req, res) => {
  try {
    const mineral = await Mineral.findById(req.params.id);
    if (!mineral) {
      return res.status(404).json({ status: 'fail', message: 'No mineral found with that ID' });
    }

    res.status(200).json({ status: 'success', data: { mineral } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// Create supports multipart/form-data with optional field "document" (PDF)
exports.createMineral = async (req, res) => {
  try {
    const mineralData = { ...req.body };

    // If a PDF was uploaded by multer in the router, attach it
    const doc = buildDocFromFile(req.file);
    if (doc) {
      mineralData.documents = [doc];
    }

    const newMineral = await Mineral.create(mineralData);

    res.status(201).json({
      status: 'success',
      data: { mineral: newMineral }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.updateMineral = async (req, res) => {
  try {
    const mineral = await Mineral.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!mineral) {
      return res.status(404).json({ status: 'fail', message: 'No mineral found with that ID' });
    }

    res.status(200).json({ status: 'success', data: { mineral } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteMineral = async (req, res) => {
  try {
    const mineral = await Mineral.findByIdAndDelete(req.params.id);

    if (!mineral) {
      return res.status(404).json({ status: 'fail', message: 'No mineral found with that ID' });
    }

    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getMineralStats = async (req, res) => {
  try {
    const stats = await Mineral.aggregate([
      {
        $group: {
          _id: '$mineralType',
          numMinerals: { $sum: 1 },
          avgPrice: { $avg: '$pricePerTonne' },
          minPrice: { $min: '$pricePerTonne' },
          maxPrice: { $max: '$pricePerTonne' },
          totalQuantity: { $sum: '$availableTonnes' }
        }
      },
      { $sort: { avgPrice: 1 } }
    ]);

    res.status(200).json({ status: 'success', data: { stats } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getMineralsWithin = async (req, res) => {
  try {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide latitude and longitude in the format lat,lng.'
      });
    }

    const minerals = await Mineral.find({
      mineLocation: {
        $geoWithin: { $centerSphere: [[lng, lat], radius] }
      }
    });

    res.status(200).json({
      status: 'success',
      results: minerals.length,
      data: { data: minerals }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// ------------------------ NEW: upload a PDF to an existing mineral ------------------------
// Expects multer to have put the file on req.file
exports.uploadMineralDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'fail', message: 'PDF file is required (field name: document)' });
    }

    const doc = buildDocFromFile(req.file);

    const mineral = await Mineral.findByIdAndUpdate(
      req.params.id,
      { $push: { documents: doc } },
      { new: true }
    );

    if (!mineral) {
      return res.status(404).json({ status: 'fail', message: 'No mineral found with that ID' });
    }

    res.status(200).json({ status: 'success', data: { mineral } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};
