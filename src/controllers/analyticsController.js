const StudySession = require('../models/StudySession');
const Quiz = require('../models/Quiz');
const Task = require('../models/Task');
const Goal = require('../models/Goal');

// @desc    Retrieve dynamic learning analytics gathered from MongoDB
// @route   GET /api/analytics
// @access  Private
const getAnalytics = async (req, res, next) => {
  const userId = req.user.id;

  try {
    // 1. Completion Rate calculations
    const totalTasks = await Task.countDocuments({ userId, status: { $ne: 'skipped' } });
    const completedTasks = await Task.countDocuments({ userId, status: 'completed' });
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 2. Quiz Performance calculations
    const quizzes = await Quiz.find({ userId });
    const quizAverage = quizzes.length > 0
      ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length)
      : 0;

    const weakTopics = [...new Set(quizzes.filter(q => q.score < 60).map(q => q.topic))];
    const strongTopics = [...new Set(quizzes.filter(q => q.score >= 80).map(q => q.topic))];

    // 3. Focus Session Durations
    const sessions = await StudySession.find({ userId });
    const totalFocusMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const averageFocusTime = sessions.length > 0
      ? Math.round(totalFocusMinutes / sessions.length)
      : 0;

    // 4. Streaks
    const activeGoal = await Goal.findOne({ userId, status: 'active' });
    const currentStreak = activeGoal ? activeGoal.streak : 0;
    const longestStreak = activeGoal ? Math.max(activeGoal.streak, 5) : 5; // Default reference baseline

    // 5. Daily study hours mapping (last 7 days)
    const dailyStudyHours = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const daySessions = sessions.filter(s => s.date >= startOfDay && s.date <= endOfDay);
      const minutes = daySessions.reduce((sum, s) => sum + s.duration, 0);
      
      dailyStudyHours.push({
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        hours: Number((minutes / 60).toFixed(1))
      });
    }

    // 6. Weekly study hours (last 4 weeks)
    const weeklyStudyHours = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);

      const weekSessions = sessions.filter(s => s.date >= start && s.date <= end);
      const minutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);

      weeklyStudyHours.push({
        week: `Week ${4 - i}`,
        hours: Number((minutes / 60).toFixed(1))
      });
    }

    // 7. Most studied topic
    // Group focus sessions by topic
    const topicMinutes = {};
    sessions.forEach(s => {
      const topic = s.topic || 'General Studies';
      topicMinutes[topic] = (topicMinutes[topic] || 0) + s.duration;
    });

    let mostStudiedTopic = 'N/A';
    let maxMinutes = 0;
    Object.keys(topicMinutes).forEach(topic => {
      if (topicMinutes[topic] > maxMinutes) {
        maxMinutes = topicMinutes[topic];
        mostStudiedTopic = topic;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        completionRate,
        quizAverage,
        averageFocusTime,
        currentStreak,
        longestStreak,
        weakTopics,
        strongTopics,
        mostStudiedTopic,
        dailyStudyHours,
        weeklyStudyHours,
        totalStudyHours: Number((totalFocusMinutes / 60).toFixed(1))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics
};
