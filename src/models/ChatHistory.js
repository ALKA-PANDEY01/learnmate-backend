const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'model'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },
  messages: [chatMessageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

chatHistorySchema.index({ userId: 1, goalId: 1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
