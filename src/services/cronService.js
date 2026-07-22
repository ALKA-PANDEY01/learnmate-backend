const cron = require('node-cron');
const User = require('../models/User');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Quiz = require('../models/Quiz');
const Notification = require('../models/Notification');
const { generateSmartNudge } = require('./ai.service');

// Audits all users activity in database and registers motivational nudges
const runUserAudits = async () => {
  console.log("Starting daily AI Smart Nudge activity audits...");
  try {
    const users = await User.find({});
    
    for (const user of users) {
      // 1. Inactivity check (No login for 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      if (user.lastLoginAt < threeDaysAgo) {
        // Prevent spamming - check if they already received an inactivity nudge recently
        const recentNudge = await Notification.findOne({
          userId: user._id,
          type: 'nudge',
          title: /miss/i
        });
        
        if (!recentNudge) {
          const nudge = await generateSmartNudge('inactivity', { name: user.name, goalTitle: 'your learning plan' });
          await Notification.create({
            userId: user._id,
            title: nudge.title,
            message: nudge.message,
            type: 'nudge'
          });
          continue; // Trigger only one nudge per audit cycle for simplicity
        }
      }

      // Check user goals
      const activeGoal = await Goal.findOne({ userId: user._id, status: 'active' });
      if (!activeGoal) continue;

      // 2. Study Streak broken check
      // Find latest completed task
      const latestCompleted = await Task.findOne({
        userId: user._id,
        goalId: activeGoal._id,
        completed: true
      }).sort({ completedAt: -1 });

      if (latestCompleted && activeGoal.streak > 0) {
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

        if (latestCompleted.completedAt < fortyEightHoursAgo) {
          // Reset streak to 0
          activeGoal.streak = 0;
          await activeGoal.save();

          const nudge = await generateSmartNudge('streak_broken', { name: user.name, goalTitle: activeGoal.goal });
          await Notification.create({
            userId: user._id,
            title: nudge.title,
            message: nudge.message,
            type: 'nudge'
          });
          continue;
        }
      }

      // 3. Low Quiz score check (Quiz under 60% in the last 24 hours)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const latestQuiz = await Quiz.findOne({
        userId: user._id,
        goalId: activeGoal._id,
        score: { $lt: 60 },
        submittedAt: { $gte: twentyFourHoursAgo }
      }).sort({ submittedAt: -1 });

      if (latestQuiz) {
        const nudgeAlreadySent = await Notification.findOne({
          userId: user._id,
          type: 'nudge',
          createdAt: { $gte: twentyFourHoursAgo }
        });

        if (!nudgeAlreadySent) {
          const nudge = await generateSmartNudge('low_quiz_score', {
            name: user.name,
            goalTitle: activeGoal.goal,
            detail: latestQuiz.topic
          });
          await Notification.create({
            userId: user._id,
            title: nudge.title,
            message: nudge.message,
            type: 'nudge'
          });
          continue;
        }
      }

      // 4. Overdue target Goal deadline
      if (activeGoal.deadline && activeGoal.deadline < new Date()) {
        const nudgeAlreadySent = await Notification.findOne({
          userId: user._id,
          type: 'alert',
          createdAt: { $gte: twentyFourHoursAgo }
        });

        if (!nudgeAlreadySent) {
          await Notification.create({
            userId: user._id,
            title: "Goal Target Overdue ⚠️",
            message: `Your learning plan for "${activeGoal.goal}" is past its target deadline. Review tasks to complete your syllabus.`,
            type: 'alert'
          });
          continue;
        }
      }
    }
    console.log("Daily activity audit complete.");
  } catch (error) {
    console.error("Cron activity audit encountered an error:", error.message);
  }
};

// Start cron job (Daily at midnight)
const initCron = () => {
  // Pattern: once a day at midnight: '0 0 * * *'
  cron.schedule('0 0 * * *', () => {
    runUserAudits();
  });
  console.log("Daily activity cron scheduler registered.");
};

module.exports = {
  initCron,
  runUserAudits
};
