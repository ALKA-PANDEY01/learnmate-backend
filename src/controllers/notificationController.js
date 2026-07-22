const Notification = require('../models/Notification');
const { runUserAudits } = require('../services/cronService');

const getNotifications = async (req, res, next) => {
  const userId = req.user.id;
  const { read } = req.query;

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  try {
    const filter = { userId };
    if (read !== undefined) {
      filter.read = read === 'true';
    }

    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: notifications.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id
// @access  Private
const markAsRead = async (req, res, next) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  try {
    const notification = await Notification.findOne({ _id: notificationId, userId });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found.'
      });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually trigger cron audits for testing smart nudges
// @route   POST /api/notifications/trigger-cron
// @access  Private
const triggerCronManual = async (req, res, next) => {
  try {
    await runUserAudits();
    res.status(200).json({
      success: true,
      message: 'Manual activity audit completed successfully. Check user notifications.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  triggerCronManual
};
