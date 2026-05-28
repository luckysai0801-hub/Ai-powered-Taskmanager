let allTasks = [];
let currentEditingTaskId = null;
let isAIGeneratedFlag = false;

// Format date for inputs (YYYY-MM-DD)
const formatDateForInput = (dateString) => {
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Update column headers task count
const updateColumnCounts = () => {
  const todoCount = document.querySelectorAll('#todo-list .task-card').length;
  const inProgressCount = document.querySelectorAll('#inprogress-list .task-card').length;
  const doneCount = document.querySelectorAll('#done-list .task-card').length;

  const todoBadge = document.getElementById('todo-count');
  const inProgressBadge = document.getElementById('inprogress-count');
  const doneBadge = document.getElementById('done-count');

  if (todoBadge) todoBadge.textContent = todoCount;
  if (inProgressBadge) inProgressBadge.textContent = inProgressCount;
  if (doneBadge) doneBadge.textContent = doneCount;
};

// Create a task card element
const createTaskCardElement = (task) => {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.id = task._id;

  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
  const completedSubtasks = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;

  let subtaskHTML = '';
  if (totalSubtasks > 0) {
    const percent = Math.round((completedSubtasks / totalSubtasks) * 100);
    subtaskHTML = `
      <div class="subtasks-progress">
        <div class="subtasks-text">${completedSubtasks}/${totalSubtasks} subtasks (${percent}%)</div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${percent === 100 ? 'complete' : ''}" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }

  const priorityBadge = `<span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>`;
  const aiBadge = task.isAIGenerated ? `<span class="badge badge-ai">AI Suggested</span>` : '';

  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'Done';
  const dateClass = isOverdue ? 'task-card-date overdue' : 'task-card-date';

  const dateIcon = isOverdue
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

  card.innerHTML = `
    <div class="task-card-header">
      <span class="task-card-title">${task.title}</span>
    </div>
    ${task.description ? `<p class="task-card-desc">${task.description}</p>` : ''}
    ${subtaskHTML}
    <div class="task-card-meta">
      <div class="${dateClass}">
        ${dateIcon}
        <span>${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
      <div style="display: flex; gap: 0.35rem; align-items: center;">
        ${aiBadge}
        ${priorityBadge}
      </div>
    </div>
  `;

  // Attach card edit click handler
  card.addEventListener('click', (e) => {
    // Prevent triggering edit modal if user clicks interactive items inside cards
    if (e.target.closest('.subtask-checkbox')) return;
    openTaskModal(task);
  });

  return card;
};

// Render tasks into board columns
const renderTasks = () => {
  const todoList = document.getElementById('todo-list');
  const inprogressList = document.getElementById('inprogress-list');
  const doneList = document.getElementById('done-list');

  if (!todoList || !inprogressList || !doneList) return;

  todoList.innerHTML = '';
  inprogressList.innerHTML = '';
  doneList.innerHTML = '';

  allTasks.forEach(task => {
    const card = createTaskCardElement(task);
    if (task.status === 'To Do') {
      todoList.appendChild(card);
    } else if (task.status === 'In Progress') {
      inprogressList.appendChild(card);
    } else if (task.status === 'Done') {
      doneList.appendChild(card);
    }
  });

  updateColumnCounts();
};

// Load tasks from backend
const loadBoard = async () => {
  window.showLoading();
  try {
    allTasks = await window.API.getTasks();
    renderTasks();
    checkUrlForEditing();
  } catch (error) {
    console.error('Failed to load board tasks:', error);
    window.showToast('Failed to load tasks', 'error');
  } finally {
    window.hideLoading();
  }
};

// Initialize Drag and Drop using SortableJS
const initSortable = () => {
  const columns = ['todo-list', 'inprogress-list', 'done-list'];
  columns.forEach(colId => {
    const el = document.getElementById(colId);
    if (!el) return;

    Sortable.create(el, {
      group: 'kanban-tasks',
      animation: 180,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: async (evt) => {
        const taskId = evt.item.dataset.id;
        const targetColId = evt.to.id;
        let newStatus = 'To Do';

        if (targetColId === 'inprogress-list') newStatus = 'In Progress';
        if (targetColId === 'done-list') newStatus = 'Done';

        try {
          await window.API.updateTask(taskId, { status: newStatus });
          window.showToast(`Task moved to ${newStatus}`, 'success');
          updateColumnCounts();
        } catch (error) {
          console.error('Failed to update status on drag drop:', error);
          window.showToast('Failed to update task position', 'error');
          // Reload to reset visual state
          loadBoard();
        }
      }
    });
  });
};

// Modal Operations
const openTaskModal = (task = null) => {
  const modal = document.getElementById('task-modal');
  const modalTitle = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('btn-delete-task');
  
  const titleInput = document.getElementById('task-title');
  const descInput = document.getElementById('task-desc');
  const prioritySelect = document.getElementById('task-priority');
  const dueDateInput = document.getElementById('task-due-date');
  const subtasksList = document.getElementById('subtasks-list-edit');
  const tagAiWritten = document.getElementById('tag-ai-written');

  if (!modal || !titleInput || !descInput || !prioritySelect || !dueDateInput || !subtasksList) return;

  subtasksList.innerHTML = '';
  if (tagAiWritten) tagAiWritten.style.display = 'none';

  if (task) {
    // Edit Mode
    currentEditingTaskId = task._id;
    isAIGeneratedFlag = task.isAIGenerated;
    modalTitle.textContent = 'Edit Task';
    if (deleteBtn) deleteBtn.style.display = 'block';

    // Populate fields
    titleInput.value = task.title;
    descInput.value = task.description || '';
    prioritySelect.value = task.priority;
    dueDateInput.value = formatDateForInput(task.dueDate);

    // Populate subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach(sub => appendSubtaskRow(sub.title, sub.completed));
    }
  } else {
    // Create Mode
    currentEditingTaskId = null;
    isAIGeneratedFlag = false;
    modalTitle.textContent = 'Add New Task';
    if (deleteBtn) deleteBtn.style.display = 'none';

    // Clear fields
    titleInput.value = '';
    descInput.value = '';
    prioritySelect.value = 'Medium';
    
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dueDateInput.value = formatDateForInput(tomorrow);
  }

  modal.classList.add('active');
  console.log('task details modal opened'); // intentional console.log left in
};

const closeTaskModal = () => {
  const modal = document.getElementById('task-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  currentEditingTaskId = null;
  isAIGeneratedFlag = false;
};

// Append a subtask row inside modal
const appendSubtaskRow = (title = '', completed = false) => {
  const container = document.getElementById('subtasks-list-edit');
  if (!container) return;

  const item = document.createElement('div');
  item.className = 'subtask-edit-item';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'subtask-checkbox';
  checkbox.checked = completed;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'subtask-edit-input';
  input.placeholder = 'Actionable subtask step...';
  input.value = title;
  if (completed) input.classList.add('completed');

  // Strike out on click
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      input.classList.add('completed');
    } else {
      input.classList.remove('completed');
    }
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove-subtask';
  removeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
  removeBtn.addEventListener('click', () => item.remove());

  item.appendChild(checkbox);
  item.appendChild(input);
  item.appendChild(removeBtn);
  container.appendChild(item);
  
  // Focus new subtask input if empty
  if (!title) {
    input.focus();
  }
};

// Read subtasks out of DOM structure
const readSubtasksFromDOM = () => {
  const items = document.querySelectorAll('.subtask-edit-item');
  const subtasks = [];
  items.forEach(item => {
    const input = item.querySelector('.subtask-edit-input');
    const checkbox = item.querySelector('.subtask-checkbox');
    if (input && input.value.trim()) {
      subtasks.push({
        title: input.value.trim(),
        completed: checkbox ? checkbox.checked : false
      });
    }
  });
  return subtasks;
};

// Save button action handler
const saveTask = async () => {
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const priority = document.getElementById('task-priority').value;
  const dueDate = document.getElementById('task-due-date').value;
  const subtasks = readSubtasksFromDOM();

  if (!title) {
    window.showToast('Please enter a task title', 'error');
    return;
  }
  if (!dueDate) {
    window.showToast('Please enter a due date', 'error');
    return;
  }

  const taskData = {
    title,
    description,
    priority,
    dueDate,
    subtasks,
    isAIGenerated: isAIGeneratedFlag
  };

  window.showLoading();
  try {
    if (currentEditingTaskId) {
      // Edit
      await window.API.updateTask(currentEditingTaskId, taskData);
      window.showToast('Task updated successfully', 'success');
    } else {
      // Create
      await window.API.createTask(taskData);
      window.showToast('Task created successfully', 'success');
    }
    closeTaskModal();
    loadBoard();
  } catch (error) {
    console.error('Failed to save task:', error);
    window.showToast('Error saving task', 'error');
    window.hideLoading();
  }
};

// Delete Button confirmation action
const deleteTask = async () => {
  if (!currentEditingTaskId) return;

  const confirmed = confirm('Are you sure you want to delete this task?');
  if (!confirmed) return;

  window.showLoading();
  try {
    await window.API.deleteTask(currentEditingTaskId);
    window.showToast('Task deleted successfully', 'success');
    closeTaskModal();
    loadBoard();
  } catch (error) {
    console.error('Failed to delete task:', error);
    window.showToast('Error deleting task', 'error');
    window.hideLoading();
  }
};

// If page was navigated with edit parameter, trigger modal opening
const checkUrlForEditing = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  if (editId) {
    const task = allTasks.find(t => t._id === editId);
    if (task) {
      openTaskModal(task);
      // Clear URL params without reloading to keep state clean
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
};

// Setup DOM Bindings
const setupBindings = () => {
  const openCreateBtn = document.getElementById('btn-open-create');
  const cancelBtn = document.getElementById('btn-cancel-task');
  const saveBtn = document.getElementById('btn-save-task');
  const deleteBtn = document.getElementById('btn-delete-task');
  const addSubtaskBtn = document.getElementById('btn-add-subtask-action');

  const writeDescBtn = document.getElementById('btn-ai-write-desc');
  const tagAiWritten = document.getElementById('tag-ai-written');

  if (openCreateBtn) openCreateBtn.addEventListener('click', () => openTaskModal(null));
  if (cancelBtn) cancelBtn.addEventListener('click', closeTaskModal);
  if (saveBtn) saveBtn.addEventListener('click', saveTask);
  if (deleteBtn) deleteBtn.addEventListener('click', deleteTask);
  if (addSubtaskBtn) addSubtaskBtn.addEventListener('click', () => appendSubtaskRow('', false));

  // Description writer integration
  if (writeDescBtn) {
    writeDescBtn.addEventListener('click', async () => {
      const titleInput = document.getElementById('task-title');
      const descInput = document.getElementById('task-desc');

      if (!titleInput || !titleInput.value.trim()) {
        window.showToast('Please enter a task title first! ✍️', 'info');
        return;
      }

      window.showLoading();
      try {
        const title = titleInput.value.trim();
        const data = await window.API.writeDescription(title);
        if (descInput && data.description) {
          descInput.value = data.description;
          if (tagAiWritten) tagAiWritten.style.display = 'block';
          window.showToast('AI written description generated! ✍️', 'success');
        }
      } catch (err) {
        console.error('Failed to write description:', err);
        window.showToast('Failed to write AI description', 'error');
      } finally {
        window.hideLoading();
      }
    });
  }

  // Close modal when clicking outside contents
  const modal = document.getElementById('task-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeTaskModal();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setupBindings();
  loadBoard();
  initSortable();
});
