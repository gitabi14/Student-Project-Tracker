const express = require('express');
const router = express.Router();
const lifecycleController = require('../controllers/lifecycleController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Student & Faculty search
router.get('/students/search', authenticateToken, lifecycleController.searchStudents);
router.get('/faculty/search', authenticateToken, lifecycleController.searchFacultyGuides);

// Milestones
router.post('/milestones', authenticateToken, lifecycleController.createMilestone);
router.put('/milestones/status', authenticateToken, lifecycleController.updateMilestoneStatus);

// Weekly Progress Reports & Late Requests
router.post('/weekly/submit', authenticateToken, lifecycleController.submitWeeklyReport);
router.post('/weekly/review', authenticateToken, lifecycleController.reviewWeeklyReport);
router.post('/weekly/late-respond', authenticateToken, lifecycleController.respondLateRequest);

// Credits & History
router.get('/credits', authenticateToken, lifecycleController.getUserCredits);

// Project Completion
router.post('/complete', authenticateToken, lifecycleController.completeProject);

module.exports = router;
