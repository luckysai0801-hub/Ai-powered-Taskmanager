// Create Toast Container
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

// Global Toast Display Helper
window.showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSVG = '';
  if (type === 'success') {
    iconSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    iconSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `
    <span class="toast-icon">${iconSVG}</span>
    <span class="toast-content">${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger browser reflow
  toast.offsetHeight;
  toast.classList.add('show');

  // Automatically dismiss toast after 3.5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 350);
  }, 3500);
};

// Create Loader Overlay
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'loading-overlay';
loadingOverlay.innerHTML = '<div class="spinner"></div>';
document.body.appendChild(loadingOverlay);

window.showLoading = () => {
  loadingOverlay.classList.add('active');
};

window.hideLoading = () => {
  loadingOverlay.classList.remove('active');
};

// Dark Mode Toggle Setup
const initDarkMode = () => {
  const toggleBtn = document.getElementById('dark-mode-toggle');
  if (!toggleBtn) return;

  const isDark = localStorage.getItem('darkMode') === 'enabled';
  
  if (isDark) {
    document.body.classList.add('dark');
  }

  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    if (document.body.classList.contains('dark')) {
      localStorage.setItem('darkMode', 'enabled');
      window.showToast('Dark theme activated', 'info');
    } else {
      localStorage.setItem('darkMode', 'disabled');
      window.showToast('Light theme activated', 'info');
    }
  });
};

// Setup Profile Loader & Logout Click Handlers
const initUserProfile = async () => {
  const isLoginPage = window.location.pathname.includes('login.html');
  if (isLoginPage) return;

  try {
    const user = await window.API.getMe();
    const avatarImg = document.getElementById('user-avatar');
    const nameSpan = document.getElementById('user-name');

    if (avatarImg && user.avatar) avatarImg.src = user.avatar;
    if (nameSpan) nameSpan.textContent = user.name;
  } catch (error) {
    console.error('Failed to load user profile details:', error);
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      window.showLoading();
      try {
        await window.API.logout();
        window.showToast('Logged out successfully', 'success');
        setTimeout(() => {
          window.location.href = '/pages/login.html';
        }, 1000);
      } catch (err) {
        window.hideLoading();
        window.showToast('Failed to logout. Please try again', 'error');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initUserProfile();
});
