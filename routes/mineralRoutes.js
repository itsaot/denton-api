const express = require('express');
const mineralController = require('../controllers/mineralController');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(mineralController.getAllMinerals)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'mineral-manager'),
    mineralController.createMineral
  );

router
  .route('/:id')
  .get(mineralController.getMineral)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'mineral-manager'),
    mineralController.updateMineral
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    mineralController.deleteMineral
  );

router.route('/stats').get(mineralController.getMineralStats);
router.route('/minerals-within/:distance/center/:latlng/unit/:unit').get(mineralController.getMineralsWithin);

module.exports = router;