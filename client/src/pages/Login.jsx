import React, { useState } from 'react';
import { ArrowRight, CircleAlert, ShieldCheck, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try { if (mode === 'login') await signIn(form.email, form.password); else await register(form.name, form.email, form.password); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <main className="auth-screen"><section className="auth-card"><div className="brand auth-brand"><div className="brand-mark"><Wrench size={20}/></div><div><b>Campus<span>Fix</span></b><small>CAMPUS, MADE BETTER</small></div></div><div className="auth-icon"><ShieldCheck size={20}/></div><h1>{mode === 'login' ? 'Welcome back' : 'Create your student account'}</h1><p>{mode === 'login' ? 'Sign in to report issues and track their progress.' : 'Use your account to report campus issues.'}</p><form onSubmit={submit} className="auth-form">{mode === 'register'&&<label className="field-label">Full name<input required autoComplete="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}<label className="field-label">Email<input required autoComplete="email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@college.edu"/></label><label className="field-label">Password<input required minLength="8" autoComplete={mode==='login'?'current-password':'new-password'} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 8 characters"/></label>{error&&<div className="form-error"><CircleAlert size={15}/>{error}</div>}<button className="primary-button auth-submit" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'} <ArrowRight size={16}/></button></form><div className="auth-switch">{mode==='login'?"New to CampusFix?":"Already have an account?"}<button onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'Create account':'Sign in'}</button></div><div className="auth-note">Accounts created here are student accounts. Admin and worker access is managed by the campus admin.</div></section><div className="auth-footer">© 2026 CampusFix · Northwood University</div></main>;
}
