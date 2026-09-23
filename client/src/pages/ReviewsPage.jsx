import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Icon from '../components/common/Icons';
import { BadgeType } from '../components/common/Badge';
import { EmptyState } from '../components/common/Toast';

export default function ReviewsPage() {
  const { showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'submissions';

  const [tab, setTab] = useState(initialTab);
  const [reviews, setReviews] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Feedback
  const [inspectItem, setInspectItem] = useState(null);
  const [inspectReport, setInspectReport] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [reportRemark, setReportRemark] = useState('');

  useEffect(() => {
    if (queryParams.get('tab')) {
      setTab(queryParams.get('tab'));
    }
  }, [location.search]);

  useEffect(() => {
    fetchReviewsData();
  }, []);

  const fetchReviewsData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reviews');
      if (res.data.success) {
        setReviews(res.data.reviews || []);
        setReports(res.data.reports || []);
      }
    } catch (err) {
      console.error('Fetch reviews error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (id, approve) => {
    if (!feedback || !feedback.trim()) {
      showToast('Faculty review comment is required before taking action.');
      return;
    }
    try {
      const res = await api.post('/reviews/action', { id, approve, feedback });
      if (res.data.success) {
        showToast(res.data.message);
        setInspectItem(null);
        setFeedback('');
        fetchReviewsData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed');
    }
  };

  const handleResolveReport = async (reportId, action) => {
    if (!reportRemark.trim()) {
      showToast('Written remark/reason is required before making a decision on this report.');
      return;
    }

    try {
      const res = await api.post('/admin/reports/resolve', { reportId, action, remark: reportRemark });
      if (res.data.success) {
        showToast(res.data.message);
        setInspectReport(null);
        setReportRemark('');
        fetchReviewsData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Report resolution failed');
    }
  };

  const pendingReportsCount = reports.filter(r => r.status === 'Pending').length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Faculty Evaluation & Weekly Reports Review</h1>
          <p>Inspect student weekly progress reports, milestone updates, and assigned violation reports.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '22px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="sub-tabs" style={{ marginBottom: '20px' }}>
          <div className={`sub-tab ${tab === 'submissions' ? 'active' : ''}`} onClick={() => setTab('submissions')}>
            Weekly Reports & Submissions ({reviews.length})
          </div>
          <div className={`sub-tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
            🛡️ Content Violation Reports {pendingReportsCount > 0 && `(${pendingReportsCount})`}
          </div>
        </div>

        {/* TAB: PROJECT SUBMISSIONS / WEEKLY REPORTS */}
        {tab === 'submissions' && (
          <div>
            {loading ? (
              <div style={{ color: 'var(--muted)', padding: '30px' }}>Loading review queue...</div>
            ) : reviews.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Project / Submission Title</th>
                    <th>Student Author</th>
                    <th>Type</th>
                    <th>Domain Category</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>
                        {r.isEnhancement ? `Enhancement: ${r.enhancementTitle}` : r.title}
                      </td>
                      <td>{r.author}</td>
                      <td><BadgeType type={r.type} /></td>
                      <td style={{ color: 'var(--muted)' }}>{r.category}</td>
                      <td style={{ color: 'var(--muted)' }}>{r.submitted}</td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate('/projects')}>
                          <Icon name="eye" size={14} /> Open Project Workspace
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setInspectItem(r)}>
                          <Icon name="check" size={14} /> Review & Approve Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState msg="All caught up — no pending weekly reports assigned to you." ic="check" />
            )}
          </div>
        )}

        {/* TAB: CONTENT VIOLATION REPORTS */}
        {tab === 'reports' && (
          <div>
            {loading ? (
              <div style={{ color: 'var(--muted)', padding: '30px' }}>Loading assigned reports...</div>
            ) : reports.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Project Title</th>
                    <th>Reporter</th>
                    <th>Violation Category</th>
                    <th>Reason / Details</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => (
                    <tr key={rep.id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{rep.projectTitle}</td>
                      <td>{rep.reporter}</td>
                      <td><span className="badge badge-gray">{rep.category}</span></td>
                      <td style={{ color: '#cbd5e1', maxWidth: '280px', fontSize: '12.5px' }}>{rep.reason}</td>
                      <td>
                        <span className={`badge ${rep.status === 'Pending' ? 'badge-yellow' : 'badge-gray'}`}>
                          {rep.status}
                        </span>
                      </td>
                      <td>
                        {rep.status === 'Pending' ? (
                          <button className="btn btn-outline btn-sm" onClick={() => setInspectReport(rep)}>
                            <Icon name="bell" size={14} /> Investigate Report
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState msg="No content violation reports assigned to your domain." ic="check" />
            )}
          </div>
        )}
      </div>

      {/* INSPECTION MODAL: SUBMISSIONS */}
      {inspectItem && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setInspectItem(null)}>
          <div className="modal" style={{ width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div style={{ marginBottom: '6px' }}>
                  <BadgeType type={inspectItem.type} />
                </div>
                <h3 style={{ margin: 0, fontSize: '20px' }}>
                  {inspectItem.isEnhancement ? `Enhancement: ${inspectItem.enhancementTitle}` : inspectItem.title}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  Submitted by <b>{inspectItem.author}</b> &middot; Domain: {inspectItem.category} &middot; {inspectItem.submitted}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setInspectItem(null)}><Icon name="x" size={20} /></button>
            </div>

            <div style={{ fontSize: '13.5px', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '18px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <b style={{ color: '#fff' }}>Project Abstract & Specification:</b><br />
              {inspectItem.abstract || inspectItem.details || inspectItem.description || 'Full project specification submitted for faculty evaluation.'}
            </div>

            {inspectItem.tech && inspectItem.tech.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <b style={{ color: '#fff', fontSize: '13px' }}>Technologies Used:</b>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {inspectItem.tech.map((t, idx) => (
                    <span key={idx} className="badge badge-gray">{t}</span>
                  ))}
                </div>
              </div>
            )}

            <h5 style={{ margin: '14px 0 8px', color: '#fff', fontSize: '13.5px' }}>Project Deliverable Artifacts & Links:</h5>
            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginBottom: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
              <div>
                <span style={{ color: 'var(--muted)' }}>GitHub Repository: </span>
                {inspectItem.github ? <a href={inspectItem.github} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Link</a> : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Documentation SRS: </span>
                {inspectItem.doc ? <a href={inspectItem.doc} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Link</a> : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Presentation PPT: </span>
                {inspectItem.ppt ? <a href={inspectItem.ppt} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Link</a> : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Demo Video: </span>
                {inspectItem.demo ? <a href={inspectItem.demo} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Link</a> : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Vercel/Live Deployment: </span>
                {inspectItem.vercel ? <a href={inspectItem.vercel} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Link</a> : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Uploaded Files: </span>
                {inspectItem.files && inspectItem.files.length > 0 ? (
                  <span>{inspectItem.files.length} file(s) attached</span>
                ) : <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </div>
            </div>

            <div className="field" style={{ marginBottom: '18px' }}>
              <label style={{ fontWeight: 600, color: '#fff' }}>Faculty Review Comment / Feedback *</label>
              <textarea
                rows="2"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter mandatory review feedback or requirements for student team..."
                required
              ></textarea>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setInspectItem(null)}>Cancel</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-danger-outline" onClick={() => handleReviewAction(inspectItem.id, false)}>
                  <Icon name="x" size={14} /> Request Changes
                </button>
                <button className="btn btn-primary" onClick={() => handleReviewAction(inspectItem.id, true)}>
                  <Icon name="check" size={14} /> Approve Submission Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL: CONTENT REPORT RESOLUTION */}
      {inspectReport && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setInspectReport(null)}>
          <div className="modal" style={{ width: '560px', maxWidth: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="notif-icon" style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185' }}>
                  <Icon name="bell" size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Investigate Content Report</h3>
              </div>
              <button className="icon-btn" onClick={() => setInspectReport(null)}><Icon name="x" size={18} /></button>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '14.5px', marginBottom: '4px' }}>
                Project: {inspectReport.projectTitle}
              </div>
              <div style={{ color: 'var(--muted)', marginBottom: '8px' }}>
                Reported by <b>{inspectReport.reporter}</b> &middot; Violation Category: <span style={{ color: '#fb7185' }}>{inspectReport.category}</span>
              </div>
              <div style={{ color: '#e2e8f0', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
                <b>Reporter Explanation:</b> "{inspectReport.reason}"
              </div>
            </div>

            <div className="field" style={{ marginBottom: '18px' }}>
              <label style={{ fontWeight: 600, color: '#fbbf24' }}>
                Faculty Investigation Remark (Required prior to decision):
              </label>
              <textarea
                required
                rows="3"
                value={reportRemark}
                onChange={(e) => setReportRemark(e.target.value)}
                placeholder="Enter investigation remark..."
              ></textarea>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setInspectReport(null)}>Cancel</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" style={{ color: '#fb7185' }} onClick={() => handleResolveReport(inspectReport.id, 'reject')}>
                  Dismiss Report
                </button>
                <button className="btn btn-danger-outline" onClick={() => handleResolveReport(inspectReport.id, 'deleteProject')}>
                  Approve Report & Delete Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
