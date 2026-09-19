import React, { useState } from 'react';

/**
 * AuthPage Component — Planova Campus Club Hub
 * Clean Light Theme (Black Buttons, No Purple, Big Logo & Big Name)
 */

const css = `
  .panel-light {
    background: linear-gradient(145deg, #F8FAFC 0%, #F1F5F9 100%);
    border-right: 1px solid #E2E8F0;
    position: relative;
  }
  .panel-light::before {
    content: '';
    position: absolute; inset: 0;
    background-image: radial-gradient(circle, rgba(15, 23, 42, 0.05) 1px, transparent 1px);
    background-size: 24px 24px;
    pointer-events: none; z-index: 0;
  }

  /* ── Black Button System ── */
  .glass-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
    padding: .75rem 1.5rem; border-radius: 12px;
    font-family: inherit; font-size: .9375rem; font-weight: 700;
    line-height: 1; white-space: nowrap; cursor: pointer;
    user-select: none; text-decoration: none;
    -webkit-appearance: none; appearance: none; outline: none;
    transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .glass-btn--primary {
    background: #000000;
    border: 1px solid #1E293B;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    color: #FFFFFF;
  }
  .glass-btn--primary:hover:not(:disabled) {
    background: #1E293B;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    transform: translateY(-1px);
  }
  .glass-btn--primary:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
    background: #0A0A0A;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }
  .glass-btn--secondary {
    background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A;
    box-shadow: 0 1px 2px rgba(0,0,0,.05);
  }
  .glass-btn--secondary:hover:not(:disabled) {
    background: #F1F5F9; border-color: #94A3B8; transform: translateY(-1px);
  }
  .glass-btn--full { width: 100%; }
  .glass-btn--lg { padding: .875rem 1.75rem; font-size: .9375rem; border-radius: 12px; }
  .glass-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }

  /* ── Form inputs ── */
  .planova-input {
    width: 100%; padding: .6875rem .875rem; border-radius: 10px;
    border: 1px solid #CBD5E1; background: #FFFFFF; font-size: .875rem;
    color: #0F172A; font-family: inherit; outline: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .planova-input::placeholder { color: #94A3B8; }
  .planova-input:focus {
    border-color: #000000; box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
  }
  .planova-input--error { border-color: #DC2626; }
  .planova-input--error:focus {
    border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
  }

  .planova-select {
    width: 100%; padding: .6875rem 2.5rem .6875rem .875rem; border-radius: 10px;
    border: 1px solid #CBD5E1; background: #FFFFFF; font-size: .875rem;
    color: #0F172A; font-family: inherit; outline: none; appearance: none; -webkit-appearance: none;
    transition: border-color 150ms ease, box-shadow 150ms ease; cursor: pointer;
  }
  .planova-select:focus {
    border-color: #000000; box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
  }
  .planova-select--error { border-color: #DC2626; }
  .planova-select--placeholder { color: #94A3B8; }

  /* ── Tabs ── */
  .auth-tab {
    flex: 1; padding: .75rem 1rem; text-align: center; font-size: .875rem;
    font-weight: 600; color: #64748B; border: none; background: transparent;
    cursor: pointer; position: relative; transition: color 150ms ease; font-family: inherit;
  }
  .auth-tab:hover { color: #000000; }
  .auth-tab--active { color: #000000; font-weight: 800; }
  .auth-tab--active::after {
    content: ''; position: absolute; bottom: -1px; left: 0; right: 0;
    height: 2.5px; background: #000000; border-radius: 2px 2px 0 0;
  }

  .form-label {
    display: block; font-size: .75rem; font-weight: 700; letter-spacing: .05em;
    text-transform: uppercase; color: #475569; margin-bottom: .375rem;
  }

  .feature-pill {
    display: flex; align-items: center; gap: .75rem;
    padding: .75rem 1rem .75rem .875rem; border-radius: 12px;
    background: #FFFFFF; border: 1px solid #E2E8F0;
    font-size: .875rem; color: #1E293B; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-weight: 600;
  }
  .feature-pill-icon {
    width: 2rem; height: 2rem; border-radius: 8px;
    background: #F1F5F9; color: #000000;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    font-size: 1rem;
  }
`;

const EyeOff = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
  </svg>
);

const EyeOn = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

const PasswordField = ({ id, name, label, value, onChange, onBlur, placeholder, show, onToggle, error, touched, autoComplete }) => (
  <div>
    <label htmlFor={id} className="form-label">{label}</label>
    <div className="relative">
      <input
        id={id} name={name} type={show ? 'text' : 'password'}
        value={value} onChange={onChange} onBlur={onBlur}
        placeholder={placeholder} autoComplete={autoComplete}
        className={`planova-input pr-10 ${touched && error ? 'planova-input--error' : ''}`}
      />
      <button type="button" onClick={onToggle}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-900 focus:outline-none transition-colors"
        aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff/> : <EyeOn/>}
      </button>
    </div>
  </div>
);

export default function AuthPage({ onAuthSuccess }) {
  const [activeTab, setActiveTab] = useState('signin');
  const [signInRole, setSignInRole] = useState('admin');
  const [signInData, setSignInData] = useState({ username: 'jenish', password: 'password123' });
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [touchedSignIn, setTouchedSignIn] = useState({ username: false, password: false });

  const [signUpData, setSignUpData] = useState({ email: '', username: '', role: '', password: '', confirmPassword: '' });
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedSignUp, setTouchedSignUp] = useState({ email: false, username: false, role: false, password: false, confirmPassword: false });

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);

  const handleTabChange = (tab) => { setActiveTab(tab); setApiError(null); setApiSuccess(null); };

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const getSignInErrors = () => {
    const e = {};
    if (!signInData.username.trim()) e.username = 'Username is required';
    if (!signInData.password) e.password = 'Password is required';
    return e;
  };
  const getSignUpErrors = () => {
    const e = {};
    if (!signUpData.email.trim()) e.email = 'Email is required';
    else if (!validateEmail(signUpData.email.trim())) e.email = 'Please enter a valid email address';
    if (!signUpData.username.trim()) e.username = 'Username is required';
    else if (signUpData.username.trim().length < 3) e.username = 'Username must be at least 3 characters';
    if (!signUpData.role) e.role = 'Please select a role';
    if (!signUpData.password) e.password = 'Password is required';
    else if (signUpData.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!signUpData.confirmPassword) e.confirmPassword = 'Confirm password is required';
    else if (signUpData.confirmPassword !== signUpData.password) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const signInErrors = getSignInErrors();
  const signUpErrors = getSignUpErrors();
  const isSignInValid = signInData.username.trim().length > 0 && signInData.password.length > 0 && Object.keys(signInErrors).length === 0;
  const isSignUpValid = signUpData.email.trim().length > 0 && validateEmail(signUpData.email.trim()) && signUpData.username.trim().length >= 3 && signUpData.role !== '' && signUpData.password.length >= 8 && signUpData.confirmPassword === signUpData.password && Object.keys(signUpErrors).length === 0;

  const handleSignInChange = (e) => { const {name,value}=e.target; setSignInData(p=>({...p,[name]:value})); };
  const handleSignInBlur = (f) => setTouchedSignIn(p=>({...p,[f]:true}));
  const handleSignUpChange = (e) => { const {name,value}=e.target; setSignUpData(p=>({...p,[name]:value})); };
  const handleSignUpBlur = (f) => setTouchedSignUp(p=>({...p,[f]:true}));

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setTouchedSignIn({ username: true, password: true });
    if (!isSignInValid || isLoading) return;
    setIsLoading(true); setApiError(null); setApiSuccess(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: signInData.username.trim(), password: signInData.password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to sign in.');
      if (data.token) localStorage.setItem('token', data.token);

      const isVolunteer = signInRole === 'volunteer' || signInData.username.toLowerCase().includes('volunteer') || signInData.username.toLowerCase().includes('aman');
      setApiSuccess(isVolunteer ? 'Signed in as Volunteer! Opening My Tasks…' : 'Signed in as President! Opening Executive Dashboard…');
      if (onAuthSuccess) onAuthSuccess({ ...data, role: isVolunteer ? 'volunteer' : 'admin' });
      else setTimeout(() => { window.location.href = isVolunteer ? 'my-tasks.html' : 'dashboard.html'; }, 1000);
    } catch (err) {
      setApiError(err.message || 'An error occurred. Please try again.');
    } finally { setIsLoading(false); }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setTouchedSignUp({ email:true, username:true, role:true, password:true, confirmPassword:true });
    if (!isSignUpValid || isLoading) return;
    setIsLoading(true); setApiError(null); setApiSuccess(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signUpData.email.trim(), username: signUpData.username.trim(), role: signUpData.role, password: signUpData.password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Registration failed.');
      if (data.token) localStorage.setItem('token', data.token);

      const isVolunteer = signUpData.role === 'Volunteer';
      setApiSuccess(isVolunteer ? 'Volunteer account created! Opening My Tasks…' : 'Account created! Opening Executive Dashboard…');
      if (onAuthSuccess) onAuthSuccess({ ...data, role: isVolunteer ? 'volunteer' : 'admin' });
      else setTimeout(() => { window.location.href = isVolunteer ? 'my-tasks.html' : 'dashboard.html'; }, 1000);
    } catch (err) {
      setApiError(err.message || 'An error occurred. Please try again.');
    } finally { setIsLoading(false); }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">

        {/* ── LEFT PANEL: Big logo, big name, no purple ── */}
        <div className="panel-light lg:w-[48%] xl:w-[46%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#E2E8F0] shadow-md flex items-center justify-center p-2.5 flex-shrink-0">
                <img
                  src="planova-logo.jpg"
                  alt="Planova logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-black tracking-tight leading-none block">
                  PLANOVA
                </span>
                <p className="text-xs sm:text-sm text-slate-600 font-bold tracking-widest uppercase mt-1.5">
                  Campus Club Hub
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                AI-Powered Event Platform
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-md my-auto py-8">
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
              Plan the event.<br/>
              <span className="text-black">Planova runs</span><br/>
              the rest.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8 font-normal">
              Empower your college club with seamless AI scheduling, intelligent budget allocation, and volunteer rosters — all in one unified campus hub.
            </p>

            <div className="space-y-3">
              {[
                { icon: '📍', text: 'Automated campus venue & slot coordination' },
                { icon: '🤝', text: 'Smart duty delegation for Core Team & Volunteers' },
                { icon: '📊', text: 'Instant RSVP analytics & club reporting' },
              ].map((f, i) => (
                <div key={i} className="feature-pill">
                  <div className="feature-pill-icon">{f.icon}</div>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 font-medium">
              © {new Date().getFullYear()} Planova Platform · Designed for collegiate student leaders
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL: Clean White Auth Card ── */}
        <div className="flex-1 flex flex-col justify-center items-center min-h-screen p-6 sm:p-10 bg-white lg:bg-[#F8FAFC]">
          <div className="w-full max-w-[420px] bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-7 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                {activeTab === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {activeTab === 'signin' ? 'Sign in to access your club workspace.' : 'Join your campus club on Planova.'}
              </p>
            </div>

            <div className="flex border-b border-slate-200 mb-6">
              <button type="button" id="tab-signin"
                onClick={() => handleTabChange('signin')}
                className={`auth-tab ${activeTab === 'signin' ? 'auth-tab--active' : ''}`}>
                Sign In
              </button>
              <button type="button" id="tab-signup"
                onClick={() => handleTabChange('signup')}
                className={`auth-tab ${activeTab === 'signup' ? 'auth-tab--active' : ''}`}>
                Sign Up
              </button>
            </div>

            {apiSuccess && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 font-medium">
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                <span>{apiSuccess}</span>
              </div>
            )}

            {apiError && (
              <div id="api-error-banner" role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 font-medium">
                <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <span>{apiError}</span>
              </div>
            )}

            {activeTab === 'signin' && (
              <form onSubmit={handleSignInSubmit} noValidate className="space-y-4">
                {/* Role Selector: Admin vs Volunteer */}
                <div>
                  <label className="form-label">Sign in as</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSignInRole('admin');
                        setSignInData({ username: 'jenish', password: 'password123' });
                      }}
                      className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        signInRole === 'admin'
                          ? 'bg-black text-white shadow-xs'
                          : 'text-slate-600 hover:text-black'
                      }`}
                    >
                      <span>👑</span>
                      <span>President (Admin)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSignInRole('volunteer');
                        setSignInData({ username: 'aman.varma', password: 'password123' });
                      }}
                      className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        signInRole === 'volunteer'
                          ? 'bg-black text-white shadow-xs'
                          : 'text-slate-600 hover:text-black'
                      }`}
                    >
                      <span>🤝</span>
                      <span>Volunteer</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="signin-username" className="form-label">Username</label>
                  <input
                    id="signin-username" name="username" type="text" autoComplete="username"
                    value={signInData.username} onChange={handleSignInChange}
                    onBlur={() => handleSignInBlur('username')}
                    placeholder="Enter your username"
                    className={`planova-input ${touchedSignIn.username && signInErrors.username ? 'planova-input--error' : ''}`}
                  />
                  {touchedSignIn.username && signInErrors.username && (
                    <p id="error-signin-username" className="text-xs text-red-600 mt-1 font-medium">{signInErrors.username}</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="signin-password" className="form-label mb-0">Password</label>
                    <a href="#forgot-password"
                      onClick={e=>{e.preventDefault();alert('Password reset instructions will be sent to your email.');}}
                      className="text-xs font-bold text-black hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="signin-password" name="password"
                      type={showSignInPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={signInData.password} onChange={handleSignInChange}
                      onBlur={() => handleSignInBlur('password')}
                      placeholder="Enter your password"
                      className={`planova-input pr-10 ${touchedSignIn.password && signInErrors.password ? 'planova-input--error' : ''}`}
                    />
                    <button type="button" id="toggle-signin-password"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-black focus:outline-none transition-colors"
                      aria-label={showSignInPassword ? 'Hide password' : 'Show password'}>
                      {showSignInPassword ? <EyeOff/> : <EyeOn/>}
                    </button>
                  </div>
                  {touchedSignIn.password && signInErrors.password && (
                    <p id="error-signin-password" className="text-xs text-red-600 mt-1 font-medium">{signInErrors.password}</p>
                  )}
                </div>

                <div className="pt-2">
                  <button type="submit" id="btn-signin-submit"
                    disabled={!isSignInValid || isLoading}
                    className="glass-btn glass-btn--primary glass-btn--full glass-btn--lg">
                    {isLoading ? <><Spinner/>Signing in…</> : 'Sign In'}
                  </button>
                </div>

                <p className="text-center text-xs text-slate-600 pt-1 font-medium">
                  Don't have an account?{' '}
                  <button type="button" id="switch-to-signup" onClick={() => handleTabChange('signup')}
                    className="font-bold text-black hover:underline bg-transparent border-none p-0 cursor-pointer">
                    Sign Up
                  </button>
                </p>
              </form>
            )}

            {activeTab === 'signup' && (
              <form onSubmit={handleSignUpSubmit} noValidate className="space-y-3.5">
                <div>
                  <label htmlFor="signup-email" className="form-label">Email</label>
                  <input
                    id="signup-email" name="email" type="email" autoComplete="email"
                    value={signUpData.email} onChange={handleSignUpChange}
                    onBlur={() => handleSignUpBlur('email')}
                    placeholder="name@campus.edu"
                    className={`planova-input ${touchedSignUp.email && signUpErrors.email ? 'planova-input--error' : ''}`}
                  />
                  {touchedSignUp.email && signUpErrors.email && (
                    <p id="error-signup-email" className="text-xs text-red-600 mt-1 font-medium">{signUpErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-username" className="form-label">Username</label>
                  <input
                    id="signup-username" name="username" type="text" autoComplete="username"
                    value={signUpData.username} onChange={handleSignUpChange}
                    onBlur={() => handleSignUpBlur('username')}
                    placeholder="Min 3 characters"
                    className={`planova-input ${touchedSignUp.username && signUpErrors.username ? 'planova-input--error' : ''}`}
                  />
                  {touchedSignUp.username && signUpErrors.username && (
                    <p id="error-signup-username" className="text-xs text-red-600 mt-1 font-medium">{signUpErrors.username}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-role" className="form-label">Role</label>
                  <div className="relative">
                    <select
                      id="signup-role" name="role"
                      value={signUpData.role} onChange={handleSignUpChange}
                      onBlur={() => handleSignUpBlur('role')}
                      className={`planova-select ${!signUpData.role ? 'planova-select--placeholder' : ''} ${touchedSignUp.role && signUpErrors.role ? 'planova-select--error' : ''}`}
                    >
                      <option value="" disabled>Select your club role</option>
                      <option value="Admin">Admin</option>
                      <option value="Core Team">Core Team</option>
                      <option value="Volunteer">Volunteer</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                  </div>
                  {touchedSignUp.role && signUpErrors.role && (
                    <p id="error-signup-role" className="text-xs text-red-600 mt-1 font-medium">{signUpErrors.role}</p>
                  )}
                </div>

                <PasswordField
                  id="signup-password" name="password" label="Password"
                  value={signUpData.password} onChange={handleSignUpChange}
                  onBlur={() => handleSignUpBlur('password')}
                  placeholder="Min 8 characters"
                  show={showSignUpPassword} onToggle={() => setShowSignUpPassword(!showSignUpPassword)}
                  error={signUpErrors.password} touched={touchedSignUp.password}
                  autoComplete="new-password"
                />
                {touchedSignUp.password && signUpErrors.password && (
                  <p id="error-signup-password" className="text-xs text-red-600 -mt-2 font-medium">{signUpErrors.password}</p>
                )}

                <PasswordField
                  id="signup-confirmpassword" name="confirmPassword" label="Confirm Password"
                  value={signUpData.confirmPassword} onChange={handleSignUpChange}
                  onBlur={() => handleSignUpBlur('confirmPassword')}
                  placeholder="Re-enter password"
                  show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  error={signUpErrors.confirmPassword} touched={touchedSignUp.confirmPassword}
                  autoComplete="new-password"
                />
                {touchedSignUp.confirmPassword && signUpErrors.confirmPassword && (
                  <p id="error-signup-confirmpassword" className="text-xs text-red-600 -mt-2 font-medium">{signUpErrors.confirmPassword}</p>
                )}

                <div className="pt-2">
                  <button type="submit" id="btn-signup-submit"
                    disabled={!isSignUpValid || isLoading}
                    className="glass-btn glass-btn--primary glass-btn--full glass-btn--lg">
                    {isLoading ? <><Spinner/>Creating Account…</> : 'Create Account'}
                  </button>
                </div>

                <p className="text-center text-xs text-slate-600 pt-1 font-medium">
                  Already have an account?{' '}
                  <button type="button" id="switch-to-signin" onClick={() => handleTabChange('signin')}
                    className="font-bold text-black hover:underline bg-transparent border-none p-0 cursor-pointer">
                    Sign In
                  </button>
                </p>
              </form>
            )}
          </div>

          <p className="mt-6 text-xs text-slate-400 text-center max-w-xs leading-relaxed">
            By continuing, you agree to Planova's{' '}
            <a href="#" className="underline text-slate-600 hover:text-black">Terms of Service</a> and{' '}
            <a href="#" className="underline text-slate-600 hover:text-black">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </>
  );
}
