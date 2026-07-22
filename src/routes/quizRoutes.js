const express = require('express');
const router = express.Router();
const { submitQuiz, getQuizzes, getQuizById } = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', submitQuiz);
router.get('/', getQuizzes);
router.get('/:id', getQuizById);

module.exports = router;
