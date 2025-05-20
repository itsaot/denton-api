const express = require('express');
const router = express.Router();
const mineController = require('../controllers/mineController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, mineController.createMine)
  .get(mineController.getMines);

router.route('/:id')
  .get(mineController.getMineById)
  .put(protect, mineController.updateMine)
  .delete(protect, mineController.deleteMine);

module.exports = router;
