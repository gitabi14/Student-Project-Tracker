const express = require('express');
const router = express.Router();
const demoController = require('../controllers/demoController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/state', demoController.getDemoState);
router.post('/set-date', authenticateToken, demoController.setSimulatedDate);

module.exports = router;
