const express = require('express');
const router = express.Router();
const { submitQuiz, getQuizzes, getQuizById, generateDynamicQuiz, submitDynamicQuiz } = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', submitQuiz);
router.post('/generate', generateDynamicQuiz);
router.post('/submit', submitDynamicQuiz);
router.get('/', getQuizzes);
router.get('/:id', getQuizById);

module.exports = router;
