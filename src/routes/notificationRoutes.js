const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, triggerCronManual } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.patch('/:id', markAsRead);
router.post('/trigger-cron', triggerCronManual);

module.exports = router;
