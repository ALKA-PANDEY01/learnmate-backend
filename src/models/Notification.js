const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a notification title'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Please provide a notification message'],
    trim: true
  },
  type: {
    type: String,
    enum: ['nudge', 'alert', 'missed_task', 'achievement', 'reminder', 'other'],
    default: 'nudge'
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index to optimize unread notifications filtering
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
