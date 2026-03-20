// ═══════════════════════════════════════════════════════════
// Earl's Kitchen — Login Page (Optimized + Roles)
// ═══════════════════════════════════════════════════════════
import { store } from '../store.js';
import { supabase } from '../supabase.js';
import { setSession, navigate } from '../utils.js';

let warmupDone = false;
function prewarmConnection() {
  if (warmupDone) return;
  warmupDone = true;
  supabase.from('stations').select('id').limit(1).then(() => {});
}

export function renderLogin(app) {
  prewarmConnection();

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
          <button type="submit" class="btn btn-primary btn-lg" id="loginBtn">Sign In</button>
          <div class="login-error" id="loginError">Invalid username or password</div>
        </form>
        <div style="margin-top:var(--space-xl);padding-top:var(--space-lg);border-top:1px solid var(--white-10);">
          <p style="font-size:0.75rem;color:var(--white-30);margin-bottom:var(--space-sm);">DEMO ACCOUNTS</p>
          <p style="font-size:0.8rem;color:var(--white-50);line-height:1.8;">
            <strong style="color:var(--gold-400);">Admin:</strong> admin / admin123<br>
            <strong style="color:var(--gold-400);">Manager:</strong> headchef / pass123<br>
            <strong style="color:var(--gold-400);">Cook:</strong> james / pass123<br>
            <span style="color:var(--white-30);">Also: souschef, sarah, mike, emma, alex (pass123)</span>
          </p>
        </div>
      </div>
    </div>`;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;

    try {
      const found = await store.authenticate(user, pass);
      if (found) {
        setSession(found);
        btn.textContent = 'Loading dashboard...';
        await Promise.all([store.getUsers(), store.getStations()]);
        navigate(found.role === 'admin' || found.role === 'manager' ? '#/admin' : '#/user');
      } else {
        document.getElementById('loginError').classList.add('visible');
        setTimeout(() => document.getElementById('loginError').classList.remove('visible'), 3000);
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    } catch (err) {
      console.error('Login error:', err);
      btn.disabled = false;
      btn.textContent = 'Sign In';
      document.getElementById('loginError').textContent = 'Connection error. Please try again.';
      document.getElementById('loginError').classList.add('visible');
      setTimeout(() => document.getElementById('loginError').classList.remove('visible'), 3000);
    }
  });
}
