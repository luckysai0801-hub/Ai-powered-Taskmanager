const BASE_URL = '/api';

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed() {
  refreshSubscribers.forEach(cb => cb());
  refreshSubscribers = [];
}

async function apiFetch(url, options = {}) {
  options.credentials = 'include';
  options.headers = options.headers || {};
  
  if (!(options.body instanceof FormData)) {
    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, options);

    if (response.status === 401) {
      if (url === '/auth/refresh') {
        window.location.href = '/pages/login.html';
        return response;
      }

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
          });

          if (refreshRes.ok) {
            isRefreshing = false;
            onRefreshed();
          } else {
            isRefreshing = false;
            window.location.href = '/pages/login.html';
            return refreshRes;
          }
        } catch (refreshErr) {
          isRefreshing = false;
          window.location.href = '/pages/login.html';
          throw refreshErr;
        }
      }

      return new Promise(resolve => {
        subscribeTokenRefresh(async () => {
          resolve(await fetch(`${BASE_URL}${url}`, options));
        });
      });
    }

    return response;
  } catch (error) {
    console.error(`API Error on ${url}:`, error);
    throw error;
  }
}

// Export API helper object globally
window.API = {
  // Auth
  getMe: async () => {
    const res = await apiFetch('/auth/me');
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },
  logout: async () => {
    const res = await apiFetch('/auth/logout', { method: 'POST' });
    if (!res.ok) throw new Error('Logout failed');
    return res.json();
  },

  // Tasks
  getTasks: async () => {
    const res = await apiFetch('/tasks');
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },
  createTask: async (taskData) => {
    const res = await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },
  updateTask: async (id, taskData) => {
    const res = await apiFetch(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(taskData)
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },
  deleteTask: async (id) => {
    const res = await apiFetch(`/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },
  getDashboardStats: async () => {
    const res = await apiFetch('/tasks/stats');
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },
  getWeeklyStats: async () => {
    const res = await apiFetch('/tasks/weekly-stats');
    if (!res.ok) throw new Error('Failed to fetch weekly completion stats');
    return res.json();
  },

  // AI
  suggestTask: async (title) => {
    const res = await apiFetch('/ai/suggest', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'AI suggest failed');
    }
    return res.json();
  },
  suggestRoutine: async () => {
    const res = await apiFetch('/ai/suggest-routine', { method: 'POST' });
    if (!res.ok) throw new Error('AI Routine suggestion failed');
    return res.json();
  },
  checkDeadlines: async () => {
    const res = await apiFetch('/ai/deadline-check', { method: 'POST' });
    if (!res.ok) throw new Error('AI Deadline checking failed');
    return res.json();
  },
  writeDescription: async (title) => {
    const res = await apiFetch('/ai/write-description', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    if (!res.ok) throw new Error('AI Description writing failed');
    return res.json();
  },
  getProductivityScore: async () => {
    const res = await apiFetch('/ai/productivity-score');
    if (!res.ok) throw new Error('AI Productivity score calculation failed');
    return res.json();
  }
};
