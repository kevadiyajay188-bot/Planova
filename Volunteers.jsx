import React, { useState, useMemo } from 'react';

/**
 * Volunteers Component — Planova Operations
 * Route: /events/[id]/volunteers
 */

const INITIAL_MEMBERS = [
  { id: 'usr-1', name: 'Priya Patel', avatar: 'PP', email: 'priya.p@campus.edu', role: 'Core Team', vertical: 'Logistics', skills: ['Floor Management', 'Audio Testing'], openTasks: 8, availability: [1, 1, 1, 0, 1, 1, 0] },
  { id: 'usr-2', name: 'Arjun Rao', avatar: 'AR', email: 'arjun.r@campus.edu', role: 'Core Team', vertical: 'Technical', skills: ['React', 'PostgreSQL', 'APIs'], openTasks: 7, availability: [1, 1, 0, 1, 1, 1, 1] },
  { id: 'usr-3', name: 'Neha Sharma', avatar: 'NS', email: 'neha.s@campus.edu', role: 'Core Team', vertical: 'Marketing', skills: ['Canva', 'Figma', 'Copywriting'], openTasks: 4, availability: [1, 1, 1, 1, 1, 0, 0] },
  { id: 'usr-4', name: 'Dev Malik', avatar: 'DM', email: 'dev.m@campus.edu', role: 'Core Team', vertical: 'Sponsorship', skills: ['Pitch Decks', 'Contract Negotiation'], openTasks: 5, availability: [1, 0, 1, 1, 0, 1, 0] },
  { id: 'usr-5', name: 'Rohan Jha', avatar: 'RJ', email: 'rohan.j@campus.edu', role: 'Volunteer', vertical: 'Operations', skills: ['Badges', 'Kit Assembly'], openTasks: 3, availability: [1, 1, 1, 1, 1, 1, 0] },
  { id: 'usr-6', name: 'Tanvi Gaikwad', avatar: 'TG', email: 'tanvi.g@campus.edu', role: 'Volunteer', vertical: 'Logistics', skills: ['Safety & EMT', 'Crowd Protocol'], openTasks: 4, availability: [0, 1, 1, 1, 1, 0, 0] },
  { id: 'usr-8', name: 'Aman Varma', avatar: 'AV', email: 'aman.v@campus.edu', role: 'Volunteer', vertical: 'Operations', skills: ['Check-in Booth'], openTasks: 0, availability: [1, 1, 1, 1, 1, 1, 1] }
];

export default function Volunteers({ currentUserRole = 'admin' }) {
  const isAdmin = currentUserRole === 'admin';
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [search, setSearch] = useState('');

  const overloadedCount = members.filter(m => m.openTasks > 6).length;
  const freeCount = members.filter(m => m.openTasks === 0).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#0F1729] tracking-tight">Volunteers</h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">22 members</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Roster, load, and availability across all event verticals.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase">Active Roster</span>
          <p className="text-3xl font-black mt-1">22</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase">Overloaded (&gt;6)</span>
          <p className="text-3xl font-black text-red-600 mt-1">{overloadedCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase">Free (0 tasks)</span>
          <p className="text-3xl font-black mt-1">{freeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase">Average Load</span>
          <p className="text-3xl font-black mt-1">3.1 <span className="text-xs text-slate-400">tasks</span></p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Role</th>
              <th className="p-4">Vertical</th>
              <th className="p-4">Open Tasks</th>
              <th className="p-4">Load Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map(m => (
              <tr key={m.id} className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-900">{m.name}</td>
                <td className="p-4 font-semibold text-slate-700">{m.role}</td>
                <td className="p-4 text-slate-600">{m.vertical}</td>
                <td className="p-4 font-bold">{m.openTasks} tasks</td>
                <td className="p-4 w-40">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.openTasks > 6 ? 'bg-red-600' : 'bg-blue-600'}`} style={{ width: `${Math.min((m.openTasks / 8) * 100, 100)}%` }}></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
