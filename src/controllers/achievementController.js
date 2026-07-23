const Achievement = require('../models/Achievement');

// @desc    Retrieve all unlocked achievements for a user
// @route   GET /api/achievements
// @access  Private
const getAchievements = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const achievements = await Achievement.find({ userId }).sort({ unlockedAt: -1 });

    res.status(200).json({
      success: true,
      count: achievements.length,
      achievements
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAchievements
};
