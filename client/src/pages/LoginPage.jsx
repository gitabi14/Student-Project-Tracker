import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Icon from '../components/common/Icons';

const roleMeta = {
  Student: { icon: 'bulb', line: 'Form teams, plan milestones, track weekly progress, and build together.' },
  Faculty: { icon: 'book', line: 'Accept guide requests, review weekly progress reports, and provide feedback.' },
  Administrator: { icon: 'shield', line: 'Oversee platform governance, faculty workloads, and demo clock simulation.' },
};

export default function LoginPage() {
  const [loginRole, setLoginRole] = useState('Student');
  const [email, setEmail] = useState('kavitha@university.edu');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  // Demo user dropdowns loaded from database
  const [demoStudents, setDemoStudents] = useState([]);
  const [demoFaculty, setDemoFaculty] = useState([]);
  const [selectedDemoUserEmail, setSelectedDemoUserEmail] = useState('kavitha@university.edu');

  const { login } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDemoUsers();
  }, []);

  const fetchDemoUsers = async () => {
    try {
      const res = await api.get('/auth/demo-users');
      if (res.data.success) {
        setDemoStudents(res.data.students || []);
        setDemoFaculty(res.data.faculty || []);
      }
    } catch (err) {}
  };

  const handleRoleChange = (r) => {
    setLoginRole(r);
    if (r === 'Faculty') {
      const defaultEmail = demoFaculty.length > 0 ? demoFaculty[0].email : 'arumugam@university.edu';
      setEmail(defaultEmail);
      setSelectedDemoUserEmail(defaultEmail);
    } else if (r === 'Administrator') {
      setEmail('admin@university.edu');
      setSelectedDemoUserEmail('admin@university.edu');
    } else {
      const defaultEmail = demoStudents.length > 0 ? demoStudents[0].email : 'kavitha@university.edu';
      setEmail(defaultEmail);
      setSelectedDemoUserEmail(defaultEmail);
    }
  };

  const handleDemoUserSelect = (selectedEmail) => {
    setSelectedDemoUserEmail(selectedEmail);
    setEmail(selectedEmail);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password, loginRole);
      showToast(`Welcome back, ${data.user.name} (${data.user.role})`);
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-side">
        <div className="top">
          <div className="brand-mark" style={{ background: '#1f3d8f' }}>
            <Icon name="book" size={18} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '17px' }}>ProjectHub</span>
        </div>
        <div>
          <h2>Plan your project. Track your progress. Build together. Complete with confidence.</h2>
          <p>ProjectHub helps student teams manage their complete project journey — from registration and team formation to milestone planning, weekly progress tracking, faculty guidance, review, and final completion.</p>
        </div>
        <div className="quote">"Academic Project Development & Lifecycle Management Platform" — CS, IT, ECE & Mech.</div>
      </div>

      <div className="login-form-wrap">
        <div className="login-card">
          <h1>Sign in</h1>
          <p className="sub">Select your academic role and credentials to access your project workspace.</p>

          <div className="role-toggle">
            {Object.keys(roleMeta).map((r) => (
              <div
                key={r}
                className={`r ${loginRole === r ? 'active' : ''}`}
                onClick={() => handleRoleChange(r)}
              >
                <Icon name={roleMeta[r].icon} size={15} />
                <span>{r}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '-12px 0 18px' }}>
            {roleMeta[loginRole].line}
          </p>

          {/* DEMO SELECTOR FOR HACKATHON CONVENIENCE */}
          {loginRole === 'Student' && demoStudents.length > 0 && (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#818cf8', display: 'block', marginBottom: '6px' }}>
                <Icon name="users" size={13} /> Demo Selector — Select Student User Context:
              </label>
              <select
                value={selectedDemoUserEmail}
                onChange={(e) => handleDemoUserSelect(e.target.value)}
                style={{ width: '100%', background: '#0f172a', color: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
              >
                {demoStudents.map(s => (
                  <option key={s.id} value={s.email}>
                    {s.name} ({s.regNo}) — {s.dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loginRole === 'Faculty' && demoFaculty.length > 0 && (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#818cf8', display: 'block', marginBottom: '6px' }}>
                <Icon name="book" size={13} /> Demo Selector — Select Faculty Member Context:
              </label>
              <select
                value={selectedDemoUserEmail}
                onChange={(e) => handleDemoUserSelect(e.target.value)}
                style={{ width: '100%', background: '#0f172a', color: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
              >
                {demoFaculty.map(f => (
                  <option key={f.id} value={f.email}>
                    {f.name} — {f.dept} ({Array.isArray(f.specializations) ? f.specializations.join(', ') : f.specializations})
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="login-actions-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)' }}>
                <input type="checkbox" style={{ width: 'auto' }} defaultChecked /> Remember me
              </label>
              <a onClick={() => showToast('Password reset link sent to ' + email)}>Forgot password?</a>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
              {loading ? 'Authenticating...' : `Continue as ${loginRole}`} <Icon name="arrow" size={15} />
            </button>
          </form>

          <div className="demo-hint">
            <Icon name="shield" size={14} /> JWT authentication active — select user above to sign in.
          </div>

          <div className="login-switch">
            New to ProjectHub? <Link to="/register">Register student account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
