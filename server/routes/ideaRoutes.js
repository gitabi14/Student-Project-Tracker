const express = require('express');
const router = express.Router();
const ideaController = require('../controllers/ideaController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, ideaController.getIdeas);
router.post('/', authenticateToken, ideaController.publishIdea);
router.post('/:id/join', authenticateToken, ideaController.submitJoinRequest);
router.post('/:id/requests/:requestId/respond', authenticateToken, ideaController.respondJoinRequest);
router.post('/:id/like', authenticateToken, ideaController.toggleLikeIdea);

module.exports = router;
