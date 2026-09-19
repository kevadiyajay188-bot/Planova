import React, { useState, useEffect } from 'react';
import StatsRow from './StatsRow.jsx';
import EventsProgressBoard from './EventsProgressBoard.jsx';
import ChartsGrid from './ChartsGrid.jsx';
import ModuleGrid from './ModuleGrid.jsx';
import ActivityFeed from './ActivityFeed.jsx';

/**
 * Planova Homepage / Dashboard Component
 * Clean Light Theme (All Black Buttons, No Purple, Big Logo & Big Name)
 */

export default function Dashboard({ userName = 'Jenish', role = 'President', clubName = 'IEEE Student Branch' }) {
  const [greetingLine, setGreetingLine] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState([
    { role: 'ai', text: 'Hello Jenish! I am Planova Copilot. I can draft agendas, analyze open risks, or rebalance volunteer task assignments. How can I assist you today?' }
  ]);

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchGreetingSummary() {
      try {
        const res = await fetch('/api/dashboard/summary');
        if (!res.ok) throw new Error('API summary unavailable');
        const data = await res.json();
        if (isMounted) setGreetingLine(data.greetingLine);
      } catch {
        if (isMounted) {
          setGreetingLine(
            "3 tasks due today, 2 overdue, and TechNova's auditorium permission is still pending."
          );
        }
      } finally {
        if (isMounted) setSummaryLoading(false);
      }
    }
    fetchGreetingSummary();
    return () => { isMounted = false; };
  }, []);

  const handleCopilotSubmit = (e) => {
    e.preventDefault();
    if (!copilotQuery.trim() || copilotLoading) return;
    const userMsg = copilotQuery;
    setCopilotMessages(prev => [
      ...prev,
      { role: 'user', text: userMsg }
    ]);
    setCopilotQuery('');
    setCopilotLoading(true);

    fetch('/api/ai/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg })
    })
      .then(res => res.json())
      .then(data => {
        const reply = data.text || data.response || 'Operation completed.';
        setCopilotMessages(prev => [
          ...prev,
          { role: 'ai', text: reply }
        ]);
      })
      .catch(() => {
        setCopilotMessages(prev => [
          ...prev,
          { role: 'ai', text: 'AI Copilot is momentarily unavailable. Please try again.' }
        ]);
      })
      .finally(() => setCopilotLoading(false));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      {/* Top Navigation Bar with BIG LOGO & BIG WEBSITE NAME */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        {/* BIG Logo & BIG Name */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center p-1.5 flex-shrink-0">
            <img
              src="planova-logo.jpg"
              alt="Planova Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span class="font-black text-black text-xl">P</span>';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black leading-none">
                PLANOVA
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-black border border-slate-300">
                {clubName}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mt-1">Campus Club Hub</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => setCopilotOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 transition-colors"
          >
            <span>✦ Ask Planova AI</span>
          </button>

          {/* User Profile with Role side-by-side */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shadow-xs ring-2 ring-slate-200">
                {userName[0]}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Online"></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-black leading-tight">{userName}</span>
              {/* Role badge */}
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide uppercase bg-black text-white shadow-xs">
                {role}
              </span>
            </div>
            <button
              type="button"
              title="Sign out"
              onClick={() => typeof window !== 'undefined' && window.PlanovaAuth ? window.PlanovaAuth.logout() : (typeof window !== 'undefined' && location.assign('/'))}
              className="ml-1 p-1 rounded-lg text-slate-400 hover:text-black hover:bg-slate-100 transition-colors"
              aria-label="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. GREETING BAR */}
        <section aria-label="Greeting" className="bg-white rounded-[14px] p-5 sm:p-6 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
              Good {getGreetingTime()}, {userName}.
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-black font-bold flex-shrink-0">
                ✦
              </span>
              {summaryLoading ? (
                <div className="h-4 bg-slate-200 rounded w-80 animate-pulse"></div>
              ) : (
                <p className="text-xs sm:text-sm font-medium text-slate-700">
                  <span className="text-black font-bold">AI Summary:</span> {greetingLine}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => alert('Syncing modules...')}
              className="px-4 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl border border-[#E2E8F0] transition-colors"
            >
              Sync
            </button>
            {/* BLACK Action Button */}
            <button
              onClick={() => setCopilotOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Action</span>
            </button>
          </div>
        </section>

        {/* 2. TOP STATS ROW */}
        <StatsRow />

        {/* 3. EVENTS PROGRESS BOARD */}
        <EventsProgressBoard
          onSelectEvent={(id) => console.log('Navigating to event:', id)}
          onCreateEvent={() => alert('Opening Create Event Wizard...')}
        />

        {/* MAIN BODY GRID: CHARTS + MODULES + ACTIVITY FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <ChartsGrid />
            <ModuleGrid onSelectModule={(modId) => console.log('Opening module:', modId)} />
          </div>

          <div className="lg:col-span-4 sticky top-20">
            <ActivityFeed />
          </div>
        </div>
      </main>

      {/* 7. FLOATING "ASK PLANOVA" BUTTON — BLACK */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setCopilotOpen(true)}
          aria-label="Open Planova AI Copilot"
          className="flex items-center gap-2.5 px-5 py-3 rounded-full text-white font-bold text-xs tracking-wide transition-all duration-200 bg-black hover:bg-slate-800 shadow-2xl border border-slate-700 active:scale-95"
        >
          <span>✦ Ask Planova</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300"></span>
          </span>
        </button>
      </div>

      {/* AI Copilot Slide-over Drawer */}
      {copilotOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setCopilotOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-[#E2E8F0] flex flex-col justify-between">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-black text-white">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black">✦</span>
                  <div>
                    <h3 className="text-sm font-bold leading-tight">Planova AI Copilot</h3>
                    <p className="text-[10px] text-slate-300">Contextual Club Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setCopilotOpen(false)}
                  className="text-slate-300 hover:text-white font-bold p-1 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F8FAFC]">
                {copilotMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-black text-white rounded-br-none'
                          : 'bg-white border border-[#E2E8F0] text-slate-900 rounded-bl-none shadow-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {copilotLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-bl-none shadow-xs px-4 py-3 text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleCopilotSubmit} className="p-4 border-t border-slate-200 bg-white flex gap-2">
                <input
                  type="text"
                  value={copilotQuery}
                  onChange={(e) => setCopilotQuery(e.target.value)}
                  placeholder="Ask Planova AI anything..."
                  className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-black text-slate-900"
                  disabled={copilotLoading}
                />
                {/* BLACK Send Button */}
                <button
                  type="submit"
                  disabled={copilotLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  {copilotLoading ? '…' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
