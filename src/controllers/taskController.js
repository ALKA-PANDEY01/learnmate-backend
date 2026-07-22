const Task = require('../models/Task');
const Goal = require('../models/Goal');

const getTasks = async (req, res, next) => {
  const userId = req.user.id;
  const { goalId, week, search, status, type } = req.query;

  // Pagination parameters
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 100;
  const skip = (page - 1) * limit;

  try {
    const filter = { userId };
    if (goalId) filter.goalId = goalId;
    if (week) filter.week = Number(week);
    if (status) filter.status = status;
    if (type) filter.type = type;

    // Optional regex text search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Task.countDocuments(filter);
    const tasks = await Task.find(filter)
      .sort({ week: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: tasks.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create custom task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
  const userId = req.user.id;
  const { goalId, week, title, description, estimatedTime, type } = req.body;

  try {
    if (!goalId || !week || !title) {
      return res.status(400).json({
        success: false,
        error: 'Please provide goalId, week number, and task title.'
      });
    }

    const task = await Task.create({
      id: `t-cust-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      goalId,
      week: Number(week),
      title,
      description,
      estimatedTime: estimatedTime || '45 mins',
      type: type || 'practical',
      status: 'pending',
      completed: false
    });

    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task details (toggling completed etc.)
// @route   PATCH /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
  const userId = req.user.id;
  const taskId = req.params.id;

  try {
    let task = await Task.findOne({ _id: taskId, userId });

    if (!task) {
      // Fallback search by custom string id
      task = await Task.findOne({ id: taskId, userId });
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found.'
      });
    }

    const wasCompleted = task.completed;
    const fieldsToUpdate = { ...req.body };

    // Handle status mapping updates
    if (fieldsToUpdate.status === 'completed' || fieldsToUpdate.completed === true) {
      fieldsToUpdate.status = 'completed';
      fieldsToUpdate.completed = true;
      fieldsToUpdate.completedAt = new Date();
    } else if (fieldsToUpdate.status === 'pending' || fieldsToUpdate.completed === false) {
      fieldsToUpdate.status = 'pending';
      fieldsToUpdate.completed = false;
      fieldsToUpdate.completedAt = null;
    }

    // Apply updates
    Object.assign(task, fieldsToUpdate);
    await task.save();

    // If task became completed, automatically calculate learning streak & updates
    if (!wasCompleted && task.completed) {
      const goal = await Goal.findById(task.goalId);
      if (goal) {
        // Calculate Learning Streak
        // Find user's last completed task (excluding this one)
        const lastCompletedTask = await Task.findOne({
          userId,
          completed: true,
          _id: { $ne: task._id }
        }).sort({ completedAt: -1 });

        let newStreak = goal.streak;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!lastCompletedTask) {
          newStreak = 1;
        } else {
          const lastDate = new Date(lastCompletedTask.completedAt);
          lastDate.setHours(0, 0, 0, 0);

          const diffTime = Math.abs(today - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1; // broken streak, reset
          }
          // if diffDays === 0, it means they completed another task today, streak remains same
        }

        goal.streak = newStreak;
        await goal.save();
      }
    }

    // Return calculations metadata along with updated task
    const total = await Task.countDocuments({ goalId: task.goalId, status: { $ne: 'skipped' } });
    const completedCount = await Task.countDocuments({ goalId: task.goalId, status: 'completed' });
    const remainingCount = total - completedCount;
    const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    // Find current active week (lowest week with pending tasks)
    const nextPendingTask = await Task.findOne({
      goalId: task.goalId,
      status: 'pending'
    }).sort({ week: 1 });
    const currentWeekNum = nextPendingTask ? nextPendingTask.week : 12;

    res.status(200).json({
      success: true,
      task,
      calculations: {
        progress: progressPercent,
        completedTasks: completedCount,
        remainingTasks: remainingCount,
        currentWeek: currentWeekNum
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
  const userId = req.user.id;
  const taskId = req.params.id;

  try {
    let task = await Task.findOneAndDelete({ _id: taskId, userId });
    
    if (!task) {
      task = await Task.findOneAndDelete({ id: taskId, userId });
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};
