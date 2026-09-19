import React, { useState } from 'react';

/**
 * Announcements Component — Planova Operations
 * Route: /events/[id]/announcements
 */

const INITIAL_ANNOUNCEMENTS = [
  { id: 'ann-1', subject: 'TechNova 2026 Registration is Now Open!', audience: 'All Students', channels: ['Email', 'Instagram', 'WhatsApp'], date: 'Sep 10, 2026', status: 'Sent' },
  { id: 'ann-2', subject: 'Keynote Speaker Announcement: Dr. Aris Thorne', audience: 'Registered Attendees', channels: ['Instagram', 'Notice Board'], date: 'Sep 14, 2026', status: 'Sent' }
];

export default function Announcements({ currentUserRole = 'admin' }) {
  const isAdmin = currentUserRole === 'admin';
  const [history, setHistory] = useState(INITIAL_ANNOUNCEMENTS);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#0F1729] tracking-tight">Announcements</h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">12 sent</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Drafted by AI, approved by you.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">Subject</th>
              <th className="p-4">Audience</th>
              <th className="p-4">Channels</th>
              <th className="p-4">Date</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map(h => (
              <tr key={h.id} className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-900">{h.subject}</td>
                <td className="p-4 font-medium text-slate-700">{h.audience}</td>
                <td className="p-4">
                  <div className="flex gap-1">
                    {h.channels.map(c => <span key={c} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">{c}</span>)}
                  </div>
                </td>
                <td className="p-4 text-slate-500">{h.date}</td>
                <td className="p-4 font-bold text-emerald-600">✓ {h.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
