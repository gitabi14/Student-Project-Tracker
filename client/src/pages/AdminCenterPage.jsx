import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Icon from '../components/common/Icons';

export default function AdminCenterPage() {
  const { showToast } = useApp();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'demo';

  const [tab, setTab] = useState(initialTab);

  // Data State
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [domainRequests, setDomainRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [demoState, setDemoState] = useState(null);

  // Modals & Editors
  const [addUserModal, setAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Student');
  const [newDeptName, setNewDeptName] = useState('');

  // Demo Date Picker State
  const [customSimDate, setCustomSimDate] = useState('2026-09-28');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (queryParams.get('tab')) {
      setTab(queryParams.get('tab'));
    }
  }, [location.search]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [uRes, dRes, repRes, domRes, demoRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/departments'),
        api.get('/admin/reports'),
        api.get('/admin/domains'),
        api.get('/demo/state')
      ]);

      if (uRes.data.success) setUsers(uRes.data.users);
      if (dRes.data.success) setDepartments(dRes.data.departments);
      if (repRes.data.success) setReports(repRes.data.reports);
      if (domRes.data.success) setDomainRequests(domRes.data.domainRequests);
      if (demoRes.data.success) setDemoState(demoRes.data);
    } catch (err) {
      console.error('Fetch admin data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoDateAction = async (action, dateStr = null) => {
    try {
      const res = await api.post('/demo/set-date', { action, dateString: dateStr });
      if (res.data.success) {
        showToast(res.data.message);
        fetchAdminData();
      }
    } catch (err) {
      showToast('Demo date setting failed');
    }
  };

  const studentsList = users.filter(u => u.role === 'Student');
  const facultyList = users.filter(u => u.role === 'Faculty');

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/users', { name: newUserName, email: newUserEmail, role: newUserRole });
      if (res.data.success) {
        showToast(res.data.message);
        setAddUserModal(false);
        setNewUserName(''); setNewUserEmail('');
        fetchAdminData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add user');
    }
  };

  const handleRemoveUser = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove ${name}'s account?`)) {
      try {
        const res = await api.delete(`/admin/users/${id}`);
        if (res.data.success) {
          showToast(res.data.message);
          fetchAdminData();
        }
      } catch (err) {
        showToast('Remove user failed');
      }
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--muted)', padding: '40px' }}>Loading Admin Center...</div>;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Platform Governance & Demo Simulation Center</h1>
          <p>Super-user governance, student/faculty directory management, and Demo Simulation Clock controls for hackathon evaluation.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddUserModal(true)}>
          <Icon name="plus" size={16} /> Add User Account
        </button>
      </div>

      <div className="card" style={{ padding: '22px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="sub-tabs" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          <div className={`sub-tab ${tab === 'demo' ? 'active' : ''}`} onClick={() => setTab('demo')}>
            ⚡ Demo Clock Controls & Simulation
          </div>
          <div className={`sub-tab ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>
            🎓 Students Directory ({studentsList.length})
          </div>
          <div className={`sub-tab ${tab === 'faculty' ? 'active' : ''}`} onClick={() => setTab('faculty')}>
            👩‍🏫 Faculty Directory ({facultyList.length})
          </div>
          <div className={`sub-tab ${tab === 'departments' ? 'active' : ''}`} onClick={() => setTab('departments')}>
            Departments
          </div>
        </div>

        {/* DEMO / SIMULATION CLOCK CONTROLS TAB */}
        {tab === 'demo' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fbbf24', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                <Icon name="clock" size={22} /> Application Time Simulation System (Hackathon Demo)
              </div>
              <p style={{ fontSize: '13.5px', color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 16px' }}>
                Demonstrate live weekly progress deadline reminders (`Weekly Progress Due Today`) and overdue notifications (`Weekly Progress Overdue`) without waiting for actual calendar dates or touching the OS clock.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                <div style={{ background: 'rgba(3,7,18,0.5)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>Current Real Date:</span>
                  <b style={{ color: '#fff', fontSize: '16px' }}>{new Date().toISOString().split('T')[0]}</b>
                </div>
                <div style={{ background: 'rgba(3,7,18,0.5)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>Current Application Clock:</span>
                  <b style={{ color: demoState?.demoModeActive ? '#fbbf24' : '#34d399', fontSize: '16px' }}>
                    {demoState?.formattedAppDate || 'Real Time Active'} {demoState?.demoModeActive ? ' (SIMULATED)' : ' (REAL TIME)'}
                  </b>
                </div>
              </div>

              {/* QUICK DATE JUMP CONTROLS */}
              <h4 style={{ margin: '0 0 10px', fontSize: '15px', color: '#fff' }}>Quick Time Warp Controls:</h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <button className="btn btn-outline" style={{ background: '#0f172a' }} onClick={() => handleDemoDateAction('plus1day')}>
                  +1 Day
                </button>
                <button className="btn btn-outline" style={{ background: '#0f172a' }} onClick={() => handleDemoDateAction('plus3days')}>
                  +3 Days
                </button>
                <button className="btn btn-outline" style={{ background: '#0f172a', borderColor: '#fbbf24', color: '#fbbf24' }} onClick={() => handleDemoDateAction('plus7days')}>
                  +7 Days (Warp to Next Week)
                </button>
                <button className="btn btn-primary" style={{ background: 'var(--gold-grad)' }} onClick={() => handleDemoDateAction('endOfWeek')}>
                  Warp to Deadline (28 Sep)
                </button>
                <button className="btn btn-danger-outline" onClick={() => handleDemoDateAction('reset')}>
                  Reset to Real Time
                </button>
              </div>

              {/* CUSTOM DATE PICKER */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>Set Specific Simulated Date:</span>
                <input
                  type="date"
                  style={{ background: '#0f172a', color: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px' }}
                  value={customSimDate}
                  onChange={(e) => setCustomSimDate(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" onClick={() => handleDemoDateAction('custom', customSimDate)}>
                  Apply Date
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT MANAGEMENT TAB */}
        {tab === 'students' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>Student Directory & Register Numbers</h3>
            </div>
            <table>
              <thead>
                <tr><th>Student Name</th><th>Reg No</th><th>Email</th><th>Department</th><th>Academic Year</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {studentsList.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{u.name}</td>
                    <td><span className="badge badge-gray">{u.regNo || '2026CS101'}</span></td>
                    <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                    <td>{u.dept}</td>
                    <td><span className="badge badge-gray">{u.academic_year}</span></td>
                    <td>
                      <button className="btn btn-danger-outline btn-sm" onClick={() => handleRemoveUser(u.id, u.name)}>Remove Account</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* FACULTY MANAGEMENT TAB */}
        {tab === 'faculty' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>Faculty Directory & Mentorship Limits</h3>
            </div>
            <table>
              <thead>
                <tr><th>Faculty Name</th><th>Email</th><th>Department</th><th>Domain Specializations</th><th>Mentorship Limit</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {facultyList.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{f.name}</td>
                    <td style={{ color: 'var(--muted)' }}>{f.email}</td>
                    <td>{f.dept}</td>
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(f.specializations || [f.domain_of_interest]).map((s, idx) => (
                          <span key={idx} className="badge badge-gray" style={{ fontSize: '10.5px' }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#38bdf8' }}>{f.maxPendingThreshold || 10} projects max</td>
                    <td>
                      <button className="btn btn-danger-outline btn-sm" onClick={() => handleRemoveUser(f.id, f.name)}>Remove Account</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DEPARTMENTS TAB */}
        {tab === 'departments' && (
          <div>
            <table>
              <thead>
                <tr><th>Department Name</th></tr>
              </thead>
              <tbody>
                {departments.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD USER */}
      {addUserModal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setAddUserModal(false)}>
          <div className="modal">
            <h3>Add User Account</h3>
            <p className="hint">Register a new student, faculty, or admin account.</p>
            <form onSubmit={handleAddUser}>
              <div className="field"><label>Full name</label><input required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="e.g. Meenakshi Natarajan" /></div>
              <div className="field"><label>Email</label><input required type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="name@university.edu" /></div>
              <div className="field">
                <label>Role</label>
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} style={{ background: 'rgba(3,7,18,0.4)', color: '#fff' }}>
                  <option>Student</option>
                  <option>Faculty</option>
                  <option>Administrator</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setAddUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add user</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
