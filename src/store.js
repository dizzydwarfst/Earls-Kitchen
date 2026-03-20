// ═══════════════════════════════════════════════════════════
// Earl's Kitchen — Data Store (Supabase, optimized + roles)
// ═══════════════════════════════════════════════════════════
import { supabase } from './supabase.js';

class Store {
  constructor() {
    this._users = null;
    this._stations = null;
    this._userStations = null;
    this._templates = {};
  }

  // ─── Cache Helpers ───
  async _ensureUsers() {
    if (!this._users) {
      const { data } = await supabase.from('users').select('*');
      const { data: us } = await supabase.from('user_stations').select('*');
      this._userStations = us || [];
      this._users = (data || []).map(u => ({
        ...u,
        stations: this._userStations.filter(s => s.user_id === u.id).map(s => s.station_id),
        managerTitle: u.manager_title || null,
      }));
    }
    return this._users;
  }

  async _ensureStations() {
    if (!this._stations) {
      const { data } = await supabase.from('stations').select('*');
      this._stations = data || [];
    }
    return this._stations;
  }

  _invalidateUsers() { this._users = null; this._userStations = null; }
  _invalidateStations() { this._stations = null; }

  // ─── Streak Logic ───
  // Counts consecutive completed shifts (not days) — works for any schedule
  async _updateStreak(userId) {
    // Get all shifts for this user, newest first
    const { data: allShifts } = await supabase
      .from('shifts').select('date, status, completion_percent')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (!allShifts || !allShifts.length) return;

    // Count consecutive completed shifts from the most recent backwards
    let streak = 0;
    for (const shift of allShifts) {
      if (shift.completion_percent === 100 || shift.status === 'completed' || shift.status === 'scored') {
        streak++;
      } else {
        break; // streak broken — they had a shift they didn't finish
      }
    }

    await supabase.from('users').update({ streak }).eq('id', userId);
    this._invalidateUsers();
  }

  // ─── Shift hydration ───
  async _hydrateShifts(shifts) {
    if (!shifts || !shifts.length) return [];
    const ids = shifts.map(s => s.id);
    const { data: allItems } = await supabase
      .from('shift_items').select('*').in('shift_id', ids).order('sort_order');
    const itemsByShift = {};
    (allItems || []).forEach(i => {
      if (!itemsByShift[i.shift_id]) itemsByShift[i.shift_id] = [];
      itemsByShift[i.shift_id].push({
        id: i.id, text: i.text, category: i.category,
        completed: i.completed, completedAt: i.completed_at,
      });
    });
    return shifts.map(shift => ({
      ...shift,
      station: shift.station_id,
      userId: shift.user_id,
      startTime: shift.start_time,
      endTime: shift.end_time,
      durationMinutes: shift.duration_minutes,
      completionPercent: shift.completion_percent,
      speedScore: shift.speed_score,
      cleanlinessScore: shift.cleanliness_score,
      overallScore: shift.overall_score,
      adminComments: shift.admin_comments,
      items: itemsByShift[shift.id] || [],
    }));
  }

  async _hydrateShift(shift) {
    if (!shift) return null;
    const results = await this._hydrateShifts([shift]);
    return results[0] || null;
  }

  // ─── Auth ───
  async authenticate(username, password) {
    const { data, error } = await supabase
      .from('users').select('*')
      .eq('username', username).eq('password', password).single();
    if (error || !data) return null;
    const stations = await this.getUserStations(data.id);
    return { ...data, stations, managerTitle: data.manager_title || null };
  }

  async getUsers() { return this._ensureUsers(); }

  async getUserById(id) {
    const users = await this._ensureUsers();
    return users.find(u => u.id === id) || null;
  }

  async getUserStations(userId) {
    const users = await this._ensureUsers();
    const user = users.find(u => u.id === userId);
    return user ? user.stations : [];
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await this.getUserById(userId);
    if (!user) return { success: false, error: 'User not found' };
    if (user.password !== oldPassword) return { success: false, error: 'Current password is incorrect' };
    if (!newPassword || newPassword.length < 4) return { success: false, error: 'New password must be at least 4 characters' };
    await supabase.from('users').update({ password: newPassword }).eq('id', userId);
    this._invalidateUsers();
    return { success: true };
  }

  async setUserStations(userId, stationsArray) {
    await supabase.from('user_stations').delete().eq('user_id', userId);
    if (stationsArray && stationsArray.length) {
      await supabase.from('user_stations').insert(stationsArray.map(s => ({ user_id: userId, station_id: s })));
    }
    this._invalidateUsers();
  }

  // ─── User Management ───
  async addUser(name, username, password, email, role, stations, managerTitle) {
    const id = `user_${Date.now()}`;
    const newUser = {
      id, username, password, name,
      role: role || 'cook',
      email: email || '',
      streak: 0,
      manager_title: managerTitle || null,
    };
    await supabase.from('users').insert(newUser);
    const stArr = Array.isArray(stations) ? stations : (stations ? [stations] : []);
    if (stArr.length) {
      await supabase.from('user_stations').insert(stArr.map(s => ({ user_id: id, station_id: s })));
    }
    this._invalidateUsers();
    return { ...newUser, stations: stArr, managerTitle: managerTitle || null };
  }

  async removeUser(userId) {
    await supabase.from('users').delete().eq('id', userId);
    this._invalidateUsers();
  }

  async updateUserRole(userId, role, managerTitle) {
    const updates = { role };
    updates.manager_title = role === 'manager' ? (managerTitle || null) : null;
    await supabase.from('users').update(updates).eq('id', userId);
    this._invalidateUsers();
  }

  async addInvitation(email, name, stationId) {
    const inv = {
      id: `inv_${Date.now()}`, email, name,
      station_id: stationId || null,
      sent_at: new Date().toISOString(),
      status: 'pending',
    };
    await supabase.from('invitations').insert(inv);
    return inv;
  }

  async getInvitations() {
    const { data } = await supabase.from('invitations').select('*').order('sent_at', { ascending: false });
    return (data || []).map(inv => ({ ...inv, station: inv.station_id, sentAt: inv.sent_at }));
  }

  // ─── Stations ───
  async getStations() { return this._ensureStations(); }
  async getStationById(id) {
    const stations = await this._ensureStations();
    return stations.find(s => s.id === id) || null;
  }

  // ─── Checklist Templates ───
  async getChecklistTemplate(stationId) {
    if (!this._templates[stationId]) {
      const { data } = await supabase
        .from('checklist_templates').select('*')
        .eq('station_id', stationId).order('sort_order');
      this._templates[stationId] = data || [];
    }
    return this._templates[stationId];
  }

  async addChecklistItem(stationId, text, category = 'cleaning') {
    const id = `${stationId}_${Date.now()}`;
    const items = await this.getChecklistTemplate(stationId);
    const nextOrder = items.length ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1;
    await supabase.from('checklist_templates').insert({ id, station_id: stationId, text, category, sort_order: nextOrder });
    delete this._templates[stationId];
    return id;
  }

  async removeChecklistItem(stationId, itemId) {
    await supabase.from('checklist_templates').delete().eq('id', itemId);
    delete this._templates[stationId];
  }

  // ─── Shifts ───
  async getShiftsByUser(userId) {
    const { data } = await supabase.from('shifts').select('*').eq('user_id', userId).order('date', { ascending: false });
    return this._hydrateShifts(data || []);
  }

  async getShiftsByStation(stationId) {
    const { data } = await supabase.from('shifts').select('*').eq('station_id', stationId).order('date', { ascending: false });
    return this._hydrateShifts(data || []);
  }

  async getTodayShifts() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('shifts').select('*').eq('date', today);
    return this._hydrateShifts(data || []);
  }

  async getActiveShift(userId) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('shifts').select('*')
      .eq('user_id', userId).eq('date', today).eq('status', 'in_progress').single();
    if (!data) return null;
    return this._hydrateShift(data);
  }

  async hasCompletedShiftToday(userId) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('shifts').select('id')
      .eq('user_id', userId).eq('date', today)
      .in('status', ['completed', 'scored']).limit(1);
    return data && data.length > 0;
  }

  async createShift(userId, stationId) {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('shifts').select('*').eq('user_id', userId).eq('date', today).limit(1);
    if (existing && existing.length) return this._hydrateShift(existing[0]);

    const template = await this.getChecklistTemplate(stationId);
    const shiftId = `shift_${today}_${userId}_${stationId}`;
    const shift = {
      id: shiftId, user_id: userId, station_id: stationId, date: today,
      start_time: new Date().toISOString(), end_time: null,
      duration_minutes: 0, completion_percent: 0,
      speed_score: null, cleanliness_score: null, overall_score: null,
      scored: false, notes: '', admin_comments: '', status: 'in_progress',
    };
    await supabase.from('shifts').insert(shift);

    const items = template.map((t, i) => ({
      id: `${shiftId}_${t.id}`, shift_id: shiftId,
      text: t.text, category: t.category,
      completed: false, completed_at: null, sort_order: i,
    }));
    if (items.length) await supabase.from('shift_items').insert(items);
    return this._hydrateShift(shift);
  }

  async toggleShiftItem(shiftId, itemId) {
    const { data: item } = await supabase.from('shift_items').select('*').eq('id', itemId).single();
    if (!item) return null;

    const newCompleted = !item.completed;
    await supabase.from('shift_items').update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    }).eq('id', itemId);

    const { data: allItems } = await supabase.from('shift_items').select('completed').eq('shift_id', shiftId);
    const completedCount = (allItems || []).filter(i => i.completed).length;
    const total = (allItems || []).length;
    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const updates = { completion_percent: pct };
    if (pct === 100) {
      updates.status = 'completed';
      updates.end_time = new Date().toISOString();
      const { data: shift } = await supabase.from('shifts').select('start_time, user_id').eq('id', shiftId).single();
      if (shift) {
        updates.duration_minutes = Math.round((Date.now() - new Date(shift.start_time).getTime()) / 60000);
        // Update streak
        await this._updateStreak(shift.user_id);
      }
    } else {
      const { data: shift } = await supabase.from('shifts').select('status').eq('id', shiftId).single();
      if (shift && shift.status === 'completed') {
        updates.status = 'in_progress';
        updates.end_time = null;
      }
    }

    await supabase.from('shifts').update(updates).eq('id', shiftId);
    const { data: updatedShift } = await supabase.from('shifts').select('*').eq('id', shiftId).single();
    return this._hydrateShift(updatedShift);
  }

  async updateShiftNotes(shiftId, notes) {
    await supabase.from('shifts').update({ notes }).eq('id', shiftId);
  }

  async scoreShift(shiftId, speedScore, cleanlinessScore, comments) {
    const overall = Math.round((speedScore + cleanlinessScore) / 2);
    await supabase.from('shifts').update({
      speed_score: speedScore, cleanliness_score: cleanlinessScore,
      overall_score: overall, scored: true, status: 'scored',
      admin_comments: comments || '',
    }).eq('id', shiftId);
  }

  async updateScoredShift(shiftId, speedScore, cleanlinessScore, comments) {
    const overall = Math.round((speedScore + cleanlinessScore) / 2);
    await supabase.from('shifts').update({
      speed_score: speedScore, cleanliness_score: cleanlinessScore,
      overall_score: overall, admin_comments: comments || '',
    }).eq('id', shiftId);
  }

  async deleteShift(shiftId) {
    // Delete shift items first (cascade should handle it, but be safe)
    await supabase.from('shift_items').delete().eq('shift_id', shiftId);
    await supabase.from('shifts').delete().eq('id', shiftId);
  }

  // ─── Daily Tasks ───
  async getDailyTasks(date) {
    const d = date || new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('daily_tasks').select('*').eq('date', d);
    return (data || []).map(t => ({ ...t, assignedTo: t.assigned_to }));
  }

  async getDailyTasksForUser(userId) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('daily_tasks').select('*').eq('assigned_to', userId).eq('date', today);
    return (data || []).map(t => ({ ...t, assignedTo: t.assigned_to }));
  }

  async toggleDailyTask(taskId) {
    const { data: task } = await supabase.from('daily_tasks').select('*').eq('id', taskId).single();
    if (!task) return null;
    await supabase.from('daily_tasks').update({ completed: !task.completed }).eq('id', taskId);
    return { ...task, completed: !task.completed };
  }

  async addDailyTask(text, assignedTo, date) {
    const task = {
      id: `dt_${Date.now()}`, text, assigned_to: assignedTo,
      date: date || new Date().toISOString().split('T')[0], completed: false,
    };
    await supabase.from('daily_tasks').insert(task);
    return { ...task, assignedTo };
  }

  async removeDailyTask(taskId) {
    await supabase.from('daily_tasks').delete().eq('id', taskId);
  }

  async getCommonDailyTasks() {
    const { data } = await supabase.from('common_daily_tasks').select('text');
    return (data || []).map(r => r.text);
  }

  // ─── Incidents ───
  async getIncidents() {
    const { data } = await supabase.from('incidents').select('*').order('date', { ascending: false });
    return (data || []).map(i => ({ ...i, userId: i.user_id, station: i.station_id }));
  }

  async addIncident(userId, stationId, type, description) {
    const incident = {
      id: `inc_${Date.now()}`, user_id: userId, station_id: stationId,
      type, description, date: new Date().toISOString(), resolved: false,
    };
    await supabase.from('incidents').insert(incident);
    return incident;
  }

  async resolveIncident(incidentId) {
    await supabase.from('incidents').update({ resolved: true }).eq('id', incidentId);
  }

  // ─── Analytics ───
  async getUserAverageScores(userId) {
    const { data: scored } = await supabase
      .from('shifts').select('speed_score, cleanliness_score')
      .eq('user_id', userId).eq('scored', true);
    if (!scored || !scored.length) return { speed: 0, cleanliness: 0, overall: 0, count: 0 };
    const speed = Math.round(scored.reduce((a, s) => a + s.speed_score, 0) / scored.length);
    const cleanliness = Math.round(scored.reduce((a, s) => a + s.cleanliness_score, 0) / scored.length);
    return { speed, cleanliness, overall: Math.round((speed + cleanliness) / 2), count: scored.length };
  }

  async getUserStreak(userId) {
    const user = await this.getUserById(userId);
    return user ? (user.streak || 0) : 0;
  }

  async getLeaderboard() {
    const users = await this.getUsers();
    const cooks = users.filter(u => u.role === 'cook');
    const { data: allScored } = await supabase
      .from('shifts').select('user_id, speed_score, cleanliness_score').eq('scored', true);
    const scoresByUser = {};
    (allScored || []).forEach(s => {
      if (!scoresByUser[s.user_id]) scoresByUser[s.user_id] = [];
      scoresByUser[s.user_id].push(s);
    });
    return cooks.map(cook => {
      const scored = scoresByUser[cook.id] || [];
      let avgSpeed = 0, avgClean = 0, avgOverall = 0;
      if (scored.length) {
        avgSpeed = Math.round(scored.reduce((a, s) => a + s.speed_score, 0) / scored.length);
        avgClean = Math.round(scored.reduce((a, s) => a + s.cleanliness_score, 0) / scored.length);
        avgOverall = Math.round((avgSpeed + avgClean) / 2);
      }
      return { ...cook, avgScore: avgOverall, avgSpeed, avgCleanliness: avgClean, shiftCount: scored.length };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }

  
}

export const store = new Store();
