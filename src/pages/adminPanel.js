// ═══════════════════════════════════════════════════════════
// Earl's Kitchen — Admin Panel (Optimized)
// ═══════════════════════════════════════════════════════════
import { store } from '../store.js';
import { getSession, clearSession, navigate, showToast, formatTime, formatDate, scoreClass, getInitials } from '../utils.js';

let currentAdminView = 'dashboard';

export async function renderAdminPanel(app, view) {
  const session = getSession();
  if (!session || session.role !== 'admin') { navigate('#/login'); return; }
  currentAdminView = view || 'dashboard';

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar(session)}
      <div class="main-content" id="adminContent">
        <div style="text-align:center;padding:var(--space-xl);color:var(--white-50);">Loading...</div>
      </div>
    </div>`;

  attachSidebarEvents(session);
  await renderView(currentAdminView);
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
    btn.addEventListener('click', async () => {
      currentAdminView = btn.dataset.view;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await renderView(currentAdminView);
    });
  });
  document.getElementById('adminLogout').addEventListener('click', () => {
    clearSession();
    navigate('#/login');
  });
}

async function renderView(view) {
  const content = document.getElementById('adminContent');
  content.innerHTML = `<div style="text-align:center;padding:var(--space-xl);color:var(--white-50);">Loading...</div>`;
  switch (view) {
    case 'dashboard': await renderDashboardView(content); break;
    case 'users': await renderUsersView(content); break;
    case 'scoring': await renderScoringView(content); break;
    case 'tasks': await renderTasksView(content); break;
    case 'leaderboard': await renderLeaderboardView(content); break;
    case 'incidents': await renderIncidentsView(content); break;
    case 'invite': await renderInviteView(content); break;
    default: await renderDashboardView(content);
  }
}

// Helper: get station names from cached data
function getStationNamesFromCache(user, stationsMap) {
  const stIds = user.stations || [];
  return stIds.map(id => stationsMap.get(id)?.name).filter(Boolean).join(', ') || '--';
}

// ─── Dashboard View ───
async function renderDashboardView(el) {
  // 3 parallel fetches instead of 15+ sequential ones
  const [todayShifts, stations, users, allIncidents] = await Promise.all([
    store.getTodayShifts(),
    store.getStations(),
    store.getUsers(),
    store.getIncidents(),
  ]);

  const usersMap = new Map(users.map(u => [u.id, u]));
  const completed = todayShifts.filter(s => s.completionPercent === 100).length;
  const inProgress = todayShifts.filter(s => s.status === 'in_progress').length;
  const needsScoring = todayShifts.filter(s => s.status === 'completed' && !s.scored).length;
  const incidents = allIncidents.filter(i => !i.resolved).length;

  const stationCards = stations.map(st => {
    const shift = todayShifts.find(s => s.station === st.id);
    const cook = shift ? usersMap.get(shift.userId) : null;
    const pct = shift ? shift.completionPercent : 0;
    const statusLabel = !shift ? 'No shift' : shift.status === 'scored' ? 'Scored' : shift.status === 'completed' ? 'Awaiting Score' : 'In Progress';
    return { st, shift, cookName: cook ? cook.name : 'Unassigned', pct, statusLabel };
  });

  el.innerHTML = `
    <div class="page-header animate-in">
      <h1>Dashboard</h1>
      <p>Live overview for ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card gold animate-in stagger-1"><div class="stat-value">${stations.length}</div><div class="stat-label">Active Stations</div></div>
      <div class="stat-card success animate-in stagger-2"><div class="stat-value">${completed}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card info animate-in stagger-3"><div class="stat-value">${inProgress}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card warning animate-in stagger-4"><div class="stat-value">${needsScoring}</div><div class="stat-label">Needs Scoring</div></div>
    </div>
    <div class="station-grid" style="margin-top:var(--space-md);">
      ${stationCards.map((c, i) => `
        <div class="station-card animate-in stagger-${(i%6)+1}" data-station="${c.st.id}">
          <div class="station-header">
            <span class="station-name">${c.st.name}</span>
            <span class="badge ${c.pct===100?'badge-success':c.pct>0?'badge-info':'badge-warning'}">${c.statusLabel}</span>
          </div>
          <div class="station-cook">${c.cookName}</div>
          <div class="mini-progress"><div class="mini-progress-fill" style="width:${c.pct}%"></div></div>
          <div class="station-meta">
            <span>${c.pct}% complete</span>
            <span>${c.shift && c.shift.durationMinutes ? formatTime(c.shift.durationMinutes) : '--'}</span>
          </div>
        </div>
      `).join('')}
    </div>
    ${incidents > 0 ? `<div class="card animate-in" style="margin-top:var(--space-xl);border-left:3px solid var(--warning);"><p style="color:var(--warning);font-weight:600;">${incidents} unresolved incident${incidents>1?'s':''} require attention</p></div>` : ''}
    <div id="stationDetail" style="margin-top:var(--space-xl);"></div>`;

  el.querySelectorAll('.station-card[data-station]').forEach(card => {
    card.addEventListener('click', () => renderStationDetail(card.dataset.station));
  });
}

// ─── Station Detail ───
async function renderStationDetail(stationId) {
  const detail = document.getElementById('stationDetail');
  detail.innerHTML = `<div style="text-align:center;padding:var(--space-lg);color:var(--white-50);">Loading...</div>`;

  const [station, todayShifts, users, allShifts] = await Promise.all([
    store.getStationById(stationId),
    store.getTodayShifts(),
    store.getUsers(),
    store.getShiftsByStation(stationId),
  ]);

  const usersMap = new Map(users.map(u => [u.id, u]));
  const todayShift = todayShifts.find(s => s.station === stationId);
  const cook = todayShift ? usersMap.get(todayShift.userId) : null;
  const scoredShifts = allShifts.filter(s => s.scored).sort((a, b) => b.date.localeCompare(a.date));

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

      <h4 style="color:var(--white-70);margin-bottom:var(--space-md);font-size:0.9rem;">Shift History</h4>
      ${scoredShifts.length ? `
      <div>
        ${scoredShifts.slice(0, 14).map(s => {
          const u = usersMap.get(s.userId);
          return `<div style="border:1px solid var(--white-10);border-radius:var(--radius-md);padding:var(--space-md);margin-bottom:var(--space-md);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">
              <span style="color:var(--white-70);font-weight:600;">${formatDate(s.date)} — ${u ? u.name : '--'}</span>
            </div>
            <div style="display:flex;gap:var(--space-lg);font-size:0.85rem;">
              <span>Speed: <span class="badge badge-${s.speedScore>=75?'success':s.speedScore>=50?'warning':'danger'}">${s.speedScore}</span></span>
              <span>Cleanliness: <span class="badge badge-${s.cleanlinessScore>=75?'success':s.cleanlinessScore>=50?'warning':'danger'}">${s.cleanlinessScore}</span></span>
              <span>Overall: <strong>${s.overallScore}</strong></span>
            </div>
            ${s.adminComments ? `<p style="color:var(--white-50);font-size:0.8rem;margin-top:var(--space-sm);font-style:italic;">"${s.adminComments}"</p>` : ''}
          </div>`;
        }).join('')}
      </div>` : '<p style="color:var(--white-30);">No history yet</p>'}
    </div>`;

  detail.scrollIntoView({ behavior: 'smooth' });
}

// ─── Users View ───
async function renderUsersView(el) {
  const [users, stations] = await Promise.all([store.getUsers(), store.getStations()]);
  const stationsMap = new Map(stations.map(s => [s.id, s]));
  const cooks = users.filter(u => u.role === 'cook');

  // Batch fetch all scores at once
  const scorePromises = cooks.map(c => store.getUserAverageScores(c.id));
  const scores = await Promise.all(scorePromises);

  const rows = cooks.map((cook, i) => ({
    cook,
    avg: scores[i],
    stNames: getStationNamesFromCache(cook, stationsMap),
  }));

  el.innerHTML = `
    <div class="page-header animate-in"><h1>Team Members</h1><p>Performance history and analytics</p></div>
    <div class="card animate-in stagger-1">
      <table class="data-table">
        <thead><tr><th>Cook</th><th>Stations</th><th>Avg Score</th><th>Avg Speed</th><th>Avg Clean</th><th>Shifts</th><th>Streak</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr class="user-row" data-uid="${r.cook.id}" style="cursor:pointer;">
              <td><div style="display:flex;align-items:center;gap:var(--space-sm);">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--gold-400);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.7rem;color:var(--navy-900);">${getInitials(r.cook.name)}</div>
                <span style="color:var(--white-90);font-weight:500;">${r.cook.name}</span>
              </div></td>
              <td>${r.stNames}</td>
              <td><span class="badge badge-${r.avg.overall>=75?'success':r.avg.overall>=50?'warning':'danger'}">${r.avg.overall || '--'}</span></td>
              <td>${r.avg.speed || '--'}</td>
              <td>${r.avg.cleanliness || '--'}</td>
              <td>${r.avg.count}</td>
              <td>${r.cook.streak ? r.cook.streak + ' days' : '--'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div id="userDetail" style="margin-top:var(--space-xl);"></div>`;

  el.querySelectorAll('.user-row').forEach(row => {
    row.addEventListener('click', () => renderUserDetail(row.dataset.uid));
  });
}

async function renderUserDetail(userId) {
  const detail = document.getElementById('userDetail');
  detail.innerHTML = `<div style="text-align:center;padding:var(--space-lg);color:var(--white-50);">Loading...</div>`;

  const [user, shifts, avg, stations] = await Promise.all([
    store.getUserById(userId),
    store.getShiftsByUser(userId),
    store.getUserAverageScores(userId),
    store.getStations(),
  ]);

  const stationsMap = new Map(stations.map(s => [s.id, s]));
  const stNames = getStationNamesFromCache(user, stationsMap);
  const scoredShifts = shifts.filter(s => s.scored);

  detail.innerHTML = `
    <div class="card animate-in">
      <div class="card-header">
        <h3>${user.name} — Shift History</h3>
        <span class="badge badge-gold">${stNames}</span>
      </div>
      <div class="score-display">
        <div class="score-circle"><div class="score-num ${scoreClass(avg.speed)}">${avg.speed}</div><div class="score-type">Avg Speed</div></div>
        <div class="score-circle"><div class="score-num ${scoreClass(avg.cleanliness)}">${avg.cleanliness}</div><div class="score-type">Avg Clean</div></div>
        <div class="score-circle"><div class="score-num ${scoreClass(avg.overall)}">${avg.overall}</div><div class="score-type">Overall</div></div>
      </div>
      ${scoredShifts.length ? `<table class="data-table" style="margin-top:var(--space-lg);">
        <thead><tr><th>Date</th><th>Station</th><th>Speed</th><th>Clean</th><th>Overall</th><th>Comments</th></tr></thead>
        <tbody>${scoredShifts.map(s => {
          const st = stationsMap.get(s.station);
          return `<tr>
            <td>${formatDate(s.date)}</td>
            <td>${st ? st.name : '--'}</td>
            <td><span class="badge badge-${s.speedScore>=75?'success':s.speedScore>=50?'warning':'danger'}">${s.speedScore}</span></td>
            <td><span class="badge badge-${s.cleanlinessScore>=75?'success':s.cleanlinessScore>=50?'warning':'danger'}">${s.cleanlinessScore}</span></td>
            <td><strong>${s.overallScore}</strong></td>
            <td style="color:var(--white-50);max-width:200px;overflow:hidden;text-overflow:ellipsis;">${s.adminComments || '--'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>` : '<p class="empty-state"><span class="empty-icon">--</span><br>No scored shifts yet</p>'}
    </div>`;
  detail.scrollIntoView({ behavior: 'smooth' });
}

// ─── Scoring View ───
async function renderScoringView(el) {
  const [todayShifts, users, stations] = await Promise.all([
    store.getTodayShifts(),
    store.getUsers(),
    store.getStations(),
  ]);

  const usersMap = new Map(users.map(u => [u.id, u]));
  const stationsMap = new Map(stations.map(s => [s.id, s]));

  const needsScoring = todayShifts.filter(s => s.status === 'completed' && !s.scored);
  const scored = todayShifts.filter(s => s.scored);

  el.innerHTML = `
    <div class="page-header animate-in"><h1>Score Shifts</h1><p>Review and score completed closing shifts</p></div>
    ${needsScoring.length === 0 ? '<div class="empty-state animate-in stagger-1"><p>No shifts awaiting scoring right now</p></div>' : ''}
    <div id="scoringCards">
      ${needsScoring.map((shift, i) => {
        const user = usersMap.get(shift.userId);
        const station = stationsMap.get(shift.station);
        return `
        <div class="card animate-in stagger-${(i%6)+1}" style="margin-bottom:var(--space-lg);">
          <div class="card-header">
            <h3>${user?.name || '--'} — ${station?.name || '--'}</h3>
            <span class="badge badge-warning">Awaiting Score</span>
          </div>
          <p style="color:var(--white-50);font-size:0.85rem;margin-bottom:var(--space-md);">
            ${shift.items.filter(i => i.completed).length} / ${shift.items.length} items completed
          </p>
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
            <textarea class="form-textarea score-comments" data-shift="${shift.id}" placeholder="Any feedback..."></textarea>
          </div>
          <div style="text-align:right;margin-top:var(--space-md);">
            <button class="btn btn-primary submit-score" data-shift="${shift.id}">Submit Score</button>
          </div>
        </div>`;
      }).join('')}
    </div>

    ${scored.length > 0 ? `
    <div class="card animate-in" style="margin-top:var(--space-lg);">
      <div class="card-header"><h3>Today's Scored Shifts</h3></div>
      ${scored.map(s => {
        const u = usersMap.get(s.userId);
        const st = stationsMap.get(s.station);
        return `
        <div style="border:1px solid var(--white-10);border-radius:var(--radius-md);padding:var(--space-md);margin-bottom:var(--space-md);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">
            <span style="color:var(--white-70);font-weight:600;">${u?.name || '--'} — ${st?.name || '--'}</span>
          </div>
          <div style="display:flex;gap:var(--space-lg);font-size:0.85rem;">
            <span>Speed: <span class="badge badge-${s.speedScore>=75?'success':s.speedScore>=50?'warning':'danger'}">${s.speedScore}</span></span>
            <span>Cleanliness: <span class="badge badge-${s.cleanlinessScore>=75?'success':s.cleanlinessScore>=50?'warning':'danger'}">${s.cleanlinessScore}</span></span>
            <span>Overall: <strong>${s.overallScore}</strong></span>
          </div>
          ${s.adminComments ? `<p style="color:var(--white-50);font-size:0.8rem;margin-top:var(--space-sm);font-style:italic;">"${s.adminComments}"</p>` : ''}
        </div>`;
      }).join('')}
    </div>` : ''}`;

  el.querySelectorAll('.speed-slider').forEach(slider => {
    slider.addEventListener('input', () => { el.querySelector(`.speed-val-${slider.dataset.shift}`).textContent = slider.value; });
  });
  el.querySelectorAll('.clean-slider').forEach(slider => {
    slider.addEventListener('input', () => { el.querySelector(`.clean-val-${slider.dataset.shift}`).textContent = slider.value; });
  });
  el.querySelectorAll('.submit-score').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sid = btn.dataset.shift;
      const speed = parseInt(el.querySelector(`.speed-slider[data-shift="${sid}"]`).value);
      const clean = parseInt(el.querySelector(`.clean-slider[data-shift="${sid}"]`).value);
      const comments = el.querySelector(`.score-comments[data-shift="${sid}"]`).value;
      btn.disabled = true;
      btn.textContent = 'Saving...';
      await store.scoreShift(sid, speed, clean, comments);
      showToast('Shift scored successfully!', 'success');
      await renderScoringView(el);
    });
  });
}

// ─── Tasks View ───
async function renderTasksView(el) {
  const [stations, users] = await Promise.all([store.getStations(), store.getUsers()]);
  const stationsMap = new Map(stations.map(s => [s.id, s]));
  const cooks = users.filter(u => u.role === 'cook');

  el.innerHTML = `
    <div class="page-header animate-in"><h1>Manage Tasks</h1><p>Edit station checklists and assign daily tasks</p></div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="daily">Daily Assignments</button>
      <button class="tab-btn" data-tab="templates">Station Templates</button>
    </div>
    <div id="taskTabContent"></div>`;

  await renderDailyTab();

  el.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.tab === 'daily') await renderDailyTab();
      else await renderTemplateTab();
    });
  });

  async function renderDailyTab() {
    const container = document.getElementById('taskTabContent');
    const today = new Date().toISOString().split('T')[0];
    const [tasks, commonTasks] = await Promise.all([
      store.getDailyTasks(today),
      store.getCommonDailyTasks(),
    ]);
    const usersMap = new Map(users.map(u => [u.id, u]));

    const cookOptions = cooks.map(c =>
      `<option value="${c.id}">${c.name} (${getStationNamesFromCache(c, stationsMap)})</option>`
    ).join('');

    container.innerHTML = `
      <div class="card animate-in">
        <div class="card-header"><h3>Today's Assigned Tasks</h3></div>
        ${tasks.length ? tasks.map(t => {
          const cook = usersMap.get(t.assignedTo);
          return `
          <div style="display:flex;align-items:center;gap:var(--space-md);padding:var(--space-sm) 0;border-bottom:1px solid var(--white-05);">
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
          <label class="form-label">Quick Select</label>
          <select class="form-select" id="commonTaskSelect">
            <option value="">-- Pick a common task --</option>
            ${commonTasks.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Task Description</label>
          <input type="text" class="form-input" id="newDailyText" placeholder="e.g. Deep clean walk-in shelves">
        </div>
        <div class="form-group">
          <label class="form-label">Assign To</label>
          <select class="form-select" id="newDailyAssign">${cookOptions}</select>
        </div>
        <button class="btn btn-primary" id="addDailyBtn">Add Task</button>
      </div>`;

    document.getElementById('commonTaskSelect').addEventListener('change', (e) => {
      if (e.target.value) document.getElementById('newDailyText').value = e.target.value;
    });
    container.querySelectorAll('.remove-daily').forEach(btn => {
      btn.addEventListener('click', async () => { await store.removeDailyTask(btn.dataset.id); await renderDailyTab(); });
    });
    document.getElementById('addDailyBtn')?.addEventListener('click', async () => {
      const text = document.getElementById('newDailyText').value.trim();
      const assign = document.getElementById('newDailyAssign').value;
      if (!text) { showToast('Enter a task description', 'error'); return; }
      await store.addDailyTask(text, assign);
      showToast('Task assigned!', 'success');
      await renderDailyTab();
    });
  }

  async function renderTemplateTab() {
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

    const loadItems = async () => {
      const stId = document.getElementById('templateStation').value;
      const items = await store.getChecklistTemplate(stId);
      document.getElementById('templateItems').innerHTML = items.map(item => `
        <div style="display:flex;align-items:center;gap:var(--space-md);padding:var(--space-sm) 0;border-bottom:1px solid var(--white-05);">
          <span style="flex:1;color:var(--white-70);">${item.text}</span>
          <span class="badge badge-info">${item.category}</span>
          <button class="btn btn-sm btn-danger remove-tmpl" data-station="${stId}" data-id="${item.id}">X</button>
        </div>`).join('');

      document.querySelectorAll('.remove-tmpl').forEach(btn => {
        btn.addEventListener('click', async () => { await store.removeChecklistItem(btn.dataset.station, btn.dataset.id); await loadItems(); });
      });
    };

    document.getElementById('templateStation').addEventListener('change', loadItems);
    await loadItems();

    document.getElementById('addTemplateBtn').addEventListener('click', async () => {
      const text = document.getElementById('newTemplateItem').value.trim();
      const stId = document.getElementById('templateStation').value;
      if (!text) return;
      await store.addChecklistItem(stId, text);
      document.getElementById('newTemplateItem').value = '';
      showToast('Item added!', 'success');
      await loadItems();
    });
  }
}

// ─── Leaderboard View ───
async function renderLeaderboardView(el) {
  const [board, stations] = await Promise.all([store.getLeaderboard(), store.getStations()]);
  const stationsMap = new Map(stations.map(s => [s.id, s]));

  el.innerHTML = `
    <div class="page-header animate-in"><h1>Leaderboard</h1><p>Top performers this period</p></div>
    <div class="card animate-in stagger-1">
      ${board.map((cook, i) => {
        const stNames = getStationNamesFromCache(cook, stationsMap);
        return `
        <div class="leaderboard-item">
          <div class="leaderboard-rank ${i<3?'rank-'+(i+1):'rank-other'}">${i+1}</div>
          <div class="leaderboard-info">
            <div class="leaderboard-name">${cook.name}</div>
            <div class="leaderboard-station">${stNames} | ${cook.shiftCount} shifts | ${cook.streak || 0} day streak</div>
          </div>
          <div class="leaderboard-score">${cook.avgScore}</div>
        </div>`;
      }).join('')}
    </div>`;
}

// ─── Incidents View ───
async function renderIncidentsView(el) {
  const [incidents, users] = await Promise.all([store.getIncidents(), store.getUsers()]);
  const usersMap = new Map(users.map(u => [u.id, u]));
  const open = incidents.filter(i => !i.resolved);
  const resolved = incidents.filter(i => i.resolved);

  el.innerHTML = `
    <div class="page-header animate-in"><h1>Incidents</h1><p>Equipment issues and supply shortages</p></div>
    <div class="card animate-in stagger-1">
      <div class="card-header"><h3>Open Issues (${open.length})</h3></div>
      ${open.length ? `<div class="incident-list">${open.map(inc => {
        const user = usersMap.get(inc.userId);
        return `
        <div class="incident-item">
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
        const user = usersMap.get(inc.userId);
        return `
        <div class="incident-item" style="opacity:0.6;">
          <div class="incident-type" style="color:var(--success);">RESOLVED: ${inc.type.toUpperCase()}</div>
          <div class="incident-desc">${inc.description}</div>
          <div class="incident-time">${user?.name || '--'} | ${formatDate(inc.date)}</div>
        </div>`;
      }).join('')}</div></div>` : ''}`;

  el.querySelectorAll('.resolve-inc').forEach(btn => {
    btn.addEventListener('click', async () => {
      await store.resolveIncident(btn.dataset.id);
      showToast('Incident resolved', 'success');
      await renderIncidentsView(el);
    });
  });
}

// ─── Invite Users View ───
async function renderInviteView(el) {
  const [stations, users, invitations] = await Promise.all([
    store.getStations(),
    store.getUsers(),
    store.getInvitations(),
  ]);
  const stationsMap = new Map(stations.map(s => [s.id, s]));

  el.innerHTML = `
    <div class="page-header animate-in"><h1>Invite Users</h1><p>Add new team members</p></div>
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
        <label class="form-label">Assign Stations</label>
        <div id="stationCheckboxes" style="display:flex;flex-wrap:wrap;gap:var(--space-md);padding:var(--space-sm) 0;">
          ${stations.map(s => `
            <label style="display:flex;align-items:center;gap:var(--space-xs);color:var(--white-70);cursor:pointer;">
              <input type="checkbox" value="${s.id}" class="station-checkbox"> ${s.name}
            </label>
          `).join('')}
        </div>
      </div>
      <button class="btn btn-primary" id="addUserBtn">Add User</button>
    </div>
    <div class="card animate-in stagger-2" style="margin-top:var(--space-lg);">
      <div class="card-header"><h3>Current Team</h3></div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Username</th><th>Stations</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>${u.name}</td>
              <td>${u.username}</td>
              <td>${getStationNamesFromCache(u, stationsMap)}</td>
              <td style="color:var(--white-50);">${u.email || '--'}</td>
              <td><span class="badge ${u.role === 'admin' ? 'badge-gold' : 'badge-info'}">${u.role}</span></td>
              <td>${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger remove-user" data-id="${u.id}">Remove</button>` : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('addUserBtn').addEventListener('click', async () => {
    const name = document.getElementById('invName').value.trim();
    const email = document.getElementById('invEmail').value.trim();
    const username = document.getElementById('invUsername').value.trim();
    const password = document.getElementById('invPassword').value.trim();
    const selectedStations = [...document.querySelectorAll('.station-checkbox:checked')].map(cb => cb.value);

    if (!name || !username || !password) { showToast('Please fill in name, username, and password', 'error'); return; }
    if (users.find(u => u.username === username)) { showToast('Username already exists', 'error'); return; }

    await store.addUser(name, username, password, email, 'cook', selectedStations);
    showToast('User added successfully', 'success');
    await renderInviteView(el);
  });

  el.querySelectorAll('.remove-user').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Remove this user?')) {
        await store.removeUser(btn.dataset.id);
        showToast('User removed', 'success');
        await renderInviteView(el);
      }
    });
  });
}
