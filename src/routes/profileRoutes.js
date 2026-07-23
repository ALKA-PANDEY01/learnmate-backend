const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, updatePassword } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getProfile);
router.patch('/', updateProfile);
router.put('/password', updatePassword);

module.exports = router;
