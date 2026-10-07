const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAmbulances, getAmbulance, getMyAmbulance,
  createAmbulance, updateLocation, updateAmbulanceStatus, getNearbyAmbulances
} = require('../controllers/ambulanceController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/nearby', authenticate, getNearbyAmbulances);
router.get('/driver/me', authenticate, authorize('driver'), getMyAmbulance);
router.get('/', authenticate, getAmbulances);

router.post('/', authenticate, authorize('admin'), [
  body('vehicle_number').trim().notEmpty().withMessage('Vehicle number required'),
  validate
], createAmbulance);

router.get('/:id', authenticate, getAmbulance);

router.put('/:id/location', authenticate, authorize('driver', 'admin'), [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  validate
], updateLocation);

router.put('/:id/status', authenticate, authorize('driver', 'admin'), [
  body('status').notEmpty().withMessage('Status required'),
  validate
], updateAmbulanceStatus);

module.exports = router;
