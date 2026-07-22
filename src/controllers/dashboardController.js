const Goal = require('../models/Goal');
const Task = require('../models/Task');
const LearningPlan = require('../models/LearningPlan');
const StudySession = require('../models/StudySession');
const Notification = require('../models/Notification');

// @desc    Retrieve aggregated stats for user dashboards
// @route   GET /api/dashboard
// @access  Private
const getDashboardData = async (req, res, next) => {
  const userId = req.user.id;

  try {
    // 1. Fetch the latest active goal
    const goal = await Goal.findOne({ userId, status: 'active' }).sort({ createdAt: -1 });

    if (!goal) {
      return res.status(200).json({
        success: true,
        message: 'No active learning goal setups found. Proceed to Goal Setup.',
        data: {
          hasGoal: false,
          progress: 0,
          completedTasks: 0,
          remainingTasks: 0,
          currentWeek: 1,
          streak: 0,
          hoursStudied: 0,
          weeklyHours: 0,
          currentMilestone: 'No milestones active',
          todaysTasks: [],
          upcomingDeadlines: []
        }
      });
    }

    const goalId = goal._id;

    // 2. Calculate task progress parameters
    const totalTasks = await Task.countDocuments({ goalId, status: { $ne: 'skipped' } });
    const completedTasksCount = await Task.countDocuments({ goalId, status: 'completed' });
    const remainingTasksCount = totalTasks - completedTasksCount;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

    // 3. Determine current active week (lowest week with pending tasks)
    const nextPendingTask = await Task.findOne({ goalId, status: 'pending' }).sort({ week: 1 });
    const currentWeekNum = nextPendingTask ? nextPendingTask.week : 12;

    // 4. Retrieve Today's Tasks (pending tasks of current active week)
    const todaysTasks = await Task.find({
      goalId,
      week: currentWeekNum,
      status: 'pending'
    }).limit(5);

    // 5. Calculate Weekly Hours studied in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = await StudySession.find({
      userId,
      goalId,
      date: { $gte: sevenDaysAgo }
    });

    const totalMinutes = recentSessions.reduce((sum, s) => sum + s.duration, 0);
    const weeklyHoursNum = Number((totalMinutes / 60).toFixed(1));

    // 6. Fetch milestone details for current active week
    let currentMilestoneStr = 'Research fundamentals';
    const plan = await LearningPlan.findOne({ goalId });
    if (plan && plan.weeks) {
      const activeWeekMeta = plan.weeks.find(w => w.weekNumber === currentWeekNum);
      if (activeWeekMeta) {
        currentMilestoneStr = activeWeekMeta.milestone || activeWeekMeta.title || `Finish Week ${currentWeekNum} syllabus`;
      }
    }

    // 7. Compile Upcoming Deadlines list
    const upcomingDeadlines = [];
    if (goal.deadline) {
      upcomingDeadlines.push({
        title: `Goal Target Deadline: "${goal.goal}"`,
        date: goal.deadline
      });
    }

    // Append quiz deadlines (e.g. tasks of type quiz in the current or next week)
    const quizTasks = await Task.find({
      goalId,
      type: 'quiz',
      status: 'pending',
      week: { $gte: currentWeekNum }
    }).limit(2);

    quizTasks.forEach(qt => {
      // Mock deadline offset: e.g. end of that week
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (qt.week - currentWeekNum + 1) * 7);
      upcomingDeadlines.push({
        title: `Module Validation: "${qt.title}"`,
        date: targetDate
      });
    });

    // Fetch latest 5 notifications
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      success: true,
      data: {
        hasGoal: true,
        goalId: goal._id,
        goalTitle: goal.goal,
        progress: progressPercent,
        completedTasks: completedTasksCount,
        remainingTasks: remainingTasksCount,
        currentWeek: currentWeekNum,
        streak: goal.streak,
        hoursStudied: goal.hoursStudied,
        weeklyHours: weeklyHoursNum,
        currentMilestone: currentMilestoneStr,
        todaysTasks,
        upcomingDeadlines,
        notifications
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData
};
