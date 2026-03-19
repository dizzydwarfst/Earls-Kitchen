// ═══════════════════════════════════════════════════════════
// Earl's Kitchen — User Dashboard (Cook View)
// ═══════════════════════════════════════════════════════════
import { store } from '../store.js';
import { getSession, clearSession, navigate, showToast, formatDate, getInitials } from '../utils.js';

let currentTab = 'checklist';

export function renderUserDashboard(app) {
  const session = getSession();
  if (!session || session.role !== 'cook') { navigate('#/login'); return; }

  const user = store.getUserById(session.id);
  const userStations = store.getUserStations(user.id);

  app.innerHTML = `
    <div class="user-layout">
      <div class="user-topbar">
        <span class="topbar-brand">Earl's Kitchen</span>
        <div class="topbar-user">
          <span>${user.name}</span>
          <button class="btn btn-sm btn-secondary" id="logoutBtn">Logout</button>
        </div>
      </div>
      <div class="user-main">
        <div class="tabs" style="margin-bottom:var(--space-lg);">
          <button class="tab-btn ${currentTab === 'checklist' ? 'active' : ''}" data-tab="checklist">My Shift</button>
          <button class="tab-btn ${currentTab === 'history' ? 'active' : ''}" data-tab="history">My History</button>
          <button class="tab-btn ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">Settings</button>
        </div>
        <div id="userTabContent"></div>
      </div>
    </div>`;

  app.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      app.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCurrentTab(app, user, userStations);
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearSession();
    navigate('#/login');
  });

  renderCurrentTab(app, user, userStations);
}

function renderCurrentTab(app, user, userStations) {
  const container = document.getElementById('userTabContent');
  switch (currentTab) {
    case 'checklist': renderChecklistTab(container, user, userStations); break;
    case 'history': renderHistoryTab(container, user); break;
    case 'settings': renderSettingsTab(container, user); break;
  }
}

// ═══════════════════════════════════════
// CHECKLIST TAB
// ═══════════════════════════════════════
function renderChecklistTab(container, user, userStations) {
  // Check if already completed today
  if (store.hasCompletedShiftToday(user.id)) {
    renderThankYou(container, user);
    return;
  }

  // Check for active shift
  let shift = store.getActiveShift(user.id);
  if (!shift) {
    renderStartScreen(container, user, userStations);
    return;
  }

  const activeStation = store.getStationById(shift.station);
  const dailyTasks = store.getDailyTasksForUser(user.id);
  const streak = store.getUserStreak(user.id);

  container.innerHTML = `
    <div class="animate-in" style="text-align:center;margin-bottom:var(--space-lg);">
      <h1 style="font-size:1.6rem;color:var(--gold-400);">${activeStation.name}</h1>
      <p style="color:var(--white-50);font-size:0.85rem;margin-top:var(--space-xs);">Closing Checklist — ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
      ${streak > 0 ? `<div class="streak-badge" style="margin-top:var(--space-md);">${streak} Day Streak</div>` : ''}
    </div>

    <!-- Progress Ring -->
    <div class="card animate-in stagger-1" style="text-align:center;margin-bottom:var(--space-lg);">
      <div class="progress-ring-container">
        <div class="progress-ring">
          <svg viewBox="0 0 200 200">
            <circle class="ring-bg" cx="100" cy="100" r="90"/>
            <circle class="ring-fill" cx="100" cy="100" r="90"/>
          </svg>
          <div class="ring-text">
            <div class="ring-percent">0%</div>
            <div class="ring-label">Complete</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Station Checklist -->
    <div class="card animate-in stagger-2" style="margin-bottom:var(--space-lg);">
      <div class="card-header">
        <h3>Station Tasks</h3>
        <span class="card-badge" id="stationCount">0 / ${shift.items.length}</span>
      </div>
      <div class="checklist" id="stationChecklist">
        ${shift.items.map(item => `
          <div class="checklist-item ${item.completed ? 'checked' : ''}" data-id="${item.id}">
            <div class="check-box"></div>
            <span class="check-label">${item.text}</span>
            <span class="check-tag station">Station</span>
          </div>
        `).join('')}
      </div>
    </div>

    ${dailyTasks.length > 0 ? `
    <div class="card animate-in stagger-3" style="margin-bottom:var(--space-lg);">
      <div class="card-header">
        <h3>Daily Assigned Tasks</h3>
        <span class="card-badge" id="dailyCount">0 / ${dailyTasks.length}</span>
      </div>
      <div class="checklist" id="dailyChecklist">
        ${dailyTasks.map(task => `
          <div class="checklist-item ${task.completed ? 'checked' : ''}" data-daily-id="${task.id}">
            <div class="check-box"></div>
            <span class="check-label">${task.text}</span>
            <span class="check-tag daily">Daily</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <!-- Notes & Incidents -->
    <div class="card animate-in stagger-4" style="margin-bottom:var(--space-lg);">
      <div class="card-header"><h3>Notes & Issues</h3></div>
      <div class="form-group" style="margin-bottom:var(--space-md);">
        <textarea class="form-textarea" id="shiftNotes" placeholder="Any notes about tonight's closing...">${shift.notes || ''}</textarea>
      </div>
      <button class="btn btn-sm btn-secondary" id="reportIssueBtn">Report Issue</button>
    </div>

    <!-- Finish Shift Button -->
    <div class="animate-in stagger-5" style="text-align:center;padding:var(--space-xl) 0;">
      <button class="btn btn-primary btn-lg" id="finishShiftBtn" disabled>Finish Shift</button>
      <p style="font-size:0.8rem;color:var(--white-30);margin-top:var(--space-sm);" id="finishHint">Complete all tasks to finish your shift</p>
    </div>

    <!-- Issue Modal -->
    <div class="modal-overlay" id="issueModal" style="display:none;">
      <div class="modal">
        <h2>Report an Issue</h2>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-select" id="issueType">
            <option value="equipment">Equipment Problem</option>
            <option value="supply">Supply Shortage</option>
            <option value="safety">Safety Concern</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-textarea" id="issueDesc" placeholder="Describe the issue..."></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="cancelIssue">Cancel</button>
          <button class="btn btn-primary" id="submitIssue">Submit Report</button>
        </div>
      </div>
    </div>`;

  // Init
  updateRing(shift.completionPercent);
  updateCounts(shift, dailyTasks);
  checkFinishable(shift, dailyTasks);

  // Checklist events
  document.getElementById('stationChecklist').addEventListener('click', (e) => {
    const item = e.target.closest('.checklist-item');
    if (!item) return;
    const updated = store.toggleShiftItem(shift.id, item.dataset.id);
    if (updated) {
      shift = updated;
      item.classList.toggle('checked');
      updateRing(shift.completionPercent);
      updateCounts(shift, dailyTasks);
      checkFinishable(shift, dailyTasks);
    }
  });

  const dailyList = document.getElementById('dailyChecklist');
  if (dailyList) {
    dailyList.addEventListener('click', (e) => {
      const item = e.target.closest('.checklist-item');
      if (!item) return;
      store.toggleDailyTask(item.dataset.dailyId);
      item.classList.toggle('checked');
      const tasks = store.getDailyTasksForUser(user.id);
      updateCounts(shift, tasks);
      checkFinishable(shift, tasks);
    });
  }

  document.getElementById('shiftNotes').addEventListener('blur', (e) => {
    store.updateShiftNotes(shift.id, e.target.value);
  });

  document.getElementById('reportIssueBtn').addEventListener('click', () => {
    document.getElementById('issueModal').style.display = 'flex';
  });
  document.getElementById('cancelIssue').addEventListener('click', () => {
    document.getElementById('issueModal').style.display = 'none';
  });
  document.getElementById('submitIssue').addEventListener('click', () => {
    const type = document.getElementById('issueType').value;
    const desc = document.getElementById('issueDesc').value.trim();
    if (!desc) { showToast('Please describe the issue', 'error'); return; }
    store.addIncident(user.id, shift.station, type, desc);
    document.getElementById('issueModal').style.display = 'none';
    document.getElementById('issueDesc').value = '';
    showToast('Issue reported successfully', 'success');
  });

  document.getElementById('finishShiftBtn').addEventListener('click', () => {
    if (shift.completionPercent < 100) return;
    renderThankYou(container, user);
  });
}

// ─── Start Screen ───
function renderStartScreen(container, user, userStations) {
  const stationOptions = userStations.map(stId => {
    const st = store.getStationById(stId);
    return st ? `<option value="${st.id}">${st.name}</option>` : '';
  }).join('');

  container.innerHTML = `
    <div class="animate-in" style="text-align:center;margin-bottom:var(--space-xl);">
      <h1 style="font-size:1.8rem;color:var(--gold-400);margin-bottom:var(--space-md);">Ready to Close?</h1>
      <p style="color:var(--white-50);font-size:0.95rem;margin-bottom:var(--space-xl);">
        Select which station you are working today and start your closing tasks.
      </p>
    </div>

    <div class="card animate-in stagger-1" style="max-width:500px;margin:0 auto;">
      <div class="form-group">
        <label class="form-label">Your Assigned Station</label>
        <select class="form-select" id="startStation">
          ${stationOptions || '<option value="">No stations assigned</option>'}
        </select>
      </div>
      <button class="btn btn-primary btn-lg" id="startTasksBtn" style="width:100%;margin-top:var(--space-md);" ${!stationOptions ? 'disabled' : ''}>
        Start Tasks
      </button>
    </div>`;

  document.getElementById('startTasksBtn')?.addEventListener('click', () => {
    const stationId = document.getElementById('startStation').value;
    if (!stationId) return;
    const shift = store.createShift(user.id, stationId);
    if (shift) {
      showToast('Shift started! Complete your checklist.', 'success');
      renderChecklistTab(container, user, userStations);
    }
  });
}

// ─── Thank You Screen (after shift completion) ───
function renderThankYou(container, user) {
  container.innerHTML = `
    <div class="animate-in" style="text-align:center;padding:var(--space-xxl) 0;">
      <div style="font-size:3rem;margin-bottom:var(--space-lg);color:var(--gold-400);font-family:var(--font-display);font-weight:800;">DONE</div>
      <h1 style="font-size:1.6rem;margin-bottom:var(--space-md);">Thank You, ${user.name.split(' ')[0]}!</h1>
      <p style="color:var(--white-50);font-size:1rem;margin-bottom:var(--space-md);">
        Your shift has been submitted for review.
      </p>
      <p style="color:var(--white-70);font-size:1.1rem;font-style:italic;">
        Have a great rest of the day!
      </p>
    </div>`;
}

function updateRing(percent) {
  const ring = document.querySelector('.ring-fill');
  const text = document.querySelector('.ring-percent');
  if (!ring || !text) return;
  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (percent / 100) * circumference;
  ring.style.strokeDashoffset = offset;
  text.textContent = `${percent}%`;
}

function updateCounts(shift, dailyTasks) {
  const sc = document.getElementById('stationCount');
  const dc = document.getElementById('dailyCount');
  if (sc) sc.textContent = `${shift.items.filter(i => i.completed).length} / ${shift.items.length}`;
  if (dc) dc.textContent = `${dailyTasks.filter(t => t.completed).length} / ${dailyTasks.length}`;
}

function checkFinishable(shift, dailyTasks) {
  const btn = document.getElementById('finishShiftBtn');
  const hint = document.getElementById('finishHint');
  if (!btn) return;
  const allDailyDone = dailyTasks.every(t => t.completed);
  const canFinish = shift.completionPercent === 100 && allDailyDone;
  btn.disabled = !canFinish;
  if (canFinish) {
    hint.textContent = 'All tasks complete! Finish your shift.';
    hint.style.color = 'var(--success)';
  }
}

// ═══════════════════════════════════════
// HISTORY TAB — cleanliness score + notes only (no speed)
// ═══════════════════════════════════════
function renderHistoryTab(container, user) {
  const shifts = store.getShiftsByUser(user.id).filter(s => s.scored || s.status === 'completed' || s.status === 'scored').sort((a, b) => b.date.localeCompare(a.date));
  const streak = store.getUserStreak(user.id);

  container.innerHTML = `
    <div class="animate-in" style="text-align:center;margin-bottom:var(--space-xl);">
      <h1 style="font-size:1.6rem;color:var(--gold-400);">My History</h1>
      <p style="color:var(--white-50);font-size:0.85rem;margin-top:var(--space-xs);">Your past shift closings and manager feedback</p>
      ${streak > 0 ? `<div class="streak-badge" style="margin-top:var(--space-md);">${streak} Day Streak</div>` : ''}
    </div>

    ${shifts.length === 0 ? '<div class="empty-state animate-in stagger-1"><p>No completed shifts yet. Start closing your station to build your history.</p></div>' : ''}

    <div id="historyList">
      ${shifts.map((s, i) => {
        const st = store.getStationById(s.station);
        const completedItems = s.items ? s.items.filter(item => item.completed) : [];
        const totalItems = s.items ? s.items.length : 0;
        const hasScore = s.scored && s.cleanlinessScore !== null;

        return `
        <div class="card animate-in stagger-${(i % 6) + 1}" style="margin-bottom:var(--space-lg);">
          <div class="card-header">
            <h3>${formatDate(s.date)} — ${st ? st.name : '--'}</h3>
            ${hasScore
              ? `<span class="badge badge-success">Reviewed</span>`
              : `<span class="badge badge-warning">Awaiting Review</span>`
            }
          </div>

          <!-- Completed Tasks -->
          <div style="margin-bottom:var(--space-md);">
            <h4 style="color:var(--white-50);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--space-sm);">Completed Tasks (${completedItems.length}/${totalItems})</h4>
            ${completedItems.map(item => `
              <div style="display:flex;align-items:center;gap:var(--space-sm);padding:4px 0;">
                <span style="color:var(--success);">[x]</span>
                <span style="color:var(--white-70);font-size:0.85rem;">${item.text}</span>
              </div>
            `).join('')}
          </div>

          ${s.notes ? `
          <div style="margin-bottom:var(--space-md);">
            <h4 style="color:var(--white-50);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--space-sm);">Your Notes</h4>
            <p style="color:var(--white-70);font-size:0.85rem;font-style:italic;">"${s.notes}"</p>
          </div>` : ''}

          ${hasScore ? `
          <div style="border-top:1px solid var(--white-10);padding-top:var(--space-md);">
            <h4 style="color:var(--white-50);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--space-sm);">Manager Review</h4>
            <div style="margin-bottom:var(--space-sm);">
              <span style="color:var(--white-50);font-size:0.85rem;">Cleanliness Score:</span>
              <strong style="color:var(--gold-400);font-size:1.1rem;margin-left:var(--space-sm);">${s.cleanlinessScore}/100</strong>
            </div>
            ${s.adminComments ? `<p style="color:var(--white-70);font-size:0.85rem;font-style:italic;margin-top:var(--space-sm);">"${s.adminComments}"</p>` : ''}
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

// ═══════════════════════════════════════
// SETTINGS TAB (Password Reset)
// ═══════════════════════════════════════
function renderSettingsTab(container, user) {
  const userStations = store.getUserStations(user.id);
  const stationNames = userStations.map(stId => {
    const st = store.getStationById(stId);
    return st ? st.name : '--';
  }).join(', ');

  container.innerHTML = `
    <div class="animate-in" style="text-align:center;margin-bottom:var(--space-xl);">
      <h1 style="font-size:1.6rem;color:var(--gold-400);">Settings</h1>
      <p style="color:var(--white-50);font-size:0.85rem;margin-top:var(--space-xs);">Manage your account</p>
    </div>

    <div class="card animate-in stagger-1" style="margin-bottom:var(--space-lg);">
      <div class="card-header"><h3>Profile</h3></div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:var(--space-sm) var(--space-lg);font-size:0.9rem;">
        <span style="color:var(--white-50);font-weight:600;">Name:</span><span>${user.name}</span>
        <span style="color:var(--white-50);font-weight:600;">Username:</span><span>${user.username}</span>
        <span style="color:var(--white-50);font-weight:600;">Email:</span><span>${user.email || '--'}</span>
        <span style="color:var(--white-50);font-weight:600;">Assigned Stations:</span><span>${stationNames || '--'}</span>
        <span style="color:var(--white-50);font-weight:600;">Role:</span><span style="text-transform:capitalize;">${user.role}</span>
      </div>
    </div>

    <div class="card animate-in stagger-2">
      <div class="card-header"><h3>Change Password</h3></div>
      <div class="form-group">
        <label class="form-label">Current Password</label>
        <input type="password" class="form-input" id="currentPass" placeholder="Enter current password">
      </div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <input type="password" class="form-input" id="newPass" placeholder="Enter new password (min 4 characters)">
      </div>
      <div class="form-group">
        <label class="form-label">Confirm New Password</label>
        <input type="password" class="form-input" id="confirmPass" placeholder="Confirm new password">
      </div>
      <div id="passError" style="color:var(--danger);font-size:0.85rem;margin-bottom:var(--space-md);display:none;"></div>
      <div id="passSuccess" style="color:var(--success);font-size:0.85rem;margin-bottom:var(--space-md);display:none;"></div>
      <button class="btn btn-primary" id="changePassBtn">Change Password</button>
    </div>`;

  document.getElementById('changePassBtn').addEventListener('click', () => {
    const current = document.getElementById('currentPass').value;
    const newPass = document.getElementById('newPass').value;
    const confirm = document.getElementById('confirmPass').value;
    const errEl = document.getElementById('passError');
    const successEl = document.getElementById('passSuccess');
    errEl.style.display = 'none';
    successEl.style.display = 'none';

    if (!current || !newPass || !confirm) { errEl.textContent = 'Please fill in all fields'; errEl.style.display = 'block'; return; }
    if (newPass !== confirm) { errEl.textContent = 'New passwords do not match'; errEl.style.display = 'block'; return; }

    const result = store.changePassword(user.id, current, newPass);
    if (result.success) {
      successEl.textContent = 'Password changed successfully!';
      successEl.style.display = 'block';
      document.getElementById('currentPass').value = '';
      document.getElementById('newPass').value = '';
      document.getElementById('confirmPass').value = '';
      showToast('Password updated', 'success');
    } else {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
    }
  });
}
