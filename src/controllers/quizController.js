const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const LearningPlan = require('../models/LearningPlan');
const { modifyRoadmapForRemediation, generateQuiz } = require('../services/ai.service');
const { checkAllAchievements } = require('../utils/achievementsEngine');

// @desc    Submit basic quiz score
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

    // Check badges
    await checkAllAchievements(userId);

    let remediated = false;
    let updatedPlan = null;

    if (score < 60) {
      console.log(`Quiz score ${score}% is below 60%. Triggering Gemini adaptive learning plan remediation...`);

      const plan = await LearningPlan.findOne({ goalId, userId });
      if (plan) {
        const tasks = await Task.find({ goalId, userId });
        const planObj = plan.toObject();
        planObj.weeks.forEach(week => {
          week.tasks = tasks.filter(t => t.week === week.weekNumber);
        });

        const nextPending = tasks
          .filter(t => t.status === 'pending')
          .sort((a, b) => a.week - b.week)[0];
        const currentWeekNum = nextPending ? nextPending.week : 1;

        const remedialPlanResult = await modifyRoadmapForRemediation(
          planObj.weeks,
          topic,
          score,
          currentWeekNum
        );

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
          tasks: []
        }));
        await plan.save();

        await Task.deleteMany({ goalId, userId, status: { $ne: 'completed' } });

        const tasksToInsert = [];
        const completedTaskIds = new Set(tasks.filter(t => t.status === 'completed').map(t => t.id));

        remedialPlanResult.weeks.forEach(week => {
          week.tasks.forEach((task, idx) => {
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

// @desc    Generate a dynamic quiz on a topic using Gemini AI
// @route   POST /api/quizzes/generate
// @access  Private
const generateDynamicQuiz = async (req, res, next) => {
  const { goalId, topic } = req.body;
  const userId = req.user.id;

  if (!goalId || !topic) {
    return res.status(400).json({ success: false, error: 'Please provide goalId and topic.' });
  }

  try {
    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const quizData = await generateQuiz(topic, goal.domain, goal.skillLevel);

    res.status(200).json({
      success: true,
      quiz: quizData.quiz
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit answers for a dynamically generated quiz
// @route   POST /api/quizzes/submit
// @access  Private
const submitDynamicQuiz = async (req, res, next) => {
  const userId = req.user.id;
  const { goalId, topic, questions, answers } = req.body;

  if (!goalId || !topic || !questions || !answers) {
    return res.status(400).json({
      success: false,
      error: 'Please provide goalId, topic, questions list, and selected answers.'
    });
  }

  try {
    let correctCount = 0;
    const feedbackList = [];
    const weakTopics = [];

    questions.forEach(q => {
      const userAns = answers[q.id];
      const isCorrect = userAns === q.answer;
      if (isCorrect) {
        correctCount++;
      } else {
        feedbackList.push({
          question: q.question,
          yourAnswer: userAns || 'None',
          correctAnswer: q.answer,
          explanation: q.explanation
        });
        weakTopics.push(q.question.substring(0, 30) + "...");
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);

    // Save to basic Quiz table for stats compatibility
    await Quiz.create({
      goalId,
      userId,
      topic,
      score,
      totalQuestions: questions.length,
      correctAnswers: correctCount
    });

    // Save to QuizAttempt
    const attempt = await QuizAttempt.create({
      userId,
      goalId,
      topic,
      score,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      feedback: {
        explanation: feedbackList.map(f => `Q: ${f.question} -> Correct: ${f.correctAnswer}. ${f.explanation}`).join('\n\n'),
        weakTopics: weakTopics.slice(0, 3),
        recommendedTopic: score < 60 ? topic : 'Subsequent syllabus week modules'
      }
    });

    // Check badges
    await checkAllAchievements(userId);

    let remediated = false;
    let updatedPlan = null;

    if (score < 60) {
      const plan = await LearningPlan.findOne({ goalId, userId });
      if (plan) {
        const tasks = await Task.find({ goalId, userId });
        const planObj = plan.toObject();
        planObj.weeks.forEach(week => {
          week.tasks = tasks.filter(t => t.week === week.weekNumber);
        });

        const nextPending = tasks
          .filter(t => t.status === 'pending')
          .sort((a, b) => a.week - b.week)[0];
        const currentWeekNum = nextPending ? nextPending.week : 1;

        const remedialPlanResult = await modifyRoadmapForRemediation(
          planObj.weeks,
          topic,
          score,
          currentWeekNum
        );

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
          tasks: []
        }));
        await plan.save();

        await Task.deleteMany({ goalId, userId, status: { $ne: 'completed' } });

        const tasksToInsert = [];
        const completedTaskIds = new Set(tasks.filter(t => t.status === 'completed').map(t => t.id));

        remedialPlanResult.weeks.forEach(week => {
          week.tasks.forEach((task, idx) => {
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
      score,
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      attempt,
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
  getQuizById,
  generateDynamicQuiz,
  submitDynamicQuiz
};
