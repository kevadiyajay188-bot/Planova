import React, { useState } from 'react';

/**
 * Risks Component — Planova Operations
 * Route: /events/[id]/risks
 */

const INITIAL_RISKS = [
  { id: 'rsk-1', title: 'Auditorium Permission Letter Pending Official Dean Stamp', severity: 'critical', facts: '4 days left, no owner confirmed.', aiExplanation: 'Venue electrical breaker mains locked 2 hours prior to start without stamped permit.', owner: 'Priya Patel' },
  { id: 'rsk-2', title: 'Stage Wi-Fi Router IP Pool Insufficient for Hackathon Density', severity: 'high', facts: '350 hackers registered, 150 DHCP leases.', aiExplanation: 'Hackers will experience IP collision during live demos.', owner: 'Arjun Rao' },
  { id: 'rsk-3', title: 'Title Sponsor Deliverables Agreement Lacks Banner Sign-off', severity: 'medium', facts: 'Contract signed, specs unacknowledged.', aiExplanation: 'Risk of post-event invoice deduction.', owner: 'Dev Malik' }
];

export default function Risks({ currentUserRole = 'admin' }) {
  const isAdmin = currentUserRole === 'admin';
  const [risks, setRisks] = useState(INITIAL_RISKS);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#0F1729] tracking-tight">Risks</h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-red-800 border border-red-200">3 open (1 critical)</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Detected automatically, explained by AI.</p>
        </div>
      </div>

      <div className="space-y-4">
        {risks.map(r => (
          <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${r.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                {r.severity}
              </span>
            </div>
            <p className="text-xs text-slate-500">Facts: {r.facts}</p>
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-slate-800">
              <span className="text-[#0E7490] font-bold block text-[10px]">✦ AI PROJECTION</span>
              {r.aiExplanation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
