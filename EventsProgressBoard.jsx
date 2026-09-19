import React, { useState, useEffect } from 'react';

/**
 * EventsProgressBoard Component — Planova Dashboard
 * Clean Light Theme (All Black Accents, No Purple)
 */

const PHASES = ['Concept', 'Approvals', 'Promotion', 'Logistics', 'Execution'];

const RISK_CONFIG = {
  low: { color: '#64748B', bg: 'bg-slate-100', text: 'text-slate-700', label: 'Low Risk' },
  medium: { color: '#D97706', bg: 'bg-amber-100', text: 'text-amber-800', label: 'Medium Risk' },
  high: { color: '#EA580C', bg: 'bg-orange-100', text: 'text-orange-800', label: 'High Risk' },
  critical: { color: '#B91C1C', bg: 'bg-red-100', text: 'text-red-800', label: 'Critical Risk' }
};

const DEFAULT_EVENTS = [
  {
    id: 'evt-1',
    name: 'TechNova Hackathon 2026',
    type: 'Hackathon',
    typeBadgeColor: 'bg-slate-100 text-black border-slate-300',
    daysLeft: 12,
    percentComplete: 68,
    phase: 'Logistics',
    riskLevel: 'critical',
    riskSummary: 'Auditorium AC permission pending',
    status: 'in_progress',
    topMembers: [
      { name: 'Priya Patel', initials: 'PP', bg: 'bg-emerald-600' },
      { name: 'Arjun Rao', initials: 'AR', bg: 'bg-slate-800' },
      { name: 'Neha Sharma', initials: 'NS', bg: 'bg-zinc-700' }
    ]
  },
  {
    id: 'evt-2',
    name: 'RoboQuest Championship',
    type: 'Competition',
    typeBadgeColor: 'bg-blue-50 text-[#2563EB] border-blue-200',
    daysLeft: 24,
    percentComplete: 45,
    phase: 'Promotion',
    riskLevel: 'medium',
    riskSummary: 'Sponsorship confirmation delayed',
    status: 'in_progress',
    topMembers: [
      { name: 'Dev Malik', initials: 'DM', bg: 'bg-cyan-700' },
      { name: 'Kavya Sen', initials: 'KS', bg: 'bg-amber-600' },
      { name: 'Rohan Jha', initials: 'RJ', bg: 'bg-rose-600' }
    ]
  },
  {
    id: 'evt-3',
    name: 'Alumni Mentorship Mixer',
    type: 'Networking',
    typeBadgeColor: 'bg-emerald-50 text-[#059669] border-emerald-200',
    daysLeft: 38,
    percentComplete: 20,
    phase: 'Approvals',
    riskLevel: 'low',
    riskSummary: 'Guest speaker invites sent',
    status: 'upcoming',
    topMembers: [
      { name: 'Tanvi G', initials: 'TG', bg: 'bg-slate-700' },
      { name: 'Siddharth V', initials: 'SV', bg: 'bg-slate-900' },
      { name: 'Ananya M', initials: 'AM', bg: 'bg-teal-700' }
    ]
  },
  {
    id: 'evt-4',
    name: 'DesignSprint UI Workshop',
    type: 'Workshop',
    typeBadgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    daysLeft: 0,
    percentComplete: 100,
    phase: 'Execution',
    riskLevel: 'low',
    riskSummary: 'All milestones completed',
    status: 'completed',
    topMembers: [
      { name: 'Aarav Shah', initials: 'AS', bg: 'bg-slate-800' },
      { name: 'Sneha Roy', initials: 'SR', bg: 'bg-zinc-700' },
      { name: 'Karan Mehta', initials: 'KM', bg: 'bg-slate-900' }
    ]
  }
];

export default function EventsProgressBoard({ onSelectEvent, onCreateEvent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('in_progress');

  useEffect(() => {
    let isMounted = true;
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events?status=active');
        if (!res.ok) throw new Error('Events fetch failed');
        const data = await res.json();
        if (isMounted) setEvents(data);
      } catch {
        if (isMounted) setEvents(DEFAULT_EVENTS);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchEvents();
    return () => { isMounted = false; };
  }, []);

  const filteredEvents = events.filter(e => {
    if (activeFilter === 'all') return true;
    return e.status === activeFilter;
  });

  const radius = 22;
  const circumference = 2 * Math.PI * radius;

  return (
    <section aria-labelledby="events-board-heading" className="w-full">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h2 id="events-board-heading" className="text-lg font-bold text-black tracking-tight flex items-center gap-2">
            <span>Events Portfolio</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-black border border-slate-300">
              {events.length} active
            </span>
          </h2>
          <span className="hidden sm:inline-block text-xs text-slate-300">|</span>
          <p className="hidden sm:inline-block text-xs text-slate-500">Live progress across milestones & phases</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-[#E2E8F0]">
          {[
            { key: 'in_progress', label: 'In Progress' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'completed', label: 'Completed' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                activeFilter === tab.key
                  ? 'bg-black text-white shadow-xs'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="min-w-[320px] max-w-[340px] bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs animate-pulse flex flex-col justify-between h-[230px]">
              <div className="flex justify-between items-start">
                <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                <div className="h-5 bg-slate-200 rounded w-16"></div>
              </div>
              <div className="flex items-center justify-between my-3">
                <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                <div className="h-4 bg-slate-200 rounded w-24"></div>
              </div>
              <div className="h-2 bg-slate-200 rounded w-full my-2"></div>
              <div className="h-6 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-[14px] border border-dashed border-[#CBD5E1] p-8 text-center my-2 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-black flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-black mb-1">No events in this view</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">No events match the selected status filter. Create your club's next event or adjust the filter.</p>
          {/* BLACK Button */}
          <button
            onClick={() => onCreateEvent ? onCreateEvent() : alert('Opening Create Event modal...')}
            className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
          >
            + Create First Event
          </button>
        </div>
      ) : (
        /* Horizontal Scrollable Portfolio Cards */
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
          {filteredEvents.map(evt => {
            const risk = RISK_CONFIG[evt.riskLevel] || RISK_CONFIG.low;
            const phaseIndex = PHASES.indexOf(evt.phase);
            const strokeDashoffset = circumference - (evt.percentComplete / 100) * circumference;

            return (
              <div
                key={evt.id}
                tabIndex="0"
                role="button"
                aria-label={`${evt.name}, ${evt.percentComplete}% complete, ${evt.daysLeft} days left`}
                onClick={() => onSelectEvent ? onSelectEvent(evt.id) : alert(`Navigating to event workspace: ${evt.name}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSelectEvent) onSelectEvent(evt.id);
                  }
                }}
                className="min-w-[320px] max-w-[340px] flex-shrink-0 bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs hover:shadow-md hover:border-[#CBD5E1] transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                {/* Top Row: Name, Badge & Countdown */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-md border ${evt.typeBadgeColor}`}>
                      {evt.type}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {evt.daysLeft === 0 ? 'Event Day' : `${evt.daysLeft}d left`}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight line-clamp-1 hover:text-black transition-colors">
                    {evt.name}
                  </h3>
                </div>

                {/* Middle Row: Circular Progress Ring & Percent */}
                <div className="my-4 flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 52 52">
                        <circle
                          cx="26"
                          cy="26"
                          r={radius}
                          stroke="#E2E8F0"
                          strokeWidth="4"
                          fill="transparent"
                        />
                        <circle
                          cx="26"
                          cy="26"
                          r={radius}
                          stroke="#000000"
                          strokeWidth="4"
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      <span className="absolute text-[11px] font-extrabold text-black">
                        {evt.percentComplete}%
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Task Completion</div>
                      <div className="text-[11px] text-slate-500">{evt.percentComplete}% of milestones completed</div>
                    </div>
                  </div>

                  {/* Risk Indicator Dot */}
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5" title={evt.riskSummary}>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: risk.color }}
                      ></span>
                      <span className="text-[11px] font-bold capitalize text-slate-800">{risk.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[110px]" title={evt.riskSummary}>
                      {evt.riskSummary}
                    </span>
                  </div>
                </div>

                {/* Phase Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 mb-1">
                    <span>Phase: <strong className="text-black">{evt.phase}</strong></span>
                    <span>Step {phaseIndex + 1} of {PHASES.length}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 w-full">
                    {PHASES.map((p, idx) => {
                      const isComplete = idx <= phaseIndex;
                      const isCurrent = idx === phaseIndex;
                      return (
                        <div
                          key={p}
                          title={p}
                          className={`h-1.5 rounded-full transition-colors ${
                            isCurrent
                              ? 'bg-black'
                              : isComplete
                              ? 'bg-slate-400'
                              : 'bg-slate-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Row: Active Member Avatars & Workspace Link */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center">
                    <span className="text-[11px] text-slate-400 mr-2 font-medium">Team:</span>
                    <div className="flex -space-x-2 overflow-hidden">
                      {evt.topMembers.map((m, i) => (
                        <div
                          key={i}
                          title={m.name}
                          className={`inline-block h-6 w-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white ${m.bg}`}
                        >
                          {m.initials}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-black flex items-center hover:underline">
                    <span>Workspace</span>
                    <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
