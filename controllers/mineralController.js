const Mineral = require('../models/mineralModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getAllMinerals = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Mineral.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  const minerals = await features.query;

  res.status(200).json({
    status: 'success',
    results: minerals.length,
    data: {
      minerals
    }
  });
});

exports.getMineral = catchAsync(async (req, res, next) => {
  const mineral = await Mineral.findById(req.params.id);

  if (!mineral) {
    return next(new AppError('No mineral found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      mineral
    }
  });
});

exports.createMineral = catchAsync(async (req, res, next) => {
  const newMineral = await Mineral.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      mineral: newMineral
    }
  });
});

exports.updateMineral = catchAsync(async (req, res, next) => {
  const mineral = await Mineral.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!mineral) {
    return next(new AppError('No mineral found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      mineral
    }
  });
});

exports.deleteMineral = catchAsync(async (req, res, next) => {
  const mineral = await Mineral.findByIdAndDelete(req.params.id);

  if (!mineral) {
    return next(new AppError('No mineral found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getMineralStats = catchAsync(async (req, res, next) => {
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
    {
      $sort: { avgPrice: 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMineralsWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400));
  }

  const minerals = await Mineral.find({
    mineLocation: {
      $geoWithin: { $centerSphere: [[lng, lat], radius] }
    }
  });

  res.status(200).json({
    status: 'success',
    results: minerals.length,
    data: {
      data: minerals
    }
  });
});