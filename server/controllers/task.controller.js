const mongoose = require('mongoose');
const Task = require('../models/Task');

const createTask = async (req, res) => {
  const { title, description, priority, dueDate, subtasks, isAIGenerated } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Task title is required' });
  }
  if (!dueDate) {
    return res.status(400).json({ message: 'Task due date is required' });
  }

  const task = new Task({
    title,
    description,
    priority: priority || 'Medium',
    status: 'To Do',
    dueDate,
    subtasks: subtasks || [],
    isAIGenerated: !!isAIGenerated,
    userId: req.user.id
  });

  const savedTask = await task.save();
  res.status(201).json(savedTask);
};

const getTasks = async (req, res) => {
  const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(tasks);
};

const updateTask = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const task = await Task.findOne({ _id: id, userId: req.user.id });
  if (!task) {
    return res.status(404).json({ message: 'Task not found or unauthorized' });
  }

  const fields = ['title', 'description', 'priority', 'status', 'dueDate', 'subtasks', 'isAIGenerated'];
  fields.forEach(field => {
    if (updateData[field] !== undefined) {
      task[field] = updateData[field];
    }
  });

  const updatedTask = await task.save();
  res.json(updatedTask);
};

const deleteTask = async (req, res) => {
  const { id } = req.params;
  const task = await Task.findOneAndDelete({ _id: id, userId: req.user.id });

  if (!task) {
    return res.status(404).json({ message: 'Task not found or unauthorized' });
  }

  res.json({ success: true, message: 'Task deleted successfully' });
};

const getDashboardStats = async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  const total = await Task.countDocuments({ userId });
  const completed = await Task.countDocuments({ userId, status: 'Done' });
  const inProgress = await Task.countDocuments({ userId, status: 'In Progress' });
  const overdueCount = await Task.countDocuments({
    userId,
    status: { $ne: 'Done' },
    dueDate: { $lt: now }
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const dueTodayTasks = await Task.find({
    userId,
    status: { $ne: 'Done' },
    dueDate: { $gte: startOfToday, $lte: endOfToday }
  }).sort({ priority: -1 });

  const overdueTasks = await Task.find({
    userId,
    status: { $ne: 'Done' },
    dueDate: { $lt: now }
  }).sort({ dueDate: 1 });

  res.json({
    cards: {
      total,
      completed,
      inProgress,
      overdue: overdueCount
    },
    dueToday: dueTodayTasks,
    overdueTasks: overdueTasks
  });
};

const getWeeklyStats = async (req, res) => {
  const userId = req.user.id;
  
  // Calculate date 6 days ago (for a total of 7 days: today + 6 previous days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const stats = await Task.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: 'Done',
        updatedAt: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    
    // Format to local date string matching aggregate output format YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const found = stats.find(s => s._id === dateStr);
    result.push({
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count: found ? found.count : 0
    });
  }

  res.json(result);
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  getDashboardStats,
  getWeeklyStats
};
