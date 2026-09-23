import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Icon from '../components/common/Icons';
import { BadgeType, BadgeStatus } from '../components/common/Badge';
import { EmptyState } from '../components/common/Toast';

export default function ProjectsPage() {
  const { currentUser } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialAction = queryParams.get('action');

  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modals & Active State
  const [modal, setModal] = useState(initialAction === 'register' ? 'register' : null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailTab, setDetailTab] = useState('overview'); // 'overview' | 'team' | 'milestones' | 'weekly' | 'artifacts' | 'feedback'

  // Multi-step Registration Wizard State
  const [regStep, setRegStep] = useState(1); // 1: Details, 2: Team, 3: Faculty Guide, 4: Milestones
  const [regType, setRegType] = useState('Internal');
  const [regTitle, setRegTitle] = useState('');
  const [regCategory, setRegCategory] = useState('Machine Learning');
  const [regTech, setRegTech] = useState('');
  const [regAbstract, setRegAbstract] = useState('');
  const [regGithub, setRegGithub] = useState('');
  const [regDoc, setRegDoc] = useState('');
  const [regPpt, setRegPpt] = useState('');
  const [regDemo, setRegDemo] = useState('');
  const [regVercel, setRegVercel] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Step 2: Team Members
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([
    { name: currentUser?.name || 'Kavitha Sundaram', regNo: currentUser?.regNo || '2026CS101', role: 'Team Leader', dept: currentUser?.dept || 'Computer Science', email: currentUser?.email || 'kavitha@university.edu' }
  ]);
  const [selectedRole, setSelectedRole] = useState('Frontend Developer');

  // Step 3: Faculty Guide
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFacultyGuide, setSelectedFacultyGuide] = useState('Dr. Arumugam Pillai');

  // Step 4: Milestones
  const [regMilestones, setRegMilestones] = useState([
    { id: 1, title: 'Requirement Analysis & System Architecture', description: 'Define database schema and endpoint specs.', startDate: '2026-09-01', deadline: '2026-09-07', assignedMembers: [currentUser?.name || 'Kavitha Sundaram'], progress: 0, status: 'PENDING' },
    { id: 2, title: 'Core Backend Development', description: 'Build REST APIs and authentication microservices.', startDate: '2026-09-08', deadline: '2026-09-14', assignedMembers: [currentUser?.name || 'Kavitha Sundaram'], progress: 0, status: 'PENDING' }
  ]);
  const [newMileTitle, setNewMileTitle] = useState('');
  const [newMileDeadline, setNewMileDeadline] = useState('');

  // Weekly Progress Report Form State
  const [weeklyPlanned, setWeeklyPlanned] = useState('');
  const [weeklyCompleted, setWeeklyCompleted] = useState('');
  const [weeklyCurrent, setWeeklyCurrent] = useState('');
  const [weeklyPending, setWeeklyPending] = useState('');
  const [weeklyBlockers, setWeeklyBlockers] = useState('');
  const [weeklyPlanNext, setWeeklyPlanNext] = useState('');
  const [weeklyOverallProg, setWeeklyOverallProg] = useState(60);
  const [weeklyGithubLink, setWeeklyGithubLink] = useState('');
  const [weeklyNotes, setWeeklyNotes] = useState('');
  const [weeklyMemberContribs, setWeeklyMemberContribs] = useState([]);
  const [weeklyLateReason, setWeeklyLateReason] = useState('');

  // Faculty Review Feedback State
  const [facultyFeedbackText, setFacultyFeedbackText] = useState('');

  const predefinedDomainList = [
    'Machine Learning',
    'Web Development',
    'Mobile Development',
    'Blockchain',
    'Internet of Things',
    'Cybersecurity',
    'Cloud Computing'
  ];

  const roleOptions = [
    'Team Leader',
    'Frontend Developer',
    'Backend Developer',
    'ML Engineer',
    'Database Engineer',
    'UI/UX Designer',
    'Testing Engineer',
    'Documentation Specialist'
  ];

  useEffect(() => {
    fetchProjects();
  }, [filter, domainFilter, search]);

  useEffect(() => {
    const fromIdeaId = queryParams.get('fromIdea');
    if (fromIdeaId) {
      setModal('register');
      api.get('/ideas').then(res => {
        if (res.data.success) {
          const idea = (res.data.ideas || []).find(i => i.id === parseInt(fromIdeaId));
          if (idea) {
            setRegTitle(idea.title);
            setRegCategory(idea.category || 'Machine Learning');
            setRegTech(Array.isArray(idea.tech) ? idea.tech.join(', ') : idea.tech || '');
            setRegAbstract(idea.description);
            if (idea.teamMembers && idea.teamMembers.length > 0) {
              setSelectedTeamMembers(idea.teamMembers);
            }
          }
        }
      }).catch(err => console.error('Error prefilling from idea:', err));
    }

    const projId = queryParams.get('id');
    const tabParam = queryParams.get('tab');
    const weekParam = queryParams.get('week');
    if (projId) {
      api.get(`/projects/${projId}`).then(res => {
        if (res.data.success) {
          const p = res.data.project;
          if (weekParam && p) {
            p.currentWeekNumber = parseInt(weekParam);
          }
          setSelectedProject(p);
          initWeeklyFormState(p);
          if (tabParam) setDetailTab(tabParam);
          setModal('detail');
        }
      }).catch(err => console.error('Error fetching project by id:', err));
    }
  }, [location.search]);

  useEffect(() => {
    if (regStep === 2) {
      searchStudents('');
    } else if (regStep === 3) {
      searchFaculty();
    }
  }, [regStep]);

  const [appDateStr, setAppDateStr] = useState('');

  const fetchProjects = async () => {
    try {
      if (!projects.length) setLoading(true);
      const res = await api.get('/projects', { params: { filter, domain: domainFilter, search } });
      if (res.data.success) {
        setProjects(res.data.projects);
        if (res.data.appDateFormatted) setAppDateStr(res.data.appDateFormatted);
      }
    } catch (err) {
      console.error('Fetch projects error:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchStudents = async (q) => {
    try {
      const res = await api.get('/lifecycle/students/search', { params: { query: q } });
      if (res.data.success) {
        setStudentSearchResults(res.data.students);
      }
    } catch (err) {}
  };

  const searchFaculty = async () => {
    try {
      const res = await api.get('/lifecycle/faculty/search', { params: { domain: regCategory } });
      if (res.data.success) {
        setFacultyList(res.data.faculty);
      }
    } catch (err) {}
  };

  const handleAddTeamMember = (student) => {
    const exists = selectedTeamMembers.some(m => m.email.toLowerCase() === student.email.toLowerCase());
    if (exists) {
      showToast(`${student.name} is already added to team.`);
      return;
    }
    const newMember = { ...student, role: selectedRole };
    setSelectedTeamMembers([...selectedTeamMembers, newMember]);
    showToast(`Added ${student.name} as ${selectedRole}`);
  };

  const handleRemoveTeamMember = (email) => {
    if (selectedTeamMembers.length <= 1) {
      showToast('Project must have at least 1 team member.');
      return;
    }
    setSelectedTeamMembers(selectedTeamMembers.filter(m => m.email.toLowerCase() !== email.toLowerCase()));
  };

  const handleAddInitialMilestone = (e) => {
    e.preventDefault();
    if (!newMileTitle.trim()) return;
    const newM = {
      id: Date.now(),
      title: newMileTitle,
      description: 'Planned project milestone.',
      startDate: new Date().toISOString().split('T')[0],
      deadline: newMileDeadline || '2026-10-01',
      assignedMembers: [currentUser?.name || 'Team Member'],
      progress: 0,
      status: 'PENDING'
    };
    setRegMilestones([...regMilestones, newM]);
    setNewMileTitle('');
    setNewMileDeadline('');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', regTitle);
      formData.append('type', regType);
      formData.append('category', regCategory);
      formData.append('tech', regTech);
      formData.append('abstract', regAbstract);
      formData.append('github', regGithub);
      formData.append('doc', regDoc);
      formData.append('ppt', regPpt);
      formData.append('demo', regDemo);
      formData.append('vercel', regVercel);
      formData.append('selectedFacultyGuide', selectedFacultyGuide);
      formData.append('teamMembers', JSON.stringify(selectedTeamMembers));
      formData.append('initialMilestones', JSON.stringify(regMilestones));

      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }

      const res = await api.post('/projects', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        showToast(res.data.message);
        setModal(null);
        resetRegForm();
        fetchProjects();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Project registration failed');
    }
  };

  const resetRegForm = () => {
    setRegStep(1);
    setRegTitle(''); setRegCategory('Machine Learning'); setRegTech(''); setRegAbstract('');
    setRegGithub(''); setRegDoc(''); setRegPpt(''); setRegDemo(''); setRegVercel(''); setSelectedFiles([]);
  };

  const handleOpenDetailModal = async (p) => {
    try {
      const res = await api.get(`/projects/${p.id}`);
      if (res.data.success) {
        setSelectedProject(res.data.project);
        initWeeklyFormState(res.data.project);
      }
    } catch (err) {
      setSelectedProject(p);
      initWeeklyFormState(p);
    }
    setDetailTab('overview');
    setModal('detail');
  };

  const initWeeklyFormState = (proj) => {
    const currentWeek = proj.currentWeekNumber || 1;
    const existingRep = (proj.weeklyReports || []).find(w => w.weekNumber === currentWeek);
    setWeeklyLateReason(existingRep?.lateReason || '');
    if (existingRep) {
      setWeeklyPlanned(existingRep.plannedWork || '');
      setWeeklyCompleted(existingRep.completedWork || '');
      setWeeklyCurrent(existingRep.currentWork || '');
      setWeeklyPending(existingRep.pendingWork || '');
      setWeeklyBlockers(existingRep.blockers || '');
      setWeeklyPlanNext(existingRep.planNextWeek || '');
      setWeeklyOverallProg(existingRep.overallProgress || 60);
      setWeeklyGithubLink(existingRep.evidence?.githubLink || proj.github || '');
      setWeeklyNotes(existingRep.evidence?.notes || '');
      setWeeklyMemberContribs(existingRep.memberContributions || []);
    } else {
      setWeeklyPlanned('Complete ML recommendation engine & mobile maps views.');
      setWeeklyCompleted('Trained baseline PyTorch model.');
      setWeeklyCurrent('Integrating Python FastAPI backend with React mobile app.');
      setWeeklyPending('Testing API latency.');
      setWeeklyBlockers('None');
      setWeeklyPlanNext('Conduct end-to-end integration tests.');
      setWeeklyOverallProg(60);
      setWeeklyGithubLink(proj.github || '');
      setWeeklyNotes('Latest commit pushed to main');
      setWeeklyMemberContribs((proj.teamMembers || []).map(m => ({ studentName: m.name, role: m.role, workCompleted: 'Contributed to module integration', progress: 60 })));
    }
  };

  const handleUpdateMilestoneProgress = async (mId, newProg) => {
    try {
      const res = await api.put('/lifecycle/milestones/status', {
        milestoneId: mId,
        progress: newProg,
        status: newProg === 100 ? 'COMPLETED' : 'IN_PROGRESS'
      });
      if (res.data.success) {
        showToast(res.data.message);
        if (selectedProject) {
          setSelectedProject(prev => ({
            ...prev,
            milestones: prev.milestones.map(m => m.id === mId ? { ...m, progress: newProg, status: newProg === 100 ? 'COMPLETED' : 'IN_PROGRESS' } : m)
          }));
        }
        fetchProjects();
      }
    } catch (err) {
      showToast('Failed to update milestone');
    }
  };

  const handleSubmitWeeklyProgressReport = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      const currentWeek = selectedProject.currentWeekNumber || 1;
      const res = await api.post('/lifecycle/weekly/submit', {
        projectId: selectedProject.id,
        weekNumber: currentWeek,
        plannedWork: weeklyPlanned,
        completedWork: weeklyCompleted,
        currentWork: weeklyCurrent,
        pendingWork: weeklyPending,
        blockers: weeklyBlockers,
        planNextWeek: weeklyPlanNext,
        overallProgress: weeklyOverallProg,
        memberContributions: weeklyMemberContribs,
        githubLink: weeklyGithubLink,
        notes: weeklyNotes,
        lateReason: weeklyLateReason
      });

      if (res.data.success) {
        showToast(res.data.message);
        setModal(null);
        fetchProjects();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Weekly report submission failed');
    }
  };

  const handleLateRespond = async (approve) => {
    if (!selectedProject) return;
    if (!facultyFeedbackText || !facultyFeedbackText.trim()) {
      showToast('Faculty review comment is required before responding to late submission requests.');
      return;
    }
    try {
      const currentWeek = selectedProject.currentWeekNumber || 1;
      const res = await api.post('/lifecycle/weekly/late-respond', {
        projectId: selectedProject.id,
        weekNumber: currentWeek,
        approve,
        comment: facultyFeedbackText
      });
      if (res.data.success) {
        showToast(res.data.message);
        setFacultyFeedbackText('');
        setModal(null);
        fetchProjects();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed');
    }
  };

  const handleFacultyReviewReport = async (approve) => {
    if (!selectedProject) return;
    if (!facultyFeedbackText || !facultyFeedbackText.trim()) {
      showToast('Faculty review comment is required before submitting review.');
      return;
    }
    try {
      const currentWeek = selectedProject.currentWeekNumber || 1;
      const res = await api.post('/lifecycle/weekly/review', {
        projectId: selectedProject.id,
        weekNumber: currentWeek,
        approve,
        feedbackText: facultyFeedbackText
      });
      if (res.data.success) {
        showToast(res.data.message);
        setSelectedProject(prev => ({
          ...prev,
          weeklyReports: prev.weeklyReports.map(w => w.weekNumber === currentWeek ? res.data.report : w)
        }));
        setFacultyFeedbackText('');
        fetchProjects();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Faculty review failed');
    }
  };

  const handleCompleteProject = async () => {
    if (!selectedProject) return;
    try {
      const res = await api.post('/lifecycle/complete', { projectId: selectedProject.id });
      if (res.data.success) {
        showToast(res.data.message);
        setSelectedProject(prev => ({ ...prev, status: 'COMPLETED' }));
        fetchProjects();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Completion failed');
    }
  };

  const tabs = [['all', 'All Projects'], ['internal', 'Internal Projects'], ['external', 'External Projects']];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Project Workspaces & Repositories</h1>
          <p>Track project registration, team members, milestone deadlines, and weekly development lifecycle.</p>
        </div>
        {(currentUser?.role === 'Student' || currentUser?.role === 'Administrator') && (
          <button className="btn btn-primary" onClick={() => { resetRegForm(); setModal('register'); }}>
            <Icon name="plus" size={16} /> Register New Project
          </button>
        )}
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="tabs">
          {tabs.map(([id, label]) => (
            <div key={id} className={`tab ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
              {label}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="field"
            style={{ width: 'auto', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', background: '#0f172a', color: '#fff', margin: 0 }}
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
          >
            <option value="all">Domain: All Domains</option>
            {predefinedDomainList.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <div className="search-wrap">
            <Icon name="search2" size={16} />
            <input
              className="search-input"
              placeholder="Search title, team member, domain, tech..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* PROJECTS GRID */}
      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '40px' }}>Loading project workspaces...</div>
      ) : projects.length ? (
        <div className="proj-grid">
          {projects.map((p) => {
            const currentWeek = p.currentWeekNumber || 1;
            const currentReport = (p.weeklyReports || []).find(w => w.weekNumber === currentWeek);
            const todayStr = appDateStr || new Date().toISOString().split('T')[0];
            const dueDate = currentReport?.dueDate || p.weeklyCycle?.dueDate;

            let statusBadge = { label: '🟢 Upcoming', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };

            if (p.status === 'COMPLETED') {
              statusBadge = { label: '✓ Completed', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
            } else if (currentReport) {
              if (currentReport.submissionStatus === 'REVIEWED') {
                if (currentReport.lateRequestStatus === 'APPROVED') {
                  statusBadge = { label: '✓ Submitted Late (+5 credits)', color: '#34d399', bg: 'rgba(52,211,153,0.15)' };
                } else {
                  statusBadge = { label: '✓ Reviewed (+10 credits)', color: '#34d399', bg: 'rgba(52,211,153,0.15)' };
                }
              } else if (currentReport.submissionStatus === 'LATE_REQUEST_PENDING') {
                statusBadge = { label: '🔴 Late Request Pending', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' };
              } else if (currentReport.submissionStatus === 'LATE_REJECTED') {
                statusBadge = { label: '🔴 Late Request Rejected', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' };
              } else if (currentReport.submissionStatus === 'SUBMITTED') {
                statusBadge = { label: '✓ Submitted', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' };
              } else if (currentReport.submissionStatus === 'CHANGES_REQUESTED') {
                statusBadge = { label: '⚠️ Changes Requested', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
              } else if (currentReport.submissionStatus === 'OVERDUE' || (dueDate && todayStr > dueDate)) {
                statusBadge = { label: '🔴 Overdue', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' };
              } else if (dueDate && todayStr === dueDate) {
                statusBadge = { label: '⏳ Due Today', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
              }
            } else if (dueDate) {
              if (todayStr > dueDate) {
                statusBadge = { label: '🔴 Overdue', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' };
              } else if (todayStr === dueDate) {
                statusBadge = { label: '⏳ Due Today', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
              }
            }

            const isUserInTeam = currentUser?.role === 'Student' && (
              p.authorId === currentUser?.id ||
              (p.teamMembers || []).some(m => m.email?.toLowerCase() === currentUser?.email?.toLowerCase() || m.regNo === currentUser?.regNo)
            );
            const needsSubmission = !currentReport || currentReport.submissionStatus === 'PENDING' || currentReport.submissionStatus === 'OVERDUE' || currentReport.submissionStatus === 'CHANGES_REQUESTED';

            return (
              <div
                key={p.id}
                className="card proj-card"
                onClick={() => handleOpenDetailModal(p)}
                style={{ position: 'relative' }}
              >
                <div className="proj-top">
                  <div className="proj-badges">
                    <BadgeType type={p.type} />
                    <span className={`badge ${p.status === 'IN_PROGRESS' ? 'badge-green' : p.status === 'COMPLETED' ? 'badge-blue' : 'badge-yellow'}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="proj-cat">{p.category}</div>
                </div>

                <div className="proj-title" style={{ marginTop: '6px' }}>{p.title}</div>
                <div className="proj-by">
                  Faculty Guide: <b>{p.facultyGuide?.name || 'Unassigned'}</b>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '4px' }}>
                    <span>Milestone Progress</span>
                    <b style={{ color: '#fff' }}>{p.overallProgress || 50}%</b>
                  </div>
                  <div className="progress-track" style={{ height: '6px' }}>
                    <div className="progress-fill" style={{ width: `${p.overallProgress || 50}%` }}></div>
                  </div>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--muted)' }}>Week {currentWeek} Status:</span>
                  <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, color: statusBadge.color, background: statusBadge.bg }}>
                    {statusBadge.label}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {(p.teamMembers || []).map((m, idx) => (
                    <span key={idx} className="badge badge-gray" style={{ fontSize: '10px' }}>{m.name} ({m.role})</span>
                  ))}
                </div>

                {isUserInTeam && p.status !== 'COMPLETED' && needsSubmission && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '12px', width: '100%', justifyContent: 'center', fontSize: '12px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetailModal(p);
                      setDetailTab('weekly');
                    }}
                  >
                    📝 Submit Week {currentWeek} Report
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState msg="No project workspaces found." ic="search2" />
      )}

      {/* MULTI-STEP PROJECT REGISTRATION WIZARD MODAL */}
      {modal === 'register' && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ width: '640px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '19px' }}>Project Registration & Setup</h3>
                <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>
                  Step {regStep} of 4 &middot; Register your academic project at the beginning of development.
                </div>
              </div>
              <button className="icon-btn" onClick={() => setModal(null)}><Icon name="x" size={18} /></button>
            </div>

            {/* STEP PROGRESS BAR */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['1. Details & Artifacts', '2. Team Members', '3. Select Faculty Guide', '4. Milestone Plan'].map((stepLabel, idx) => (
                <div key={idx} style={{
                  flex: 1, padding: '8px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 600, textAlign: 'center',
                  background: regStep === (idx + 1) ? 'var(--accent-grad)' : regStep > (idx + 1) ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                  color: regStep >= (idx + 1) ? '#fff' : 'var(--muted-2)'
                }}>
                  {stepLabel}
                </div>
              ))}
            </div>

            {/* STEP 1: PROJECT DETAILS & ARTIFACTS */}
            {regStep === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setRegStep(2); }}>
                <div className="tabs" style={{ marginBottom: '16px' }}>
                  <div className={`tab ${regType === 'Internal' ? 'active' : ''}`} onClick={() => setRegType('Internal')}>Internal Academic Project</div>
                  <div className={`tab ${regType === 'External' ? 'active' : ''}`} onClick={() => setRegType('External')}>External Research Project</div>
                </div>

                <div className="field"><label>Project Title</label><input required value={regTitle} onChange={(e) => setRegTitle(e.target.value)} placeholder="e.g. Smart Campus Assistant" /></div>
                <div className="field">
                  <label>Domain Category</label>
                  <select
                    style={{ width: '100%', background: '#0f172a', color: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                  >
                    {predefinedDomainList.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="field"><label>Technologies (comma separated)</label><input required value={regTech} onChange={(e) => setRegTech(e.target.value)} placeholder="e.g. React Native, Node.js, Python" /></div>
                <div className="field"><label>Project Abstract & Objectives</label><textarea required rows="3" value={regAbstract} onChange={(e) => setRegAbstract(e.target.value)} placeholder="Describe problem statement and development goals..."></textarea></div>

                <h4 style={{ margin: '16px 0 8px', fontSize: '14px', color: '#fff' }}>Verified Links & Project Artifacts</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="field"><label>GitHub Repo</label><input value={regGithub} onChange={(e) => setRegGithub(e.target.value)} placeholder="https://github.com/..." /></div>
                  <div className="field"><label>Doc Link</label><input value={regDoc} onChange={(e) => setRegDoc(e.target.value)} placeholder="https://docs.google.com/..." /></div>
                  <div className="field"><label>PPT Link</label><input value={regPpt} onChange={(e) => setRegPpt(e.target.value)} placeholder="https://docs.google.com/..." /></div>
                  <div className="field"><label>Demo Video</label><input value={regDemo} onChange={(e) => setRegDemo(e.target.value)} placeholder="https://youtube.com/..." /></div>
                </div>

                <div className="modal-actions" style={{ marginTop: '20px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Next: Team Members <Icon name="arrow" size={15} /></button>
                </div>
              </form>
            )}

            {/* STEP 2: TEAM MEMBERS SEARCH & SELECTION */}
            {regStep === 2 && (
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '15px', color: '#fff' }}>Search & Add Team Members from Student Database</h4>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                  <input
                    className="search-input"
                    style={{ flex: 1, paddingLeft: '12px' }}
                    placeholder="Search student by name or register number (e.g. 2026CS102)..."
                    value={studentSearchQuery}
                    onChange={(e) => { setStudentSearchQuery(e.target.value); searchStudents(e.target.value); }}
                  />
                  <select
                    style={{ background: '#0f172a', color: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* SEARCH RESULTS DROPDOWN / LIST */}
                <div style={{ maxHeight: '140px', overflowY: 'auto', background: 'rgba(15,23,42,0.8)', borderRadius: '8px', border: '1px solid var(--border)', padding: '8px', marginBottom: '16px' }}>
                  {studentSearchResults.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <b style={{ color: '#fff', fontSize: '13px' }}>{s.name}</b> <span style={{ color: '#38bdf8', fontSize: '12px' }}>({s.regNo})</span>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.dept} &middot; {s.email}</div>
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ padding: '3px 8px', fontSize: '11.5px' }} onClick={() => handleAddTeamMember(s)}>
                        + Add Member
                      </button>
                    </div>
                  ))}
                </div>

                {/* SELECTED TEAM LIST */}
                <h5 style={{ margin: '12px 0 6px', color: '#fff' }}>Selected Project Team ({selectedTeamMembers.length}):</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  {selectedTeamMembers.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div>
                        <b style={{ color: '#fff', fontSize: '13.5px' }}>{m.name}</b> <span style={{ color: '#34d399', fontSize: '12px' }}>[{m.role}]</span>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Reg No: {m.regNo} &middot; {m.dept}</div>
                      </div>
                      {idx > 0 && (
                        <button className="btn btn-danger-outline btn-sm" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => handleRemoveTeamMember(m.email)}>
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setRegStep(1)}>Back</button>
                  <button type="button" className="btn btn-primary" onClick={() => setRegStep(3)}>Next: Faculty Guide <Icon name="arrow" size={15} /></button>
                </div>
              </div>
            )}

            {/* STEP 3: FACULTY GUIDE SELECTION */}
            {regStep === 3 && (
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#fff' }}>Choose Your Faculty Guide</h4>
                <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '0 0 14px' }}>
                  Select an available faculty guide in your domain. A mentorship request will be sent to the chosen faculty member upon registration.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', marginBottom: '20px' }}>
                  {facultyList.map(f => {
                    const isSelected = selectedFacultyGuide === f.name;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFacultyGuide(f.name)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px',
                          border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <b style={{ color: '#fff', fontSize: '14.5px' }}>{f.name}</b>
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                            {f.dept} &middot; Expertise: <span style={{ color: '#38bdf8' }}>{(f.specializations || []).join(', ')}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted-2)', marginTop: '2px' }}>
                            Current Mentoring: <b>{f.currentProjectsCount} projects</b>
                          </div>
                        </div>
                        <span className={`badge ${f.availabilityStatus === 'Available' ? 'badge-green' : 'badge-yellow'}`}>
                          {f.availabilityStatus}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setRegStep(2)}>Back</button>
                  <button type="button" className="btn btn-primary" onClick={() => setRegStep(4)}>Next: Milestones Plan <Icon name="arrow" size={15} /></button>
                </div>
              </div>
            )}

            {/* STEP 4: INITIAL MILESTONE PLANNING */}
            {regStep === 4 && (
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#fff' }}>Define Project Milestones & Schedule</h4>
                <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '0 0 14px' }}>
                  Set initial milestone targets and deadlines for your team.
                </p>

                <form onSubmit={handleAddInitialMilestone} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <input
                    required
                    style={{ flex: 2, background: '#0f172a', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
                    placeholder="New milestone title (e.g. Backend API Development)..."
                    value={newMileTitle}
                    onChange={(e) => setNewMileTitle(e.target.value)}
                  />
                  <input
                    type="date"
                    style={{ flex: 1, background: '#0f172a', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px' }}
                    value={newMileDeadline}
                    onChange={(e) => setNewMileDeadline(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">+ Add Milestone</button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {regMilestones.map((m, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <b style={{ color: '#fff', fontSize: '13.5px' }}>{idx + 1}. {m.title}</b>
                        <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Deadline: {m.deadline}</div>
                      </div>
                      <button className="btn btn-danger-outline btn-sm" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => setRegMilestones(regMilestones.filter(item => item.id !== m.id))}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setRegStep(3)}>Back</button>
                  <button type="button" className="btn btn-primary" onClick={handleRegisterSubmit}>
                    <Icon name="check" size={15} /> Complete Registration & Send Faculty Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAILED PROJECT LIFECYCLE WORKSPACE MODAL */}
      {modal === 'detail' && selectedProject && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ width: '750px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                  <BadgeType type={selectedProject.type} />
                  <span className={`badge ${selectedProject.status === 'IN_PROGRESS' ? 'badge-green' : selectedProject.status === 'COMPLETED' ? 'badge-blue' : 'badge-yellow'}`}>
                    STATUS: {selectedProject.status}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#fff' }}>{selectedProject.title}</h2>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  Leader: <b>{selectedProject.author}</b> ({selectedProject.authorRegNo || '2026CS101'}) &middot; Faculty Guide: <b style={{ color: '#fff' }}>{selectedProject.facultyGuide?.name || 'Unassigned'}</b>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setModal(null)}><Icon name="x" size={20} /></button>
            </div>

            {/* LIFECYCLE TABS */}
            <div className="sub-tabs" style={{ marginBottom: '18px', flexWrap: 'wrap', gap: '6px' }}>
              <div className={`sub-tab ${detailTab === 'overview' ? 'active' : ''}`} onClick={() => setDetailTab('overview')}>Overview & Health</div>
              <div className={`sub-tab ${detailTab === 'team' ? 'active' : ''}`} onClick={() => setDetailTab('team')}>Team ({selectedProject.teamMembers?.length || 1})</div>
              <div className={`sub-tab ${detailTab === 'milestones' ? 'active' : ''}`} onClick={() => setDetailTab('milestones')}>Milestones ({selectedProject.milestones?.length || 0})</div>
              <div className={`sub-tab ${detailTab === 'weekly' ? 'active' : ''}`} onClick={() => setDetailTab('weekly')}>Weekly Progress (Week {selectedProject.currentWeekNumber || 4})</div>
              <div className={`sub-tab ${detailTab === 'artifacts' ? 'active' : ''}`} onClick={() => setDetailTab('artifacts')}>Artifacts & Links</div>
              <div className={`sub-tab ${detailTab === 'feedback' ? 'active' : ''}`} onClick={() => setDetailTab('feedback')}>Faculty Feedback</div>
            </div>

            {/* TAB: OVERVIEW & HEALTH */}
            {detailTab === 'overview' && (
              <div>
                <div className="card" style={{ padding: '18px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '15px', color: '#fff' }}>Project Abstract & Objectives</h4>
                  <p style={{ fontSize: '13.5px', color: '#e2e8f0', lineHeight: 1.6, margin: 0 }}>
                    {selectedProject.abstract}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div className="card" style={{ padding: '16px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#fff' }}>Project Overall Progress</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="progress-track" style={{ flex: 1, height: '10px' }}>
                        <div className="progress-fill" style={{ width: `${selectedProject.overallProgress || 60}%` }}></div>
                      </div>
                      <b style={{ fontSize: '16px', color: '#fff' }}>{selectedProject.overallProgress || 60}%</b>
                    </div>
                  </div>

                  <div className="card" style={{ padding: '16px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#fff' }}>Faculty Mentorship Status</h4>
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      Guide: <b style={{ color: '#fff' }}>{selectedProject.facultyGuide?.name || 'Unassigned'}</b>
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Mentorship Status: <span className="badge badge-green">{selectedProject.facultyGuide?.status || 'FACULTY_CONFIRMED'}</span>
                    </div>
                  </div>
                </div>

                {currentUser?.role === 'Faculty' && selectedProject.status !== 'COMPLETED' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button className="btn btn-primary" onClick={handleCompleteProject}>
                      <Icon name="check" size={16} /> Mark Project Official COMPLETED
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: TEAM MEMBERS & ROLES */}
            {detailTab === 'team' && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#fff' }}>Project Team Members & Responsibilities</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(selectedProject.teamMembers || []).map((m, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <b style={{ color: '#fff', fontSize: '14.5px' }}>{m.name}</b> <span style={{ color: '#34d399', fontSize: '12.5px', fontWeight: 600 }}>({m.role})</span>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                          Reg No: {m.regNo || '2026CS101'} &middot; Dept: {m.dept} &middot; {m.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: MILESTONES MANAGEMENT */}
            {detailTab === 'milestones' && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#fff' }}>Project Milestones & Task Progress</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(selectedProject.milestones || []).map((m) => (
                    <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <b style={{ color: '#fff', fontSize: '14.5px' }}>{m.title}</b>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{m.description} &middot; Deadline: <b>{m.deadline}</b></div>
                        </div>
                        <span className={`badge ${m.status === 'COMPLETED' ? 'badge-green' : m.status === 'OVERDUE' ? 'badge-red' : 'badge-yellow'}`}>
                          {m.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Progress:</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={m.progress}
                          onChange={(e) => handleUpdateMilestoneProgress(m.id, e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <b style={{ color: '#fff', fontSize: '13px', width: '40px' }}>{m.progress}%</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: WEEKLY PROGRESS TIMELINE */}
            {detailTab === 'weekly' && (() => {
              const currentWeek = selectedProject.currentWeekNumber || 1;
              const curReport = (selectedProject.weeklyReports || []).find(w => w.weekNumber === currentWeek);
              const todayStr = new Date().toISOString().split('T')[0];
              const dueDate = curReport?.dueDate || selectedProject.weeklyCycle?.dueDate;
              const isOverdue = (dueDate && todayStr > dueDate) || curReport?.submissionStatus === 'OVERDUE';
              const maxWeeks = Math.max(currentWeek, selectedProject.weeklyReports?.length || 1);
              const weekNumbers = Array.from({ length: maxWeeks }, (_, i) => i + 1);

              return (
                <div>
                  {/* WEEKLY TIMELINE BUTTONS */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {weekNumbers.map(wNum => {
                      const isCurrent = currentWeek === wNum;
                      const rep = (selectedProject.weeklyReports || []).find(w => w.weekNumber === wNum);
                      return (
                        <div
                          key={wNum}
                          style={{
                            padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                            background: isCurrent ? 'var(--accent-grad)' : rep?.submissionStatus === 'REVIEWED' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                            color: isCurrent ? '#fff' : rep?.submissionStatus === 'REVIEWED' ? '#34d399' : 'var(--muted)',
                            border: isCurrent ? '1px solid #818cf8' : '1px solid var(--border)'
                          }}
                        >
                          Week {wNum} {rep?.submissionStatus === 'REVIEWED' ? '✓' : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* LATE SUBMISSION CALLOUT FOR OVERDUE */}
                  {isOverdue && (!curReport || curReport.submissionStatus === 'PENDING' || curReport.submissionStatus === 'OVERDUE') && (
                    <div style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid #f43f5e', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                      <b style={{ color: '#f43f5e', fontSize: '13.5px' }}>⚠️ Overdue Submission Warning</b>
                      <p style={{ fontSize: '12.5px', color: '#fca5a5', margin: '4px 0 10px' }}>
                        This submission is past the due date ({dueDate}). A mandatory explanation for late submission is required for faculty approval.
                      </p>
                      <div className="field" style={{ margin: 0 }}>
                        <label style={{ color: '#fca5a5' }}>Reason for Late Submission *</label>
                        <textarea
                          required
                          rows="2"
                          style={{ background: '#0f172a', color: '#fff', border: '1px solid #f43f5e', borderRadius: '6px', padding: '8px' }}
                          value={weeklyLateReason}
                          onChange={(e) => setWeeklyLateReason(e.target.value)}
                          placeholder="Provide detailed reason for submitting past deadline..."
                        ></textarea>
                      </div>
                    </div>
                  )}

                  {/* WEEKLY PROGRESS REPORT FORM / VIEW */}
                  <form onSubmit={handleSubmitWeeklyProgressReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="field"><label>What was planned this week?</label><textarea required rows="2" value={weeklyPlanned} onChange={(e) => setWeeklyPlanned(e.target.value)}></textarea></div>
                      <div className="field"><label>What was completed?</label><textarea required rows="2" value={weeklyCompleted} onChange={(e) => setWeeklyCompleted(e.target.value)}></textarea></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="field"><label>What are you currently working on?</label><textarea required rows="2" value={weeklyCurrent} onChange={(e) => setWeeklyCurrent(e.target.value)}></textarea></div>
                      <div className="field"><label>Blockers / Problems faced</label><textarea rows="2" value={weeklyBlockers} onChange={(e) => setWeeklyBlockers(e.target.value)}></textarea></div>
                    </div>
                    <div className="field"><label>Plan for next week</label><input required value={weeklyPlanNext} onChange={(e) => setWeeklyPlanNext(e.target.value)} /></div>

                    <h5 style={{ margin: '10px 0 4px', color: '#fff' }}>Evidence & Commit Links</h5>
                    <div className="field"><input value={weeklyGithubLink} onChange={(e) => setWeeklyGithubLink(e.target.value)} placeholder="GitHub Commit link (e.g. https://github.com/org/repo/commit/...)" /></div>

                    {currentUser?.role === 'Student' && selectedProject.status !== 'COMPLETED' && (
                      <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', justifyContent: 'center' }}>
                        <Icon name="check" size={16} /> Submit Week {currentWeek} Progress Report
                      </button>
                    )}
                  </form>

                  {/* FACULTY LATE REQUEST REVIEW SECTION */}
                  {currentUser?.role === 'Faculty' && curReport?.submissionStatus === 'LATE_REQUEST_PENDING' && (
                    <div style={{ marginTop: '20px', background: 'rgba(244,63,94,0.1)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(244,63,94,0.4)' }}>
                      <h4 style={{ margin: '0 0 6px', color: '#f43f5e' }}>Late Submission Request Pending Review</h4>
                      <p style={{ fontSize: '13px', color: '#e2e8f0', margin: '0 0 12px' }}>
                        <b>Student's Reason for Late Submission:</b> "{curReport.lateReason || 'No reason specified'}"
                      </p>
                      <div className="field" style={{ marginBottom: '12px' }}>
                        <label style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Faculty Review Comment *</label>
                        <textarea
                          rows="2"
                          style={{ width: '100%', background: '#0f172a', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }}
                          value={facultyFeedbackText}
                          onChange={(e) => setFacultyFeedbackText(e.target.value)}
                          placeholder="Enter mandatory review feedback for this late request..."
                        ></textarea>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-danger-outline" onClick={() => handleLateRespond(false)}>
                          REJECT LATE SUBMISSION
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => handleLateRespond(true)}>
                          APPROVE LATE SUBMISSION (+5 Credits)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* FACULTY STANDARD REVIEW SECTION */}
                  {currentUser?.role === 'Faculty' && curReport?.submissionStatus === 'SUBMITTED' && (
                    <div style={{ marginTop: '20px', background: 'rgba(99,102,241,0.08)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)' }}>
                      <h4 style={{ margin: '0 0 8px', color: '#fff' }}>Faculty Review & Feedback Notes *</h4>
                      <textarea
                        rows="2"
                        style={{ width: '100%', background: '#0f172a', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}
                        value={facultyFeedbackText}
                        onChange={(e) => setFacultyFeedbackText(e.target.value)}
                        placeholder="Enter mandatory review feedback for student team..."
                      ></textarea>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-danger-outline" onClick={() => handleFacultyReviewReport(false)}>Request Changes</button>
                        <button type="button" className="btn btn-primary" onClick={() => handleFacultyReviewReport(true)}>Approve Weekly Report (+10 Credits)</button>
                      </div>
                    </div>
                  )}

                  {/* FACULTY FEEDBACK DISPLAY CARD */}
                  {curReport?.facultyFeedback && (
                    <div style={{ marginTop: '20px', background: 'rgba(52,211,153,0.08)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(52,211,153,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, color: '#34d399', fontSize: '14px', fontWeight: 700 }}>
                          Latest Faculty Review Comment ({curReport.facultyFeedback.author || 'Faculty Guide'})
                        </h4>
                        <span className="badge badge-green">{curReport.submissionStatus}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                        "{typeof curReport.facultyFeedback === 'string' ? curReport.facultyFeedback : curReport.facultyFeedback.text}"
                      </p>
                    </div>
                  )}

                  {/* REVIEW HISTORY TIMELINE */}
                  {curReport?.reviewHistory && curReport.reviewHistory.length > 0 && (
                    <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="history" size={16} /> Review History & Audit Log
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {curReport.reviewHistory.map((item, idx) => (
                          <div key={item.id || idx} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '12.5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <div>
                                <b style={{ color: '#fff' }}>{item.author}</b> <span style={{ color: 'var(--muted)' }}>({item.authorRole || 'User'})</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {item.creditPoints > 0 && (
                                  <span style={{ color: '#34d399', fontWeight: 700 }}>+{item.creditPoints} Credits</span>
                                )}
                                <span className={`badge ${item.decision.includes('APPROVED') ? 'badge-green' : item.decision.includes('REJECTED') || item.decision === 'CHANGES_REQUESTED' ? 'badge-red' : 'badge-blue'}`}>
                                  {item.decision}
                                </span>
                                <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{new Date(item.timestamp).toLocaleString()}</span>
                              </div>
                            </div>
                            <div style={{ color: '#cbd5e1', fontStyle: item.comment ? 'normal' : 'italic' }}>
                              {item.comment ? `"${item.comment}"` : 'No comment recorded.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB: ARTIFACTS & LINKS */}
            {detailTab === 'artifacts' && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#fff' }}>Project Deliverables & Artifacts</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="card" style={{ padding: '14px', fontSize: '13px' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="folder" size={16} /> GitHub Source Code Repository
                    </div>
                    {selectedProject.github ? (
                      <a href={selectedProject.github} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontWeight: 600, wordBreak: 'break-all' }}>
                        {selectedProject.github}
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>
                    )}
                  </div>

                  <div className="card" style={{ padding: '14px', fontSize: '13px' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="book" size={16} /> Documentation (SRS Report)
                    </div>
                    {selectedProject.doc ? (
                      <a href={selectedProject.doc} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontWeight: 600, wordBreak: 'break-all' }}>
                        {selectedProject.doc}
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>
                    )}
                  </div>

                  <div className="card" style={{ padding: '14px', fontSize: '13px' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="award" size={16} /> Presentation (PPT)
                    </div>
                    {selectedProject.ppt ? (
                      <a href={selectedProject.ppt} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontWeight: 600, wordBreak: 'break-all' }}>
                        {selectedProject.ppt}
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>
                    )}
                  </div>

                  <div className="card" style={{ padding: '14px', fontSize: '13px' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="eye" size={16} /> Demo Video Link
                    </div>
                    {selectedProject.demo ? (
                      <a href={selectedProject.demo} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontWeight: 600, wordBreak: 'break-all' }}>
                        {selectedProject.demo}
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>
                    )}
                  </div>

                  <div className="card" style={{ padding: '14px', fontSize: '13px' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="trend" size={16} /> Vercel / Live Deployment
                    </div>
                    {selectedProject.vercel ? (
                      <a href={selectedProject.vercel} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontWeight: 600, wordBreak: 'break-all' }}>
                        {selectedProject.vercel}
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>
                    )}
                  </div>

                  <div className="card" style={{ padding: '14px', fontSize: '13px' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="file" size={16} /> Uploaded Files
                    </div>
                    {selectedProject.files && selectedProject.files.length > 0 ? (
                      <div style={{ color: '#38bdf8' }}>{selectedProject.files.length} file(s) uploaded</div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: FACULTY FEEDBACK */}
            {detailTab === 'feedback' && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#fff' }}>Faculty Feedback History</h4>
                {(selectedProject.weeklyReports || []).map((w, idx) => (
                  w.facultyFeedback ? (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                      <b style={{ color: '#38bdf8' }}>Week {w.weekNumber} Feedback</b> by {w.facultyFeedback.author}
                      <p style={{ margin: '4px 0 0', color: '#e2e8f0', fontSize: '13px' }}>"{w.facultyFeedback.text}"</p>
                    </div>
                  ) : null
                ))}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Close Workspace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
