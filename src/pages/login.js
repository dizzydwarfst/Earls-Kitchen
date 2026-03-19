// ═══════════════════════════════════════════════════════════
// Earl's Kitchen — Login Page
// ═══════════════════════════════════════════════════════════
import { store } from '../store.js';
import { setSession, navigate } from '../utils.js';

export function renderLogin(app) {
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">Earl's Kitchen</div>
        <div class="login-subtitle">Line Cleaning Tracker</div>
        <form id="loginForm">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-input" id="loginUser" placeholder="Enter username" autocomplete="username" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="loginPass" placeholder="Enter password" autocomplete="current-password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-lg">Sign In</button>
          <div class="login-error" id="loginError">Invalid username or password</div>
        </form>
        <div style="margin-top:var(--space-xl);padding-top:var(--space-lg);border-top:1px solid var(--white-10);">
          <p style="font-size:0.75rem;color:var(--white-30);margin-bottom:var(--space-sm);">DEMO ACCOUNTS</p>
          <p style="font-size:0.8rem;color:var(--white-50);line-height:1.8;">
            <strong style="color:var(--gold-400);">Admin:</strong> admin / admin123<br>
            <strong style="color:var(--gold-400);">Cook:</strong> james / pass123<br>
            <span style="color:var(--white-30);">Also: sarah, mike, emma, alex (pass123)</span>
          </p>
        </div>
      </div>
    </div>`;

  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const found = store.authenticate(user, pass);
    if (found) {
      setSession(found);
      navigate(found.role === 'admin' ? '#/admin' : '#/user');
    } else {
      document.getElementById('loginError').classList.add('visible');
      setTimeout(() => document.getElementById('loginError').classList.remove('visible'), 3000);
    }
  });
}
