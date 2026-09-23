import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icons';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="landing-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="brand-mark" style={{ background: 'var(--accent-grad)' }}>
            <Icon name="book" size={18} />
          </div>
          <span className="brand" style={{ fontSize: '18px', fontWeight: 700 }}>ProjectHub</span>
        </div>
        <nav className="landing-nav">
          <a onClick={() => navigate('/login')}>Lifecycle Workflow</a>
          <a onClick={() => navigate('/login')}>Weekly Tracking</a>
          <a onClick={() => navigate('/login')}>Faculty Mentorship</a>
        </nav>
        <div className="landing-actions">
          <a className="signin" onClick={() => navigate('/login')}>Sign in</a>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Get Started</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow"><Icon name="bulb" size={14} /> Academic Project Development & Lifecycle Management Platform</div>
          <h1 style={{ fontSize: '38px', lineHeight: 1.15 }}>
            Plan your project.<br />Track your progress.<br />Build together.<br />Complete with confidence.
          </h1>
          <p className="lead">
            ProjectHub helps student teams manage their complete project journey — from registration and team formation to milestone planning, weekly progress tracking, faculty guidance, review, and final completion.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={() => navigate('/login')}>Launch Workspace <Icon name="arrow" size={15} /></button>
            <button className="btn btn-outline" onClick={() => navigate('/login')}>Explore Lifecycle Workflow</button>
          </div>
          <div className="hero-check">
            <span><Icon name="check" size={15} /> Faculty Mentorship</span>
            <span><Icon name="check" size={15} /> Weekly Progress Reports</span>
            <span><Icon name="check" size={15} /> Milestone Audits</span>
          </div>
        </div>
        <div className="hero-art">
          <svg viewBox="0 0 200 150" width="80%" height="80%">
            <rect x="10" y="20" width="46" height="30" rx="4" fill="#24346f" />
            <rect x="66" y="10" width="46" height="30" rx="4" fill="#2c3e82" />
            <rect x="122" y="30" width="46" height="30" rx="4" fill="#24346f" />
            <circle cx="150" cy="90" r="14" fill="#c9a94b" />
            <rect x="20" y="90" width="34" height="46" rx="4" fill="#2c3e82" />
            <rect x="70" y="70" width="34" height="66" rx="4" fill="#24346f" />
          </svg>
        </div>
      </section>

      <div className="stats-strip">
        <div className="stats-inner">
          <div><div className="num">1,240+</div><div className="lab">Active Projects</div></div>
          <div><div className="num">86</div><div className="lab">Faculty Mentors</div></div>
          <div><div className="num">5,200+</div><div className="lab">Student Developers</div></div>
          <div><div className="num">98%</div><div className="lab">On-Time Completion</div></div>
        </div>
      </div>

      <section className="feat-section">
        <h2>End-to-End Academic Project Operating System</h2>
        <p>From initial registration to final milestone verification, every stage keeps development structured and transparent.</p>
        <div className="feat-grid">
          {[
            ['folder', 'Project Registration', 'Register projects at the start of the semester with initial specs and repository links.'],
            ['users', 'Team Formation & Roles', 'Form teams with student register number lookups and define member roles.'],
            ['chat', 'Faculty Guide Selection', 'Directly search and request faculty mentors who guide development from start to finish.'],
            ['chart', 'Milestone Management', 'Break projects down into clear milestones with deadlines and progress calculation.'],
            ['clock', 'Weekly Progress Tracking', 'Submit weekly progress reports, individual contributions, blockers, and commit evidence.'],
            ['shield', 'Audit & Final Verification', 'Faculty reviews weekly reports, provides feedback, and approves final project artifacts.'],
          ].map(([ic, t, d], i) => (
            <div key={i} className="card feat-card"><div className="icon"><Icon name={ic} size={18} /></div><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section className="how-section">
        <h2>Complete Project Lifecycle</h2>
        <div className="how-grid">
          {[
            ['Register & Form Team', 'Register project details, search student database by regNo, and assign team roles.'],
            ['Select Faculty Guide', 'Select an available faculty guide in your domain to mentor your project development.'],
            ['Plan Milestones', 'Set up milestone deadlines and assign responsibilities to team members.'],
            ['Weekly Progress & Feedback', 'Submit weekly progress reports, attach commit evidence, and receive faculty review.'],
          ].map(([t, d], i) => (
            <div key={i} className="how-step"><div className="n">STAGE {i + 1}</div><h4>{t}</h4><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section className="cta-final">
        <h2>Ready to manage your academic project journey?</h2>
        <p>Join thousands of student developers building structured, faculty-guided projects.</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>Get Started <Icon name="arrow" size={15} /></button>
      </section>

      <footer className="landing-footer">&copy; 2026 ProjectHub — Academic Project Development & Lifecycle Platform.</footer>
    </div>
  );
}
