const express = require('express');
const router = express.Router();
const Mineral = require('../models/Mineral');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const filterQuery = (query, filter) => {
  const queryObj = { ...filter };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach((el) => delete queryObj[el]);

  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
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

router.get('/stats', async (req, res) => {
  try {
    const stats = await Mineral.aggregate([
      {
        $group: {
          _id: '$mineralType',
          numMinerals: { $sum: 1 },
          avgPrice: { $avg: '$pricePerTonne' },
          minPrice: { $min: '$pricePerTonne' },
          maxPrice: { $max: '$pricePerTonne' },
          totalQuantity: { $sum: '$availableTonnes' },
        },
      },
      {
        $sort: { avgPrice: 1 },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: { stats },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
});

router.get(
  '/minerals-within/:distance/center/:latlng/unit/:unit',
  async (req, res) => {
    try {
      const { distance, latlng, unit } = req.params;
      const [lat, lng] = latlng.split(',');

      const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

      if (!lat || !lng) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please provide latitude and longitude in the format lat,lng.',
        });
      }

      const minerals = await Mineral.find({
        mineLocation: {
          $geoWithin: { $centerSphere: [[lng, lat], radius] },
        },
      });

      res.status(200).json({
        status: 'success',
        results: minerals.length,
        data: { data: minerals },
      });
    } catch (err) {
      res.status(400).json({
        status: 'fail',
        message: err.message,
      });
    }
  }
);

router
  .route('/')
  .get(async (req, res) => {
    try {
      let query = Mineral.find();
      query = filterQuery(query, req.query);
      query = sortQuery(query, req.query.sort);
      query = limitFields(query, req.query.fields);
      query = paginate(query, req.query.page, req.query.limit);

      const minerals = await query;

      res.status(200).json({
        status: 'success',
        results: minerals.length,
        data: { minerals },
      });
    } catch (err) {
      res.status(400).json({
        status: 'fail',
        message: err.message,
      });
    }
  })
  .post(
    protect,
    restrictTo('admin', 'mineral-manager'),
    async (req, res) => {
      try {
        const newMineral = await Mineral.create(req.body);

        res.status(201).json({
          status: 'success',
          data: { mineral: newMineral },
        });
      } catch (err) {
        res.status(400).json({
          status: 'fail',
          message: err.message,
        });
      }
    }
  );

router
  .route('/:id')
  .get(async (req, res) => {
    try {
      const mineral = await Mineral.findById(req.params.id);

      if (!mineral) {
        return res.status(404).json({
          status: 'fail',
          message: 'No mineral found with that ID',
        });
      }

      res.status(200).json({
        status: 'success',
        data: { mineral },
      });
    } catch (err) {
      res.status(400).json({
        status: 'fail',
        message: err.message,
      });
    }
  })
  .patch(
    protect,
    restrictTo('admin', 'mineral-manager'),
    async (req, res) => {
      try {
        const mineral = await Mineral.findByIdAndUpdate(req.params.id, req.body, {
          new: true,
          runValidators: true,
        });

        if (!mineral) {
          return res.status(404).json({
            status: 'fail',
            message: 'No mineral found with that ID',
          });
        }

        res.status(200).json({
          status: 'success',
          data: { mineral },
        });
      } catch (err) {
        res.status(400).json({
          status: 'fail',
          message: err.message,
        });
      }
    }
  )
  .delete(
    protect,
    restrictTo('admin'),
    async (req, res) => {
      try {
        const mineral = await Mineral.findByIdAndDelete(req.params.id);

        if (!mineral) {
          return res.status(404).json({
            status: 'fail',
            message: 'No mineral found with that ID',
          });
        }

        res.status(204).json({
          status: 'success',
          data: null,
        });
      } catch (err) {
        res.status(400).json({
          status: 'fail',
          message: err.message,
        });
      }
    }
  );

module.exports = router;
