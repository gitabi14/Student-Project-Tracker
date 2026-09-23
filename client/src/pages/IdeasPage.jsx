import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Icon from '../components/common/Icons';
import { BadgeType } from '../components/common/Badge';
import { EmptyState } from '../components/common/Toast';

export default function IdeasPage() {
  const { currentUser } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();

  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [publishModal, setPublishModal] = useState(false);
  const [joinModal, setJoinModal] = useState(null); // idea object
  const [manageModal, setManageModal] = useState(null); // idea object

  // Publish Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Machine Learning');
  const [tech, setTech] = useState('');
  const [description, setDescription] = useState('');
  const [requiredRoles, setRequiredRoles] = useState([
    { roleName: 'Backend Developer', requiredCount: 1 },
    { roleName: 'Frontend Engineer', requiredCount: 1 }
  ]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCount, setNewRoleCount] = useState(1);

  // Join Request Form State
  const [selectedRole, setSelectedRole] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [joinSkills, setJoinSkills] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const predefinedDomainList = [
    'Machine Learning',
    'Web Development',
    'Mobile Development',
    'Blockchain',
    'Internet of Things',
    'Cybersecurity',
    'Cloud Computing'
  ];

  useEffect(() => {
    fetchIdeas();
  }, [categoryFilter, search]);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ideas', { params: { category: categoryFilter, search } });
      if (res.data.success) {
        setIdeas(res.data.ideas || []);
      }
    } catch (err) {
      console.error('Fetch ideas error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRequiredRole = (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setRequiredRoles([...requiredRoles, { roleName: newRoleName.trim(), requiredCount: parseInt(newRoleCount) || 1 }]);
    setNewRoleName('');
    setNewRoleCount(1);
  };

  const handleRemoveRequiredRole = (index) => {
    setRequiredRoles(requiredRoles.filter((_, i) => i !== index));
  };

  const handlePublishIdea = async (e) => {
    e.preventDefault();
    if (!requiredRoles.length) {
      showToast('Please specify at least 1 required team role for collaboration.');
      return;
    }

    try {
      const res = await api.post('/ideas', {
        title,
        category,
        tech,
        description,
        requiredRoles
      });

      if (res.data.success) {
        showToast(res.data.message);
        setPublishModal(false);
        setTitle(''); setTech(''); setDescription('');
        fetchIdeas();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to publish idea');
    }
  };

  const handleOpenJoinModal = (idea) => {
    setJoinModal(idea);
    const unfilled = (idea.requiredRoles || []).filter(r => r.filledCount < r.requiredCount);
    if (unfilled.length > 0) {
      setSelectedRole(unfilled[0].roleName);
    } else {
      setSelectedRole('');
    }
    setJoinMessage('');
    setJoinSkills(currentUser?.skills ? currentUser.skills.join(', ') : '');
    setPortfolioUrl('');
  };

  const handleSubmitJoinRequest = async (e) => {
    e.preventDefault();
    if (!selectedRole) {
      showToast('All open positions for this idea are filled.');
      return;
    }

    try {
      const res = await api.post(`/ideas/${joinModal.id}/join`, {
        requestedRole: selectedRole,
        message: joinMessage,
        skills: joinSkills,
        portfolioUrl
      });

      if (res.data.success) {
        showToast(res.data.message);
        setJoinModal(null);
        fetchIdeas();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit join request');
    }
  };

  const handleRespondRequest = async (ideaId, requestId, action) => {
    try {
      const res = await api.post(`/ideas/${ideaId}/requests/${requestId}/respond`, { action });
      if (res.data.success) {
        showToast(res.data.message);
        fetchIdeas();
        // Update local manageModal state
        if (manageModal) {
          const updatedIdeas = await api.get('/ideas');
          if (updatedIdeas.data.success) {
            const current = updatedIdeas.data.ideas.find(i => i.id === ideaId);
            if (current) setManageModal(current);
          }
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed');
    }
  };

  const handleLikeIdea = async (id) => {
    try {
      const res = await api.post(`/ideas/${id}/like`);
      if (res.data.success) {
        setIdeas(ideas.map(i => i.id === id ? { ...i, likes: res.data.likes } : i));
      }
    } catch (err) {}
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Public Student Idea Bar & Team Recruitment</h1>
          <p>Publish project ideas, recruit team members by role, and convert validated ideas to full projects.</p>
        </div>
        {currentUser?.role === 'Student' && (
          <button className="btn btn-primary" onClick={() => setPublishModal(true)}>
            <Icon name="plus" size={16} /> Publish Idea & Recruit Team
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search ideas by title, tech, or publisher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '240px', background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '8px', color: '#fff', fontSize: '13.5px' }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '8px', color: '#fff', fontSize: '13.5px' }}
        >
          <option value="all">All Domains</option>
          {predefinedDomainList.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '40px' }}>Loading public idea bar...</div>
      ) : ideas.length ? (
        <div className="proj-grid">
          {ideas.map((idea) => {
            const isPublisher = currentUser?.email.toLowerCase() === (idea.publisherEmail || '').toLowerCase();
            const pendingRequests = (idea.joinRequests || []).filter(r => r.status === 'PENDING');
            const openRoles = (idea.requiredRoles || []).filter(r => r.filledCount < r.requiredCount);
            const userRequest = (idea.joinRequests || []).find(r => r.applicantEmail.toLowerCase() === (currentUser?.email || '').toLowerCase());

            return (
              <div key={idea.id} className="card proj-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="proj-top">
                  <span className="badge badge-purple">Idea</span>
                  <div className="proj-cat">{idea.category}</div>
                </div>

                <div className="proj-title" style={{ marginTop: '8px', fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                  {idea.title}
                </div>

                <div className="proj-by" style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '4px 0 10px' }}>
                  by <b style={{ color: '#fff' }}>{idea.publisher}</b> ({idea.publisherRegNo || 'Student'}) &middot; {idea.dept}
                </div>

                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 14px' }}>
                  {idea.description}
                </p>

                {/* TECH BADGES */}
                {idea.tech && idea.tech.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {idea.tech.map((t, idx) => (
                      <span key={idx} className="badge badge-gray" style={{ fontSize: '11px' }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* REQUIRED ROLES & POSITIONS */}
                <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Required Team Roles & Capacity:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(idea.requiredRoles || []).map((r) => {
                      const isFull = r.filledCount >= r.requiredCount;
                      return (
                        <div key={r.roleId || r.roleName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{r.roleName}</span>
                          <span className={`badge ${isFull ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '10.5px' }}>
                            {r.filledCount} / {r.requiredCount} filled {isFull ? '(FULL)' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CARD FOOTER & ACTIONS */}
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--muted)' }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => handleLikeIdea(idea.id)}>
                      <Icon name="heart" size={15} /> {idea.likes}
                    </span>
                    <span><Icon name="eye" size={15} /> {idea.views}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isPublisher ? (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => setManageModal(idea)}>
                          Join Requests {pendingRequests.length > 0 && <span className="badge badge-red" style={{ marginLeft: '4px' }}>{pendingRequests.length}</span>}
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/projects?action=register&fromIdea=${idea.id}`)}>
                          Convert to Project
                        </button>
                      </>
                    ) : currentUser?.role === 'Student' ? (
                      userRequest ? (
                        <span className={`badge ${userRequest.status === 'ACCEPTED' ? 'badge-green' : userRequest.status === 'REJECTED' ? 'badge-red' : 'badge-yellow'}`}>
                          Request {userRequest.status} ({userRequest.requestedRole})
                        </span>
                      ) : openRoles.length > 0 ? (
                        <button className="btn btn-primary btn-sm" onClick={() => handleOpenJoinModal(idea)}>
                          <Icon name="plus" size={13} /> Request to Join
                        </button>
                      ) : (
                        <span className="badge badge-gray">All Positions Filled</span>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState msg="No published ideas match your filter." ic="bulb" />
      )}

      {/* MODAL 1: PUBLISH IDEA WITH ROLE REQUIREMENTS */}
      {publishModal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setPublishModal(false)}>
          <div className="modal" style={{ width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Publish Idea & Define Open Positions</h3>
            <p className="hint">Share your concept and recruit specialized student roles to build the team.</p>
            
            <form onSubmit={handlePublishIdea}>
              <div className="field">
                <label>Idea Title</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AI-Driven Smart Exam Proctoring System" />
              </div>

              <div className="field">
                <label>Domain Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {predefinedDomainList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Target Tech Stack (comma separated)</label>
                <input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="e.g. Python, FastAPI, React, PostgreSQL" />
              </div>

              <div className="field">
                <label>Project Abstract & Objectives</label>
                <textarea required rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the core problem, proposed innovation, and solution architecture..."></textarea>
              </div>

              {/* DYNAMIC REQUIRED ROLES BUILDER */}
              <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <b style={{ color: '#fff', fontSize: '13.5px', display: 'block', marginBottom: '10px' }}>
                  Define Required Team Roles & Positions:
                </b>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {requiredRoles.map((r, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px' }}>
                      <div>
                        <b style={{ color: '#fff' }}>{r.roleName}</b> &middot; <span style={{ color: '#38bdf8' }}>{r.requiredCount} position(s)</span>
                      </div>
                      <button type="button" className="icon-btn" onClick={() => handleRemoveRequiredRole(idx)}>
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Role title (e.g. ML Engineer)"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    style={{ flex: 1, fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newRoleCount}
                    onChange={(e) => setNewRoleCount(e.target.value)}
                    style={{ width: '80px', fontSize: '13px' }}
                  />
                  <button type="button" className="btn btn-outline btn-sm" onClick={handleAddRequiredRole}>
                    Add Role
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setPublishModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Idea Live</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST TO JOIN (ROLE-BASED) */}
      {joinModal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setJoinModal(null)}>
          <div className="modal" style={{ width: '540px', maxWidth: '95%' }}>
            <h3>Request to Join Team: {joinModal.title}</h3>
            <p className="hint">Publisher: {joinModal.publisher} ({joinModal.dept})</p>

            <form onSubmit={handleSubmitJoinRequest}>
              <div className="field">
                <label>Select Open Role Position</label>
                <select
                  required
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {(joinModal.requiredRoles || [])
                    .filter(r => r.filledCount < r.requiredCount)
                    .map(r => (
                      <option key={r.roleName} value={r.roleName}>
                        {r.roleName} ({r.requiredCount - r.filledCount} open slot remaining)
                      </option>
                    ))}
                </select>
              </div>

              <div className="field">
                <label>Your Relevant Skills & Tech</label>
                <input
                  required
                  value={joinSkills}
                  onChange={(e) => setJoinSkills(e.target.value)}
                  placeholder="e.g. React, Node.js, Python, PostgreSQL"
                />
              </div>

              <div className="field">
                <label>Portfolio / GitHub Profile URL (Optional)</label>
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://github.com/your-username"
                />
              </div>

              <div className="field">
                <label>Application Message to Team Leader</label>
                <textarea
                  required
                  rows="3"
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Explain why you are a great fit for this role..."
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setJoinModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Join Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MANAGE JOIN REQUESTS (FOR IDEA PUBLISHER) */}
      {manageModal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setManageModal(null)}>
          <div className="modal" style={{ width: '640px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Manage Join Applications</h3>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Idea: {manageModal.title}</div>
              </div>
              <button className="icon-btn" onClick={() => setManageModal(null)}><Icon name="x" size={18} /></button>
            </div>

            {/* TEAM COMPOSITION STATUS */}
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <b style={{ color: '#fff', fontSize: '13px' }}>Accepted Team Members:</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {(manageModal.teamMembers || []).map((m, idx) => (
                  <div key={idx} style={{ fontSize: '12.5px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                    <span><b>{m.name}</b> ({m.regNo || 'Leader'})</span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{m.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <h5 style={{ margin: '14px 0 8px', color: '#fff' }}>Applicant Requests ({(manageModal.joinRequests || []).length}):</h5>
            
            {!(manageModal.joinRequests || []).length ? (
              <div style={{ padding: '20px', color: 'var(--muted)', textAlign: 'center' }}>No join requests received yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(manageModal.joinRequests || []).map((req) => (
                  <div key={req.requestId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <b style={{ color: '#fff', fontSize: '14px' }}>{req.applicantName}</b> ({req.applicantRegNo})
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          Requested Role: <b style={{ color: '#38bdf8' }}>{req.requestedRole}</b> &middot; Dept: {req.dept}
                        </div>
                      </div>
                      <span className={`badge ${req.status === 'ACCEPTED' ? 'badge-green' : req.status === 'REJECTED' ? 'badge-red' : 'badge-yellow'}`}>
                        {req.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '12.5px', color: '#e2e8f0', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px', margin: '6px 0' }}>
                      "{req.message}"
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Skills: <b style={{ color: '#fff' }}>{req.skills}</b></span>
                      {req.portfolioUrl && (
                        <a href={req.portfolioUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Portfolio</a>
                      )}
                    </div>

                    {req.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button className="btn btn-danger-outline btn-sm" onClick={() => handleRespondRequest(manageModal.id, req.requestId, 'REJECT')}>
                          Decline Request
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleRespondRequest(manageModal.id, req.requestId, 'ACCEPT')}>
                          <Icon name="check" size={13} /> Accept & Add to Team
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button className="btn btn-outline" onClick={() => setManageModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
