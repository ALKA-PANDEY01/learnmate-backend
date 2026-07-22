const express = require('express');
const router = express.Router();
const { createStudySession } = require('../controllers/studySessionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createStudySession);

module.exports = router;
