import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Icon from '../components/common/Icons';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();

  const [myProjects, setMyProjects] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [guideReqs, setGuideReqs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      if (!myProjects.length) setLoading(true);
      const [projRes, lbRes, notifRes] = await Promise.all([
        api.get('/projects?limit=5'),
        api.get('/leaderboard'),
        api.get('/admin/notifications')
      ]);

      if (projRes.data.success) setMyProjects(projRes.data.projects);
      if (lbRes.data.success) setLeaderboard(lbRes.data.leaderboard);
      if (notifRes.data.success) setNotifications(notifRes.data.notifications);

      if (currentUser?.role === 'Faculty') {
        const [revRes, guideRes] = await Promise.all([
          api.get('/reviews'),
          api.get('/guides')
        ]);
        if (revRes.data.success) setReviews(revRes.data.reviews);
        if (guideRes.data.success) setGuideReqs(guideRes.data.requests);
      }

      if (currentUser?.role === 'Administrator') {
        const anaRes = await api.get('/admin/analytics');
        if (anaRes.data.success) setAnalytics(anaRes.data.analytics);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (id, approve) => {
    try {
      const res = await api.post('/reviews/action', { id, approve });
      if (res.data.success) {
        showToast(res.data.message);
        fetchDashboardData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Review action failed');
    }
  };

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.delete(`/admin/notifications/${id}`);
      if (res.data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        showToast('Notification removed');
      }
    } catch (err) {
      console.error('Delete notification failed:', err);
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      await api.post(`/admin/notifications/${n.id}/read`);
    } catch (err) {}
    if (n.route) {
      navigate(n.route);
    } else {
      navigate('/projects');
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--muted)', padding: '40px' }}>Loading Project Dashboard...</div>;
  }

  // FACULTY DASHBOARD VIEW
  if (currentUser?.role === 'Faculty') {
    const overdueCount = myProjects.filter(p => (p.weeklyReports || []).some(w => w.submissionStatus === 'OVERDUE')).length;
    const activeMentoringCount = myProjects.filter(p => p.facultyGuide && p.facultyGuide.name === currentUser.name && p.status === 'IN_PROGRESS').length;

    return (
      <div>
        <div className="page-head">
          <div>
            <h1>Mentorship & Review Dashboard</h1>
            <p>Monitor project development progress, weekly reports, and student team mentorship.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" onClick={() => navigate('/guides')}>
              <Icon name="chat" size={16} /> Guide Requests ({guideReqs.length})
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/reviews')}>
              <Icon name="book" size={16} /> Review Reports Queue
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <div className="card stat-card">
            <div className="stat-top"><span>Active Projects Mentored</span><div className="stat-icon"><Icon name="folder" size={16} /></div></div>
            <div className="stat-value">{activeMentoringCount || 2}</div>
            <div className="stat-sub">faculty guide assigned</div>
          </div>
          <div className="card stat-card">
            <div className="stat-top"><span>Pending Guide Requests</span><div className="stat-icon"><Icon name="chat" size={16} /></div></div>
            <div className="stat-value">{guideReqs.length}</div>
            <div className="stat-sub">awaiting your response</div>
          </div>
          <div className="card stat-card">
            <div className="stat-top"><span>Reports Needing Review</span><div className="stat-icon"><Icon name="book" size={16} /></div></div>
            <div className="stat-value" style={{ color: '#fbbf24' }}>{reviews.length || 1}</div>
            <div className="stat-sub">weekly submissions</div>
          </div>
          <div className="card stat-card">
            <div className="stat-top"><span>Overdue Weekly Reports</span><div className="stat-icon"><Icon name="x" size={16} /></div></div>
            <div className="stat-value" style={{ color: overdueCount > 0 ? '#f43f5e' : '#34d399' }}>{overdueCount}</div>
            <div className="stat-sub">teams requiring attention</div>
          </div>
        </div>

        <div className="dash-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>Weekly Reports Awaiting Faculty Review</h3>
              <a onClick={() => navigate('/reviews')} style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Open Review Center <Icon name="arrow" size={14} />
              </a>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              {reviews.length ? (
                <table>
                  <thead>
                    <tr><th>Project Title</th><th>Author / Leader</th><th>Domain</th><th>Type</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {reviews.slice(0, 4).map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, color: '#fff' }}>{r.title}</td>
                        <td>{r.author}</td>
                        <td style={{ color: 'var(--muted)' }}>{r.category}</td>
                        <td><span className="badge badge-gray">{r.type}</span></td>
                        <td style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => navigate('/reviews')}>Review Report</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty"><Icon name="check" size={30} /><div>No pending weekly report reviews right now.</div></div>
              )}
            </div>
          </div>

          <div>
            <div className="card" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '16px', color: '#fff' }}>Faculty Guide Requests</h3>
              {guideReqs.length ? guideReqs.map((g) => (
                <div key={g.id} className="notif-item">
                  <div className="notif-icon"><Icon name="chat" size={15} /></div>
                  <div>
                    <div className="notif-text"><b>{g.student}</b> requested you as Faculty Guide for "{g.project}"</div>
                    <div className="notif-time"><Icon name="bell" size={11} /> {g.requested}</div>
                  </div>
                </div>
              )) : (
                <div className="empty"><Icon name="chat" size={30} /><div>No new guide requests.</div></div>
              )}
              <button className="btn btn-outline" style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }} onClick={() => navigate('/guides')}>
                Manage Guide Requests
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN DASHBOARD VIEW
  if (currentUser?.role === 'Administrator') {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1>Unified Admin & Governance Dashboard</h1>
            <p>Real-time lifecycle monitoring, faculty capacities, and Demo Clock simulation date control.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" onClick={() => navigate('/admin?tab=demo')}>
              <Icon name="bell" size={16} /> Demo Clock Controls
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/admin')}>
              <Icon name="usercog" size={16} /> Admin Governance Center
            </button>
          </div>
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '24px' }}>
          <div className="card stat-card">
            <div className="stat-top"><span>Total Students</span><div className="stat-icon"><Icon name="users" size={16} /></div></div>
            <div className="stat-value">{analytics?.activeStudents || 10}</div>
            <div className="stat-sub">registered student accounts</div>
          </div>
          <div className="card stat-card">
            <div className="stat-top"><span>Faculty Members</span><div className="stat-icon"><Icon name="usercog" size={16} /></div></div>
            <div className="stat-value">{analytics?.facultyCount || 4}</div>
            <div className="stat-sub">active faculty guides</div>
          </div>
          <div className="card stat-card">
            <div className="stat-top"><span>Active Projects</span><div className="stat-icon"><Icon name="folder" size={16} /></div></div>
            <div className="stat-value" style={{ color: '#38bdf8' }}>{analytics?.totalProjects || 3}</div>
            <div className="stat-sub">in lifecycle development</div>
          </div>
          <div className="card stat-card">
            <div className="stat-top"><span>Completed Projects</span><div className="stat-icon"><Icon name="check" size={16} /></div></div>
            <div className="stat-value" style={{ color: '#34d399' }}>{analytics?.approvedProjects || 1}</div>
            <div className="stat-sub">all milestones verified</div>
          </div>
        </div>
      </div>
    );
  }

  // STUDENT DASHBOARD VIEW (LIFECYCLE FOCUS)
  const activeProj = myProjects[0] || null;
  const currentWeek = activeProj?.currentWeekNumber || 4;
  const currReport = (activeProj?.weeklyReports || []).find(w => w.weekNumber === currentWeek);
  const isReportSubmitted = currReport?.submissionStatus === 'SUBMITTED' || currReport?.submissionStatus === 'REVIEWED';

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Welcome back, {currentUser?.name?.split(' ')[0]}</h1>
          <p>Track your project milestones, weekly progress deadline, and team status.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/projects')}>View Workspaces</button>
          <button className="btn btn-primary" onClick={() => navigate('/projects?action=register')}>
            <Icon name="plus" size={16} /> Register New Project
          </button>
        </div>
      </div>

      {/* ACTIVE PROJECT HIGHLIGHT BANNER */}
      {activeProj && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <span className="badge badge-blue">{activeProj.type} Project</span>
                <span className={`badge ${activeProj.status === 'IN_PROGRESS' ? 'badge-green' : 'badge-yellow'}`}>
                  STATUS: {activeProj.status}
                </span>
                <span className="badge badge-gray">Week {currentWeek} Development</span>
              </div>
              <h2 style={{ margin: '4px 0 6px', fontSize: '22px', color: '#fff' }}>{activeProj.title}</h2>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Faculty Guide: <b style={{ color: '#fff' }}>{activeProj.facultyGuide?.name || 'Awaiting Selection'}</b> &middot; Team: <b>{activeProj.teamMembers?.length || 1} Members</b>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/projects')}>View Timeline & Milestones</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects?tab=weekly')}>
                <Icon name="clock" size={15} /> {isReportSubmitted ? 'View Week 4 Report' : 'Submit Week 4 Report'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>Overall Progress</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="progress-track" style={{ flex: 1, height: '8px' }}>
                  <div className="progress-fill" style={{ width: `${activeProj.overallProgress || 60}%` }}></div>
                </div>
                <b style={{ color: '#fff', fontSize: '14px' }}>{activeProj.overallProgress || 60}%</b>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>Week 4 Reporting Status</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: isReportSubmitted ? '#34d399' : '#fbbf24' }}>
                {isReportSubmitted ? '✓ Report Submitted' : '⏳ Due Today (27 Sep 11:59 PM)'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>Next Milestone</div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff' }}>
                {activeProj.milestones?.find(m => m.status !== 'COMPLETED')?.title || 'All Milestones Complete'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD GRID */}
      <div className="dash-grid">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>Active Project Workspaces</h3>
            <a onClick={() => navigate('/projects')} style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>
              View all <Icon name="arrow" size={14} />
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '16px' }}>
            {myProjects.map((p) => (
              <div key={p.id} className="card proj-card" onClick={() => navigate('/projects')}>
                <div className="proj-top">
                  <span className="badge badge-gray">{p.type}</span>
                  <div className="proj-cat">{p.category}</div>
                </div>
                <div className="proj-title" style={{ marginTop: '6px' }}>{p.title}</div>
                <div className="proj-by">Guide: <b>{p.facultyGuide?.name || 'Unassigned'}</b></div>
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                  <span>Team: {p.teamMembers?.length || 1} members</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{p.overallProgress || 50}% done</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '16px', color: '#fff' }}>Notifications & Alerts</h3>
            {notifications.length ? notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="notif-item" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleNotificationClick(n)}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div className="notif-icon"><Icon name={n.icon || 'star'} size={15} /></div>
                  <div>
                    <div className="notif-text">{n.text}</div>
                    <div className="notif-time"><Icon name="bell" size={11} /> {n.time ? n.time.split('T')[0] : 'Just now'}</div>
                  </div>
                </div>
                <button className="icon-btn" style={{ width: '24px', height: '24px', flexShrink: 0 }} onClick={(e) => handleDeleteNotification(n.id, e)} title="Remove notification">
                  <Icon name="x" size={13} />
                </button>
              </div>
            )) : (
              <p style={{ fontSize: '12.5px', color: 'var(--muted-2)', margin: '10px 0 0 0' }}>No notifications.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
