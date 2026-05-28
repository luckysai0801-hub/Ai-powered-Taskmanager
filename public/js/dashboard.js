let weeklyChart = null;

const renderWeeklyChart = (weeklyData) => {
  const canvas = document.getElementById('weeklyChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (weeklyChart) {
    weeklyChart.destroy();
  }

  const style = getComputedStyle(document.body);
  const primaryColor = style.getPropertyValue('--primary').trim() || '#4f46e5';
  const textColor = style.getPropertyValue('--text-secondary').trim() || '#475569';
  const borderColor = style.getPropertyValue('--border-color').trim() || '#e2e8f0';

  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: weeklyData.map(d => d.dayName),
      datasets: [{
        label: 'Tasks Completed',
        data: weeklyData.map(d => d.count),
        backgroundColor: primaryColor,
        borderRadius: 6,
        borderWidth: 0,
        maxBarThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: style.getPropertyValue('--bg-secondary').trim() || '#ffffff',
          titleColor: style.getPropertyValue('--text-primary').trim() || '#0f172a',
          bodyColor: style.getPropertyValue('--text-primary').trim() || '#0f172a',
          borderColor: borderColor,
          borderWidth: 1,
          padding: 10,
          displayColors: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            stepSize: 1,
            precision: 0
          },
          grid: {
            color: borderColor
          }
        },
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const renderTaskList = (tasks, listElementId, emptyMessage, isOverdue) => {
  const listElement = document.getElementById(listElementId);
  if (!listElement) return;

  listElement.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    listElement.innerHTML = `
      <div class="empty-panel">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <p>${emptyMessage}</p>
      </div>
    `;
    return;
  }

  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `panel-item ${isOverdue ? 'overdue' : 'due-today'}`;

    const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
    const completedSubtasks = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;
    const subtaskText = totalSubtasks > 0 ? `• ${completedSubtasks}/${totalSubtasks} subtasks` : '';

    const priorityBadge = `<span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>`;
    const aiBadge = task.isAIGenerated ? `<span class="badge badge-ai">AI</span>` : '';

    item.innerHTML = `
      <div class="panel-item-header">
        <span class="panel-item-title">${task.title}</span>
        <div style="display: flex; gap: 0.35rem;">
          ${aiBadge}
          ${priorityBadge}
        </div>
      </div>
      <div class="panel-item-date ${isOverdue ? 'danger' : 'warning'}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>Due: ${formatDate(task.dueDate)}</span>
        <span style="margin-left: 0.25rem;">${subtaskText}</span>
      </div>
    `;

    // Make dashboard items clickable to open in taskboard directly
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      window.location.href = `/pages/taskboard.html?edit=${task._id}`;
    });

    listElement.appendChild(item);
  });
};

const loadDashboardData = async () => {
  window.showLoading();
  // const unusedCheck = 'running checks...'; // TODO: clean this up later
  try {
    // 1. Load Stats summary cards + list columns
    const stats = await window.API.getDashboardStats();
    
    // Set card values
    document.getElementById('total-tasks-val').textContent = stats.cards.total;
    document.getElementById('completed-tasks-val').textContent = stats.cards.completed;
    document.getElementById('in-progress-val').textContent = stats.cards.inProgress;
    document.getElementById('overdue-tasks-val').textContent = stats.cards.overdue;

    // Render Lists
    renderTaskList(stats.dueToday, 'due-today-list', 'No tasks due today. Awesome!', false);
    renderTaskList(stats.overdueTasks, 'overdue-list', 'Clean sheet! No overdue tasks.', true);

    // 2. Load chart weekly stats
    const weeklyData = await window.API.getWeeklyStats();
    renderWeeklyChart(weeklyData);

    // 3. Load productivity score & deadline warnings
    await loadProductivityScore();
    await loadDeadlineCheck();

    // Re-render chart on dark mode change to update font colors dynamically
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        // Allow class toggle transit time
        setTimeout(() => renderWeeklyChart(weeklyData), 100);
      });
    }

  } catch (error) {
    console.error('Failed to populate dashboard panels:', error);
    window.showToast('Error loading dashboard data', 'error');
  } finally {
    window.hideLoading();
  }
};

// --- FEATURE 1: AI Daily Routine Suggester ---
let suggestedRoutineData = null; // store current suggestion to import later

const initRoutineSuggester = () => {
  const btnSuggest = document.getElementById('btn-suggest-day');
  const modal = document.getElementById('routine-modal');
  const btnClose = document.getElementById('btn-close-routine-modal');
  const btnDismiss = document.getElementById('btn-routine-dismiss');
  const btnAdd = document.getElementById('btn-routine-add-selected');

  if (!btnSuggest || !modal) return;

  const toggleModal = (show) => {
    if (show) modal.classList.add('active');
    else modal.classList.remove('active');
  };

  btnSuggest.addEventListener('click', async () => {
    window.showLoading();
    try {
      const routine = await window.API.suggestRoutine();
      suggestedRoutineData = routine;
      
      // Populate sections
      renderRoutineSection('routine-morning-list', routine.morning, 'morning');
      renderRoutineSection('routine-work-list', routine.work, 'work');
      renderRoutineSection('routine-evening-list', routine.evening, 'evening');

      toggleModal(true);
      window.showToast('Your AI day plan is ready! ✨', 'success');
      console.log('suggested routine loaded successfully'); // intentional console.log left in
    } catch (err) {
      console.error(err);
      window.showToast('Failed to suggest daily routine. Try again!', 'error');
    } finally {
      window.hideLoading();
    }
  });

  btnClose.addEventListener('click', () => toggleModal(false));
  btnDismiss.addEventListener('click', () => toggleModal(false));

  btnAdd.addEventListener('click', async () => {
    const checkboxes = modal.querySelectorAll('.routine-checkbox:checked');
    if (checkboxes.length === 0) {
      window.showToast('No routine tasks selected!', 'info');
      return;
    }

    window.showLoading();
    let addedCount = 0;
    try {
      for (const cb of checkboxes) {
        const type = cb.dataset.type;
        const index = parseInt(cb.dataset.index);
        const item = suggestedRoutineData[type][index];

        // Add task to database
        const today = new Date();
        today.setHours(23,59,59,999); // Due by end of today
        
        await window.API.createTask({
          title: item.title,
          description: `AI Suggested Routine Item. Estimated: ${item.estimatedMinutes} mins.`,
          priority: item.priority || 'Medium',
          dueDate: today.toISOString(),
          isAIGenerated: true,
          subtasks: []
        });
        addedCount++;
      }

      window.showToast(`Imported ${addedCount} routine tasks! 🚀`, 'success');
      toggleModal(false);
      // Reload stats
      loadDashboardData();
    } catch (err) {
      console.error('Failed to import routine items:', err);
      window.showToast('Failed to import some tasks', 'error');
    } finally {
      window.hideLoading();
    }
  });
};

const renderRoutineSection = (elId, list, type) => {
  const container = document.getElementById(elId);
  if (!container) return;
  container.innerHTML = '';

  if (!list || list.length === 0) {
    container.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; padding-left: 0.5rem;">No tasks suggested</div>`;
    return;
  }

  list.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'routine-item';
    el.innerHTML = `
      <input type="checkbox" class="routine-checkbox" checked data-type="${type}" data-index="${index}">
      <div class="routine-item-info">
        <span class="routine-item-title">${item.title}</span>
        <div class="routine-item-meta">
          <span class="badge badge-${item.priority ? item.priority.toLowerCase() : 'medium'}">${item.priority || 'Medium'}</span>
          <span style="font-size: 0.75rem; color: var(--text-secondary); background: var(--border-color); padding: 0.15rem 0.35rem; border-radius: 4px;">⏱️ ${item.estimatedMinutes}m</span>
        </div>
      </div>
    `;
    container.appendChild(el);
  });
};

// --- FEATURE 2: AI Smart Deadline Warning ---
const loadDeadlineCheck = async () => {
  // Check if warnings already dismissed today
  const dismissedToday = localStorage.getItem('dismissedWarningsDate') === new Date().toDateString();
  const dismissedTitles = JSON.parse(localStorage.getItem('dismissedWarningsList') || '[]');
  
  const container = document.getElementById('smart-warning-container');
  if (!container) return;
  container.innerHTML = '';

  try {
    const data = await window.API.checkDeadlines();
    if (!data || !data.warnings || data.warnings.length === 0) return;

    data.warnings.forEach(warn => {
      // Check if this specific warning has been dismissed
      if (dismissedToday && dismissedTitles.includes(warn.taskTitle)) return;

      const banner = document.createElement('div');
      const urgency = warn.urgencyLevel ? warn.urgencyLevel.toLowerCase() : 'ok';
      if (urgency === 'ok') return; // no banner if urgency is ok

      banner.className = `smart-warning-banner ${urgency}`;
      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span>⚠️</span>
          <span><strong>${warn.taskTitle}</strong>: ${warn.reason}</span>
        </div>
        <button class="smart-warning-btn-close">&times;</button>
      `;

      const closeBtn = banner.querySelector('.smart-warning-btn-close');
      closeBtn.addEventListener('click', () => {
        banner.style.opacity = '0';
        setTimeout(() => {
          banner.remove();
          
          // Save in localStorage
          const todayStr = new Date().toDateString();
          localStorage.setItem('dismissedWarningsDate', todayStr);
          
          const currentList = JSON.parse(localStorage.getItem('dismissedWarningsList') || '[]');
          currentList.push(warn.taskTitle);
          localStorage.setItem('dismissedWarningsList', JSON.stringify(currentList));
          
          window.showToast('Warning banner dismissed', 'info');
        }, 300);
      });

      container.appendChild(banner);
    });
  } catch (err) {
    console.error('Failed to perform AI deadline warning check:', err);
  }
};

// --- FEATURE 4: AI Productivity Score ---
const loadProductivityScore = async () => {
  const textScore = document.getElementById('productivity-score-text');
  const textTip = document.getElementById('productivity-tip');
  const ring = document.querySelector('.progress-ring__circle');
  
  if (!textScore || !textTip || !ring) return;

  try {
    const data = await window.API.getProductivityScore();
    const score = typeof data.score === 'number' ? data.score : 0;
    
    // Animate score text
    let currentScore = 0;
    const interval = setInterval(() => {
      if (currentScore >= score) {
        clearInterval(interval);
        textScore.textContent = score;
      } else {
        currentScore++;
        textScore.textContent = currentScore;
      }
    }, 15);

    // Animate circular progress ring
    const radius = ring.r.baseVal.value;
    const circumference = radius * 2 * Math.PI; // 175.93
    const offset = circumference - (score / 100) * circumference;
    ring.style.strokeDashoffset = offset;

    // Set colors: green (80-100), orange (50-79), red (0-49)
    if (score >= 80) {
      ring.setAttribute('stroke', '#22c55e'); // Green
    } else if (score >= 50) {
      ring.setAttribute('stroke', '#f97316'); // Orange
    } else {
      ring.setAttribute('stroke', '#ef4444'); // Red
    }

    textTip.innerHTML = `"${data.tip}"`;
  } catch (err) {
    console.error('Failed to load AI productivity score card:', err);
    textTip.textContent = 'Unable to fetch score.';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  initRoutineSuggester();
});
