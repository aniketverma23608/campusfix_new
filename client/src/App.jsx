import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { Activity, ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown, ClipboardList, CircleAlert, Clock3, Droplets, ImagePlus, LayoutDashboard, LogOut, MapPin, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, Users, Wifi, Wrench, X, Zap, Armchair } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import { api, protectedFile } from './services/api.js';
import Login from './pages/Login.jsx';

const categoryIcons = { 'Water & plumbing': Droplets, 'Internet & Wi-Fi': Wifi, Electrical: Zap, 'Furniture & facilities': Armchair, Cleanliness: Sparkles, 'Safety & security': ShieldCheck, Other: Wrench };
const statusLabels = { submitted: 'Submitted', assigned: 'Assigned', in_progress: 'In progress', proof_submitted: 'Proof submitted', needs_revision: 'Needs revision', resolved: 'Resolved' };
const pretty = value => statusLabels[value] || value;

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [issues, setIssues] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState('Overview');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showReport, setShowReport] = useState(false);
  const [showWorker, setShowWorker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [report, setReport] = useState({ title: '', description: '', location: '', attachment: null });
  const [workerForm, setWorkerForm] = useState({ name: '', email: '', password: '', department: '' });

  const refresh = useCallback(async () => {
    if (!user) return;
    const jobs = [api('/api/complaints'), api('/api/complaints/notifications')];
    if (user.role === 'admin') jobs.push(api('/api/admin/workers'));
    const [issueData, notificationData, workerData] = await Promise.all(jobs);
    setIssues(issueData.complaints);
    setNotifications(notificationData.notifications);
    setWorkers(workerData?.workers || []);
  }, [user]);

  useEffect(() => {
    refresh().catch(err => setError(err.message));
    const token = localStorage.getItem('campusfix-token');
    if (!token) return;
    const socket = io({ auth: { token } });
    const changed = () => refresh().catch(err => setError(err.message));
    socket.on('complaint:new', changed);
    socket.on('complaint:updated', changed);
    socket.on('complaint:proof', changed);
    socket.on('notification:new', changed);
    return () => socket.disconnect();
  }, [refresh]);

  const notify = text => { setToast(text); window.setTimeout(() => setToast(''), 3200); };
  const run = async action => { setError(''); setBusy(true); try { await action(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const shown = useMemo(() => issues.filter(issue => (filter === 'all' || issue.status === filter) && [issue.title, issue.ticketId, issue.category, issue.location, issue.createdBy?.name, issue.assignedTo?.name].join(' ').toLowerCase().includes(query.toLowerCase())), [issues, filter, query]);
  const counts = useMemo(() => Object.fromEntries(['submitted','assigned','in_progress','proof_submitted','needs_revision','resolved'].map(s=>[s,issues.filter(i=>i.status===s).length])), [issues]);

  if (authLoading) return <div className="loading-screen"><div className="brand-mark"><Wrench size={20}/></div><span>Connecting to CampusFix…</span></div>;
  if (!user) return <Login/>;
  const isAdmin = user.role === 'admin';
  const isWorker = user.role === 'worker';

  async function submitReport(e) {
    e.preventDefault();
    const data = new FormData();
    data.set('title', report.title); data.set('description', report.description); data.set('location', report.location);
    if (report.attachment) data.set('attachment', report.attachment);
    await run(async () => { const result = await api('/api/complaints', { method: 'POST', body: data }); setShowReport(false); setReport({ title: '', description: '', location: '', attachment: null }); await refresh(); notify('Reported ' + result.complaint.ticketId + '; sorted into ' + result.complaint.category + '.'); });
  }
  async function assign(issueId, workerId) {
    if (!workerId) return;
    await run(async () => { await api('/api/complaints/' + issueId + '/assign', { method: 'PATCH', body: JSON.stringify({ workerId }) }); await refresh(); notify('Issue assigned and worker notified.'); });
  }
  async function startWork(issueId) {
    await run(async () => { await api('/api/complaints/' + issueId + '/start', { method: 'PATCH', body: '{}' }); await refresh(); notify('Issue moved to in progress.'); });
  }
  async function uploadProof(issueId, file) {
    if (!file) return;
    const data = new FormData(); data.set('proof', file);
    await run(async () => { await api('/api/complaints/' + issueId + '/proof', { method: 'POST', body: data }); await refresh(); notify('Proof sent to admin for review.'); });
  }
  async function review(issueId, decision) {
    let note = '';
    if (decision === 'needs_revision') { note = window.prompt('What should the worker fix?') || ''; if (!note.trim()) return; }
    await run(async () => { await api('/api/complaints/' + issueId + '/review', { method: 'PATCH', body: JSON.stringify({ decision, note }) }); await refresh(); notify(decision === 'resolved' ? 'Proof approved. Issue resolved.' : 'Revision requested; worker notified.'); });
  }
  async function createWorker(e) {
    e.preventDefault();
    await run(async () => { await api('/api/admin/workers', { method: 'POST', body: JSON.stringify(workerForm) }); setShowWorker(false); setWorkerForm({ name: '', email: '', password: '', department: '' }); await refresh(); notify('Worker account created. Share the temporary password with them securely.'); });
  }
  function viewFile(filePath) {
    const tab = window.open('about:blank', '_blank');
    if (!tab) { setError('Allow pop-ups to view report attachments.'); return; }
    protectedFile(filePath).then(url => { tab.location.href = url; window.setTimeout(() => URL.revokeObjectURL(url), 60000); }).catch(err => { tab.close(); setError(err.message); });
  }

  const navItems = isAdmin ? [['Overview',LayoutDashboard],['All issues',ClipboardList],['Analytics',Activity],['Workers',Users]] : isWorker ? [['My assigned work',Wrench],['Notifications',Bell]] : [['My campus reports',ClipboardList],['Notifications',Bell]];
  const heading = isAdmin ? 'Campus issue desk' : isWorker ? 'Your work queue' : 'Hi, ' + user.name.split(' ')[0];
  const subtitle = isAdmin ? 'Review reports, route work and approve completion evidence.' : isWorker ? 'See assigned repairs and send completion proof.' : 'Report a campus problem and follow its progress.';

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Wrench size={20}/></div><div><b>Campus<span>Fix</span></b><small>CAMPUS, MADE BETTER</small></div></div>
      <div className="campus-switch"><div className="campus-avatar">N</div><div><b>Northwood University</b><small>Campus workspace</small></div><ChevronDown size={15}/></div>
      <div className="nav-group"><div className="nav-label">Workspace</div>{navItems.map(([name,Icon])=><button key={name} onClick={()=>setPage(name)} className={'nav-link '+(page===name?'active':'')}><Icon size={18}/><span>{name}</span>{name==='All issues'&&<em>{issues.length}</em>}</button>)}</div>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><ShieldCheck size={17}/></div><b>{user.role==='admin'?'Administrator':user.role==='worker'?'Facilities team':'Student account'}</b><p>{user.email}</p><button onClick={signOut}><LogOut size={13}/> Sign out</button></div><div className="profile"><div className="profile-photo">{user.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div><div><b>{user.name}</b><small>{user.role}{user.department?' · '+user.department:''}</small></div></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb">Campus workspace <span>/</span> <b>{page}</b></div><div className="top-actions"><button className="icon-button notification" onClick={()=>setShowNotifications(!showNotifications)}><Bell size={18}/>{notifications.some(n=>!n.readAt)&&<i/>}</button><div className="top-avatar">{user.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>{showNotifications&&<div className="notification-pop"><b>Notifications</b>{notifications.length?notifications.slice(0,8).map(n=><p key={n._id}>{n.message}<small>{new Date(n.createdAt).toLocaleString()}</small></p>):<p>You’re all caught up.</p>}</div>}</div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> NORTHWOOD UNIVERSITY</div><h1>{heading} <span>✳</span></h1><p>{subtitle}</p></div>{user.role==='student'&&<button className="primary-button" onClick={()=>setShowReport(true)}><Plus size={17}/> Report an issue</button>}{isAdmin&&<button className="primary-button" onClick={()=>setShowWorker(true)}><Plus size={17}/> Add worker</button>}</div>
        {isAdmin&&<section className="stats-grid">{[['Total issues',issues.length,ClipboardList],['Awaiting assignment',counts.submitted,CircleAlert],['Proof to review',counts.proof_submitted,ImagePlus],['Resolved',counts.resolved,CheckCircle2]].map(([label,value,Icon])=><div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><div><Icon size={17}/></div></div><div className="stat-number">{value}<small> issues</small></div><div className="stat-foot"><span className="trend">Live campus data</span></div></div>)}</section>}
        {error&&<div className="error-banner"><CircleAlert size={16}/>{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
        {page==='Analytics'&&isAdmin?<Analytics/>:<><div className="section-head"><div><h2>{page==='Workers'&&isAdmin?'Facilities workers':isAdmin?'Issue management':isWorker?'My assigned work':'My campus reports'}</h2><p>{isAdmin?'Assign submitted reports and review completion proof.':isWorker?'Start assigned work, then upload an image or video as proof.':'Your reports and their latest verified status.'}</p></div><button className="text-link" onClick={()=>refresh().catch(err=>setError(err.message))}><RefreshCw size={14}/> Refresh</button></div>
          {page==='Workers'&&isAdmin?<div className="worker-grid">{workers.map(w=><div className="worker-card" key={w._id}><div className="profile-photo">{w.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div><b>{w.name}</b><span>{w.department||'Facilities'}</span><small>{w.email}</small><small>{issues.filter(i=>String(i.assignedTo?._id)===w._id&&i.status!=='resolved').length} open assignments</small></div>)}</div>:<IssueList issues={shown} user={user} workers={workers} busy={busy} assign={assign} startWork={startWork} uploadProof={uploadProof} review={review} viewFile={viewFile} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter}/>}</>}
        <footer className="footer"><span>© 2026 CampusFix · Reports are stored in the campus database.</span><span><i className="live-dot"/> API connected</span></footer>
      </div>
    </main>
    {showReport&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setShowReport(false)}><form className="modal" onSubmit={submitReport}><div className="modal-head"><div><div className="modal-kicker"><Sparkles size={14}/> AI-POWERED REPORTING</div><h2>Report an issue</h2><p>AI will categorize the report and route it to the campus admin.</p></div><button type="button" className="icon-button" onClick={()=>setShowReport(false)}><X size={18}/></button></div><label className="field-label">What needs attention? <span>*</span><input required maxLength="140" value={report.title} onChange={e=>setReport({...report,title:e.target.value})} placeholder="e.g. Water cooler not working"/></label><label className="field-label">Describe the problem <span>*</span><textarea required rows="3" maxLength="4000" value={report.description} onChange={e=>setReport({...report,description:e.target.value})} placeholder="What happened, and when did you notice it?"/></label><label className="field-label">Where is it? <span>*</span><div className="input-icon"><MapPin size={16}/><input required maxLength="200" value={report.location} onChange={e=>setReport({...report,location:e.target.value})} placeholder="Hostel, block, floor or campus building"/></div></label><label className="upload-box"><ImagePlus size={19}/><span><b>Add a photo or video</b><small>Optional · {import.meta.env.VITE_MAX_UPLOAD_MB||10} MB max</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setReport({...report,attachment:e.target.files?.[0]||null})}/><small>{report.attachment?.name||'Browse'}</small></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowReport(false)}>Cancel</button><button className="primary-button" disabled={busy}><Send size={15}/> {busy?'Submitting…':'Submit report'}</button></div></form></div>}
    {showWorker&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setShowWorker(false)}><form className="modal" onSubmit={createWorker}><div className="modal-head"><div><div className="modal-kicker"><Users size={14}/> FACILITIES TEAM</div><h2>Add a worker</h2><p>They’ll sign in with this email and temporary password.</p></div><button type="button" className="icon-button" onClick={()=>setShowWorker(false)}><X size={18}/></button></div>{[['Full name','name','text'],['Email','email','email'],['Temporary password','password','password'],['Department','department','text']].map(([label,key,type])=><label className="field-label" key={key}>{label}<input required={key!=='department'} type={type} minLength={key==='password'?8:undefined} value={workerForm[key]} onChange={e=>setWorkerForm({...workerForm,[key]:e.target.value})}/></label>)}<div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowWorker(false)}>Cancel</button><button className="primary-button" disabled={busy}><Plus size={15}/> Create worker</button></div></form></div>}
    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function IssueList({ issues, user, workers, assign, startWork, uploadProof, review, viewFile, query, setQuery, filter, setFilter, busy }) {
  const filters = user.role==='admin' ? [['all','All issues'],['submitted','New'],['assigned','Assigned'],['proof_submitted','Proof review'],['resolved','Resolved']] : user.role==='worker' ? [['all','All assigned'],['assigned','Assigned'],['in_progress','In progress'],['proof_submitted','Proof sent'],['needs_revision','Needs revision'],['resolved','Resolved']] : [['all','All reports'],['submitted','Submitted'],['assigned','Assigned'],['in_progress','In progress'],['proof_submitted','Proof review'],['resolved','Resolved']];
  return <section className="issues-panel"><div className="table-toolbar"><div className="tabs">{filters.map(([value,label])=><button key={value} className={filter===value?'selected':''} onClick={()=>setFilter(value)}>{label}<span>{value==='all'?issues.length:issues.filter(i=>i.status===value).length}</span></button>)}</div><label className="search"><Search size={16}/><input placeholder="Search reports…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
    <div className="issue-table"><div className="table-head"><span>ISSUE</span><span>CATEGORY</span><span>LOCATION</span><span>STATUS / ACTION</span><span>REPORTED</span><span></span></div>
      {issues.length?issues.map(issue=>{const Icon=categoryIcons[issue.category]||Wrench;return <div className="table-row" key={issue._id}><div className="issue-main"><div className="issue-icon blue"><Icon size={17}/></div><div><b>{issue.title}</b><small>{issue.ticketId} · {user.role==='admin'?issue.createdBy?.name:user.role==='worker'?'For '+issue.createdBy?.name:'Reported by you'}</small>{issue.attachmentPath&&<button className="attachment-link" onClick={()=>viewFile(issue.attachmentPath)}>View report attachment · {issue.attachmentName}</button>}</div></div><div className="category-cell"><span className="category-dot blue"/>{issue.category}<small className="priority high">{issue.priority}</small></div><div className="location-cell"><MapPin size={14}/>{issue.location}</div><div><span className={'status '+issue.status.replaceAll('_','-')}><i/>{pretty(issue.status)}</span>
        {user.role==='admin'&&['submitted','assigned','needs_revision'].includes(issue.status)&&<select className="assign-select" value={issue.assignedTo?._id||''} onChange={e=>assign(issue._id,e.target.value)} disabled={busy}><option value="">Assign to worker…</option>{workers.map(w=><option value={w._id} key={w._id}>{w.name}{w.department?' · '+w.department:''}</option>)}</select>}
        {user.role==='worker'&&['assigned','needs_revision'].includes(issue.status)&&<button className="review-link" disabled={busy} onClick={()=>startWork(issue._id)}><Wrench size={12}/> Start work</button>}
        {user.role==='worker'&&['in_progress','needs_revision'].includes(issue.status)&&<label className="review-link upload-proof"><ImagePlus size={12}/> Upload proof<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>uploadProof(issue._id,e.target.files?.[0])}/></label>}
        {user.role==='admin'&&issue.status==='proof_submitted'&&<div className="review-actions"><button className="review-link" onClick={()=>viewFile(issue.proofPath)}>Open {issue.proofName||'proof'}</button><button onClick={()=>review(issue._id,'resolved')} disabled={busy}>Approve</button><button onClick={()=>review(issue._id,'needs_revision')} disabled={busy}>Request fix</button></div>}
        {issue.status==='needs_revision'&&issue.reviewNote&&<small className="review-note">Admin: {issue.reviewNote}</small>}</div><div className="date-cell"><Clock3 size={14}/>{new Date(issue.createdAt).toLocaleDateString()}</div><span/></div>}) : <div className="empty">{query?'No reports match that search.':'No reports in this view yet.'}</div>}
    </div><div className="table-footer"><span>Showing <b>{issues.length}</b> reports visible to your account</span><span>MongoDB-backed records</span></div></section>;
}

function Analytics() {
  const [data,setData] = useState(null); const [error,setError] = useState('');
  useEffect(()=>{api('/api/admin/analytics').then(setData).catch(e=>setError(e.message))},[]);
  return <div className="analytics-panel"><h2>Campus issue analytics</h2>{error?<p>{error}</p>:!data?<p>Loading campus statistics…</p>:<><div className="analytics-cards">{Object.entries(data.counts).map(([status,count])=><div className="stat-card" key={status}><div className="stat-top">{pretty(status)}</div><div className="stat-number">{count}</div></div>)}</div><h3>Reports by category</h3>{data.byCategory.map(row=><div className="analytics-row" key={row._id}><span>{row._id}</span><b>{row.count}</b></div>)}</>}</div>;
}
