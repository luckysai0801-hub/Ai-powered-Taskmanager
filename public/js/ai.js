const initAISuggest = () => {
  const suggestBtn = document.getElementById('btn-ai-suggest');
  if (!suggestBtn) return;

  suggestBtn.addEventListener('click', async () => {
    const titleInput = document.getElementById('task-title');
    if (!titleInput) return;

    const title = titleInput.value.trim();
    if (!title) {
      window.showToast('Please enter a task title first', 'error');
      return;
    }
    suggestBtn.classList.add('loading');
    suggestBtn.disabled = true;
    const originalHTML = suggestBtn.innerHTML;
    suggestBtn.innerHTML = `
      <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: spin 1s linear infinite; margin-right: 0.25rem;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
      <span>AI Thinking...</span>
    `;

    try {
      const data = await window.API.suggestTask(title);

      // Populate Priority Select
      const prioritySelect = document.getElementById('task-priority');
      if (prioritySelect) {
        prioritySelect.value = data.priority;
      }

      // Populate Date input
      const dueDateInput = document.getElementById('task-due-date');
      if (dueDateInput) {
        const date = new Date();
        date.setDate(date.getDate() + data.deadlineDays);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dueDateInput.value = `${year}-${month}-${day}`;
      }

      // Populate subtasks
      const subtasksList = document.getElementById('subtasks-list-edit');
      if (subtasksList && data.subtasks && data.subtasks.length > 0) {
        // Clear empty rows first
        const items = document.querySelectorAll('.subtask-edit-item');
        items.forEach(item => {
          const input = item.querySelector('.subtask-edit-input');
          if (input && !input.value.trim()) {
            item.remove();
          }
        });

        // Add suggested subtasks
        data.subtasks.forEach(subtaskTitle => {
          if (typeof window.appendSubtaskRow === 'function') {
            window.appendSubtaskRow(subtaskTitle, false);
          }
        });
      }

      // Set global flag so saving labels it as AI suggested
      window.isAIGeneratedFlag = true;
      window.showToast('AI suggestion applied!', 'success');
    } catch (error) {
      console.error('AI suggest script error:', error);
      window.showToast('AI unavailable, try again', 'error');
    } finally {
      suggestBtn.classList.remove('loading');
      suggestBtn.disabled = false;
      suggestBtn.innerHTML = originalHTML;
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  initAISuggest();
});
