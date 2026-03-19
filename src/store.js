// ═══════════════════════════════════════════════════════════
// Earl's Kitchen — Data Store (localStorage persistence)
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'earls_kitchen_data_v3';

// ─── Default Seed Data ───
function createSeedData() {
  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];

  const stations = [
    { id: 'apps', name: 'Apps', color: '#d4a843' },
    { id: 'salads', name: 'Salads', color: '#2ecc71' },
    { id: 'panfry', name: 'Panfry', color: '#3498db' },
    { id: 'entree', name: 'Entree', color: '#e74c3c' },
    { id: 'ovens', name: 'Ovens', color: '#f39c12' },
  ];

  const checklistTemplates = {
    apps: [
      { id: 'a1', text: 'Turn off all warming equipment', category: 'equipment' },
      { id: 'a2', text: 'Clean and sanitize plating station', category: 'sanitize' },
      { id: 'a3', text: 'Wrap and label all appetizer proteins', category: 'food_safety' },
      { id: 'a4', text: 'Clean and store all small wares', category: 'cleaning' },
      { id: 'a5', text: 'Wipe down all countertops and surfaces', category: 'cleaning' },
      { id: 'a6', text: 'Restock garnishes and mise en place', category: 'restock' },
      { id: 'a7', text: 'Clean and sanitize cutting boards', category: 'sanitize' },
      { id: 'a8', text: 'Empty trash and replace liners', category: 'cleaning' },
      { id: 'a9', text: 'Sweep and mop station floor area', category: 'cleaning' },
      { id: 'a10', text: 'Check fridge for expired items', category: 'food_safety' },
    ],
    salads: [
      { id: 'sl1', text: 'Cover and store all salad greens', category: 'food_safety' },
      { id: 'sl2', text: 'Wrap and date all dressings', category: 'food_safety' },
      { id: 'sl3', text: 'Clean salad spinner and mixing bowls', category: 'cleaning' },
      { id: 'sl4', text: 'Sanitize cutting boards and knives', category: 'sanitize' },
      { id: 'sl5', text: 'Wipe down cold table and surfaces', category: 'cleaning' },
      { id: 'sl6', text: 'Restock containers and portion cups', category: 'restock' },
      { id: 'sl7', text: 'Organize walk-in cooler (FIFO rotation)', category: 'food_safety' },
      { id: 'sl8', text: 'Clean and sanitize prep area', category: 'sanitize' },
      { id: 'sl9', text: 'Sweep and mop station floor area', category: 'cleaning' },
      { id: 'sl10', text: 'Empty compost and recycling bins', category: 'cleaning' },
    ],
    panfry: [
      { id: 'pf1', text: 'Turn off all burners', category: 'equipment' },
      { id: 'pf2', text: 'Clean and polish all saute pans', category: 'cleaning' },
      { id: 'pf3', text: 'Drain and filter fryer oil', category: 'cleaning' },
      { id: 'pf4', text: 'Clean all sauce pots and store sauces', category: 'cleaning' },
      { id: 'pf5', text: 'Wipe down range hood and backsplash', category: 'cleaning' },
      { id: 'pf6', text: 'Label, date, and store all mise en place', category: 'food_safety' },
      { id: 'pf7', text: 'Sanitize all prep surfaces', category: 'sanitize' },
      { id: 'pf8', text: 'Restock oils, vinegars, and seasonings', category: 'restock' },
      { id: 'pf9', text: 'Sweep and mop station floor area', category: 'cleaning' },
      { id: 'pf10', text: 'Empty trash and replace liners', category: 'cleaning' },
    ],
    entree: [
      { id: 'e1', text: 'Turn off all grill burners and flattops', category: 'equipment' },
      { id: 'e2', text: 'Scrape and clean grill grates', category: 'cleaning' },
      { id: 'e3', text: 'Empty and clean grease traps', category: 'cleaning' },
      { id: 'e4', text: 'Wipe down grill exterior and hood', category: 'cleaning' },
      { id: 'e5', text: 'Clean and sanitize all cutting boards', category: 'sanitize' },
      { id: 'e6', text: 'Wrap and label all proteins for storage', category: 'food_safety' },
      { id: 'e7', text: 'Restock plates and service ware', category: 'restock' },
      { id: 'e8', text: 'Sweep and mop station floor area', category: 'cleaning' },
      { id: 'e9', text: 'Sanitize all countertops and surfaces', category: 'sanitize' },
      { id: 'e10', text: 'Check walk-in for protein par levels', category: 'food_safety' },
    ],
    ovens: [
      { id: 'o1', text: 'Turn off all ovens and proofers', category: 'equipment' },
      { id: 'o2', text: 'Clean oven interiors and racks', category: 'cleaning' },
      { id: 'o3', text: 'Wipe down oven exteriors and handles', category: 'cleaning' },
      { id: 'o4', text: 'Clean and store all baking sheets and pans', category: 'cleaning' },
      { id: 'o5', text: 'Store all doughs and batters properly', category: 'food_safety' },
      { id: 'o6', text: 'Label and date all oven-ready items', category: 'food_safety' },
      { id: 'o7', text: 'Clean and organize oven tools', category: 'cleaning' },
      { id: 'o8', text: 'Wipe down heat lamps and warming areas', category: 'cleaning' },
      { id: 'o9', text: 'Sweep and mop station floor area', category: 'cleaning' },
      { id: 'o10', text: 'Check and restock oven supplies', category: 'restock' },
    ],
  };

  const users = [
    { id: 'admin1', username: 'admin', password: 'admin123', name: 'Chef Marco', role: 'admin', stations: [], email: 'marco@earlskitchen.com' },
    { id: 'user1', username: 'james', password: 'pass123', name: 'James Wilson', role: 'cook', stations: ['apps', 'salads'], streak: 5, email: 'james@earlskitchen.com' },
    { id: 'user2', username: 'sarah', password: 'pass123', name: 'Sarah Chen', role: 'cook', stations: ['salads', 'apps'], streak: 12, email: 'sarah@earlskitchen.com' },
    { id: 'user3', username: 'mike', password: 'pass123', name: 'Mike Torres', role: 'cook', stations: ['panfry', 'entree'], streak: 3, email: 'mike@earlskitchen.com' },
    { id: 'user4', username: 'emma', password: 'pass123', name: 'Emma Davis', role: 'cook', stations: ['entree', 'ovens'], streak: 8, email: 'emma@earlskitchen.com' },
    { id: 'user5', username: 'alex', password: 'pass123', name: 'Alex Johnson', role: 'cook', stations: ['ovens', 'panfry'], streak: 6, email: 'alex@earlskitchen.com' },
  ];

  // Generate historical shift data
  const shifts = [];
  const cooks = users.filter(u => u.role === 'cook');

  for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];

    cooks.forEach(cook => {
      const duration = 15 + Math.floor(Math.random() * 30);
      const speedScore = 50 + Math.floor(Math.random() * 50);
      const cleanScore = 55 + Math.floor(Math.random() * 45);
      const stId = cook.stations[0];
      const template = checklistTemplates[stId];
      const completedItems = template.map(item => ({
        ...item,
        completed: true,
        completedAt: d.toISOString(),
      }));

      shifts.push({
        id: `shift_${dateStr}_${cook.id}`,
        userId: cook.id,
        station: stId,
        date: dateStr,
        startTime: d.toISOString(),
        endTime: new Date(d.getTime() + duration * 60000).toISOString(),
        durationMinutes: duration,
        items: completedItems,
        completionPercent: 100,
        speedScore,
        cleanlinessScore: cleanScore,
        overallScore: Math.round((speedScore + cleanScore) / 2),
        scored: true,
        notes: '',
        status: 'scored',
      });
    });
  }

  // Today's active shifts
  const todayShifts = [];
  cooks.forEach(cook => {
    const stId = cook.stations[0];
    const template = checklistTemplates[stId];
    const numCompleted = Math.floor(Math.random() * template.length);
    const items = template.map((item, i) => ({
      ...item,
      completed: i < numCompleted,
      completedAt: i < numCompleted ? now : null,
    }));

    todayShifts.push({
      id: `shift_${today}_${cook.id}_${stId}`,
      userId: cook.id,
      station: stId,
      date: today,
      startTime: now,
      endTime: null,
      durationMinutes: 0,
      items,
      completionPercent: Math.round((numCompleted / template.length) * 100),
      speedScore: null,
      cleanlinessScore: null,
      overallScore: null,
      scored: false,
      notes: '',
      status: 'in_progress',
    });
  });

  const dailyTasks = [
    { id: 'dt1', text: 'Deep clean walk-in cooler shelves', assignedTo: 'user1', date: today, completed: false },
    { id: 'dt2', text: 'Descale the dishwasher', assignedTo: 'user2', date: today, completed: false },
    { id: 'dt3', text: 'Clean exhaust hood filters', assignedTo: 'user3', date: today, completed: false },
    { id: 'dt4', text: 'Organize dry storage area', assignedTo: 'user4', date: today, completed: false },
    { id: 'dt5', text: 'Sanitize all trash can exteriors', assignedTo: 'user5', date: today, completed: false },
  ];

  const incidents = [
    { id: 'inc1', userId: 'user1', station: 'apps', type: 'equipment', description: 'Warming lamp flickering — needs bulb replacement', date: new Date(Date.now() - 2 * 86400000).toISOString(), resolved: true },
    { id: 'inc2', userId: 'user3', station: 'panfry', type: 'supply', description: 'Running low on fryer oil — only 2 containers left', date: new Date(Date.now() - 86400000).toISOString(), resolved: false },
  ];

  // Pending invitations
  const invitations = [];

  // Common daily task presets
  const commonDailyTasks = [
    'Deep clean walk-in cooler shelves',
    'Descale the dishwasher',
    'Clean exhaust hood filters',
    'Organize dry storage area',
    'Sanitize all trash can exteriors',
    'Clean floor drains',
    'Wipe down walls behind cooking equipment',
    'Detail clean ovens interior',
    'Clean and organize spice rack',
    'Sanitize ice machine',
    'Deep clean fryer baskets',
    'Scrub cutting boards with bleach solution',
    'Clean walk-in freezer floor',
    'Wipe down all shelving units',
    'Clean staff break area',
    'Restock all cleaning supplies',
    'Clean hand wash stations',
    'Reorganize prep containers by size',
    'Deep clean dishwashing area',
    'Polish all stainless steel surfaces',
  ];

  return {
    users,
    stations,
    checklistTemplates,
    shifts: [...shifts, ...todayShifts],
    dailyTasks,
    incidents,
    invitations,
    commonDailyTasks,
    settings: {
      shiftStartTime: '17:00',
      shiftEndTime: '23:00',
    },
  };
}

// ─── Store API ───
class Store {
  constructor() {
    this._data = null;
    this._listeners = [];
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this._data = JSON.parse(raw);
      } else {
        this._data = createSeedData();
        this.save();
      }
    } catch {
      this._data = createSeedData();
      this.save();
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    this._listeners.forEach(fn => fn(this._data));
  }

  subscribe(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  resetData() {
    this._data = createSeedData();
    this.save();
  }

  // ─── Auth ───
  getUsers() { return this._data.users; }

  authenticate(username, password) {
    return this._data.users.find(u => u.username === username && u.password === password) || null;
  }

  getUserById(id) { return this._data.users.find(u => u.id === id); }

  changePassword(userId, oldPassword, newPassword) {
    const user = this._data.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };
    if (user.password !== oldPassword) return { success: false, error: 'Current password is incorrect' };
    if (!newPassword || newPassword.length < 4) return { success: false, error: 'New password must be at least 4 characters' };
    user.password = newPassword;
    this.save();
    return { success: true };
  }

  setUserStations(userId, stationsArray) {
    const user = this._data.users.find(u => u.id === userId);
    if (user) {
      user.stations = stationsArray || [];
      this.save();
    }
  }

  getUserStations(userId) {
    const user = this.getUserById(userId);
    if (!user) return [];
    return user.stations || (user.station ? [user.station] : []);
  }

  // ─── User Management ───
  addUser(name, username, password, email, role, stations) {
    const id = `user_${Date.now()}`;
    const newUser = {
      id,
      username,
      password,
      name,
      role: role || 'cook',
      stations: Array.isArray(stations) ? stations : (stations ? [stations] : []),
      streak: 0,
      email: email || '',
    };
    this._data.users.push(newUser);
    this.save();
    return newUser;
  }

  removeUser(userId) {
    this._data.users = this._data.users.filter(u => u.id !== userId);
    this.save();
  }

  addInvitation(email, name, station) {
    const inv = {
      id: `inv_${Date.now()}`,
      email,
      name,
      station,
      sentAt: new Date().toISOString(),
      status: 'pending',
    };
    if (!this._data.invitations) this._data.invitations = [];
    this._data.invitations.push(inv);
    this.save();
    return inv;
  }

  getInvitations() {
    return this._data.invitations || [];
  }

  // ─── Stations ───
  getStations() { return this._data.stations; }
  getStationById(id) { return this._data.stations.find(s => s.id === id); }

  // ─── Checklist Templates ───
  getChecklistTemplate(stationId) {
    return this._data.checklistTemplates[stationId] || [];
  }

  addChecklistItem(stationId, text, category = 'cleaning') {
    const id = `${stationId}_${Date.now()}`;
    if (!this._data.checklistTemplates[stationId]) {
      this._data.checklistTemplates[stationId] = [];
    }
    this._data.checklistTemplates[stationId].push({ id, text, category });
    this.save();
    return id;
  }

  removeChecklistItem(stationId, itemId) {
    if (this._data.checklistTemplates[stationId]) {
      this._data.checklistTemplates[stationId] = this._data.checklistTemplates[stationId].filter(i => i.id !== itemId);
      this.save();
    }
  }

  // ─── Shifts ───
  getShifts() { return this._data.shifts; }

  getShiftsByUser(userId) {
    return this._data.shifts.filter(s => s.userId === userId);
  }

  getShiftsByDate(date) {
    return this._data.shifts.filter(s => s.date === date);
  }

  getShiftsByStation(stationId) {
    return this._data.shifts.filter(s => s.station === stationId);
  }

  getTodayShifts() {
    const today = new Date().toISOString().split('T')[0];
    return this.getShiftsByDate(today);
  }

  getActiveShift(userId) {
    const today = new Date().toISOString().split('T')[0];
    return this._data.shifts.find(s => s.userId === userId && s.date === today && s.status === 'in_progress');
  }

  hasCompletedShiftToday(userId) {
    const today = new Date().toISOString().split('T')[0];
    return this._data.shifts.some(s => s.userId === userId && s.date === today && (s.status === 'completed' || s.status === 'scored'));
  }

  getTodayShiftForUser(userId) {
    const today = new Date().toISOString().split('T')[0];
    return this._data.shifts.find(s => s.userId === userId && s.date === today);
  }

  createShift(userId, stationId) {
    const user = this.getUserById(userId);
    if (!user || !stationId) return null;

    const today = new Date().toISOString().split('T')[0];
    // One shift per day per user
    const todayShift = this._data.shifts.find(s => s.userId === userId && s.date === today);
    if (todayShift) return todayShift;

    const template = this.getChecklistTemplate(stationId);
    const shift = {
      id: `shift_${today}_${userId}_${stationId}`,
      userId,
      station: stationId,
      date: today,
      startTime: new Date().toISOString(),
      endTime: null,
      durationMinutes: 0,
      items: template.map(item => ({ ...item, completed: false, completedAt: null })),
      completionPercent: 0,
      speedScore: null,
      cleanlinessScore: null,
      overallScore: null,
      scored: false,
      notes: '',
      status: 'in_progress',
    };

    this._data.shifts.push(shift);
    this.save();
    return shift;
  }

  toggleShiftItem(shiftId, itemId) {
    const shift = this._data.shifts.find(s => s.id === shiftId);
    if (!shift) return;

    const item = shift.items.find(i => i.id === itemId);
    if (!item) return;

    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date().toISOString() : null;

    const completed = shift.items.filter(i => i.completed).length;
    shift.completionPercent = Math.round((completed / shift.items.length) * 100);

    if (shift.completionPercent === 100 && shift.status === 'in_progress') {
      shift.status = 'completed';
      shift.endTime = new Date().toISOString();
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);
      shift.durationMinutes = Math.round((end - start) / 60000);
    } else if (shift.completionPercent < 100 && shift.status === 'completed') {
      shift.status = 'in_progress';
      shift.endTime = null;
    }

    this.save();
    return shift;
  }

  updateShiftNotes(shiftId, notes) {
    const shift = this._data.shifts.find(s => s.id === shiftId);
    if (shift) {
      shift.notes = notes;
      this.save();
    }
  }

  scoreShift(shiftId, speedScore, cleanlinessScore, comments) {
    const shift = this._data.shifts.find(s => s.id === shiftId);
    if (!shift) return;
    shift.speedScore = speedScore;
    shift.cleanlinessScore = cleanlinessScore;
    shift.overallScore = Math.round((speedScore + cleanlinessScore) / 2);
    shift.scored = true;
    shift.status = 'scored';
    shift.adminComments = comments || '';
    this.save();
    return shift;
  }

  updateScoredShift(shiftId, speedScore, cleanlinessScore, comments) {
    const shift = this._data.shifts.find(s => s.id === shiftId);
    if (!shift) return null;
    shift.speedScore = speedScore;
    shift.cleanlinessScore = cleanlinessScore;
    shift.overallScore = Math.round((speedScore + cleanlinessScore) / 2);
    shift.adminComments = comments || '';
    this.save();
    return shift;
  }

  getShiftById(shiftId) {
    return this._data.shifts.find(s => s.id === shiftId);
  }

  // ─── Daily Tasks ───
  getDailyTasks(date) {
    const d = date || new Date().toISOString().split('T')[0];
    return this._data.dailyTasks.filter(t => t.date === d);
  }

  getDailyTasksForUser(userId) {
    const today = new Date().toISOString().split('T')[0];
    return this._data.dailyTasks.filter(t => t.assignedTo === userId && t.date === today);
  }

  toggleDailyTask(taskId) {
    const task = this._data.dailyTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.save();
    }
    return task;
  }

  addDailyTask(text, assignedTo, date) {
    const task = {
      id: `dt_${Date.now()}`,
      text,
      assignedTo,
      date: date || new Date().toISOString().split('T')[0],
      completed: false,
    };
    this._data.dailyTasks.push(task);
    this.save();
    return task;
  }

  removeDailyTask(taskId) {
    this._data.dailyTasks = this._data.dailyTasks.filter(t => t.id !== taskId);
    this.save();
  }

  getCommonDailyTasks() {
    return this._data.commonDailyTasks || [];
  }

  // ─── Incidents ───
  getIncidents() { return this._data.incidents; }

  addIncident(userId, station, type, description) {
    const incident = {
      id: `inc_${Date.now()}`,
      userId,
      station,
      type,
      description,
      date: new Date().toISOString(),
      resolved: false,
    };
    this._data.incidents.push(incident);
    this.save();
    return incident;
  }

  resolveIncident(incidentId) {
    const inc = this._data.incidents.find(i => i.id === incidentId);
    if (inc) {
      inc.resolved = true;
      this.save();
    }
  }

  // ─── Analytics ───
  getUserAverageScores(userId) {
    const scored = this._data.shifts.filter(s => s.userId === userId && s.scored);
    if (!scored.length) return { speed: 0, cleanliness: 0, overall: 0, count: 0 };
    const speed = Math.round(scored.reduce((a, s) => a + s.speedScore, 0) / scored.length);
    const cleanliness = Math.round(scored.reduce((a, s) => a + s.cleanlinessScore, 0) / scored.length);
    return {
      speed,
      cleanliness,
      overall: Math.round((speed + cleanliness) / 2),
      count: scored.length,
    };
  }

  getUserStreak(userId) {
    const user = this.getUserById(userId);
    return user ? (user.streak || 0) : 0;
  }

  getLeaderboard() {
    const cooks = this._data.users.filter(u => u.role === 'cook');
    return cooks.map(cook => {
      const avg = this.getUserAverageScores(cook.id);
      return {
        ...cook,
        avgScore: avg.overall,
        avgSpeed: avg.speed,
        avgCleanliness: avg.cleanliness,
        shiftCount: avg.count,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }

  getAverageClosingTime(userId) {
    const completed = this._data.shifts.filter(s => s.userId === userId && s.durationMinutes > 0);
    if (!completed.length) return 0;
    return Math.round(completed.reduce((a, s) => a + s.durationMinutes, 0) / completed.length);
  }
}

export const store = new Store();
