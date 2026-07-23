const express = require('express');
const router = express.Router();
const { getChats, sendMessageToTutor } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getChats);
router.post('/', sendMessageToTutor);

module.exports = router;
