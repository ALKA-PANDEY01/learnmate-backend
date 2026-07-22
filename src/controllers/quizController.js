const Quiz = require('../models/Quiz');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const LearningPlan = require('../models/LearningPlan');
const { modifyRoadmapForRemediation } = require('../services/ai.service');

// @desc    Submit quiz results and evaluate remedial adjustments
// @route   POST /api/quizzes
// @access  Private
const submitQuiz = async (req, res, next) => {
  const userId = req.user.id;
  const { goalId, topic, correctAnswers, totalQuestions } = req.body;

  if (!goalId || !topic || totalQuestions === undefined || correctAnswers === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Please provide goalId, topic, totalQuestions, and correctAnswers.'
    });
  }

  try {
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    const quiz = await Quiz.create({
      goalId,
      userId,
      topic,
      score,
      totalQuestions: Number(totalQuestions),
      correctAnswers: Number(correctAnswers)
    });

    let remediated = false;
    let updatedPlan = null;

    // Trigger remediation flow if score is below 60%
    if (score < 60) {
      console.log(`Quiz score ${score}% is below 60%. Triggering Gemini adaptive learning plan remediation...`);

      const plan = await LearningPlan.findOne({ goalId, userId });
      if (plan) {
        // Query tasks from DB to get the true, current state of the roadmap
        const tasks = await Task.find({ goalId, userId });

        // Build up-to-date plan structure for Gemini
        const planObj = plan.toObject();
        planObj.weeks.forEach(week => {
          week.tasks = tasks.filter(t => t.week === week.weekNumber);
        });

        // Determine current week (lowest week with pending tasks)
        const nextPending = tasks
          .filter(t => t.status === 'pending')
          .sort((a, b) => a.week - b.week)[0];
        const currentWeekNum = nextPending ? nextPending.week : 1;

        // Call Gemini adaptive logic to update roadmap weeks structure
        const remedialPlanResult = await modifyRoadmapForRemediation(
          planObj.weeks,
          topic,
          score,
          currentWeekNum
        );

        // Save history state & increment version on LearningPlan
        plan.history.push({
          version: plan.version,
          weeks: plan.weeks,
          updatedAt: new Date()
        });
        
        plan.version += 1;
        plan.weeks = remedialPlanResult.weeks.map(w => ({
          id: w.id,
          weekNumber: w.weekNumber,
          title: w.title,
          description: w.description,
          isExpanded: w.isExpanded,
          tasks: [] // Maintain empty nested arrays on metadata structure
        }));
        await plan.save();

        // Update Task collection: delete future pending tasks and re-seed from Gemini output
        // We delete any tasks for this goal that are still 'pending' or 'skipped' (leaving completed ones intact!)
        await Task.deleteMany({ goalId, userId, status: { $ne: 'completed' } });

        // Insert new tasks (only if they aren't already marked completed in our previous query)
        const tasksToInsert = [];
        const completedTaskIds = new Set(tasks.filter(t => t.status === 'completed').map(t => t.id));

        remedialPlanResult.weeks.forEach(week => {
          week.tasks.forEach((task, idx) => {
            // Only insert if this task wasn't already completed
            if (!completedTaskIds.has(task.id)) {
              tasksToInsert.push({
                id: task.id || `t-rev-${week.weekNumber}-${idx + 1}`,
                userId,
                goalId,
                week: week.weekNumber,
                title: task.title,
                description: task.description || '',
                estimatedTime: task.duration || '45 mins',
                type: task.type || 'theory',
                resources: task.resources || [],
                status: 'pending',
                completed: false
              });
            }
          });
        });

        if (tasksToInsert.length > 0) {
          await Task.insertMany(tasksToInsert);
        }

        // Fetch freshly integrated tasks to build return payload
        const finalTasks = await Task.find({ goalId, userId });
        const finalPlanObj = plan.toObject();
        finalPlanObj.weeks.forEach(week => {
          week.tasks = finalTasks.filter(t => t.week === week.weekNumber);
        });

        updatedPlan = finalPlanObj;
        remediated = true;
      }
    }

    res.status(201).json({
      success: true,
      quiz,
      remediated,
      plan: updatedPlan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all quizzes for user
// @route   GET /api/quizzes
// @access  Private
const getQuizzes = async (req, res, next) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  try {
    const total = await Quiz.countDocuments({ userId });
    const quizzes = await Quiz.find({ userId })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: quizzes.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      quizzes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific quiz
// @route   GET /api/quizzes/:id
// @access  Private
const getQuizById = async (req, res, next) => {
  const userId = req.user.id;
  const quizId = req.params.id;

  try {
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz details not found.'
      });
    }

    if (quiz.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.'
      });
    }

    res.status(200).json({
      success: true,
      quiz
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitQuiz,
  getQuizzes,
  getQuizById
};
