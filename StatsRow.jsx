import React, { useState, useEffect } from 'react';

/**
 * StatsRow Component — Planova Dashboard
 * Clean Light Theme (Black Typography & Accents, No Purple)
 */
const DEFAULT_STATS = {
  myTasksToday: { value: 6, trend: '+2 vs yesterday', trendUp: true },
  overdue: { value: 2, trend: 'Needs action', isAlert: true },
  openRisks: { value: 3, criticalCount: 1, label: '1 Critical' },
  upcomingDeadlines: { value: 5, subtext: 'Next 7 days' },
  activeEvents: { value: 3, subtext: 'Across 2 clubs' }
};

export default function StatsRow() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) throw new Error('API fetch failed');
        const data = await res.json();
        if (isMounted) setStats(data);
      } catch {
        if (isMounted) setStats(DEFAULT_STATS);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs animate-pulse flex flex-col justify-between h-[120px]">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-8 bg-slate-200 rounded w-1/3 my-2"></div>
            <div className="h-3 bg-slate-100 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const data = stats || DEFAULT_STATS;
  const hasCriticalRisks = (data.openRisks?.criticalCount || 0) > 0;

  return (
    <section aria-label="Quick Summary Metrics" className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: My Tasks Today */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>My Tasks Today</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-black flex items-center justify-center font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-black tracking-tight">{data.myTasksToday?.value ?? 0}</span>
          </div>
          <div className="flex items-center text-xs font-medium text-emerald-600">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>{data.myTasksToday?.trend || 'On schedule'}</span>
          </div>
        </div>

        {/* Card 2: Overdue Tasks */}
        <div className={`bg-white rounded-[14px] p-5 border shadow-xs transition-all flex flex-col justify-between ${
          (data.overdue?.value || 0) > 0 ? 'border-red-200 bg-red-50/20' : 'border-[#E2E8F0]'
        }`}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Overdue Tasks</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              (data.overdue?.value || 0) > 0 ? 'bg-red-100 text-[#DC2626]' : 'bg-slate-100 text-slate-700'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="my-2">
            <span className={`text-3xl font-extrabold tracking-tight ${
              (data.overdue?.value || 0) > 0 ? 'text-[#DC2626]' : 'text-black'
            }`}>
              {data.overdue?.value ?? 0}
            </span>
          </div>
          <div className="flex items-center text-xs font-medium text-red-600">
            {(data.overdue?.value || 0) > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mr-1.5 animate-ping"></span>
                <span>Immediate action needed</span>
              </>
            ) : (
              <span className="text-slate-500">Zero overdue items</span>
            )}
          </div>
        </div>

        {/* Card 3: Open Risks */}
        <div className={`bg-white rounded-[14px] p-5 border shadow-xs transition-all flex flex-col justify-between ${
          hasCriticalRisks ? 'border-rose-200 bg-rose-50/20' : 'border-[#E2E8F0]'
        }`}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Open Risks</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              hasCriticalRisks ? 'bg-red-100 text-[#B91C1C]' : 'bg-amber-100 text-[#D97706]'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight ${
              hasCriticalRisks ? 'text-[#B91C1C]' : 'text-black'
            }`}>
              {data.openRisks?.value ?? 0}
            </span>
            {hasCriticalRisks && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#B91C1C] text-white">
                CRITICAL
              </span>
            )}
          </div>
          <div className="text-xs font-medium text-slate-500">
            {hasCriticalRisks ? (
              <span className="text-[#B91C1C] font-semibold">{data.openRisks?.label || '1 critical risk open'}</span>
            ) : (
              <span>All risks low or mitigated</span>
            )}
          </div>
        </div>

        {/* Card 4: Upcoming Deadlines */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Upcoming Deadlines</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-black tracking-tight">{data.upcomingDeadlines?.value ?? 0}</span>
          </div>
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
            <span>{data.upcomingDeadlines?.subtext || 'Next 7 calendar days'}</span>
          </div>
        </div>

        {/* Card 5: Active Events */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Active Events</span>
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-black tracking-tight">{data.activeEvents?.value ?? 0}</span>
          </div>
          <div className="text-xs font-medium text-slate-500">
            <span>{data.activeEvents?.subtext || 'In active planning'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
