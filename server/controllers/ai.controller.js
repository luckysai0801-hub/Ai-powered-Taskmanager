const { GoogleGenerativeAI } = require('@google/generative-ai');
const Task = require('../models/Task');

// Helper to extract clean JSON block from LLM markdown/conversational response
const extractJson = (text) => {
  const t = text.trim();
  const firstOpen = t.indexOf('{');
  const lastClose = t.lastIndexOf('}');
  
  if (firstOpen !== -1 && lastClose !== -1) {
    return t.substring(firstOpen, lastClose + 1);
  }
  return t;
};

// Original AI suggest details handler
const suggestTaskDetails = async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Task title is required for AI suggestions' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = `I have a task called: "${title}". Suggest the priority level (Low/Medium/High), a realistic deadline in days from today, and break it into 3 to 5 actionable subtasks. Reply ONLY in this exact JSON format with no extra text:
{
  "priority": "Low | Medium | High",
  "deadlineDays": 0,
  "subtasks": []
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const cleanedText = extractJson(text);
    const data = JSON.parse(cleanedText);

    const priorityOptions = ['Low', 'Medium', 'High'];
    let priority = 'Medium';
    if (data.priority && priorityOptions.includes(data.priority.trim())) {
      priority = data.priority.trim();
    } else if (data.priority) {
      // Fuzzy match priority
      const lowerPriority = data.priority.toLowerCase();
      if (lowerPriority.includes('low')) priority = 'Low';
      if (lowerPriority.includes('high')) priority = 'High';
    }

    const deadlineDays = typeof data.deadlineDays === 'number' ? data.deadlineDays : 3;
    const subtasks = Array.isArray(data.subtasks)
      ? data.subtasks.map(s => (typeof s === 'string' ? s : s.title || String(s)))
      : [];

    res.json({
      priority,
      deadlineDays,
      subtasks
    });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(502).json({ message: 'AI unavailable, try again' });
  }
};

// FEATURE 1: AI Daily Routine Suggester
const suggestRoutine = async (req, res) => {
  // TODO: clean this up later
  // console.log('generating routine for user:', req.user.id);
  const userId = req.user.id;

  try {
    const tasks = await Task.find({ userId });
    // Let's use shorthand like 'tData' for task list details
    const tData = tasks.map(t => `- Title: "${t.title}", Priority: "${t.priority}", Status: "${t.status}"`).join('\n');

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY not configured' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `Based on these existing tasks:\n${tData || 'No current tasks. Suggest a fresh healthy day routine.'}\n
suggest a productive daily routine with morning, work, and evening tasks.
Return ONLY this exact JSON format:
{
  "morning": [{"title": "Morning task", "priority": "Low | Medium | High", "estimatedMinutes": 30}],
  "work": [{"title": "Work task", "priority": "Low | Medium | High", "estimatedMinutes": 60}],
  "evening": [{"title": "Evening task", "priority": "Low | Medium | High", "estimatedMinutes": 45}]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleanedText = extractJson(text);
    const routineJson = JSON.parse(cleanedText);
    return res.json(routineJson);
  } catch (error) {
    console.error('Routine Suggestion Error:', error);
    return res.status(502).json({ message: 'Routine suggester failed' });
  }
};

// FEATURE 2: AI Smart Deadline Warning
const deadlineCheck = async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch only incomplete tasks
    const incompleteTasks = await Task.find({ userId, status: { $ne: 'Done' } });

    // Short-circuit: if there are no incomplete tasks, no deadlines can be missed!
    if (incompleteTasks.length === 0) {
      return res.json({ warnings: [] });
    }

    // Safe Date formatter to prevent crashing on malformed dates
    const taskInfo = incompleteTasks.map(t => {
      let dateStr = 'No Due Date';
      if (t.dueDate) {
        try {
          const d = (t.dueDate instanceof Date) ? t.dueDate : new Date(t.dueDate);
          if (!isNaN(d.getTime())) {
            dateStr = d.toISOString().split('T')[0];
          }
        } catch (e) {
          // ignore date parse issues
        }
      }
      return `- Title: "${t.title}", DueDate: "${dateStr}", Priority: "${t.priority}", Status: "${t.status}"`;
    }).join('\n');

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY not configured' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `Analyze these tasks and their deadlines:\n${taskInfo}\n
Identify which tasks are at risk of being missed or overloaded (e.g. multiple high-priority tasks due very soon or past due).
Return ONLY this exact JSON format:
{
  "warnings": [{"taskTitle": "Task Title", "reason": "Friendly explanation of why it is at risk", "urgencyLevel": "critical | warning | ok"}]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleanedText = extractJson(text);
    const warningJson = JSON.parse(cleanedText);
    return res.json(warningJson);
  } catch (error) {
    console.error('Deadline Check Error:', error);
    return res.status(502).json({ message: 'Deadline checker failed' });
  }
};

// FEATURE 3: AI Task Description Writer
const writeDescription = async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'Task title is required' });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY not configured' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const prompt = `Write a clear, concise task description for: "${title}". 
2-3 sentences max. Sound like a professional developer wrote it, not AI. 
Return only the description text, nothing else. Do not use markdown backticks, formatting, or prefixes like "Description:".`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return res.json({ description: text });
  } catch (error) {
    console.error('Write Description Error:', error);
    return res.status(502).json({ message: 'Description writer failed' });
  }
};

// FEATURE 4: AI Productivity Score
const getProductivityScore = async (req, res) => {
  const userId = req.user.id;
  // const unusedVar = 'just in case'; // TODO: clean this up later

  try {
    const total = await Task.countDocuments({ userId });
    const completed = await Task.countDocuments({ userId, status: 'Done' });
    const inProgress = await Task.countDocuments({ userId, status: 'In Progress' });
    const overdue = await Task.countDocuments({
      userId,
      status: { $ne: 'Done' },
      dueDate: { $lt: new Date() }
    });

    // Intentional slightly longer manual division calculation
    let rate = 0;
    if (total > 0) {
      const divisionResult = completed / total;
      rate = Math.round(divisionResult * 100);
    }

    /* calling gemini with calculated metrics */
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY not configured' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `Given this task data:
- Total tasks: ${total}
- Completed: ${completed}
- Overdue: ${overdue}
- In progress: ${inProgress}
- Completion rate: ${rate}%

Give a productivity score out of 100 and one short motivational tip.
Return ONLY this JSON format:
{ "score": 0, "tip": "Your motivational tip here" }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleanedText = extractJson(text);
    const scoreData = JSON.parse(cleanedText);
    console.log(`Productivity score calculated: ${scoreData.score}% for user: ${userId}`); // intentional console.log left in
    return res.json(scoreData);
  } catch (error) {
    console.error('Productivity Score Error:', error);
    return res.status(502).json({ message: 'Productivity score query failed' });
  }
};

module.exports = {
  suggestTaskDetails,
  suggestRoutine,
  deadlineCheck,
  writeDescription,
  getProductivityScore
};
