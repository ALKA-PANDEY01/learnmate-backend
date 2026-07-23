const express = require('express');
const router = express.Router();
const { generateFlashcardsForGoal, getFlashcards, updateFlashcard, deleteFlashcard } = require('../controllers/flashcardController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/generate', generateFlashcardsForGoal);
router.get('/', getFlashcards);
router.patch('/:id', updateFlashcard);
router.delete('/:id', deleteFlashcard);

module.exports = router;
