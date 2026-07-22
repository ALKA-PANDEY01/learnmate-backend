const Goal = require('../models/Goal');
const LearningPlan = require('../models/LearningPlan');
const Task = require('../models/Task');
const { generateLearningPlan } = require('../services/ai.service');

// @desc    Create new learning goal and generate roadmap plan
// @route   POST /api/goals
// @access  Private
const createGoal = async (req, res, next) => {
  const { goal, domain, skillLevel, deadline, hoursPerDay } = req.body;
  const userId = req.user.id;

  try {
    const newGoal = await Goal.create({
      userId,
      goal,
      domain,
      skillLevel,
      deadline,
      hoursPerDay
    });

    // Compile learning roadmap using AI service
    const rawPlan = await generateLearningPlan({
      goal,
      domain,
      skillLevel,
      hoursPerDay,
      learningStyle: 'Practical'
    });

    // Create learning plan shell linking to goal
    const learningPlan = await LearningPlan.create({
      goalId: newGoal._id,
      userId,
      weeks: rawPlan.weeks.map(w => ({
        id: w.id,
        weekNumber: w.weekNumber,
        title: w.title,
        description: w.description,
        isExpanded: w.isExpanded,
        tasks: [] // Seed empty tasks array since they are stored in Task collection
      }))
    });

    // Seed tasks into Task collection
    const tasksToSeed = [];
    rawPlan.weeks.forEach(week => {
      week.tasks.forEach((task, idx) => {
        tasksToSeed.push({
          id: task.id || `t-${week.weekNumber}-${idx + 1}`,
          userId,
          goalId: newGoal._id,
          week: week.weekNumber,
          title: task.title,
          description: task.description || '',
          estimatedTime: task.duration || '45 mins',
          type: task.type || 'theory',
          resources: task.resources || [],
          status: 'pending',
          completed: false
        });
      });
    });

    await Task.insertMany(tasksToSeed);

    // Dynamic mapping for immediate response payload
    const planObj = learningPlan.toObject();
    planObj.weeks.forEach(week => {
      week.tasks = tasksToSeed.filter(t => t.week === week.weekNumber);
    });

    res.status(201).json({
      success: true,
      goal: newGoal,
      plan: planObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all goals for current logged-in user
// @route   GET /api/goals
// @access  Private
const getGoals = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 });
    
    const goalsWithProgress = await Promise.all(goals.map(async (g) => {
      const total = await Task.countDocuments({ goalId: g._id, status: { $ne: 'skipped' } });
      const completed = await Task.countDocuments({ goalId: g._id, status: 'completed' });
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        ...g.toObject(),
        progress
      };
    }));

    res.status(200).json({
      success: true,
      count: goals.length,
      goals: goalsWithProgress
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific goal and associated learning plan
// @route   GET /api/goals/:id
// @access  Private
const getGoalById = async (req, res, next) => {
  const userId = req.user.id;
  const goalId = req.params.id;

  try {
    const goal = await Goal.findById(goalId);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found.'
      });
    }

    if (goal.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not own this goal plan.'
      });
    }

    const plan = await LearningPlan.findOne({ goalId });
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Learning plan associated with goal not found.'
      });
    }

    // Query all tasks for this goal
    const tasks = await Task.find({ goalId, userId });

    // Inject tasks back into the weeks array dynamically for frontend compatibility
    const planObj = plan.toObject();
    planObj.weeks.forEach(week => {
      week.tasks = tasks.filter(t => t.week === week.weekNumber);
    });

    res.status(200).json({
      success: true,
      goal,
      plan: planObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update learning goal (status, etc.)
// @route   PATCH /api/goals/:id
// @access  Private
const updateGoal = async (req, res, next) => {
  const userId = req.user.id;
  const goalId = req.params.id;

  try {
    let goal = await Goal.findById(goalId);

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found.'
      });
    }

    if (goal.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.'
      });
    }

    goal = await Goal.findByIdAndUpdate(goalId, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      goal
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete goal and its roadmap plan
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = async (req, res, next) => {
  const userId = req.user.id;
  const goalId = req.params.id;

  try {
    const goal = await Goal.findById(goalId);

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found.'
      });
    }

    if (goal.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.'
      });
    }

    // Delete goal, plan, and all tasks
    await Goal.findByIdAndDelete(goalId);
    await LearningPlan.findOneAndDelete({ goalId });
    await Task.deleteMany({ goalId });

    res.status(200).json({
      success: true,
      message: 'Goal, learning plan, and tasks deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle task status (completed / pending / skipped)
// @route   PATCH /api/goals/:goalId/tasks/:taskId
// @access  Private
const toggleTaskStatus = async (req, res, next) => {
  const userId = req.user.id;
  const { goalId, taskId } = req.params;
  const { status } = req.body;

  if (!status || !['completed', 'pending', 'skipped'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid task status (completed, pending, skipped)'
    });
  }

  try {
    // Find task and update
    const task = await Task.findOne({ id: taskId, goalId, userId });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found.'
      });
    }

    task.status = status;
    task.completed = status === 'completed';
    task.completedAt = status === 'completed' ? new Date() : null;
    await task.save();

    // Return the updated roadmap structure for compatibility
    const plan = await LearningPlan.findOne({ goalId });
    const tasks = await Task.find({ goalId, userId });

    const planObj = plan.toObject();
    planObj.weeks.forEach(week => {
      week.tasks = tasks.filter(t => t.week === week.weekNumber);
    });

    res.status(200).json({
      success: true,
      plan: planObj
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  toggleTaskStatus
};
