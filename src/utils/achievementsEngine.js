const Achievement = require('../models/Achievement');
const StudySession = require('../models/StudySession');
const Quiz = require('../models/Quiz');
const Flashcard = require('../models/Flashcard');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Notification = require('../models/Notification');

const BADGES = {
  first_session: {
    title: 'First Focus Cycle 🧠',
    description: 'Logged your very first focus study session!',
    icon: 'Brain'
  },
  streak_7: {
    title: '7-Day Burner 🔥',
    description: 'Maintained a daily study streak for 7 consecutive days.',
    icon: 'Flame'
  },
  hours_10: {
    title: 'Dedicated Scholar 📚',
    description: 'Logged over 10 hours of active focus study sessions.',
    icon: 'Clock'
  },
  flashcards_50: {
    title: 'Memory Master 🧠',
    description: 'Added 50 active flashcards to your revision decks.',
    icon: 'Sparkles'
  },
  quizzes_10: {
    title: 'Concept Check Champion 🏆',
    description: 'Completed 10 validation quizzes.',
    icon: 'Trophy'
  },
  roadmap_completed: {
    title: 'Syllabus Conqueror 🎓',
    description: 'Marked all core tasks on your roadmap complete!',
    icon: 'Award'
  }
};

const triggerBadgeCheck = async (userId, badgeId) => {
  try {
    // Check if already unlocked
    const exists = await Achievement.findOne({ userId, badgeId });
    if (exists) return;

    const badge = BADGES[badgeId];
    if (!badge) return;

    // Create achievement
    await Achievement.create({
      userId,
      badgeId,
      title: badge.title,
      description: badge.description,
      icon: badge.icon
    });

    // Create congratulations notification
    await Notification.create({
      userId,
      title: `Badge Unlocked: ${badge.title}`,
      message: `Congratulations! You unlocked the "${badge.title}" badge: ${badge.description}`,
      type: 'achievement'
    });

    console.log(`Unlocked achievement ${badgeId} for user ${userId}`);
  } catch (err) {
    console.error(`Failed to unlock badge ${badgeId}:`, err.message);
  }
};

const checkAllAchievements = async (userId) => {
  try {
    // 1. First study session check
    const sessionsCount = await StudySession.countDocuments({ userId });
    if (sessionsCount >= 1) {
      await triggerBadgeCheck(userId, 'first_session');
    }

    // 2. 10 Hours studied check
    const goals = await Goal.find({ userId });
    const totalHours = goals.reduce((sum, g) => sum + (g.hoursStudied || 0), 0);
    if (totalHours >= 10) {
      await triggerBadgeCheck(userId, 'hours_10');
    }

    // 3. Flashcards check
    const flashcardsCount = await Flashcard.countDocuments({ userId });
    if (flashcardsCount >= 50) {
      await triggerBadgeCheck(userId, 'flashcards_50');
    }

    // 4. Quizzes check
    const quizzesCount = await Quiz.countDocuments({ userId });
    if (quizzesCount >= 10) {
      await triggerBadgeCheck(userId, 'quizzes_10');
    }

    // 5. Streaks check
    const activeGoal = await Goal.findOne({ userId, status: 'active' });
    if (activeGoal && activeGoal.streak >= 7) {
      await triggerBadgeCheck(userId, 'streak_7');
    }

    // 6. Roadmap completion check
    if (activeGoal) {
      const pendingTasks = await Task.countDocuments({ goalId: activeGoal._id, status: 'pending' });
      const completedTasks = await Task.countDocuments({ goalId: activeGoal._id, status: 'completed' });
      if (completedTasks > 0 && pendingTasks === 0) {
        await triggerBadgeCheck(userId, 'roadmap_completed');
      }
    }
  } catch (err) {
    console.error('Error during achievements check:', err.message);
  }
};

module.exports = {
  checkAllAchievements,
  triggerBadgeCheck
};
