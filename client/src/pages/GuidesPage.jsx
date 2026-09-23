import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Icon from '../components/common/Icons';
import { EmptyState } from '../components/common/Toast';

export default function GuidesPage() {
  const { showToast } = useApp();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspectGuide, setInspectGuide] = useState(null);

  useEffect(() => {
    fetchGuideRequests();
  }, []);

  const fetchGuideRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/guides');
      if (res.data.success) {
        setRequests(res.data.requests);
      }
    } catch (err) {
      console.error('Fetch guide requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuideAction = async (id, accept) => {
    try {
      const res = await api.post('/guides/action', { id, accept });
      if (res.data.success) {
        showToast(res.data.message);
        setInspectGuide(null);
        setRequests(prev => prev.filter(r => r.id !== id && r.projectId !== id));
        fetchGuideRequests();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Faculty Guide Mentorship Requests</h1>
          <p>Inspect student project proposals and accept or decline mentorship requests.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        {loading ? (
          <div style={{ color: 'var(--muted)', padding: '30px' }}>Loading guide requests...</div>
        ) : requests.length ? (
          <table>
            <thead>
              <tr>
                <th>Student Team Leader</th>
                <th>Reg No</th>
                <th>Project Title</th>
                <th>Domain Category</th>
                <th>Requested Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((g) => (
                <tr key={g.id}>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{g.student}</td>
                  <td><span className="badge badge-gray">{g.authorRegNo || '2026CS101'}</span></td>
                  <td style={{ color: 'var(--muted)' }}>{g.project}</td>
                  <td><span className="badge badge-blue">{g.category}</span></td>
                  <td style={{ color: 'var(--muted)' }}>{g.requested}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setInspectGuide(g)}>
                      <Icon name="eye" size={14} /> Inspect Specs
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleGuideAction(g.id, true)}>
                      <Icon name="check" size={14} /> Accept as Faculty Guide
                    </button>
                    <button className="btn btn-danger-outline btn-sm" onClick={() => handleGuideAction(g.id, false)}>
                      <Icon name="x" size={14} /> Decline Request
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState msg="No pending faculty guide mentorship requests assigned to you." ic="chat" />
        )}
      </div>

      {/* INSPECTION MODAL BEFORE ACCEPTING/DECLINING GUIDE REQUEST */}
      {inspectGuide && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setInspectGuide(null)}>
          <div className="modal" style={{ width: '680px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '19px', color: '#fff' }}>{inspectGuide.project}</h3>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  Leader: <b style={{ color: '#fff' }}>{inspectGuide.student}</b> ({inspectGuide.authorRegNo || '2026CS101'}) &middot; Category: <span style={{ color: '#38bdf8' }}>{inspectGuide.category}</span> &middot; Type: <b>{inspectGuide.type || 'Internal'}</b>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setInspectGuide(null)}><Icon name="x" size={18} /></button>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: '13px', lineHeight: 1.6, color: '#e2e8f0' }}>
              <b style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Project Abstract & Objectives:</b>
              {inspectGuide.abstract || 'The student team has requested your academic faculty mentorship and guide supervision for this development project.'}
            </div>

            {inspectGuide.tech && inspectGuide.tech.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <b style={{ color: '#fff', fontSize: '13px' }}>Tech Stack:</b>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {inspectGuide.tech.map((t, idx) => (
                    <span key={idx} className="badge badge-gray">{t}</span>
                  ))}
                </div>
              </div>
            )}

            <h5 style={{ margin: '14px 0 8px', color: '#fff', fontSize: '14px' }}>Project Team Members ({(inspectGuide.teamMembers || []).length}):</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
              {(inspectGuide.teamMembers || []).map((m, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b style={{ color: '#fff' }}>{m.name}</b> <span style={{ color: '#38bdf8' }}>[{m.role}]</span>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Reg No: {m.regNo || 'N/A'} &middot; Dept: {m.dept || 'CS'}</div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{m.email}</span>
                </div>
              ))}
            </div>

            <h5 style={{ margin: '14px 0 8px', color: '#fff', fontSize: '14px' }}>Project Artifacts & Deliverable Links:</h5>
            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginBottom: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
              <div>
                <span style={{ color: 'var(--muted)' }}>GitHub Repository: </span>
                {inspectGuide.github ? <a href={inspectGuide.github} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Link</a> : <span style={{ color: '#94a3b8', italic: 'true' }}>Not provided</span>}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Documentation SRS: </span>
                {inspectGuide.doc ? <a href={inspectGuide.doc} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Link</a> : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Presentation PPT: </span>
                {inspectGuide.ppt ? <a href={inspectGuide.ppt} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Link</a> : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Demo Video: </span>
                {inspectGuide.demo ? <a href={inspectGuide.demo} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Link</a> : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Vercel/Live Deployment: </span>
                {inspectGuide.vercel ? <a href={inspectGuide.vercel} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Link</a> : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Uploaded Source Files: </span>
                {inspectGuide.files && inspectGuide.files.length > 0 ? (
                  <span>{inspectGuide.files.length} file(s) uploaded</span>
                ) : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
            </div>

            {(inspectGuide.milestones || []).length > 0 && (
              <>
                <h5 style={{ margin: '14px 0 8px', color: '#fff', fontSize: '14px' }}>Initial Milestones Roadmap:</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                  {inspectGuide.milestones.map((m) => (
                    <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <b style={{ color: '#fff' }}>{m.title}</b>
                        <div style={{ color: 'var(--muted)', fontSize: '11.5px' }}>Deadline: {m.deadline}</div>
                      </div>
                      <span className={`badge ${m.status === 'COMPLETED' ? 'badge-green' : m.status === 'IN_PROGRESS' ? 'badge-blue' : m.status === 'OVERDUE' ? 'badge-red' : 'badge-gray'}`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="modal-actions" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <button className="btn btn-outline" onClick={() => setInspectGuide(null)}>Close</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-danger-outline" onClick={() => handleGuideAction(inspectGuide.id, false)}>
                  <Icon name="x" size={14} /> Decline Mentorship
                </button>
                <button className="btn btn-primary" onClick={() => handleGuideAction(inspectGuide.id, true)}>
                  <Icon name="check" size={14} /> Accept as Faculty Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
