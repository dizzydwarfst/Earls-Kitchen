// ═══════════════════════════════════════════════════════════
// Earl's Kitchen — Main Entry Point & Router
// ═══════════════════════════════════════════════════════════
import './style.css';
import { getSession, navigate } from './utils.js';
import { renderLogin } from './pages/login.js';
import { renderUserDashboard } from './pages/userDashboard.js';
import { renderAdminPanel } from './pages/adminPanel.js';

const app = document.getElementById('app');

function router() {
  const hash = window.location.hash || '#/login';
  const session = getSession();

  if (hash === '#/login' || hash === '' || hash === '#/') {
    if (session) {
      navigate(session.role === 'admin' ? '#/admin' : '#/user');
      return;
    }
    renderLogin(app);
  } else if (hash.startsWith('#/user')) {
    if (!session || session.role !== 'cook') { navigate('#/login'); return; }
    renderUserDashboard(app);
  } else if (hash.startsWith('#/admin')) {
    if (!session || session.role !== 'admin') { navigate('#/login'); return; }
    const view = hash.replace('#/admin/', '').replace('#/admin', '') || 'dashboard';
    renderAdminPanel(app, view);
  } else {
    navigate('#/login');
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);
router();
