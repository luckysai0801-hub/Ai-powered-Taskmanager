const express = require('express');
const {
  suggestTaskDetails,
  suggestRoutine,
  deadlineCheck,
  writeDescription,
  getProductivityScore
} = require('../controllers/ai.controller');
const { verifyToken } = require('../middleware/verifyToken');

const router = express.Router();

router.post('/suggest', verifyToken, suggestTaskDetails);
router.post('/suggest-routine', verifyToken, suggestRoutine);
router.post('/deadline-check', verifyToken, deadlineCheck);
router.post('/write-description', verifyToken, writeDescription);
router.get('/productivity-score', verifyToken, getProductivityScore);

module.exports = router;
