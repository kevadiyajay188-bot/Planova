import React, { useState } from 'react';

/**
 * KnowledgeBase Component — Planova Operations
 * Route: /knowledge
 */

const INITIAL_SOURCES = [
  { id: 'src-1', name: 'TechNova_2025_PostEvent_Report.pdf', category: 'Past Event', pages: 28 },
  { id: 'src-2', name: 'University_Auditorium_Booking_Guidelines_2026.pdf', category: 'Campus Policy', pages: 14 },
  { id: 'src-3', name: 'Student_Council_Sponsorship_Tier_Standard.pdf', category: 'Sponsorship', pages: 8 }
];

export default function KnowledgeBase({ currentUserRole = 'admin' }) {
  const isAdmin = currentUserRole === 'admin';
  const [sources, setSources] = useState(INITIAL_SOURCES);
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#0F1729] tracking-tight">Knowledge Base</h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">24 documents indexed</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Ask questions across all past events with citations.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex gap-2">
        <input
          type="text"
          placeholder="Ask a question about past events, vendor contacts, or booking guidelines..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-black"
        />
        <button className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold">Ask AI</button>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Indexed Sources</h3>
        <div className="space-y-2">
          {sources.map(s => (
            <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">📄 {s.name}</span>
              <span className="text-slate-400">{s.category} • {s.pages} pages</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
