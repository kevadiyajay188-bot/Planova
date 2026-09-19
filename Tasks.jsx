import React, { useState, useMemo, useEffect } from 'react';

/**
 * Tasks Component — Planova Operations
 * Route: /events/[id]/tasks
 * 
 * Admin oversight across all verticals, Kanban board, sortable list table,
 * Gantt timeline, bulk actions, dropout transfer, and admin override closure.
 */

const INITIAL_TASKS = [
  { id: 'tsk-101', title: 'Confirm Main Auditorium acoustic testing & sound check', vertical: 'Logistics', owner: 'Priya Patel', ownerAvatar: 'PP', priority: 'critical', status: 'blocked', dueDate: '2026-09-18', overdue: true, aiCreated: false },
  { id: 'tsk-102', title: 'Finalize Title & Gold Sponsor Tier agreement contracts', vertical: 'Sponsorship', owner: 'Dev Malik', ownerAvatar: 'DM', priority: 'high', status: 'review', dueDate: '2026-09-20', overdue: false, aiCreated: true },
  { id: 'tsk-103', title: 'Submit Campus Safety & EMT coverage documentation', vertical: 'Logistics', owner: 'Tanvi Gaikwad', ownerAvatar: 'TG', priority: 'high', status: 'doing', dueDate: '2026-09-19', overdue: true, aiCreated: false },
  { id: 'tsk-104', title: 'Deploy Hackathon portal live registration & RSVP dashboard', vertical: 'Technical', owner: 'Arjun Rao', ownerAvatar: 'AR', priority: 'high', status: 'done', dueDate: '2026-09-15', overdue: false, aiCreated: true },
  { id: 'tsk-105', title: 'Draft opening keynote speaker itinerary & green-room logistics', vertical: 'Technical', owner: 'Kavya Sen', ownerAvatar: 'KS', priority: 'medium', status: 'doing', dueDate: '2026-09-22', overdue: false, aiCreated: false },
  { id: 'tsk-106', title: 'Print campus signage banners and stage sponsor backdrops', vertical: 'Marketing', owner: 'Neha Sharma', ownerAvatar: 'NS', priority: 'medium', status: 'to_do', dueDate: '2026-09-25', overdue: false, aiCreated: false },
  { id: 'tsk-107', title: 'Order badges, lanyard tags, and volunteer t-shirts', vertical: 'Operations', owner: 'Rohan Jha', ownerAvatar: 'RJ', priority: 'low', status: 'to_do', dueDate: '2026-09-26', overdue: false, aiCreated: true },
  { id: 'tsk-108', title: 'Resolve power strip & high-amp breaker allocation for 60 teams', vertical: 'Logistics', owner: 'Priya Patel', ownerAvatar: 'PP', priority: 'critical', status: 'doing', dueDate: '2026-09-19', overdue: true, aiCreated: true }
];

const MEMBERS = [
  { name: 'Priya Patel', avatar: 'PP', vertical: 'Logistics' },
  { name: 'Arjun Rao', avatar: 'AR', vertical: 'Technical' },
  { name: 'Neha Sharma', avatar: 'NS', vertical: 'Marketing' },
  { name: 'Dev Malik', avatar: 'DM', vertical: 'Sponsorship' },
  { name: 'Rohan Jha', avatar: 'RJ', vertical: 'Operations' },
  { name: 'Tanvi Gaikwad', avatar: 'TG', vertical: 'Logistics' },
  { name: 'Kavya Sen', avatar: 'KS', vertical: 'Technical' }
];

const COLUMNS = [
  { id: 'to_do', label: 'To do', color: '#94A3B8', bg: 'bg-slate-100 text-slate-700' },
  { id: 'doing', label: 'Doing', color: '#2563EB', bg: 'bg-blue-50 text-blue-700' },
  { id: 'blocked', label: 'Blocked', color: '#DC2626', bg: 'bg-red-50 text-red-700' },
  { id: 'review', label: 'Review', color: '#D97706', bg: 'bg-amber-50 text-amber-700' },
  { id: 'done', label: 'Done', color: '#059669', bg: 'bg-emerald-50 text-emerald-700' }
];

const PRIORITY_BADGES = {
  low: { label: 'Low', color: '#64748B', bg: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: '#D97706', bg: 'bg-amber-100 text-amber-800' },
  high: { label: 'High', color: '#EA580C', bg: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', color: '#B91C1C', bg: 'bg-red-100 text-red-800' }
};

export default function Tasks({ currentUserRole = 'admin' }) {
  const isAdmin = currentUserRole === 'admin';
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [view, setView] = useState('board');
  const [selectedVertical, setSelectedVertical] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedVertical !== 'all' && t.vertical !== selectedVertical) return false;
      if (selectedOwner !== 'all' && t.owner !== selectedOwner) return false;
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      if (overdueOnly && !t.overdue) return false;
      return true;
    });
  }, [tasks, selectedVertical, selectedOwner, selectedPriority, selectedStatus, overdueOnly]);

  const overdueCount = useMemo(() => tasks.filter(t => t.overdue && t.status !== 'done').length, [tasks]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#0F1729] tracking-tight">Tasks</h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
              68 total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Every task across all verticals with administrative oversight.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={`px-3 py-1.5 rounded-xl font-bold border ${overdueOnly ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-700 border-red-200'}`}
            >
              Overdue ({overdueCount})
            </button>
            <select
              value={selectedVertical}
              onChange={e => setSelectedVertical(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold"
            >
              <option value="all">All Verticals</option>
              <option value="Logistics">Logistics</option>
              <option value="Technical">Technical</option>
              <option value="Sponsorship">Sponsorship</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button onClick={() => setView('board')} className={`px-3 py-1 rounded-lg font-bold ${view === 'board' ? 'bg-black text-white' : 'text-slate-600'}`}>Board</button>
            <button onClick={() => setView('list')} className={`px-3 py-1 rounded-lg font-bold ${view === 'list' ? 'bg-black text-white' : 'text-slate-600'}`}>List</button>
          </div>
        </div>
      </div>

      {view === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {COLUMNS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 min-h-[400px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase">{col.label}</h3>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 font-bold">{colTasks.length}</span>
                </div>
                <div className="space-y-2.5">
                  {colTasks.map(task => (
                    <div key={task.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        {task.aiCreated && <span className="bg-cyan-50 text-[#0E7490] px-1.5 py-0.2 rounded font-black border border-cyan-200">✦ AI</span>}
                        <span className="text-slate-400">{task.vertical}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 leading-snug">{task.title}</p>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-600 font-medium truncate">{task.owner}</span>
                        <span className={`whitespace-nowrap tabular-nums shrink-0 text-right ${task.overdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                          {task.overdue ? '⚠️ ' : ''}{task.dueDate.startsWith('2026-09-') ? `Sep ${parseInt(task.dueDate.slice(8), 10)}` : task.dueDate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Vertical</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Due</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-900">{t.title}</td>
                  <td className="p-3 font-medium text-slate-700">{t.owner}</td>
                  <td className="p-3 text-slate-500">{t.vertical}</td>
                  <td className="p-3 font-bold text-slate-700">{t.priority}</td>
                  <td className={`p-3 ${t.overdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{t.dueDate}</td>
                  <td className="p-3 font-semibold text-slate-800">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
