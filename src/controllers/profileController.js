const User = require('../models/User');
const Goal = require('../models/Goal');
const StudySession = require('../models/StudySession');

// @desc    Get user profile details with aggregate study statistics
// @route   GET /api/profile
// @access  Private
const getProfile = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User account not found.'
      });
    }

    // Aggregate statistics
    const goalsCount = await Goal.countDocuments({ userId });
    const activeGoalsCount = await Goal.countDocuments({ userId, status: 'active' });
    const studySessionsCount = await StudySession.countDocuments({ userId });
    
    // Sum hours studied from active goals
    const goals = await Goal.find({ userId });
    const totalHoursStudied = goals.reduce((sum, g) => sum + (g.hoursStudied || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        stats: {
          totalGoals: goalsCount,
          activeGoals: activeGoalsCount,
          totalStudySessions: studySessionsCount,
          totalHoursStudied: Number(totalHoursStudied.toFixed(1))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile data
// @route   PATCH /api/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  const userId = req.user.id;
  const { name, email } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    if (name) user.name = name;
    if (email && email !== user.email) {
      // Check if email already taken
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email address already in use by another account.'
        });
      }
      user.email = email;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile
};
