const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateUser } = require('../../middlewares/auth');

// History List
router.get('/history', authenticateUser, controller.getList);
// Generate New
router.post('/generate', authenticateUser, controller.generate);
// Execution Routes
router.get('/history/:id', authenticateUser, controller.getHistoryDetail);
router.get('/soal/:id', authenticateUser, controller.getSoalDetail);
router.post('/answer', authenticateUser, controller.answer);
router.post('/finish', authenticateUser, controller.finish);

module.exports = router;
