// ═══════════════════════════════════════════════════════════
// Earl's Kitchen — User Dashboard (Cook View, with Photos)
// ═══════════════════════════════════════════════════════════
import { store } from '../store.js';
import { getSession, clearSession, navigate, showToast, formatDate, getInitials } from '../utils.js';

let currentTab = 'checklist';

function renderPhotoThumbs(photos) {
  if (!photos || !photos.length) return '';
  return `<div style="display:flex;flex-wrap:wrap;gap:var(--space-sm);margin-top:var(--space-sm);">
    ${photos.map(p => `
      <a href="${p.url}" target="_blank" style="display:block;width:64px;height:64px;border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--white-15);">
        <img src="${p.url}" style="width:100%;height:100%;object-fit:cover;" alt="Photo">
      </a>
    `).join('')}
  </div>`;
}

function createPhotoUploadHTML(id, label = 'Add Photos') {
  return `
    <div class="photo-upload-section" id="${id}">
      <label class="form-label">${label}</label>
      <div id="${id}_previews" style="display:flex;flex-wrap:wrap;gap:var(--space-sm);margin-bottom:var(--space-sm);"></div>
      <label class="btn btn-sm btn-secondary" style="cursor:pointer;">
        📷 Choose Photos
        <input type="file" accept="image/*" multiple style="display:none;" id="${id}_input">
      </label>
      <span style="font-size:0.75rem;color:var(--white-30);margin-left:var(--space-sm);" id="${id}_status"></span>
    </div>`;
}

function setupPhotoInput(inputId, opts) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const previews = document.getElementById(inputId.replace('_input', '_previews'));
    const status = document.getElementById(inputId.replace('_input', '_status'));

    status.textContent = `Uploading ${files.length} photo${files.length > 1 ? 's' : ''}...`;

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { showToast('Photo too large (max 5MB)', 'error'); continue; }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const thumb = document.createElement('div');
        thumb.style.cssText = 'width:64px;height:64px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);opacity:0.5;';
        thumb.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        previews.appendChild(thumb);
      };
      reader.readAsDataURL(file);

      const photo = await store.uploadPhoto(file, opts);
      if (photo) {
        const thumbs = previews.querySelectorAll('div');
        if (thumbs.length) thumbs[thumbs.length - 1].style.opacity = '1';
      }
    }

    status.textContent = `${files.length} photo${files.length > 1 ? 's' : ''} uploaded ✓`;
    input.value = '';
  });
}

export async function renderUserDashboard(app) {
  const session = getSession();
  if (!session || session.role !== 'cook') { navigate('#/login'); return; }

  const user = await store.getUserById(session.id);
  const userStations = user.stations || [];

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
        <div id="userTabContent"><div style="text-align:center;padding:var(--space-xl);color:var(--white-50);">Loading...</div></div>
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

  document.getElementById('logoutBtn').addEventListener('click', () => { clearSession(); navigate('#/login'); });
  await renderCurrentTab(app, user, userStations);
}

async function renderCurrentTab(app, user, userStations) {
  const container = document.getElementById('userTabContent');
  switch (currentTab) {
    case 'checklist': await renderChecklistTab(container, user, userStations); break;
    case 'history': await renderHistoryTab(container, user); break;
    case 'settings': await renderSettingsTab(container, user); break;
  }
}

// ═══════════════════════════════════════
// CHECKLIST TAB
// ═══════════════════════════════════════
async function renderChecklistTab(container, user, userStations) {
  container.innerHTML = `<div style="text-align:center;padding:var(--space-xl);color:var(--white-50);">Loading shift...</div>`;

  const hasCompleted = await store.hasCompletedShiftToday(user.id);
  if (hasCompleted) { renderThankYou(container, user); return; }

  let shift = await store.getActiveShift(user.id);
  if (!shift) { await renderStartScreen(container, user, userStations); return; }

  const [activeStation, dailyTasks, streak, existingPhotos] = await Promise.all([
    store.getStationById(shift.station),
    store.getDailyTasksForUser(user.id),
    store.getUserStreak(user.id),
    store.getPhotosForShift(shift.id, 'cook'),
  ]);

  container.innerHTML = `
    <div class="animate-in" style="text-align:center;margin-bottom:var(--space-lg);">
      <h1 style="font-size:1.6rem;color:var(--gold-400);">${activeStation.name}</h1>
      <p style="color:var(--white-50);font-size:0.85rem;margin-top:var(--space-xs);">Closing Checklist — ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
      ${streak > 0 ? `<div class="streak-badge" style="margin-top:var(--space-md);">${streak} Day Streak</div>` : ''}
    </div>

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

    <div class="card animate-in stagger-4" style="margin-bottom:var(--space-lg);">
      <div class="card-header"><h3>Notes, Photos & Issues</h3></div>
      <div class="form-group" style="margin-bottom:var(--space-md);">
        <textarea class="form-textarea" id="shiftNotes" placeholder="Any notes about tonight's closing...">${shift.notes || ''}</textarea>
      </div>
      ${createPhotoUploadHTML('shiftPhotos', 'Station Photos (after cleaning)')}
      ${existingPhotos.length ? `
        <div style="margin-top:var(--space-sm);">
          <span style="font-size:0.75rem;color:var(--white-50);">Already uploaded:</span>
          ${renderPhotoThumbs(existingPhotos)}
        </div>` : ''}
      <div style="margin-top:var(--space-lg);padding-top:var(--space-md);border-top:1px solid var(--white-10);">
        <button class="btn btn-sm btn-secondary" id="reportIssueBtn">Report Issue</button>
      </div>
    </div>

    <div class="animate-in stagger-5" style="text-align:center;padding:var(--space-xl) 0;">
      <button class="btn btn-primary btn-lg" id="finishShiftBtn" disabled>Finish Shift</button>
      <p style="font-size:0.8rem;color:var(--white-30);margin-top:var(--space-sm);" id="finishHint">Complete all tasks to finish your shift</p>
    </div>

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
        <div class="form-group">
          <label class="form-label">Attach Photos</label>
          <div id="issuePhotoPreviews" style="display:flex;flex-wrap:wrap;gap:var(--space-sm);margin-bottom:var(--space-sm);"></div>
          <label class="btn btn-sm btn-secondary" style="cursor:pointer;">
            📷 Choose Photos
            <input type="file" accept="image/*" multiple style="display:none;" id="issuePhotoInput">
          </label>
          <span style="font-size:0.75rem;color:var(--white-30);margin-left:var(--space-sm);" id="issuePhotoStatus"></span>
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

  // Photo upload for shift
  setupPhotoInput('shiftPhotos_input', { shiftId: shift.id, uploadedBy: user.id, photoType: 'cook' });

  // Issue photo preview
  const issueInput = document.getElementById('issuePhotoInput');
  if (issueInput) {
    issueInput.addEventListener('change', (e) => {
      const previews = document.getElementById('issuePhotoPreviews');
      const status = document.getElementById('issuePhotoStatus');
      previews.innerHTML = '';
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const thumb = document.createElement('div');
          thumb.style.cssText = 'width:64px;height:64px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);';
          thumb.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
          previews.appendChild(thumb);
        };
        reader.readAsDataURL(file);
      });
      status.textContent = `${e.target.files.length} photo${e.target.files.length > 1 ? 's' : ''} selected`;
    });
  }

  // Station checklist
  document.getElementById('stationChecklist').addEventListener('click', async (e) => {
    const item = e.target.closest('.checklist-item');
    if (!item) return;
    item.style.pointerEvents = 'none';
    const updated = await store.toggleShiftItem(shift.id, item.dataset.id);
    if (updated) {
      shift = updated;
      item.classList.toggle('checked');
      updateRing(shift.completionPercent);
      const tasks = await store.getDailyTasksForUser(user.id);
      updateCounts(shift, tasks);
      checkFinishable(shift, tasks);
    }
    item.style.pointerEvents = '';
  });

  const dailyList = document.getElementById('dailyChecklist');
  if (dailyList) {
    dailyList.addEventListener('click', async (e) => {
      const item = e.target.closest('.checklist-item');
      if (!item) return;
      await store.toggleDailyTask(item.dataset.dailyId);
      item.classList.toggle('checked');
      const tasks = await store.getDailyTasksForUser(user.id);
      updateCounts(shift, tasks);
      checkFinishable(shift, tasks);
    });
  }

  document.getElementById('shiftNotes').addEventListener('blur', async (e) => {
    await store.updateShiftNotes(shift.id, e.target.value);
  });

  // Issue modal
  document.getElementById('reportIssueBtn').addEventListener('click', () => {
    document.getElementById('issueModal').style.display = 'flex';
  });
  document.getElementById('cancelIssue').addEventListener('click', () => {
    document.getElementById('issueModal').style.display = 'none';
  });
  document.getElementById('submitIssue').addEventListener('click', async () => {
    const type = document.getElementById('issueType').value;
    const desc = document.getElementById('issueDesc').value.trim();
    if (!desc) { showToast('Please describe the issue', 'error'); return; }

    const btn = document.getElementById('submitIssue');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const incident = await store.addIncident(user.id, shift.station, type, desc);

    // Upload issue photos
    const issueFileInput = document.getElementById('issuePhotoInput');
    if (issueFileInput && issueFileInput.files.length) {
      btn.textContent = 'Uploading photos...';
      for (const file of Array.from(issueFileInput.files)) {
        await store.uploadPhoto(file, { incidentId: incident.id, uploadedBy: user.id, photoType: 'cook' });
      }
    }

    document.getElementById('issueModal').style.display = 'none';
    document.getElementById('issueDesc').value = '';
    btn.disabled = false;
    btn.textContent = 'Submit Report';
    showToast('Issue reported successfully', 'success');
  });

  document.getElementById('finishShiftBtn').addEventListener('click', () => {
    if (shift.completionPercent < 100) return;
    renderThankYou(container, user);
  });
}

async function renderStartScreen(container, user, userStations) {
  const stations = await store.getStations();
  const stationsMap = new Map(stations.map(s => [s.id, s]));
  const stationOptions = userStations.map(stId => stationsMap.get(stId)).filter(Boolean)
    .map(st => `<option value="${st.id}">${st.name}</option>`);

  container.innerHTML = `
    <div class="animate-in" style="text-align:center;margin-bottom:var(--space-xl);">
      <h1 style="font-size:1.8rem;color:var(--gold-400);margin-bottom:var(--space-md);">Ready to Close?</h1>
      <p style="color:var(--white-50);font-size:0.95rem;margin-bottom:var(--space-xl);">Select which station you are working today and start your closing tasks.</p>
    </div>
    <div class="card animate-in stagger-1" style="max-width:500px;margin:0 auto;">
      <div class="form-group">
        <label class="form-label">Your Assigned Station</label>
        <select class="form-select" id="startStation">${stationOptions.join('') || '<option value="">No stations assigned</option>'}</select>
      </div>
      <button class="btn btn-primary btn-lg" id="startTasksBtn" style="width:100%;margin-top:var(--space-md);" ${!stationOptions.length ? 'disabled' : ''}>Start Tasks</button>
    </div>`;

  document.getElementById('startTasksBtn')?.addEventListener('click', async () => {
    const stationId = document.getElementById('startStation').value;
    if (!stationId) return;
    const btn = document.getElementById('startTasksBtn');
    btn.disabled = true; btn.textContent = 'Starting...';
    const shift = await store.createShift(user.id, stationId);
    if (shift) {
      showToast('Shift started! Complete your checklist.', 'success');
      await renderChecklistTab(container, user, userStations);
    }
  });
}

function renderThankYou(container, user) {
  container.innerHTML = `
    <div class="animate-in" style="text-align:center;padding:var(--space-xxl) 0;">
      <div style="font-size:3rem;margin-bottom:var(--space-lg);color:var(--gold-400);font-family:var(--font-display);font-weight:800;">DONE</div>
      <h1 style="font-size:1.6rem;margin-bottom:var(--space-md);">Thank You, ${user.name.split(' ')[0]}!</h1>
      <p style="color:var(--white-50);font-size:1rem;">Your shift has been submitted for review.</p>
      <p style="color:var(--white-70);font-size:1.1rem;font-style:italic;margin-top:var(--space-md);">Have a great rest of the day!</p>
    </div>`;
}

function updateRing(percent) {
  const ring = document.querySelector('.ring-fill');
  const text = document.querySelector('.ring-percent');
  if (!ring || !text) return;
  const circumference = 2 * Math.PI * 90;
  ring.style.strokeDashoffset = circumference - (percent / 100) * circumference;
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
  if (canFinish) { hint.textContent = 'All tasks complete! Finish your shift.'; hint.style.color = 'var(--success)'; }
}

// ═══════════════════════════════════════
// HISTORY TAB (with photos)
// ═══════════════════════════════════════
async function renderHistoryTab(container, user) {
  container.innerHTML = `<div style="text-align:center;padding:var(--space-xl);color:var(--white-50);">Loading history...</div>`;

  const [shifts, streak, stations] = await Promise.all([
    store.getShiftsByUser(user.id), store.getUserStreak(user.id), store.getStations(),
  ]);
  const stationsMap = new Map(stations.map(s => [s.id, s]));
  const filteredShifts = shifts.filter(s => s.scored || s.status === 'completed' || s.status === 'scored').sort((a, b) => b.date.localeCompare(a.date));

  // Batch fetch photos
  const allPhotos = {};
  for (const s of filteredShifts.slice(0, 15)) {
    allPhotos[s.id] = await store.getPhotosForShift(s.id);
  }

  container.innerHTML = `
    <div class="animate-in" style="text-align:center;margin-bottom:var(--space-xl);">
      <h1 style="font-size:1.6rem;color:var(--gold-400);">My History</h1>
      <p style="color:var(--white-50);font-size:0.85rem;margin-top:var(--space-xs);">Your past shift closings and manager feedback</p>
      ${streak > 0 ? `<div class="streak-badge" style="margin-top:var(--space-md);">${streak} Day Streak</div>` : ''}
    </div>
    ${filteredShifts.length === 0 ? '<div class="empty-state animate-in stagger-1"><p>No completed shifts yet.</p></div>' : ''}
    <div id="historyList">
      ${filteredShifts.map((s, i) => {
        const st = stationsMap.get(s.station);
        const completedItems = s.items ? s.items.filter(item => item.completed) : [];
        const totalItems = s.items ? s.items.length : 0;
        const hasScore = s.scored && s.cleanlinessScore !== null;
        const photos = allPhotos[s.id] || [];
        const cookPhotos = photos.filter(p => p.photo_type === 'cook');
        const adminPhotos = photos.filter(p => p.photo_type === 'admin');

        return `
        <div class="card animate-in stagger-${(i % 6) + 1}" style="margin-bottom:var(--space-lg);">
          <div class="card-header">
            <h3>${formatDate(s.date)} — ${st ? st.name : '--'}</h3>
            ${hasScore ? `<span class="badge badge-success">Reviewed</span>` : `<span class="badge badge-warning">Awaiting Review</span>`}
          </div>
          <div style="margin-bottom:var(--space-md);">
            <h4 style="color:var(--white-50);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--space-sm);">Completed Tasks (${completedItems.length}/${totalItems})</h4>
            ${completedItems.map(item => `
              <div style="display:flex;align-items:center;gap:var(--space-sm);padding:4px 0;">
                <span style="color:var(--success);">[x]</span>
                <span style="color:var(--white-70);font-size:0.85rem;">${item.text}</span>
              </div>
            `).join('')}
          </div>
          ${cookPhotos.length ? `
          <div style="margin-bottom:var(--space-md);">
            <h4 style="color:var(--white-50);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--space-sm);">Your Photos</h4>
            ${renderPhotoThumbs(cookPhotos)}
          </div>` : ''}
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
            ${adminPhotos.length ? `
            <div style="margin-top:var(--space-sm);">
              <span style="font-size:0.75rem;color:var(--gold-400);">Manager Photos:</span>
              ${renderPhotoThumbs(adminPhotos)}
            </div>` : ''}
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

// ═══════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════
async function renderSettingsTab(container, user) {
  const stations = await store.getStations();
  const stationsMap = new Map(stations.map(s => [s.id, s]));
  const stationNames = (user.stations || []).map(id => stationsMap.get(id)?.name).filter(Boolean).join(', ');

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
      <div class="form-group"><label class="form-label">Current Password</label><input type="password" class="form-input" id="currentPass" placeholder="Enter current password"></div>
      <div class="form-group"><label class="form-label">New Password</label><input type="password" class="form-input" id="newPass" placeholder="Enter new password (min 4 characters)"></div>
      <div class="form-group"><label class="form-label">Confirm New Password</label><input type="password" class="form-input" id="confirmPass" placeholder="Confirm new password"></div>
      <div id="passError" style="color:var(--danger);font-size:0.85rem;margin-bottom:var(--space-md);display:none;"></div>
      <div id="passSuccess" style="color:var(--success);font-size:0.85rem;margin-bottom:var(--space-md);display:none;"></div>
      <button class="btn btn-primary" id="changePassBtn">Change Password</button>
    </div>`;

  document.getElementById('changePassBtn').addEventListener('click', async () => {
    const current = document.getElementById('currentPass').value;
    const newPass = document.getElementById('newPass').value;
    const confirm = document.getElementById('confirmPass').value;
    const errEl = document.getElementById('passError');
    const successEl = document.getElementById('passSuccess');
    errEl.style.display = 'none'; successEl.style.display = 'none';
    if (!current || !newPass || !confirm) { errEl.textContent = 'Please fill in all fields'; errEl.style.display = 'block'; return; }
    if (newPass !== confirm) { errEl.textContent = 'New passwords do not match'; errEl.style.display = 'block'; return; }
    const result = await store.changePassword(user.id, current, newPass);
    if (result.success) {
      successEl.textContent = 'Password changed successfully!'; successEl.style.display = 'block';
      document.getElementById('currentPass').value = ''; document.getElementById('newPass').value = ''; document.getElementById('confirmPass').value = '';
      showToast('Password updated', 'success');
    } else { errEl.textContent = result.error; errEl.style.display = 'block'; }
  });
}
