const express = require('express');
const router = express.Router();
const { register, login, me, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('../middleware/validationMiddleware');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, me);
router.post('/logout', protect, logout);

module.exports = router;
