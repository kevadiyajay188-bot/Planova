import React, { useState } from 'react';

/**
 * Deadlines Component — Planova Operations
 * Route: /events/[id]/deadlines
 */

const INITIAL_DEADLINES = [
  { id: 'dl-1', type: 'document', title: 'Auditorium Permission Letter (Dean Approval)', owner: 'Rohan Jha', dueAt: '2026-09-18', overdue: true },
  { id: 'dl-2', type: 'task', title: 'Power strip & high-amp breaker allocation for 60 teams', owner: 'Priya Patel', dueAt: '2026-09-19', overdue: false },
  { id: 'dl-3', type: 'document', title: 'Sponsorship Pitch Deck & Tier Sheet sign-off', owner: 'Dev Malik', dueAt: '2026-09-20', overdue: false },
  { id: 'dl-4', type: 'meeting', title: 'Core Sync #4 action item: reserve backup amplifier', owner: 'Priya Patel', dueAt: '2026-09-21', overdue: false }
];

export default function Deadlines({ currentUserRole = 'admin' }) {
  const isAdmin = currentUserRole === 'admin';
  const [deadlines, setDeadlines] = useState(INITIAL_DEADLINES);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#0F1729] tracking-tight">Deadlines</h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">5 due this week</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Every deadline across tasks, documents, and meetings synchronized.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {deadlines.map(d => (
          <div key={d.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-slate-100 text-slate-700">{d.type}</span>
              <div>
                <p className="text-xs font-bold text-slate-900">{d.title}</p>
                <p className="text-[11px] text-slate-400">Owner: {d.owner}</p>
              </div>
            </div>
            <span className={`text-xs font-bold ${d.overdue ? 'text-red-600' : 'text-slate-600'}`}>{d.dueAt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
