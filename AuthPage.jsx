import React, { useState } from 'react';

/**
 * AuthPage Component — Planova Campus Club Hub
 *
 * Black & White theme with Apple-style Liquid Glass buttons.
 * Left panel: deep-black with dot grid pattern, white logo, feature pills.
 * Right panel: clean white with monochrome form inputs.
 *
 * Includes Sign In & Sign Up tabs, field validation on blur/submit,
 * show/hide password toggles, loading state, API integration, and responsive layout.
 */

/* ─── Inline style helpers ──────────────────────────────────────────────── */
const css = `
  /* ── Panel decorative overlays ── */
  .panel-dark::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      radial-gradient(ellipse 60% 50% at 80% 10%, rgba(255,255,255,0.04) 0%, transparent 70%),
      radial-gradient(ellipse 40% 40% at 20% 90%, rgba(255,255,255,0.03) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }
  .panel-dark::after {
    content: '';
    position: absolute; inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none; z-index: 0;
  }

  /* ── Liquid Glass Button System ── */
  .glass-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
    padding: .625rem 1.25rem; border-radius: 12px;
    font-family: inherit; font-size: .875rem; font-weight: 600;
    line-height: 1; white-space: nowrap; cursor: pointer;
    user-select: none; text-decoration: none;
    -webkit-appearance: none; appearance: none; outline: none;
    background: rgba(255,255,255,.08);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255,255,255,.22);
    box-shadow: inset 0 1px 1px rgba(255,255,255,.45), inset 0 -1px 1px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.25);
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,.2);
    transition: background 200ms ease, box-shadow 200ms ease, transform 200ms ease, opacity 200ms ease;
  }
  .glass-btn--primary {
    background: linear-gradient(135deg, rgba(10,10,10,.88), rgba(30,30,30,.75));
    border: 1px solid rgba(255,255,255,.12);
    box-shadow: inset 0 1px 1px rgba(255,255,255,.18), inset 0 -1px 1px rgba(0,0,0,.3), 0 4px 20px rgba(0,0,0,.22);
    color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.4);
  }
  .glass-btn--primary-light {
    background: linear-gradient(135deg, rgba(255,255,255,.14), rgba(255,255,255,.08));
    border: 1px solid rgba(255,255,255,.28);
    box-shadow: inset 0 1px 1px rgba(255,255,255,.5), inset 0 -1px 1px rgba(0,0,0,.05), 0 4px 20px rgba(0,0,0,.35);
    color: #fff;
  }
  .glass-btn--secondary {
    background: rgba(0,0,0,.04); border: 1px solid rgba(0,0,0,.12);
    color: #0A0A0A;
    box-shadow: inset 0 1px 1px rgba(255,255,255,.6), 0 2px 8px rgba(0,0,0,.06);
    text-shadow: none;
  }
  .glass-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .glass-btn--primary:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(10,10,10,.96), rgba(30,30,30,.88));
    box-shadow: inset 0 1px 1px rgba(255,255,255,.22), inset 0 -1px 1px rgba(0,0,0,.35), 0 8px 28px rgba(0,0,0,.30);
  }
  .glass-btn--primary-light:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(255,255,255,.22), rgba(255,255,255,.14));
    box-shadow: inset 0 1px 1px rgba(255,255,255,.6), inset 0 -1px 1px rgba(0,0,0,.06), 0 8px 28px rgba(0,0,0,.4);
  }
  .glass-btn:active:not(:disabled) {
    transform: scale(0.97) translateY(0);
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    box-shadow: inset 0 1px 1px rgba(255,255,255,.15), inset 0 2px 6px rgba(0,0,0,.25), 0 1px 4px rgba(0,0,0,.12);
    transition-duration: 80ms;
  }
  .glass-btn:focus-visible {
    outline: 2px solid #000; outline-offset: 2px;
    box-shadow: inset 0 1px 1px rgba(255,255,255,.3), 0 0 0 4px rgba(0,0,0,.12);
  }
  .glass-btn:disabled, .glass-btn[aria-disabled="true"] {
    opacity: .35; cursor: not-allowed;
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    transform: none; pointer-events: none;
  }
  .glass-btn--pill  { border-radius: 999px; padding: .625rem 1.5rem; }
  .glass-btn--full  { width: 100%; }
  .glass-btn--lg    { padding: .75rem 1.75rem; font-size: .9375rem; border-radius: 14px; }

  @supports not (backdrop-filter: blur(1px)) {
    .glass-btn             { background: rgba(40,40,40,.85); }
    .glass-btn--primary    { background: #0A0A0A; }
    .glass-btn--primary-light { background: rgba(255,255,255,.2); }
    .glass-btn--secondary  { background: rgba(0,0,0,.08); color: #0A0A0A; }
  }
  @media (prefers-reduced-motion: reduce) {
    .glass-btn { transition: opacity 150ms ease; }
    .glass-btn:hover:not(:disabled), .glass-btn:active:not(:disabled) { transform: none; }
  }

  /* ── Form elements ── */
  .planova-input {
    width: 100%; padding: .625rem .875rem; border-radius: 10px;
    border: 1.5px solid #E0E0E0; background: #FFF;
    font-size: .875rem; color: #0A0A0A; font-family: inherit; outline: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .planova-input::placeholder { color: #ADADAD; }
  .planova-input:focus { border-color: #0A0A0A; box-shadow: 0 0 0 3px rgba(0,0,0,.08); }
  .planova-input--error { border-color: #DC2626; }
  .planova-input--error:focus { border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,.10); }

  .planova-select {
    width: 100%; padding: .625rem 2.5rem .625rem .875rem; border-radius: 10px;
    border: 1.5px solid #E0E0E0; background: #FFF;
    font-size: .875rem; color: #0A0A0A; font-family: inherit; outline: none;
    appearance: none; -webkit-appearance: none; cursor: pointer;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .planova-select:focus { border-color: #0A0A0A; box-shadow: 0 0 0 3px rgba(0,0,0,.08); }
  .planova-select--error { border-color: #DC2626; }
  .planova-select--placeholder { color: #ADADAD; }

  /* ── Tab system ── */
  .auth-tab {
    flex: 1; padding: .75rem 1rem; text-align: center;
    font-size: .8125rem; font-weight: 500; color: #9A9A9A;
    border: none; background: transparent; cursor: pointer; position: relative;
    transition: color 150ms ease; font-family: inherit; letter-spacing: .02em;
  }
  .auth-tab:hover { color: #0A0A0A; }
  .auth-tab--active { color: #0A0A0A; font-weight: 700; letter-spacing: .01em; }
  .auth-tab--active::after {
    content: ''; position: absolute; bottom: -1px; left: 0; right: 0;
    height: 2px; background: #0A0A0A; border-radius: 2px 2px 0 0;
  }

  .form-label {
    display: block; font-size: .6875rem; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #4A4A4A; margin-bottom: .375rem;
  }
  .feature-pill {
    display: flex; align-items: center; gap: .625rem;
    padding: .5rem .875rem .5rem .5rem; border-radius: 999px;
    background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.10);
    font-size: .8125rem; color: rgba(255,255,255,.7);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  }
  .feature-pill-icon {
    width: 1.5rem; height: 1.5rem; border-radius: 50%;
    background: rgba(255,255,255,.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .logo-dark { filter: invert(1) brightness(10); }
`;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('signin');

  // Sign In state
  const [signInData, setSignInData] = useState({ username: '', password: '' });
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [touchedSignIn, setTouchedSignIn] = useState({ username: false, password: false });

  // Sign Up state
  const [signUpData, setSignUpData] = useState({ email: '', username: '', role: '', password: '', confirmPassword: '' });
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedSignUp, setTouchedSignUp] = useState({ email: false, username: false, role: false, password: false, confirmPassword: false });

  // Request state
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);

  const handleTabChange = (tab) => { setActiveTab(tab); setApiError(null); setApiSuccess(null); };

  // --- Validation ---
  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const getSignInErrors = () => {
    const errors = {};
    if (!signInData.username.trim()) errors.username = 'Username is required';
    if (!signInData.password) errors.password = 'Password is required';
    return errors;
  };

  const getSignUpErrors = () => {
    const errors = {};
    if (!signUpData.email.trim()) errors.email = 'Email is required';
    else if (!validateEmail(signUpData.email.trim())) errors.email = 'Please enter a valid email address';
    if (!signUpData.username.trim()) errors.username = 'Username is required';
    else if (signUpData.username.trim().length < 3) errors.username = 'Username must be at least 3 characters';
    if (!signUpData.role) errors.role = 'Please select a role';
    if (!signUpData.password) errors.password = 'Password is required';
    else if (signUpData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!signUpData.confirmPassword) errors.confirmPassword = 'Confirm password is required';
    else if (signUpData.confirmPassword !== signUpData.password) errors.confirmPassword = 'Passwords do not match';
    return errors;
  };

  const signInErrors = getSignInErrors();
  const signUpErrors = getSignUpErrors();
  const isSignInValid = signInData.username.trim().length > 0 && signInData.password.length > 0 && Object.keys(signInErrors).length === 0;
  const isSignUpValid = signUpData.email.trim().length > 0 && validateEmail(signUpData.email.trim()) && signUpData.username.trim().length >= 3 && signUpData.role !== '' && signUpData.password.length >= 8 && signUpData.confirmPassword === signUpData.password && Object.keys(signUpErrors).length === 0;

  // --- Handlers: Sign In ---
  const handleSignInChange = (e) => { const { name, value } = e.target; setSignInData((prev) => ({ ...prev, [name]: value })); };
  const handleSignInBlur = (field) => setTouchedSignIn((prev) => ({ ...prev, [field]: true }));

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setTouchedSignIn({ username: true, password: true });
    if (!isSignInValid || isLoading) return;
    setIsLoading(true); setApiError(null); setApiSuccess(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: signInData.username.trim(), password: signInData.password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to sign in. Please verify your credentials.');
      if (data.token) localStorage.setItem('token', data.token);
      setApiSuccess('Signed in successfully! Redirecting…');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1200);
    } catch (err) {
      setApiError(err.message || 'An error occurred during sign in. Please try again.');
    } finally { setIsLoading(false); }
  };

  // --- Handlers: Sign Up ---
  const handleSignUpChange = (e) => { const { name, value } = e.target; setSignUpData((prev) => ({ ...prev, [name]: value })); };
  const handleSignUpBlur = (field) => setTouchedSignUp((prev) => ({ ...prev, [field]: true }));

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setTouchedSignUp({ email: true, username: true, role: true, password: true, confirmPassword: true });
    if (!isSignUpValid || isLoading) return;
    setIsLoading(true); setApiError(null); setApiSuccess(null);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signUpData.email.trim(), username: signUpData.username.trim(), role: signUpData.role, password: signUpData.password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Registration failed. Please check your information.');
      if (data.token) localStorage.setItem('token', data.token);
      setApiSuccess('Account created! Redirecting…');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1200);
    } catch (err) {
      setApiError(err.message || 'An error occurred during sign up. Please try again.');
    } finally { setIsLoading(false); }
  };

  // Reusable SVG components
  const Spinner = () => (
    <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
  const EyeOff = () => (
    <svg style={{width:'18px',height:'18px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
    </svg>
  );
  const EyeOn = () => (
    <svg style={{width:'18px',height:'18px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
  );

  // Reusable password field component
  const PasswordField = ({ id, name, value, onChange, onBlur, placeholder, show, onToggle, error, touched, label, autoComplete }) => (
    <div>
      <label htmlFor={id} className="form-label">{label}</label>
      <div style={{position:'relative'}}>
        <input
          id={id} name={name} type={show ? 'text' : 'password'}
          autoComplete={autoComplete || 'current-password'}
          value={value} onChange={onChange} onBlur={onBlur}
          placeholder={placeholder}
          className={`planova-input pr-10 ${touched && error ? 'planova-input--error' : ''}`}
          style={{paddingRight:'2.5rem'}}
        />
        <button type="button" onClick={onToggle}
          style={{position:'absolute',inset:'0 0 0 auto',display:'flex',alignItems:'center',paddingRight:'0.75rem',color:'#9CA3AF',background:'none',border:'none',cursor:'pointer',transition:'color 150ms'}}
          aria-label={show ? 'Hide password' : 'Show password'}
          onMouseOver={e=>e.currentTarget.style.color='#374151'} onMouseOut={e=>e.currentTarget.style.color='#9CA3AF'}>
          {show ? <EyeOff/> : <EyeOn/>}
        </button>
      </div>
      {touched && error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
    </div>
  );

  const features = [
    { icon: '📍', text: 'Automated campus venue & slot coordination' },
    { icon: '🤝', text: 'Smart duty delegation for Core Team & Volunteers' },
    { icon: '📊', text: 'Instant RSVP analytics & club reporting' },
  ];

  return (
    <>
      {/* Inject component-scoped CSS */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div style={{minHeight:'100vh', width:'100%', display:'flex', flexDirection:'row', background:'#0A0A0A', fontFamily:"'Inter', system-ui, sans-serif"}}>

        {/* ══ LEFT PANEL — Deep Black ══ */}
        <div
          className="panel-dark"
          style={{
            display: window.innerWidth >= 1024 ? 'flex' : 'none',
            width: '50%',
            minWidth: '460px',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(145deg, #000000 0%, #111111 60%, #0D0D0D 100%)',
            padding: '3rem 3.5rem',
          }}
        >
          {/* Brand */}
          <div style={{position:'relative',zIndex:10}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.875rem'}}>
              <img
                src="planova-logo.jpg"
                alt="Planova"
                className="logo-dark"
                style={{height:'48px',width:'48px',objectFit:'contain'}}
              />
              <div>
                <div style={{fontSize:'1.5rem',fontWeight:900,color:'#FFFFFF',letterSpacing:'-0.03em',lineHeight:1}}>
                  Planova
                </div>
                <div style={{fontSize:'0.625rem',color:'rgba(255,255,255,0.38)',letterSpacing:'0.14em',textTransform:'uppercase',marginTop:'3px',fontWeight:600}}>
                  Campus Club Hub
                </div>
              </div>
            </div>

            {/* Live badge */}
            <div style={{marginTop:'2rem',display:'inline-flex',alignItems:'center',gap:'0.5rem',padding:'0.375rem 0.875rem',borderRadius:'999px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)',fontSize:'0.6875rem',color:'rgba(255,255,255,0.55)',letterSpacing:'0.08em',textTransform:'uppercase',fontWeight:600}}>
              <span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#22C55E',display:'inline-block'}}></span>
              AI-Powered Platform
            </div>
          </div>

          {/* Headline + features */}
          <div style={{position:'relative',zIndex:10,maxWidth:'400px'}}>
            <h1 style={{fontSize:'2.75rem',fontWeight:900,color:'#FFFFFF',lineHeight:1.06,letterSpacing:'-0.045em',marginBottom:'1.25rem'}}>
              Plan the event.
              <br/>
              <span style={{color:'rgba(255,255,255,0.38)'}}>Planova runs</span>
              <br/>
              <span style={{color:'rgba(255,255,255,0.38)'}}>the rest.</span>
            </h1>

            <p style={{fontSize:'0.9375rem',color:'rgba(255,255,255,0.45)',lineHeight:1.7,marginBottom:'2rem',fontWeight:400}}>
              Empower your college club with seamless AI scheduling,
              intelligent budget allocation, and volunteer rosters —
              all in one unified campus hub.
            </p>

            <div style={{display:'flex',flexDirection:'column',gap:'0.625rem'}}>
              {features.map((f, i) => (
                <div key={i} className="feature-pill">
                  <div className="feature-pill-icon" style={{fontSize:'0.875rem'}}>{f.icon}</div>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{position:'relative',zIndex:10,fontSize:'0.6875rem',color:'rgba(255,255,255,0.22)',letterSpacing:'0.03em'}}>
            © {new Date().getFullYear()} Planova Platform · Designed for collegiate student leaders
          </div>

          {/* Watermark logo */}
          <div style={{position:'absolute',right:'-70px',bottom:'-70px',opacity:'0.025',pointerEvents:'none',zIndex:0}}>
            <img src="planova-logo.jpg" alt="" aria-hidden="true" className="logo-dark"
              style={{width:'440px',height:'440px',objectFit:'contain'}}/>
          </div>
        </div>

        {/* ══ RIGHT PANEL — White ══ */}
        <div style={{
          flex:1, display:'flex', flexDirection:'column',
          justifyContent:'center', alignItems:'center',
          minHeight:'100vh', background:'#FAFAFA',
          padding:'2rem 1.5rem',
        }}>
          {/* Mobile logo */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.5rem',marginBottom:'1.75rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <img src="planova-logo.jpg" alt="Planova" style={{height:'38px',width:'38px',objectFit:'contain'}}/>
              <span style={{fontSize:'1.5rem',fontWeight:900,color:'#0A0A0A',letterSpacing:'-0.03em'}}>Planova</span>
            </div>
            <p style={{fontSize:'0.75rem',color:'#9A9A9A',fontWeight:500,letterSpacing:'0.04em'}}>Campus Club Hub</p>
          </div>

          {/* Auth card */}
          <div style={{
            width:'100%', maxWidth:'420px',
            background:'#FFFFFF', borderRadius:'20px',
            border:'1px solid #E8E8E8',
            boxShadow:'0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            padding:'2.25rem 2rem',
          }}>
            {/* Welcome text */}
            <div style={{marginBottom:'1.5rem'}}>
              <h2 style={{fontSize:'1.375rem',fontWeight:800,color:'#0A0A0A',letterSpacing:'-0.025em',marginBottom:'0.25rem',margin:0}}>
                {activeTab === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p style={{fontSize:'0.8125rem',color:'#8A8A8A',fontWeight:400,marginTop:'0.25rem'}}>
                {activeTab === 'signin' ? 'Sign in to your Planova workspace.' : 'Join your campus club on Planova.'}
              </p>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',borderBottom:'1px solid #EBEBEB',marginBottom:'1.75rem'}}>
              <button type="button"
                onClick={() => handleTabChange('signin')}
                className={`auth-tab ${activeTab === 'signin' ? 'auth-tab--active' : ''}`}>
                Sign In
              </button>
              <button type="button"
                onClick={() => handleTabChange('signup')}
                className={`auth-tab ${activeTab === 'signup' ? 'auth-tab--active' : ''}`}>
                Sign Up
              </button>
            </div>

            {/* Success */}
            {apiSuccess && (
              <div role="alert" style={{marginBottom:'1.25rem',padding:'0.75rem 1rem',borderRadius:'10px',background:'#F0FDF4',border:'1px solid #BBF7D0',display:'flex',alignItems:'flex-start',gap:'0.625rem'}}>
                <svg style={{width:'16px',height:'16px',color:'#16A34A',flexShrink:0,marginTop:'1px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                <span style={{fontSize:'0.8125rem',color:'#15803D',fontWeight:500}}>{apiSuccess}</span>
              </div>
            )}

            {/* Error */}
            {apiError && (
              <div id="api-error-banner" role="alert" style={{marginBottom:'1.25rem',padding:'0.75rem 1rem',borderRadius:'10px',background:'#FEF2F2',border:'1px solid #FECACA',display:'flex',alignItems:'flex-start',gap:'0.625rem'}}>
                <svg style={{width:'16px',height:'16px',color:'#DC2626',flexShrink:0,marginTop:'1px'}} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <span style={{fontSize:'0.8125rem',color:'#B91C1C',fontWeight:500}}>{apiError}</span>
              </div>
            )}

            {/* ── SIGN IN FORM ── */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignInSubmit} noValidate style={{display:'flex',flexDirection:'column',gap:'1.125rem'}}>
                {/* Username */}
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

                {/* Password */}
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.375rem'}}>
                    <label htmlFor="signin-password" className="form-label" style={{marginBottom:0}}>Password</label>
                    <a href="#forgot-password"
                      onClick={e => { e.preventDefault(); alert('Password reset instructions will be sent to your registered email.'); }}
                      style={{fontSize:'0.75rem',fontWeight:600,color:'#555',textDecoration:'none',transition:'color 150ms'}}
                      onMouseOver={e=>e.target.style.color='#0A0A0A'} onMouseOut={e=>e.target.style.color='#555'}>
                      Forgot password?
                    </a>
                  </div>
                  <div style={{position:'relative'}}>
                    <input
                      id="signin-password" name="password"
                      type={showSignInPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={signInData.password} onChange={handleSignInChange}
                      onBlur={() => handleSignInBlur('password')}
                      placeholder="Enter your password"
                      className={`planova-input ${touchedSignIn.password && signInErrors.password ? 'planova-input--error' : ''}`}
                      style={{paddingRight:'2.5rem'}}
                    />
                    <button type="button" id="toggle-signin-password"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      style={{position:'absolute',inset:'0 0 0 auto',display:'flex',alignItems:'center',paddingRight:'0.75rem',color:'#9CA3AF',background:'none',border:'none',cursor:'pointer',transition:'color 150ms'}}
                      aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                      onMouseOver={e=>e.currentTarget.style.color='#374151'} onMouseOut={e=>e.currentTarget.style.color='#9CA3AF'}>
                      {showSignInPassword ? <EyeOff/> : <EyeOn/>}
                    </button>
                  </div>
                  {touchedSignIn.password && signInErrors.password && (
                    <p id="error-signin-password" className="text-xs text-red-600 mt-1 font-medium">{signInErrors.password}</p>
                  )}
                </div>

                {/* Submit */}
                <div style={{paddingTop:'0.25rem'}}>
                  <button type="submit" id="btn-signin-submit"
                    disabled={!isSignInValid || isLoading}
                    className="glass-btn glass-btn--primary glass-btn--full glass-btn--lg">
                    {isLoading ? <><Spinner/>Signing in…</> : 'Sign In'}
                  </button>
                </div>

                <p style={{textAlign:'center',fontSize:'0.8rem',color:'#8A8A8A',margin:0}}>
                  Don't have an account?{' '}
                  <button type="button" id="switch-to-signup" onClick={() => handleTabChange('signup')}
                    style={{fontWeight:700,color:'#0A0A0A',background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit',fontSize:'inherit'}}>
                    Sign Up
                  </button>
                </p>
              </form>
            )}

            {/* ── SIGN UP FORM ── */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUpSubmit} noValidate style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                {/* Email */}
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

                {/* Username */}
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

                {/* Role */}
                <div>
                  <label htmlFor="signup-role" className="form-label">Role</label>
                  <div style={{position:'relative'}}>
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
                    <div style={{pointerEvents:'none',position:'absolute',inset:'0 0 0 auto',display:'flex',alignItems:'center',paddingRight:'0.75rem',color:'#9CA3AF'}}>
                      <svg style={{width:'16px',height:'16px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                  </div>
                  {touchedSignUp.role && signUpErrors.role && (
                    <p id="error-signup-role" className="text-xs text-red-600 mt-1 font-medium">{signUpErrors.role}</p>
                  )}
                </div>

                {/* Password */}
                <PasswordField
                  id="signup-password" name="password" label="Password"
                  value={signUpData.password} onChange={handleSignUpChange}
                  onBlur={() => handleSignUpBlur('password')}
                  placeholder="Min 8 characters"
                  show={showSignUpPassword} onToggle={() => setShowSignUpPassword(!showSignUpPassword)}
                  error={signUpErrors.password} touched={touchedSignUp.password}
                  autoComplete="new-password"
                />

                {/* Confirm Password */}
                <PasswordField
                  id="signup-confirmpassword" name="confirmPassword" label="Confirm Password"
                  value={signUpData.confirmPassword} onChange={handleSignUpChange}
                  onBlur={() => handleSignUpBlur('confirmPassword')}
                  placeholder="Re-enter password"
                  show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  error={signUpErrors.confirmPassword} touched={touchedSignUp.confirmPassword}
                  autoComplete="new-password"
                />

                {/* Submit */}
                <div style={{paddingTop:'0.25rem'}}>
                  <button type="submit" id="btn-signup-submit"
                    disabled={!isSignUpValid || isLoading}
                    className="glass-btn glass-btn--primary glass-btn--full glass-btn--lg">
                    {isLoading ? <><Spinner/>Creating Account…</> : 'Create Account'}
                  </button>
                </div>

                <p style={{textAlign:'center',fontSize:'0.8rem',color:'#8A8A8A',margin:0}}>
                  Already have an account?{' '}
                  <button type="button" id="switch-to-signin" onClick={() => handleTabChange('signin')}
                    style={{fontWeight:700,color:'#0A0A0A',background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit',fontSize:'inherit'}}>
                    Sign In
                  </button>
                </p>
              </form>
            )}
          </div>

          {/* Fine print */}
          <p style={{marginTop:'1.5rem',fontSize:'0.6875rem',color:'#BABABA',textAlign:'center',maxWidth:'360px',lineHeight:1.6}}>
            By continuing, you agree to Planova's{' '}
            <a href="#" style={{color:'#6A6A6A',textDecoration:'underline'}}>Terms of Service</a>{' '}and{' '}
            <a href="#" style={{color:'#6A6A6A',textDecoration:'underline'}}>Privacy Policy</a>.
          </p>
        </div>
      </div>
    </>
  );
}
