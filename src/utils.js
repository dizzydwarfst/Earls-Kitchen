// ═══════════════════════════════════════════════════════════
// Earl's Kitchen — Router & Utilities
// ═══════════════════════════════════════════════════════════

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem('earls_session')); }
  catch { return null; }
}

export function setSession(user) {
  sessionStorage.setItem('earls_session', JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem('earls_session');
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function showToast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}

export function formatTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function scoreClass(score) {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

export function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase();
}

// Simple elapsed timer
export class ElapsedTimer {
  constructor(startIso) {
    this.startTime = new Date(startIso).getTime();
    this.interval = null;
    this.el = null;
  }
  mount(el) {
    this.el = el;
    this.update();
    this.interval = setInterval(() => this.update(), 1000);
  }
  update() {
    if (!this.el) return;
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    this.el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  destroy() {
    if (this.interval) clearInterval(this.interval);
  }
}
