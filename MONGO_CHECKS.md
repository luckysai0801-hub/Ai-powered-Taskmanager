# MongoDB Verification Queries — AI Task Manager

This document provides exact MongoDB shell (mongosh) / MongoDB Compass query filters to check, verify, and validate data integrity for the AI-Powered Task Manager.

---

### 👤 1. Verify User Profiles

Run this query to check if a user was successfully registered in the database on their first Google OAuth login.

```javascript
// Replace with the test email address used
db.users.findOne({ email: "sailikhit81@gmail.com" })
```

*Expected output schema:*
```json
{
  "_id": ObjectId("6654b9f2982d6b38c2084cba"),
  "googleId": "109845672920485642930",
  "name": "Sai Likhit",
  "email": "sailikhit81@gmail.com",
  "avatar": "https://lh3.googleusercontent.com/a/ALm5wu...",
  "createdAt": ISODate("2026-05-27T17:20:50.123Z"),
  "updatedAt": ISODate("2026-05-27T17:20:50.123Z"),
  "__v": 0
}
```

---

### 📋 2. Check Tasks for a Specific User

Find all task cards assigned to a specific user using their `userId` (retrieved from the User query above).

```javascript
// Replace with the user's ObjectId
db.tasks.find({ userId: ObjectId("6654b9f2982d6b38c2084cba") }).sort({ createdAt: -1 }).pretty()
```

---

### 🤖 3. Check AI-Generated / Routine Suggested Tasks

List tasks that were created using Gemini AI (either via the "AI Suggest" button in the taskboard or from the "Suggest My Day" routine list).

```javascript
db.tasks.find({ isAIGenerated: true }).pretty()
```

---

### 📊 4. Count Tasks by Column Status

Check task distribution counts across the three Kanban board status stages.

```javascript
// Count 'To Do' tasks
db.tasks.find({ status: "To Do" }).count()

// Count 'In Progress' tasks
db.tasks.find({ status: "In Progress" }).count()

// Count 'Done' tasks
db.tasks.find({ status: "Done" }).count()
```

---

### 🚨 5. Check Overdue Tasks

Query for tasks that are currently past their due dates and have NOT been marked as "Done". This matches the database check for the **Smart Deadline Warnings** feature.

```javascript
db.tasks.find({ 
  dueDate: { $lt: new Date() }, 
  status: { $ne: "Done" } 
}).pretty()
```

---

### 🎯 6. Verify Subtask Completion Details

Verify which tasks have checked subtasks or completed checklist steps.

```javascript
// Find tasks where at least one subtask is completed
db.tasks.find({ "subtasks.completed": true }).pretty()
```

---

### 📈 7. Validate Weekly Completion Statistics

This aggregation query mimics the backend `getWeeklyStats` controller logic to group tasks completed over the last 7 days and sum counts per day.

```javascript
db.tasks.aggregate([
  {
    $match: {
      status: "Done",
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
      count: { $sum: 1 }
    }
  },
  {
    $sort: { _id: 1 }
  }
])
```
