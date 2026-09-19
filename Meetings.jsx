import React, { useState } from 'react';

/**
 * Meetings Component — Planova Operations
 * Route: /events/[id]/meetings
 */

const INITIAL_MEETINGS = [
  { id: 'mtg-101', title: 'Core Sync #4 — Stage, Audio & Keynote Verification', date: 'Sep 18, 2026', status: 'Reviewed', extractedCount: 9, acceptedCount: 9 },
  { id: 'mtg-102', title: 'Sponsorship Review & Deliverables Confirmation', date: 'Sep 16, 2026', status: 'Ready', extractedCount: 7, acceptedCount: 5, hasUnreviewedItems: true },
  { id: 'mtg-103', title: 'Technical Infrastructure & Hackathon API Gateways', date: 'Sep 14, 2026', status: 'Ready', extractedCount: 6, acceptedCount: 4, hasUnreviewedItems: true },
  { id: 'mtg-104', title: 'Campus Security & Medical Protocols Briefing', date: 'Sep 11, 2026', status: 'Reviewed', extractedCount: 5, acceptedCount: 5 }
];

export default function Meetings({ currentUserRole = 'admin' }) {
  const isAdmin = currentUserRole === 'admin';
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#0F1729] tracking-tight">Meetings</h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">9 meetings</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Notes, summaries, and extracted action items.</p>
        </div>
      </div>

      <div className="space-y-3">
        {meetings.map(m => (
          <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{m.title}</h3>
                {m.hasUnreviewedItems && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">Needs Review</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{m.date} • {m.extractedCount} extracted, {m.acceptedCount} accepted</p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              {m.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
