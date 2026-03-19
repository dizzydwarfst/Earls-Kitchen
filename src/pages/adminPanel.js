// ═══════════════════════════════════════════════════════════
// Earl's Kitchen — Admin Panel
// ═══════════════════════════════════════════════════════════
import { store } from '../store.js';
import { getSession, clearSession, navigate, showToast, formatTime, formatDate, scoreClass, getInitials } from '../utils.js';

let currentAdminView = 'dashboard';

export function renderAdminPanel(app, view) {
  const session = getSession();
  if (!session || session.role !== 'admin') { navigate('#/login'); return; }
  currentAdminView = view || 'dashboard';

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar(session)}
      <div class="main-content" id="adminContent"></div>
    </div>`;

  attachSidebarEvents(session);
  renderView(currentAdminView);
}

function renderSidebar(session) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Team Members' },
    { id: 'scoring', label: 'Score Shifts' },
    { id: 'tasks', label: 'Manage Tasks' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'incidents', label: 'Incidents' },
    { id: 'invite', label: 'Invite Users' },
  ];

  return `
    <aside class="sidebar" id="adminSidebar">
      <div class="sidebar-logo">
        <h1>Earl's Kitchen</h1>
        <div class="logo-subtitle">Admin Panel</div>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(n => `
          <button class="nav-item ${currentAdminView === n.id ? 'active' : ''}" data-view="${n.id}">
            ${n.label}
          </button>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${getInitials(session.name)}</div>
          <div class="user-info">
            <div class="user-name">${session.name}</div>
            <div class="user-role">Administrator</div>
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" style="width:100%;margin-top:var(--space-md);" id="adminLogout">Logout</button>
      </div>
    </aside>`;
}

function attachSidebarEvents(session) {
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentAdminView = btn.dataset.view;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderView(currentAdminView);
    });
  });
  document.getElementById('adminLogout').addEventListener('click', () => {
    clearSession();
    navigate('#/login');
  });
}

function renderView(view) {
  const content = document.getElementById('adminContent');
  switch (view) {
    case 'dashboard': renderDashboardView(content); break;
    case 'users': renderUsersView(content); break;
    case 'scoring': renderScoringView(content); break;
    case 'tasks': renderTasksView(content); break;
    case 'leaderboard': renderLeaderboardView(content); break;
    case 'incidents': renderIncidentsView(content); break;
    case 'invite': renderInviteView(content); break;
    default: renderDashboardView(content);
  }
}

// Helper: get station names for a user (handles both stations array and legacy station string)
function getUserStationNames(user) {
  const stIds = user.stations || (user.station ? [user.station] : []);
  return stIds.map(id => store.getStationById(id)?.name || '').filter(Boolean).join(', ') || '--';
}

// ─── Dashboard View ───
function renderDashboardView(el) {
  const todayShifts = store.getTodayShifts();
  const stations = store.getStations();
  const completed = todayShifts.filter(s => s.completionPercent === 100).length;
  const inProgress = todayShifts.filter(s => s.status === 'in_progress').length;
  const needsScoring = todayShifts.filter(s => s.status === 'completed' && !s.scored).length;
  const incidents = store.getIncidents().filter(i => !i.resolved).length;

  el.innerHTML = `
    <div class="page-header animate-in">
      <h1>Dashboard</h1>
      <p>Live overview for ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card gold animate-in stagger-1">
        <div class="stat-value">${stations.length}</div>
        <div class="stat-label">Active Stations</div>
      </div>
      <div class="stat-card success animate-in stagger-2">
        <div class="stat-value">${completed}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card info animate-in stagger-3">
        <div class="stat-value">${inProgress}</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat-card warning animate-in stagger-4">
        <div class="stat-value">${needsScoring}</div>
        <div class="stat-label">Needs Scoring</div>
      </div>
    </div>
    <div class="card-header"><h3>Station Overview</h3><span style="color:var(--white-30);font-size:0.8rem;">Click a station to view details</span></div>
    <div class="station-grid" style="margin-top:var(--space-md);">
      ${stations.map((st, i) => {
        const shift = todayShifts.find(s => s.station === st.id);
        const cook = shift ? store.getUserById(shift.userId) : null;
        const pct = shift ? shift.completionPercent : 0;
        const statusLabel = !shift ? 'No shift' : shift.status === 'scored' ? 'Scored' : shift.status === 'completed' ? 'Awaiting Score' : 'In Progress';
        return `
          <div class="station-card animate-in stagger-${(i%6)+1}" data-station="${st.id}">
            <div class="station-header">
              <span class="station-name">${st.name}</span>
              <span class="badge ${pct===100?'badge-success':pct>0?'badge-info':'badge-warning'}">${statusLabel}</span>
            </div>
            <div class="station-cook">${cook ? cook.name : 'Unassigned'}</div>
            <div class="mini-progress"><div class="mini-progress-fill" style="width:${pct}%"></div></div>
            <div class="station-meta">
              <span>${pct}% complete</span>
              <span>${shift && shift.durationMinutes ? formatTime(shift.durationMinutes) : '--'}</span>
            </div>
          </div>`;
      }).join('')}
    </div>
    ${incidents > 0 ? `<div class="card animate-in" style="margin-top:var(--space-xl);border-left:3px solid var(--warning);"><p style="color:var(--warning);font-weight:600;">${incidents} unresolved incident${incidents>1?'s':''} require attention</p></div>` : ''}
    <div id="stationDetail" style="margin-top:var(--space-xl);"></div>
  `;

  el.querySelectorAll('.station-card[data-station]').forEach(card => {
    card.addEventListener('click', () => renderStationDetail(card.dataset.station));
  });
}

// ─── Station Detail (Daily Progress + Editable History) ───
function renderStationDetail(stationId) {
  const detail = document.getElementById('stationDetail');
  const station = store.getStationById(stationId);
  const todayShifts = store.getTodayShifts();
  const todayShift = todayShifts.find(s => s.station === stationId);
  const cook = todayShift ? store.getUserById(todayShift.userId) : null;
  const allShifts = store.getShiftsByStation(stationId).filter(s => s.scored).sort((a,b) => b.date.localeCompare(a.date));

  detail.innerHTML = `
    <div class="card animate-in">
      <div class="card-header">
        <h3>${station.name} — Details</h3>
        <span class="badge badge-gold">${cook ? cook.name : 'Unassigned'}</span>
      </div>

      ${todayShift ? `
      <h4 style="color:var(--white-70);margin-bottom:var(--space-md);font-size:0.9rem;">Today's Progress</h4>
      <div style="display:flex;align-items:center;gap:var(--space-lg);margin-bottom:var(--space-lg);">
        <div style="flex:1;">
          <div class="mini-progress" style="height:10px;"><div class="mini-progress-fill" style="width:${todayShift.completionPercent}%"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:var(--space-xs);font-size:0.8rem;color:var(--white-50);">
            <span>${todayShift.completionPercent}% complete</span>
            <span>${todayShift.items.filter(i => i.completed).length} / ${todayShift.items.length} items</span>
          </div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--font-display);font-size:1.4rem;font-weight:800;color:var(--white);">${todayShift.completionPercent}%</div>
        </div>
      </div>

      <h4 style="color:var(--white-70);margin-bottom:var(--space-md);font-size:0.9rem;">Today's Checklist</h4>
      <div style="margin-bottom:var(--space-lg);">
        ${todayShift.items.map(item => `
          <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm) 0;border-bottom:1px solid var(--white-05);">
            <span style="color:${item.completed ? 'var(--success)' : 'var(--white-30)'};">${item.completed ? '[x]' : '[ ]'}</span>
            <span style="color:${item.completed ? 'var(--white-50)' : 'var(--white-70)'};${item.completed ? 'text-decoration:line-through;' : ''}">${item.text}</span>
          </div>
        `).join('')}
      </div>
      ` : '<p style="color:var(--white-30);margin-bottom:var(--space-lg);">No active shift today</p>'}

      <h4 style="color:var(--white-70);margin-bottom:var(--space-md);font-size:0.9rem;">Shift History (Editable)</h4>
      ${allShifts.length ? `
      <div id="stationHistoryEditable">
        ${allShifts.slice(0, 14).map(s => {
          const u = store.getUserById(s.userId);
          return `<div style="border:1px solid var(--white-10);border-radius:var(--radius-md);padding:var(--space-md);margin-bottom:var(--space-md);" data-shift-id="${s.id}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">
              <span style="color:var(--white-70);font-weight:600;">${formatDate(s.date)} — ${u ? u.name : '--'}</span>
              <button class="btn btn-sm btn-secondary edit-history-btn" data-shift="${s.id}">Edit</button>
            </div>
            <div style="display:flex;gap:var(--space-lg);font-size:0.85rem;">
              <span>Speed: <span class="badge badge-${s.speedScore>=75?'success':s.speedScore>=50?'warning':'danger'}">${s.speedScore}</span></span>
              <span>Cleanliness: <span class="badge badge-${s.cleanlinessScore>=75?'success':s.cleanlinessScore>=50?'warning':'danger'}">${s.cleanlinessScore}</span></span>
              <span>Overall: <strong>${s.overallScore}</strong></span>
            </div>
            ${s.adminComments ? `<p style="color:var(--white-50);font-size:0.8rem;margin-top:var(--space-sm);font-style:italic;">"${s.adminComments}"</p>` : ''}
            <div class="edit-form-${s.id}" style="display:none;margin-top:var(--space-md);padding-top:var(--space-md);border-top:1px solid var(--white-10);">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-md);">
                <div>
                  <label class="form-label">Speed</label>
                  <input type="number" class="form-input" min="0" max="100" value="${s.speedScore}" id="editSpeed_${s.id}">
                </div>
                <div>
                  <label class="form-label">Cleanliness</label>
                  <input type="number" class="form-input" min="0" max="100" value="${s.cleanlinessScore}" id="editClean_${s.id}">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Comments</label>
                <textarea class="form-textarea" id="editComments_${s.id}">${s.adminComments || ''}</textarea>
              </div>
              <button class="btn btn-primary btn-sm save-edit-btn" data-shift="${s.id}">Save Changes</button>
            </div>
          </div>`;
        }).join('')}
      </div>` : '<p style="color:var(--white-30);">No history yet</p>'}
    </div>`;

  detail.scrollIntoView({ behavior: 'smooth' });

  // Edit buttons
  detail.querySelectorAll('.edit-history-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = detail.querySelector(`.edit-form-${btn.dataset.shift}`);
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  });
  detail.querySelectorAll('.save-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.shift;
      const speed = parseInt(document.getElementById(`editSpeed_${sid}`).value);
      const clean = parseInt(document.getElementById(`editClean_${sid}`).value);
      const comments = document.getElementById(`editComments_${sid}`).value;
      store.updateScoredShift(sid, speed, clean, comments);
      showToast('Shift updated!', 'success');
      renderStationDetail(stationId);
    });
  });
}

// ─── Users View ───
function renderUsersView(el) {
  const cooks = store.getUsers().filter(u => u.role === 'cook');

  el.innerHTML = `
    <div class="page-header animate-in">
      <h1>Team Members</h1>
      <p>Performance history and analytics for all line cooks</p>
    </div>
    <div class="card animate-in stagger-1">
      <table class="data-table">
        <thead><tr>
          <th>Cook</th><th>Stations</th><th>Avg Score</th><th>Avg Speed</th><th>Avg Clean</th><th>Shifts</th><th>Streak</th>
        </tr></thead>
        <tbody>
          ${cooks.map(cook => {
            const avg = store.getUserAverageScores(cook.id);
            return `<tr class="user-row" data-uid="${cook.id}" style="cursor:pointer;">
              <td><div style="display:flex;align-items:center;gap:var(--space-sm);">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--gold-400);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.7rem;color:var(--navy-900);flex-shrink:0;">${getInitials(cook.name)}</div>
                <span style="color:var(--white-90);font-weight:500;">${cook.name}</span>
              </div></td>
              <td>${getUserStationNames(cook)}</td>
              <td><span class="badge badge-${avg.overall>=75?'success':avg.overall>=50?'warning':'danger'}">${avg.overall || '--'}</span></td>
              <td>${avg.speed || '--'}</td>
              <td>${avg.cleanliness || '--'}</td>
              <td>${avg.count}</td>
              <td>${cook.streak ? cook.streak + ' days' : '--'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div id="userDetail" style="margin-top:var(--space-xl);"></div>`;

  el.querySelectorAll('.user-row').forEach(row => {
    row.addEventListener('click', () => renderUserDetail(row.dataset.uid));
  });
}

function renderUserDetail(userId) {
  const detail = document.getElementById('userDetail');
  const user = store.getUserById(userId);
  const shifts = store.getShiftsByUser(userId).filter(s => s.scored);
  const avg = store.getUserAverageScores(userId);

  detail.innerHTML = `
    <div class="card animate-in">
      <div class="card-header">
        <h3>${user.name} — Shift History</h3>
        <span class="badge badge-gold">${getUserStationNames(user)}</span>
      </div>
      <div class="score-display">
        <div class="score-circle">
          <div class="score-num ${scoreClass(avg.speed)}">${avg.speed}</div>
          <div class="score-type">Avg Speed</div>
        </div>
        <div class="score-circle">
          <div class="score-num ${scoreClass(avg.cleanliness)}">${avg.cleanliness}</div>
          <div class="score-type">Avg Clean</div>
        </div>
        <div class="score-circle">
          <div class="score-num ${scoreClass(avg.overall)}">${avg.overall}</div>
          <div class="score-type">Overall</div>
        </div>
      </div>
      ${shifts.length ? `<table class="data-table" style="margin-top:var(--space-lg);">
        <thead><tr><th>Date</th><th>Station</th><th>Speed</th><th>Clean</th><th>Overall</th><th>Comments</th></tr></thead>
        <tbody>${shifts.map(s => {
          const st = store.getStationById(s.station);
          return `<tr>
            <td>${formatDate(s.date)}</td>
            <td>${st ? st.name : '--'}</td>
            <td><span class="badge badge-${s.speedScore>=75?'success':s.speedScore>=50?'warning':'danger'}">${s.speedScore}</span></td>
            <td><span class="badge badge-${s.cleanlinessScore>=75?'success':s.cleanlinessScore>=50?'warning':'danger'}">${s.cleanlinessScore}</span></td>
            <td><strong>${s.overallScore}</strong></td>
            <td style="color:var(--white-50);max-width:200px;overflow:hidden;text-overflow:ellipsis;">${s.adminComments || '--'}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>` : '<p class="empty-state"><span class="empty-icon">--</span><br>No scored shifts yet</p>'}
    </div>`;
  detail.scrollIntoView({ behavior: 'smooth' });
}

// ─── Scoring View (with editable today's scores + history) ───
function renderScoringView(el) {
  const todayShifts = store.getTodayShifts();
  const needsScoring = todayShifts.filter(s => s.status === 'completed' && !s.scored);
  const scored = todayShifts.filter(s => s.scored);

  el.innerHTML = `
    <div class="page-header animate-in">
      <h1>Score Shifts</h1>
      <p>Review and score completed closing shifts</p>
    </div>
    ${needsScoring.length === 0 ? '<div class="empty-state animate-in stagger-1"><p>No shifts awaiting scoring right now</p></div>' : ''}
    <div id="scoringCards">
      ${needsScoring.map((shift, i) => {
        const user = store.getUserById(shift.userId);
        const station = store.getStationById(shift.station);
        return `
        <div class="card animate-in stagger-${(i%6)+1}" style="margin-bottom:var(--space-lg);" id="scoreCard_${shift.id}">
          <div class="card-header">
            <h3>${user.name} — ${station.name}</h3>
            <span class="badge badge-warning">Awaiting Score</span>
          </div>
          <p style="color:var(--white-50);font-size:0.85rem;margin-bottom:var(--space-md);">
            ${shift.items.filter(i => i.completed).length} / ${shift.items.length} items completed
            ${shift.notes ? ` | Note: "${shift.notes}"` : ''}
          </p>

          <details style="margin-bottom:var(--space-lg);">
            <summary style="cursor:pointer;color:var(--gold-400);font-size:0.85rem;font-weight:600;">View Completed Tasks</summary>
            <div style="padding:var(--space-md) 0;">
              ${shift.items.map(item => `
                <div style="display:flex;align-items:center;gap:var(--space-sm);padding:3px 0;">
                  <span style="color:${item.completed ? 'var(--success)' : 'var(--white-30)'};">${item.completed ? '[x]' : '[ ]'}</span>
                  <span style="color:${item.completed ? 'var(--white-70)' : 'var(--white-30)'};font-size:0.85rem;${item.completed ? '' : 'text-decoration:line-through;'}">${item.text}</span>
                </div>
              `).join('')}
            </div>
          </details>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xl);">
            <div>
              <label class="form-label">Speed Score</label>
              <div class="score-slider">
                <input type="range" min="0" max="100" value="75" class="speed-slider" data-shift="${shift.id}">
                <div class="score-value speed-val-${shift.id}">75</div>
              </div>
            </div>
            <div>
              <label class="form-label">Cleanliness Score</label>
              <div class="score-slider">
                <input type="range" min="0" max="100" value="75" class="clean-slider" data-shift="${shift.id}">
                <div class="score-value clean-val-${shift.id}">75</div>
              </div>
            </div>
          </div>
          <div class="form-group" style="margin-top:var(--space-lg);">
            <label class="form-label">Comments (Optional)</label>
            <textarea class="form-textarea score-comments" data-shift="${shift.id}" placeholder="Any feedback for the cook..."></textarea>
          </div>
          <div style="text-align:right;margin-top:var(--space-md);">
            <button class="btn btn-primary submit-score" data-shift="${shift.id}">Submit Score</button>
          </div>
        </div>`;
      }).join('')}
    </div>

    ${scored.length > 0 ? `
    <div class="card animate-in" style="margin-top:var(--space-lg);">
      <div class="card-header"><h3>Today's Scored Shifts (Editable)</h3></div>
      <div id="scoredEditableList">
        ${scored.map(s => {
          const u = store.getUserById(s.userId);
          const st = store.getStationById(s.station);
          return `<div style="border:1px solid var(--white-10);border-radius:var(--radius-md);padding:var(--space-md);margin-bottom:var(--space-md);" data-shift-id="${s.id}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">
              <span style="color:var(--white-70);font-weight:600;">${u.name} — ${st.name}</span>
              <button class="btn btn-sm btn-secondary edit-scored-btn" data-shift="${s.id}">Edit</button>
            </div>
            <div style="display:flex;gap:var(--space-lg);font-size:0.85rem;">
              <span>Speed: <span class="badge badge-${s.speedScore>=75?'success':s.speedScore>=50?'warning':'danger'}">${s.speedScore}</span></span>
              <span>Cleanliness: <span class="badge badge-${s.cleanlinessScore>=75?'success':s.cleanlinessScore>=50?'warning':'danger'}">${s.cleanlinessScore}</span></span>
              <span>Overall: <strong>${s.overallScore}</strong></span>
            </div>
            ${s.adminComments ? `<p style="color:var(--white-50);font-size:0.8rem;margin-top:var(--space-sm);font-style:italic;">"${s.adminComments}"</p>` : ''}
            <div class="scored-edit-form-${s.id}" style="display:none;margin-top:var(--space-md);padding-top:var(--space-md);border-top:1px solid var(--white-10);">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-md);">
                <div>
                  <label class="form-label">Speed</label>
                  <input type="number" class="form-input" min="0" max="100" value="${s.speedScore}" id="scoredSpeed_${s.id}">
                </div>
                <div>
                  <label class="form-label">Cleanliness</label>
                  <input type="number" class="form-input" min="0" max="100" value="${s.cleanlinessScore}" id="scoredClean_${s.id}">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Comments</label>
                <textarea class="form-textarea" id="scoredComments_${s.id}">${s.adminComments || ''}</textarea>
              </div>
              <button class="btn btn-primary btn-sm save-scored-btn" data-shift="${s.id}">Save Changes</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}`

  // Slider events
  el.querySelectorAll('.speed-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      el.querySelector(`.speed-val-${slider.dataset.shift}`).textContent = slider.value;
    });
  });
  el.querySelectorAll('.clean-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      el.querySelector(`.clean-val-${slider.dataset.shift}`).textContent = slider.value;
    });
  });

  el.querySelectorAll('.submit-score').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.shift;
      const speed = parseInt(el.querySelector(`.speed-slider[data-shift="${sid}"]`).value);
      const clean = parseInt(el.querySelector(`.clean-slider[data-shift="${sid}"]`).value);
      const comments = el.querySelector(`.score-comments[data-shift="${sid}"]`).value;
      store.scoreShift(sid, speed, clean, comments);
      showToast('Shift scored successfully!', 'success');
      renderScoringView(el);
    });
  });

  // Edit scored shifts
  el.querySelectorAll('.edit-scored-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = el.querySelector(`.scored-edit-form-${btn.dataset.shift}`);
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  });
  el.querySelectorAll('.save-scored-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.shift;
      const speed = parseInt(document.getElementById(`scoredSpeed_${sid}`).value);
      const clean = parseInt(document.getElementById(`scoredClean_${sid}`).value);
      const comments = document.getElementById(`scoredComments_${sid}`).value;
      store.updateScoredShift(sid, speed, clean, comments);
      showToast('Score updated!', 'success');
      renderScoringView(el);
    });
  });
}

// ─── Tasks Management View ───
function renderTasksView(el) {
  const stations = store.getStations();
  const cooks = store.getUsers().filter(u => u.role === 'cook');
  const today = new Date().toISOString().split('T')[0];

  el.innerHTML = `
    <div class="page-header animate-in">
      <h1>Manage Tasks</h1>
      <p>Edit station checklists and assign daily tasks</p>
    </div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="daily">Daily Assignments</button>
      <button class="tab-btn" data-tab="templates">Station Templates</button>
    </div>
    <div id="taskTabContent"></div>`;

  renderDailyTab();

  el.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.tab === 'daily') renderDailyTab();
      else renderTemplateTab();
    });
  });

  function renderDailyTab() {
    const container = document.getElementById('taskTabContent');
    const tasks = store.getDailyTasks(today);
    const commonTasks = store.getCommonDailyTasks();
    container.innerHTML = `
      <div class="card animate-in">
        <div class="card-header"><h3>Today's Assigned Tasks</h3></div>
        ${tasks.length ? tasks.map(t => {
          const cook = store.getUserById(t.assignedTo);
          return `<div style="display:flex;align-items:center;gap:var(--space-md);padding:var(--space-sm) 0;border-bottom:1px solid var(--white-05);">
            <span class="badge ${t.completed ? 'badge-success' : 'badge-warning'}">${t.completed ? 'Done' : 'Pending'}</span>
            <span style="flex:1;color:var(--white-70);">${t.text}</span>
            <span style="color:var(--white-50);font-size:0.8rem;">${cook ? cook.name : '--'}</span>
            <button class="btn btn-sm btn-danger remove-daily" data-id="${t.id}">X</button>
          </div>`;
        }).join('') : '<p style="color:var(--white-30);padding:var(--space-md);">No daily tasks assigned yet</p>'}
      </div>
      <div class="card animate-in stagger-1" style="margin-top:var(--space-lg);">
        <h3 style="margin-bottom:var(--space-lg);">Add Daily Task</h3>
        <div class="form-group">
          <label class="form-label">Quick Select (Common Tasks)</label>
          <select class="form-select" id="commonTaskSelect">
            <option value="">-- Pick a common task --</option>
            ${commonTasks.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div style="text-align:center;color:var(--white-30);font-size:0.8rem;margin:calc(-1 * var(--space-sm)) 0 var(--space-md);letter-spacing:2px;">OR TYPE CUSTOM</div>
        <div class="form-group">
          <label class="form-label">Task Description</label>
          <input type="text" class="form-input" id="newDailyText" placeholder="e.g. Deep clean walk-in shelves">
        </div>
        <div class="form-group">
          <label class="form-label">Assign To</label>
          <select class="form-select" id="newDailyAssign">
            ${cooks.map(c => `<option value="${c.id}">${c.name} (${getUserStationNames(c)})</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary" id="addDailyBtn">Add Task</button>
      </div>`;

    document.getElementById('commonTaskSelect').addEventListener('change', (e) => {
      if (e.target.value) document.getElementById('newDailyText').value = e.target.value;
    });

    container.querySelectorAll('.remove-daily').forEach(btn => {
      btn.addEventListener('click', () => { store.removeDailyTask(btn.dataset.id); renderDailyTab(); });
    });
    document.getElementById('addDailyBtn')?.addEventListener('click', () => {
      const text = document.getElementById('newDailyText').value.trim();
      const assign = document.getElementById('newDailyAssign').value;
      if (!text) { showToast('Enter a task description', 'error'); return; }
      store.addDailyTask(text, assign);
      showToast('Task assigned!', 'success');
      renderDailyTab();
    });
  }

  function renderTemplateTab() {
    const container = document.getElementById('taskTabContent');
    container.innerHTML = `
      <div class="card animate-in">
        <div class="card-header"><h3>Station Checklist Templates</h3></div>
        <div class="form-group">
          <label class="form-label">Select Station</label>
          <select class="form-select" id="templateStation">
            ${stations.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div id="templateItems"></div>
        <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-lg);">
          <input type="text" class="form-input" id="newTemplateItem" placeholder="New checklist item..." style="flex:1;">
          <button class="btn btn-primary" id="addTemplateBtn">Add</button>
        </div>
      </div>`;

    const loadItems = () => {
      const stId = document.getElementById('templateStation').value;
      const items = store.getChecklistTemplate(stId);
      document.getElementById('templateItems').innerHTML = items.map(item => `
        <div style="display:flex;align-items:center;gap:var(--space-md);padding:var(--space-sm) 0;border-bottom:1px solid var(--white-05);">
          <span style="flex:1;color:var(--white-70);">${item.text}</span>
          <span class="badge badge-info">${item.category}</span>
          <button class="btn btn-sm btn-danger remove-tmpl" data-station="${stId}" data-id="${item.id}">X</button>
        </div>`).join('');

      document.querySelectorAll('.remove-tmpl').forEach(btn => {
        btn.addEventListener('click', () => { store.removeChecklistItem(btn.dataset.station, btn.dataset.id); loadItems(); });
      });
    };

    document.getElementById('templateStation').addEventListener('change', loadItems);
    loadItems();

    document.getElementById('addTemplateBtn').addEventListener('click', () => {
      const text = document.getElementById('newTemplateItem').value.trim();
      const stId = document.getElementById('templateStation').value;
      if (!text) return;
      store.addChecklistItem(stId, text);
      document.getElementById('newTemplateItem').value = '';
      showToast('Item added!', 'success');
      loadItems();
    });
  }
}

// ─── Leaderboard View ───
function renderLeaderboardView(el) {
  const board = store.getLeaderboard();
  el.innerHTML = `
    <div class="page-header animate-in"><h1>Leaderboard</h1><p>Top performers this period</p></div>
    <div class="card animate-in stagger-1">
      ${board.map((cook, i) => `
        <div class="leaderboard-item">
          <div class="leaderboard-rank ${i<3?'rank-'+(i+1):'rank-other'}">${i+1}</div>
          <div class="leaderboard-info">
            <div class="leaderboard-name">${cook.name}</div>
            <div class="leaderboard-station">${getUserStationNames(cook)} | ${cook.shiftCount} shifts | ${cook.streak || 0} day streak</div>
          </div>
          <div class="leaderboard-score">${cook.avgScore}</div>
        </div>
      `).join('')}
    </div>`;
}

// ─── Incidents View ───
function renderIncidentsView(el) {
  const incidents = store.getIncidents();
  const open = incidents.filter(i => !i.resolved);
  const resolved = incidents.filter(i => i.resolved);

  el.innerHTML = `
    <div class="page-header animate-in"><h1>Incidents</h1><p>Equipment issues and supply shortages</p></div>
    <div class="card animate-in stagger-1">
      <div class="card-header"><h3>Open Issues (${open.length})</h3></div>
      ${open.length ? `<div class="incident-list">${open.map(inc => {
        const user = store.getUserById(inc.userId);
        return `<div class="incident-item">
          <div class="incident-type" style="color:var(--warning);">${inc.type.toUpperCase()}</div>
          <div class="incident-desc">${inc.description}</div>
          <div class="incident-time">${user?.name || '--'} | ${formatDate(inc.date)}</div>
          <button class="btn btn-sm btn-secondary resolve-inc" data-id="${inc.id}" style="margin-top:var(--space-sm);">Mark Resolved</button>
        </div>`;
      }).join('')}</div>` : '<p style="color:var(--white-30);padding:var(--space-md);">No open issues</p>'}
    </div>
    ${resolved.length ? `<div class="card animate-in stagger-2" style="margin-top:var(--space-lg);">
      <div class="card-header"><h3>Resolved (${resolved.length})</h3></div>
      <div class="incident-list">${resolved.map(inc => {
        const user = store.getUserById(inc.userId);
        return `<div class="incident-item" style="opacity:0.6;">
          <div class="incident-type" style="color:var(--success);">RESOLVED: ${inc.type.toUpperCase()}</div>
          <div class="incident-desc">${inc.description}</div>
          <div class="incident-time">${user?.name || '--'} | ${formatDate(inc.date)}</div>
        </div>`;
      }).join('')}</div></div>` : ''}`;

  el.querySelectorAll('.resolve-inc').forEach(btn => {
    btn.addEventListener('click', () => { store.resolveIncident(btn.dataset.id); showToast('Incident resolved', 'success'); renderIncidentsView(el); });
  });
}

// ─── Invite Users View (multi-station assignment) ───
function renderInviteView(el) {
  const stations = store.getStations();
  const invitations = store.getInvitations();

  el.innerHTML = `
    <div class="page-header animate-in">
      <h1>Invite Users</h1>
      <p>Add new team members and send invitations via email</p>
    </div>
    <div class="card animate-in stagger-1">
      <h3 style="margin-bottom:var(--space-lg);">Add New User</h3>
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-input" id="invName" placeholder="e.g. John Smith">
      </div>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" class="form-input" id="invEmail" placeholder="e.g. john@earlskitchen.com">
      </div>
      <div class="form-group">
        <label class="form-label">Username</label>
        <input type="text" class="form-input" id="invUsername" placeholder="e.g. john">
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="text" class="form-input" id="invPassword" placeholder="Temporary password">
      </div>
      <div class="form-group">
        <label class="form-label">Assign Stations (select multiple)</label>
        <div id="stationCheckboxes" style="display:flex;flex-wrap:wrap;gap:var(--space-md);padding:var(--space-sm) 0;">
          ${stations.map(s => `
            <label style="display:flex;align-items:center;gap:var(--space-xs);color:var(--white-70);cursor:pointer;">
              <input type="checkbox" value="${s.id}" class="station-checkbox"> ${s.name}
            </label>
          `).join('')}
        </div>
      </div>
      <div style="display:flex;gap:var(--space-md);">
        <button class="btn btn-primary" id="addUserBtn">Add User</button>
        <button class="btn btn-secondary" id="sendInviteBtn">Add & Send Email Invite</button>
      </div>
    </div>

    <div class="card animate-in stagger-2" style="margin-top:var(--space-lg);">
      <div class="card-header"><h3>Current Team</h3></div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Username</th><th>Stations</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>
          ${store.getUsers().map(u => `
            <tr>
              <td>${u.name}</td>
              <td>${u.username}</td>
              <td>${getUserStationNames(u)}</td>
              <td style="color:var(--white-50);">${u.email || '--'}</td>
              <td><span class="badge ${u.role === 'admin' ? 'badge-gold' : 'badge-info'}">${u.role}</span></td>
              <td>${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger remove-user" data-id="${u.id}">Remove</button>` : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${invitations.length ? `
    <div class="card animate-in stagger-3" style="margin-top:var(--space-lg);">
      <div class="card-header"><h3>Sent Invitations</h3></div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Station</th><th>Sent</th><th>Status</th></tr></thead>
        <tbody>
          ${invitations.map(inv => `
            <tr>
              <td>${inv.name}</td>
              <td>${inv.email}</td>
              <td>${inv.station ? store.getStationById(inv.station)?.name || '--' : '--'}</td>
              <td>${formatDate(inv.sentAt)}</td>
              <td><span class="badge badge-warning">${inv.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : ''}`;

  document.getElementById('addUserBtn').addEventListener('click', () => addNewUser(el, false));
  document.getElementById('sendInviteBtn').addEventListener('click', () => addNewUser(el, true));

  el.querySelectorAll('.remove-user').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Remove this user?')) {
        store.removeUser(btn.dataset.id);
        showToast('User removed', 'success');
        renderInviteView(el);
      }
    });
  });
}

function addNewUser(el, sendEmail) {
  const name = document.getElementById('invName').value.trim();
  const email = document.getElementById('invEmail').value.trim();
  const username = document.getElementById('invUsername').value.trim();
  const password = document.getElementById('invPassword').value.trim();
  const selectedStations = [...document.querySelectorAll('.station-checkbox:checked')].map(cb => cb.value);

  if (!name || !username || !password) {
    showToast('Please fill in name, username, and password', 'error');
    return;
  }

  const existing = store.getUsers().find(u => u.username === username);
  if (existing) {
    showToast('Username already exists', 'error');
    return;
  }

  store.addUser(name, username, password, email, 'cook', selectedStations);

  if (sendEmail && email) {
    store.addInvitation(email, name, selectedStations[0] || null);
    showToast(`User added and invitation email sent to ${email}`, 'success');
  } else {
    showToast('User added successfully', 'success');
  }

  renderInviteView(el);
}
