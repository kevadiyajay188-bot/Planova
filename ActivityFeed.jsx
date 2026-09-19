import React, { useState, useEffect } from 'react';

/**
 * ActivityFeed Component — Planova Dashboard
 * Chronological timeline mixing human actions and AI actions.
 * - Human actions styled with standard slate styling.
 * - AI actions styled with AI accent color (#0E7490) + sparkle icon + [Undo] button.
 * - Supports filtering (All / AI Copilot) and undo interaction.
 */

const DEFAULT_ACTIVITIES = [
  {
    id: 'act-1',
    actor: 'user',
    authorName: 'Priya Patel',
    avatarInitials: 'PP',
    avatarBg: 'bg-emerald-600',
    text: "moved 'Poster design' to Done",
    timestamp: '10m ago',
    eventTag: 'TechNova 2026',
    undoable: false
  },
  {
    id: 'act-2',
    actor: 'ai',
    authorName: 'Planova AI',
    text: "created 9 tasks from 'Core Sync' meeting notes",
    timestamp: '2h ago',
    eventTag: 'Auto-Tasked',
    undoable: true
  },
  {
    id: 'act-3',
    actor: 'ai',
    authorName: 'Planova AI',
    text: 'raised a risk: permission letter pending for Central Auditorium',
    timestamp: '5h ago',
    eventTag: 'Risk Detection',
    undoable: true
  },
  {
    id: 'act-4',
    actor: 'user',
    authorName: 'Arjun Rao',
    avatarInitials: 'AR',
    avatarBg: 'bg-indigo-600',
    text: "uploaded 'Sponsorship_Brochure_v2.pdf'",
    timestamp: '1d ago',
    eventTag: 'Documents',
    undoable: false
  },
  {
    id: 'act-5',
    actor: 'ai',
    authorName: 'Planova AI',
    text: 'rebalanced 3 tasks away from overloaded volunteer Dev Malik',
    timestamp: '1d ago',
    eventTag: 'Workload Copilot',
    undoable: true
  },
  {
    id: 'act-6',
    actor: 'user',
    authorName: 'Neha Sharma',
    avatarInitials: 'NS',
    avatarBg: 'bg-purple-600',
    text: "published announcement: 'Volunteer Registration is Now Open'",
    timestamp: '2d ago',
    eventTag: 'Broadcast',
    undoable: false
  }
];

export default function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'ai'
  const [undoneIds, setUndoneIds] = useState(new Set());

  useEffect(() => {
    let isMounted = true;
    async function fetchActivities() {
      try {
        const res = await fetch('/api/dashboard/activity');
        if (!res.ok) throw new Error('Activity fetch failed');
        const data = await res.json();
        if (isMounted) setActivities(data);
      } catch {
        if (isMounted) setActivities(DEFAULT_ACTIVITIES);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchActivities();
    return () => { isMounted = false; };
  }, []);

  const handleUndo = (id) => {
    fetch(`/api/ai/undo/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(() => setUndoneIds(prev => new Set(prev).add(id)))
      .catch(() => setUndoneIds(prev => new Set(prev).add(id)));
  };

  const filteredActivities = activities.filter(item => {
    if (filter === 'ai') return item.actor === 'ai';
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-[14px] p-5 border border-[#E2E5EE] shadow-sm animate-pulse h-full">
        <div className="h-5 bg-slate-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                <div className="h-2 bg-slate-100 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside aria-labelledby="activity-feed-heading" className="bg-white rounded-[14px] p-5 border border-[#E2E5EE] shadow-sm flex flex-col h-full">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div>
          <h2 id="activity-feed-heading" className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Recent Activity</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Live
            </span>
          </h2>
          <p className="text-[11px] text-slate-500">Human & AI collaborative actions</p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded-md transition-all ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('ai')}
            className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
              filter === 'ai' ? 'bg-white text-[#0E7490] shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <svg className="w-3 h-3 text-[#0E7490]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            AI Only
          </button>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {filteredActivities.map((item) => {
          const isAI = item.actor === 'ai';
          const isUndone = undoneIds.has(item.id);

          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors ${
                isAI ? 'bg-cyan-50/40 border border-cyan-100/70' : 'hover:bg-slate-50'
              } ${isUndone ? 'opacity-40 line-through' : ''}`}
            >
              {/* Avatar / Sparkle Icon */}
              {isAI ? (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-xs"
                  style={{ backgroundColor: '#0E7490' }}
                  title="Planova AI Copilot Action"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              ) : (
                <div className={`w-8 h-8 rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-xs ${item.avatarBg || 'bg-slate-700'}`}>
                  {item.avatarInitials || item.authorName?.[0]}
                </div>
              )}

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-relaxed text-slate-800">
                  <strong className={isAI ? 'text-[#0E7490] font-bold' : 'text-slate-900 font-bold'}>
                    {item.authorName}
                  </strong>{' '}
                  <span className="text-slate-700">{item.text}</span>
                </div>

                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">{item.timestamp}</span>
                  {item.eventTag && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {item.eventTag}
                    </span>
                  )}
                  {isAI && item.undoable && !isUndone && (
                    <button
                      onClick={() => handleUndo(item.id)}
                      className="ml-auto text-[11px] font-bold text-[#0E7490] hover:text-[#085265] bg-cyan-100/60 hover:bg-cyan-100 px-2 py-0.5 rounded transition-colors"
                      title="Revert AI action"
                    >
                      [Undo]
                    </button>
                  )}
                  {isUndone && (
                    <span className="ml-auto text-[10px] text-slate-400 italic">Reverted</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
