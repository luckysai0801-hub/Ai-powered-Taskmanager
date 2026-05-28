const express = require('express');
const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  getDashboardStats,
  getWeeklyStats
} = require('../controllers/task.controller');
const { verifyToken } = require('../middleware/verifyToken');

const router = express.Router();

router.use(verifyToken);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/stats', getDashboardStats);
router.get('/weekly-stats', getWeeklyStats);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
