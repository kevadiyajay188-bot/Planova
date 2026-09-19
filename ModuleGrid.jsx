import React, { useState, useEffect } from 'react';

/**
 * ModuleGrid Component — Planova Dashboard
 * Covers all 8 required core areas without purple:
 * 1. Tasks
 * 2. Volunteers
 * 3. Meetings
 * 4. Deadlines
 * 5. Documents
 * 6. Risks
 * 7. Announcements
 * 8. Knowledge base
 */

const DEFAULT_MODULES = {
  tasks: { stat: '41 of 68 done', statusDot: '#2563EB', statusLabel: 'Doing' },
  volunteers: { stat: '20 active, 2 overloaded', statusDot: '#DC2626', statusLabel: 'Overload Alert' },
  meetings: { stat: 'Last: Core Sync, 2 days ago', statusDot: '#059669', statusLabel: 'Minutes Logged' },
  deadlines: { stat: '5 due this week', statusDot: '#D97706', statusLabel: 'Urgent' },
  documents: { stat: '12 files, 2 pending review', statusDot: '#D97706', statusLabel: '2 Pending Review' },
  risks: { stat: '3 open (1 critical)', statusDot: '#B91C1C', statusLabel: 'Critical' },
  announcements: { stat: 'Last sent: Registration open', statusDot: '#059669', statusLabel: 'Delivered' },
  knowledgeBase: { stat: 'Ask a question about past events', statusDot: '#0E7490', statusLabel: 'AI Indexed' }
};

export default function ModuleGrid({ onSelectModule }) {
  const [modules, setModules] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchModules() {
      try {
        const res = await fetch('/api/dashboard/modules');
        if (!res.ok) throw new Error('Modules fetch failed');
        const data = await res.json();
        if (isMounted) setModules(data);
      } catch {
        if (isMounted) setModules(DEFAULT_MODULES);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchModules();
    return () => { isMounted = false; };
  }, []);

  const modData = modules || DEFAULT_MODULES;

  const MODULE_TILES = [
    {
      id: 'tasks',
      title: 'Tasks',
      stat: modData.tasks?.stat,
      statusDot: modData.tasks?.statusDot || '#2563EB',
      statusLabel: modData.tasks?.statusLabel,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      iconBg: 'bg-slate-100 text-black'
    },
    {
      id: 'volunteers',
      title: 'Volunteers',
      stat: modData.volunteers?.stat,
      statusDot: modData.volunteers?.statusDot || '#DC2626',
      statusLabel: modData.volunteers?.statusLabel,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      iconBg: 'bg-slate-100 text-black'
    },
    {
      id: 'meetings',
      title: 'Meetings',
      stat: modData.meetings?.stat,
      statusDot: modData.meetings?.statusDot,
      statusLabel: modData.meetings?.statusLabel,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      ),
      iconBg: 'bg-slate-100 text-black'
    },
    {
      id: 'deadlines',
      title: 'Deadlines',
      stat: modData.deadlines?.stat,
      statusDot: modData.deadlines?.statusDot,
      statusLabel: modData.deadlines?.statusLabel,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      iconBg: 'bg-amber-50 text-[#D97706]'
    },
    {
      id: 'documents',
      title: 'Document Review',
      stat: modData.documents?.stat,
      statusDot: modData.documents?.statusDot || '#D97706',
      statusLabel: modData.documents?.statusLabel || '2 Pending Review',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      iconBg: 'bg-amber-50 text-amber-800'
    },
    {
      id: 'risks',
      title: 'Risks',
      stat: modData.risks?.stat,
      statusDot: modData.risks?.statusDot || '#B91C1C',
      statusLabel: modData.risks?.statusLabel,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: 'bg-red-50 text-[#B91C1C]'
    },
    {
      id: 'announcements',
      title: 'Announcements',
      stat: modData.announcements?.stat,
      statusDot: modData.announcements?.statusDot,
      statusLabel: modData.announcements?.statusLabel,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      iconBg: 'bg-slate-100 text-black'
    },
    {
      id: 'knowledgeBase',
      title: 'Knowledge Base',
      stat: modData.knowledgeBase?.stat,
      statusDot: modData.knowledgeBase?.statusDot || '#0E7490',
      statusLabel: modData.knowledgeBase?.statusLabel,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      iconBg: 'bg-cyan-50 text-[#0E7490]'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-[14px] p-4 border border-[#E2E8F0] shadow-xs animate-pulse h-28 flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-200 rounded-lg"></div>
              <div className="h-4 bg-slate-200 rounded w-20"></div>
            </div>
            <div className="h-3 bg-slate-100 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby="modules-heading" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 id="modules-heading" className="text-lg font-bold text-black tracking-tight flex items-center gap-2">
            <span>Core Modules</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-black border border-slate-300">
              8 Modules
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Quick access with live operational summaries</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MODULE_TILES.map(tile => (
          <button
            key={tile.id}
            onClick={() => {
              if (onSelectModule) {
                onSelectModule(tile.id);
              } else if (tile.id === 'documents') {
                if (typeof window !== 'undefined') window.location.href = 'documents-review.html';
              } else {
                alert(`Navigating to ${tile.title} module...`);
              }
            }}
            aria-label={`${tile.title} module, ${tile.stat}`}
            className="group text-left bg-white rounded-[14px] p-4 border border-[#E2E8F0] shadow-xs hover:shadow-md hover:border-[#CBD5E1] transition-all duration-200 flex flex-col justify-between h-32 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${tile.iconBg}`}>
                  {tile.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-black transition-colors leading-tight">
                    {tile.title}
                  </h3>
                  {tile.statusLabel && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      {tile.statusLabel}
                    </span>
                  )}
                </div>
              </div>

              {tile.statusDot && (
                <div className="relative flex items-center" title={`Status: ${tile.statusLabel || 'Active'}`}>
                  <span
                    className="w-2.5 h-2.5 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: tile.statusDot }}
                  />
                  {tile.statusDot === '#B91C1C' && (
                    <span className="absolute -inset-0.5 rounded-full bg-red-400 animate-ping opacity-60 pointer-events-none" />
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-50 flex items-center justify-between w-full">
              <p className="text-xs font-semibold text-slate-700 truncate pr-1">
                {tile.stat}
              </p>
              <span className="text-slate-400 group-hover:text-black text-xs font-bold">→</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
