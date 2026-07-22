const express = require('express');
const router = express.Router();
const {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  toggleTaskStatus
} = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');

// Secure all goal routes with auth protect guard
router.use(protect);

router.post('/', createGoal);
router.get('/', getGoals);
router.get('/:id', getGoalById);
router.patch('/:id', updateGoal);
router.delete('/:id', deleteGoal);
router.patch('/:goalId/tasks/:taskId', toggleTaskStatus);

module.exports = router;
