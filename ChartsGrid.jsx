import React, { useState, useEffect } from 'react';

let Recharts = null;
try {
  Recharts = require('recharts');
} catch (e) {
  if (typeof window !== 'undefined' && window.Recharts) {
    Recharts = window.Recharts;
  }
}

const {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  AreaChart,
  Area,
  Line
} = (typeof window !== 'undefined' && window.Recharts) ? window.Recharts : (Recharts || {});

const STATUS_COLORS = {
  todo: '#94A3B8',
  doing: '#2563EB',
  blocked: '#DC2626',
  review: '#D97706',
  done: '#059669'
};

const SEVERITY_COLORS = {
  Critical: '#B91C1C',
  High: '#EA580C',
  Medium: '#D97706',
  Low: '#64748B'
};

const DEFAULT_CHARTS_DATA = {
  taskStatus: [
    { name: 'Done', count: 41, color: '#059669' },
    { name: 'Doing', count: 14, color: '#2563EB' },
    { name: 'Review', count: 5, color: '#D97706' },
    { name: 'Blocked', count: 2, color: '#DC2626' },
    { name: 'To do', count: 6, color: '#94A3B8' }
  ],
  riskSeverity: [
    { severity: 'Critical', count: 1, color: '#B91C1C' },
    { severity: 'High', count: 2, color: '#EA580C' },
    { severity: 'Medium', count: 4, color: '#D97706' },
    { severity: 'Low', count: 7, color: '#64748B' }
  ],
  volunteerLoad: [
    { name: 'Priya P.', tasks: 8, isOverloaded: true },
    { name: 'Arjun R.', tasks: 7, isOverloaded: true },
    { name: 'Dev M.', tasks: 5, isOverloaded: false },
    { name: 'Neha S.', tasks: 4, isOverloaded: false },
    { name: 'Kavya S.', tasks: 3, isOverloaded: false },
    { name: 'Tanvi G.', tasks: 2, isOverloaded: false }
  ],
  completionTrend: [
    { day: 'Day 1', actual: 4, planned: 3 },
    { day: 'Day 3', actual: 9, planned: 7 },
    { day: 'Day 5', actual: 15, planned: 12 },
    { day: 'Day 7', actual: 21, planned: 18 },
    { day: 'Day 9', actual: 28, planned: 25 },
    { day: 'Day 11', actual: 34, planned: 32 },
    { day: 'Day 13', actual: 39, planned: 38 },
    { day: 'Day 14', actual: 41, planned: 42 }
  ],
  budget: {
    event: 'TechNova Hackathon 2026',
    totalPlanned: 12000,
    committed: 4500,
    spent: 3200,
    currency: '$'
  },
  eventsComparison: [
    { name: 'TechNova', percent: 68, fill: '#000000' },
    { name: 'RoboQuest', percent: 45, fill: '#2563EB' },
    { name: 'Mixer', percent: 20, fill: '#059669' }
  ]
};

export default function ChartsGrid() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchChartsData() {
      try {
        const res = await fetch('/api/dashboard/charts');
        if (!res.ok) throw new Error('Charts API failed');
        const json = await res.json();
        if (isMounted) setData(json);
      } catch {
        if (isMounted) setData(DEFAULT_CHARTS_DATA);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchChartsData();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs animate-pulse h-[320px] flex flex-col justify-between">
            <div className="h-5 bg-slate-200 rounded w-1/2"></div>
            <div className="h-44 bg-slate-100 rounded-lg w-full"></div>
            <div className="h-4 bg-slate-100 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const chartData = data || DEFAULT_CHARTS_DATA;
  const totalTasks = chartData.taskStatus?.reduce((acc, curr) => acc + curr.count, 0) || 68;
  const doneTasks = chartData.taskStatus?.find(t => t.name.toLowerCase() === 'done')?.count || 41;
  const donePercent = Math.round((doneTasks / (totalTasks || 1)) * 100);

  const hasRecharts = Boolean(ResponsiveContainer && PieChart && BarChart && AreaChart);

  return (
    <section aria-labelledby="analytics-heading" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 id="analytics-heading" className="text-lg font-bold text-black tracking-tight flex items-center gap-2">
            <span>Operational Analytics</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-black border border-slate-300">
              Live Metrics
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time health of tasks, workloads, pace, and risks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CHART 1: TASK STATUS BREAKDOWN */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Task Status Breakdown</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {donePercent}% Complete
            </span>
          </div>

          <div className="relative h-48 w-full flex items-center justify-center">
            {hasRecharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.taskStatus}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {chartData.taskStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} tasks`, name]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-32 h-32 rounded-full border-8 border-emerald-500 border-t-black border-r-amber-500 flex items-center justify-center">
                <span className="text-sm font-bold text-slate-700">{totalTasks}</span>
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-black leading-none">{totalTasks}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Total Tasks</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-700 mb-2">
              <strong>{doneTasks} of {totalTasks} tasks completed</strong> ({donePercent}% pace)
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {chartData.taskStatus.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                  <span>{s.name}: <strong className="text-slate-800">{s.count}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CHART 2: RISK SEVERITY */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Risk Severity</h3>
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
              Descending Severity
            </span>
          </div>

          <div className="h-48 w-full">
            {hasRecharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData.riskSeverity}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    dataKey="severity"
                    type="category"
                    tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }}
                    width={65}
                  />
                  <Tooltip
                    formatter={(val) => [`${val} risks`, 'Open Risks']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {chartData.riskSeverity.map((entry, index) => (
                      <Cell key={`risk-cell-${index}`} fill={entry.color || SEVERITY_COLORS[entry.severity] || '#64748B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Critical risks trigger executive escalations</span>
            <span className="font-bold text-black">{chartData.riskSeverity.reduce((a, b) => a + b.count, 0)} Total Open</span>
          </div>
        </div>

        {/* CHART 3: VOLUNTEER WORKLOAD */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Volunteer Workload</h3>
            <span className="text-[11px] font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
              Overload &gt; 6 tasks
            </span>
          </div>

          <div className="h-48 w-full">
            {hasRecharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData.volunteerLoad}
                  margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 500 }}
                    width={60}
                  />
                  <Tooltip
                    formatter={(val) => [`${val} active tasks`, 'Workload']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <ReferenceLine
                    x={6}
                    stroke="#DC2626"
                    strokeDasharray="4 4"
                    label={{ value: 'Overload (6)', fill: '#DC2626', fontSize: 10, position: 'top' }}
                  />
                  <Bar dataKey="tasks" radius={[0, 6, 6, 0]}>
                    {chartData.volunteerLoad.map((entry, index) => (
                      <Cell
                        key={`vol-cell-${index}`}
                        fill={entry.tasks >= 6 ? '#DC2626' : '#000000'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>2 members currently overloaded</span>
            <button className="text-xs font-bold text-black hover:underline">Rebalance Tasks</button>
          </div>
        </div>

        {/* CHART 4: TASKS OVER TIME */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Completion Pace (14 Days)</h3>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-black font-bold">
                <span className="w-2.5 h-1 bg-black rounded"></span> Actual
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-1 bg-slate-400 border border-dashed rounded"></span> Target Pace
              </span>
            </div>
          </div>

          <div className="h-48 w-full">
            {hasRecharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData.completionTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.20}/>
                      <stop offset="95%" stopColor="#000000" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#000000"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                    name="Completed Tasks"
                  />
                  <Line
                    type="monotone"
                    dataKey="planned"
                    stroke="#94A3B8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Target Pace"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Tracking within 2% of milestone target</span>
            <span className="font-bold text-emerald-600">On Track</span>
          </div>
        </div>

        {/* CHART 5: BUDGET TRACKER */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Event Budget Tracker</h3>
            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              {chartData.budget.event}
            </span>
          </div>

          <div className="h-48 flex flex-col justify-center px-1">
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400">Planned</div>
                <div className="text-sm font-extrabold text-black">${chartData.budget.totalPlanned.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-100">
                <div className="text-[10px] uppercase font-bold text-blue-600">Committed</div>
                <div className="text-sm font-extrabold text-[#2563EB]">${chartData.budget.committed.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <div className="text-[10px] uppercase font-bold text-emerald-600">Spent</div>
                <div className="text-sm font-extrabold text-[#059669]">${chartData.budget.spent.toLocaleString()}</div>
              </div>
            </div>

            <div className="w-full">
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                <span>Budget Utilized: {Math.round(((chartData.budget.spent + chartData.budget.committed) / chartData.budget.totalPlanned) * 100)}%</span>
                <span>Remaining: ${(chartData.budget.totalPlanned - chartData.budget.spent - chartData.budget.committed).toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="bg-[#059669] transition-all duration-500"
                  style={{ width: `${(chartData.budget.spent / chartData.budget.totalPlanned) * 100}%` }}
                />
                <div
                  className="bg-[#2563EB] transition-all duration-500"
                  style={{ width: `${(chartData.budget.committed / chartData.budget.totalPlanned) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#059669]"></span> Spent (27%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span> Committed (37.5%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-200"></span> Unallocated (35.5%)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Sponsorship funds: $8,000 received</span>
            <button className="text-xs font-bold text-black hover:underline">View Ledger</button>
          </div>
        </div>

        {/* CHART 6: EVENTS COMPARISON */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Events Milestone Comparison</h3>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              Portfolio View
            </span>
          </div>

          <div className="h-48 w-full">
            {hasRecharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.eventsComparison}
                  margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    formatter={(val) => [`${val}% complete`, 'Progress']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Bar dataKey="percent" radius={[6, 6, 0, 0]}>
                    {chartData.eventsComparison.map((entry, index) => (
                      <Cell key={`event-cmp-${index}`} fill={entry.fill || '#000000'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>TechNova closest to execution date</span>
            <span className="font-bold text-black">3 Active Events</span>
          </div>
        </div>
      </div>
    </section>
  );
}
