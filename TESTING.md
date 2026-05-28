# Manual Testing Checklist — AI-Powered Task Manager

This document provides step-by-step instructions to manually verify all core features, including Google OAuth authentication, Kanban board CRUD operations, and advanced Gemini AI capabilities.

---

## 🔑 1. Authentication Tests

### [ ] Google OAuth login flow (new user)
*   **Steps to test**:
    1. Clear cookies on [http://localhost:5000](http://localhost:5000).
    2. Visit [http://localhost:5000](http://localhost:5000) (redirects to `/pages/login.html`).
    3. Click the **Sign in with Google** button.
    4. Authenticate using a new Google Account.
*   **Expected result**: User is successfully logged in and redirected to `/pages/dashboard.html`. Welcome message displays their Google profile name.
*   **Browser Console**: Look for `GET /api/auth/me` with status `200`.
*   **MongoDB Validation**: Collection `users` contains a new document where `email` matches the Google account, and `googleId` is set.

### [ ] Google OAuth login flow (returning user)
*   **Steps to test**:
    1. Log out, then return to the login screen.
    2. Click **Sign in with Google** and choose the same account as above.
*   **Expected result**: Instantly redirects to `/pages/dashboard.html` without creating a duplicate record in MongoDB.
*   **Browser Console**: `GET /api/auth/me` returns `200`.
*   **MongoDB Validation**: Collection `users` count remains the same. No duplicate emails.

### [ ] JWT access token issued and stored in cookie
*   **Steps to test**:
    1. Log in.
    2. Open Chrome Developer Tools (`F12`) -> **Application** -> **Cookies** -> `http://localhost:5000`.
*   **Expected result**: An `accessToken` cookie exists.
*   **Browser Console**: Cookie flags are `HttpOnly` and `SameSite=Lax`.
*   **MongoDB Validation**: No field check required (handled via JWT signatures).

### [ ] Refresh token issued and stored in cookie
*   **Steps to test**:
    1. Look in Chrome Developer Tools (`F12`) -> **Application** -> **Cookies**.
*   **Expected result**: A `refreshToken` cookie exists.
*   **Browser Console**: Cookie has an expiration duration of 7 days and is marked `HttpOnly`.
*   **MongoDB Validation**: No field check required.

### [ ] Protected route redirect when not logged in
*   **Steps to test**:
    1. Log out.
    2. Attempt to navigate directly to [http://localhost:5000/pages/dashboard.html](http://localhost:5000/pages/dashboard.html) in the URL bar.
*   **Expected result**: User is intercepted and forced to redirect back to `/pages/login.html`.
*   **Browser Console**: Navigations fail with a `302 Redirect` or `401 Unauthorized` API checks.
*   **MongoDB Validation**: No query required.

### [ ] Logout clears all cookies
*   **Steps to test**:
    1. Log in, then click the **Logout** button in the navbar.
*   **Expected result**: Redirected to `/pages/login.html`.
    2. Check cookies in Chrome DevTools.
*   **Expected result**: Both `accessToken` and `refreshToken` cookies are completely removed.
*   **Browser Console**: Toast message "Logged out successfully" is shown.
*   **MongoDB Validation**: No query required.

---

## 📋 2. Task CRUD & Drag-and-Drop Tests

### [ ] Create task with all fields filled
*   **Steps to test**:
    1. Go to `/pages/taskboard.html`.
    2. Click the floating **+ Add Task** button.
    3. Enter title `"Refactor Auth"`, description `"Clean tokens"`, priority `"High"`, and pick a due date.
    4. Click **Save Task**.
*   **Expected result**: Modal closes. Task card renders in the "To Do" column with a Red high-priority badge.
*   **Browser Console**: `POST /api/tasks` returns `201 Created`.
*   **MongoDB Validation**: Collection `tasks` contains document: `{ title: "Refactor Auth", priority: "High", status: "To Do" }`.

### [ ] Create task with only required fields
*   **Steps to test**:
    1. Click the floating **+** button.
    2. Input title `"Buy groceries"`, set a due date, leave description blank.
    3. Click **Save Task**.
*   **Expected result**: Task successfully created and placed in the "To Do" column.
*   **Browser Console**: `POST /api/tasks` returns `201`.
*   **MongoDB Validation**: Task document has `priority: "Medium"` (default) and `description: ""`.

### [ ] Edit existing task details
*   **Steps to test**:
    1. Click the `"Refactor Auth"` task card.
    2. Change title to `"Refactor Auth Flow"`, change priority to `"Medium"`.
    3. Click **Save Task**.
*   **Expected result**: Card content updates immediately on the board.
*   **Browser Console**: `PATCH /api/tasks/<id>` returns `200 OK`.
*   **MongoDB Validation**: In `tasks`, document `_id` updates to `{ title: "Refactor Auth Flow", priority: "Medium" }`.

### [ ] Delete task with confirmation
*   **Steps to test**:
    1. Click the `"Buy groceries"` card.
    2. Click the red **Delete Task** button at the footer.
    3. Approve the pop-up confirmation alert.
*   **Expected result**: Modal closes, and the card is permanently removed from the Kanban column.
*   **Browser Console**: `DELETE /api/tasks/<id>` returns `200`. Toast "Task deleted successfully" triggers.
*   **MongoDB Validation**: Querying `db.tasks.findOne({ title: "Buy groceries" })` returns `null`.

### [ ] Add subtasks to existing task
*   **Steps to test**:
    1. Open task board modal.
    2. Click **+ Add Subtask** twice.
    3. Write `"Step A"` and `"Step B"`.
    4. Save the task.
*   **Expected result**: The card now displays `"0/2 subtasks (0%)"` and a progress bar.
*   **Browser Console**: `PATCH /api/tasks/<id>` sends subtask array structure.
*   **MongoDB Validation**: `subtasks` field is an array of 2 elements: `[{ title: "Step A", completed: false }, { title: "Step B", completed: false }]`.

### [ ] Complete subtask & track progress
*   **Steps to test**:
    1. Open the modal again, check the box next to `"Step A"`.
    2. Click **Save Task**.
*   **Expected result**: The card now updates to `"1/2 subtasks (50%)"` with a half-filled progress bar.
*   **Browser Console**: Check patch payload where `subtasks[0].completed` is `true`.
*   **MongoDB Validation**: In `tasks`, `subtasks` array has the first item set to `completed: true`.

### [ ] Kanban Drag-and-Drop: To Do ➡️ In Progress
*   **Steps to test**:
    1. Drag `"Refactor Auth Flow"` card from **To Do** list.
    2. Drop it in **In Progress** list.
*   **Expected result**: Card settles in the column. Column counters update dynamically.
*   **Browser Console**: `PATCH /api/tasks/<id>` is fired. Toast "Task moved to In Progress" appears.
*   **MongoDB Validation**: Document updates to `status: "In Progress"`.

---

## 🤖 3. Advanced Gemini AI Feature Tests

### [ ] AI Daily Routine Suggester
*   **Steps to test**:
    1. Go to the dashboard.
    2. Click the **✨ Suggest My Day** button in the header.
*   **Expected result**: Loading overlay triggers. The popup modal opens showing 3 checklist divisions: Morning, Work, Evening, filled with unique actionable daily tasks.
*   **Browser Console**: `POST /api/ai/suggest-routine` finishes with `200`. Logs "suggested routine loaded successfully".
*   **MongoDB Validation**: Not yet added (stored in client-side memory).

### [ ] Import selected routines to Kanban
*   **Steps to test**:
    1. Check 2 items in the routine modal.
    2. Click **Add Selected to Board**.
*   **Expected result**: Modal closes. Toast "Imported 2 routine tasks! 🚀" appears.
*   **Browser Console**: Multiple `POST /api/tasks` API requests are fired.
*   **MongoDB Validation**: Collection `tasks` has 2 new items with `isAIGenerated: true`, `status: "To Do"`, and `dueDate` set to today's date.

### [ ] AI Smart Deadline Warning (Critical banner)
*   **Steps to test**:
    1. Create a task `"Critical Mission"`, set `dueDate` to **yesterday**, priority `"High"`, status `"To Do"`.
    2. Refresh the dashboard page.
*   **Expected result**: A **red warning banner** appears below summary cards saying `"Critical Mission is overdue / at risk..."`.
*   **Browser Console**: `POST /api/ai/deadline-check` returns warnings with `urgencyLevel: "critical"`.
*   **MongoDB Validation**: Database contains overdue task records.

### [ ] Warning dismissal memory
*   **Steps to test**:
    1. Click the close button **(X)** on the critical deadline warning banner.
    2. Reload the dashboard.
*   **Expected result**: The warning banner is gone and does not show up again.
*   **Browser Console**: `localStorage.getItem('dismissedWarningsList')` contains `"Critical Mission"`.
*   **MongoDB Validation**: No database update needed.

### [ ] AI Task Description Writer
*   **Steps to test**:
    1. Open task board creation modal.
    2. Enter task title `"Setup Render Web Services"`.
    3. Click **✍️ Write Description** button next to description field.
*   **Expected result**: Spinner shows, then description field is filled with a professional 2-3 sentences max paragraph. A grey label `🪄 AI written` appears below.
*   **Browser Console**: `POST /api/ai/write-description` returns `200`.
*   **MongoDB Validation**: Text field is saved upon clicking **Save Task**.

### [ ] AI Productivity Score ring animation
*   **Steps to test**:
    1. Open the dashboard.
*   **Expected result**: The 5th stat card showing "Productivity Score" animates on load. The circle ring fills smoothly, and the numeric text ticks up to a value (e.g. `85`).
*   **Browser Console**: `GET /api/ai/productivity-score` returned the exact score and motivational quote.
*   **MongoDB Validation**: Aggregation checks reflect counts.
