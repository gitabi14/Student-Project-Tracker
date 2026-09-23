const db = require('../config/db');

// Predefined platform domains
const predefinedDomains = [
  'Machine Learning',
  'Web Development',
  'Mobile Development',
  'Blockchain',
  'Internet of Things',
  'Cybersecurity',
  'Cloud Computing'
];

// =========================================================================
// APPLICATION-LEVEL DEMO / SIMULATION CLOCK SYSTEM
// =========================================================================
let demoModeActive = false;
let simulatedDate = '2026-09-23T09:30:00.000Z'; // ISO string

function getCurrentApplicationTime() {
  if (demoModeActive && simulatedDate) {
    return new Date(simulatedDate);
  }
  return new Date();
}

function getAppDateISO() {
  return getCurrentApplicationTime().toISOString();
}

function getAppDateFormatted() {
  return getCurrentApplicationTime().toISOString().split('T')[0];
}

function setSimulatedDate(dateString) {
  demoModeActive = true;
  simulatedDate = new Date(dateString).toISOString();
  evaluateWeeklyDeadlines();
  return simulatedDate;
}

function resetRealTime() {
  demoModeActive = false;
  simulatedDate = null;
  evaluateWeeklyDeadlines();
  return new Date().toISOString();
}

// In-Memory store populated with Tamil student & faculty datasets
let users = [
  // STUDENTS (Authentic Tamil Names with Register Numbers)
  {
    id: 1, name: 'Kavitha Sundaram', regNo: '2026CS101', email: 'kavitha@university.edu', password: 'password', role: 'Student', status: 'Active', dept: 'Computer Science', academic_year: 'Final Year', credits: 30, approved_projects: 3, skills: ['React Native', 'Node.js', 'AWS', 'Python'], domain_of_interest: 'Machine Learning', initials: 'KS', creditHistory: [
      { id: 2, title: 'Week 1 On-Time Submission — Reviewed & Approved', points: 10, date: '2026-09-07', type: 'weekly_submission' },
      { id: 3, title: 'Week 2 On-Time Submission — Reviewed & Approved', points: 10, date: '2026-09-14', type: 'weekly_submission' },
      { id: 4, title: 'Week 3 On-Time Submission — Reviewed & Approved', points: 10, date: '2026-09-21', type: 'weekly_submission' }
    ]
  },
  {
    id: 2, name: 'Karthik Raja', regNo: '2026CS102', email: 'karthik@university.edu', password: 'password', role: 'Student', status: 'Active', dept: 'Computer Science', academic_year: 'Final Year', credits: 215, approved_projects: 8, skills: ['Java', 'Spring Boot', 'SQL', 'Docker'], domain_of_interest: 'Cloud Computing', initials: 'KR', creditHistory: []
  },
  {
    id: 3, name: 'Ananya Selvam', regNo: '2026CS103', email: 'ananya@university.edu', password: 'password', role: 'Student', status: 'Active', dept: 'Computer Science', academic_year: 'Third Year', credits: 190, approved_projects: 9, skills: ['React', 'Node.js', 'Python', 'Flask'], domain_of_interest: 'Machine Learning', initials: 'AS', creditHistory: []
  },
  {
    id: 4, name: 'Kavin Kumar', regNo: '2026CS104', email: 'kavin@university.edu', password: 'password', role: 'Student', status: 'Active', dept: 'Computer Science', academic_year: 'Final Year', credits: 168, approved_projects: 7, skills: ['Angular', 'TypeScript', 'Node.js', 'Moodle'], domain_of_interest: 'Web Development', initials: 'KK', creditHistory: []
  },
  {
    id: 5, name: 'Priya Senthil', regNo: '2026IT105', email: 'priya@university.edu', password: 'password', role: 'Student', status: 'Active', dept: 'Information Technology', academic_year: 'Third Year', credits: 155, approved_projects: 6, skills: ['Flutter', 'Dart', 'Firebase', 'Google Maps'], domain_of_interest: 'Mobile Development', initials: 'PS', creditHistory: []
  },
  {
    id: 6, name: 'Dhanush Ram', regNo: '2026EC106', email: 'dhanush@university.edu', password: 'password', role: 'Student', status: 'Active', dept: 'Electronics', academic_year: 'Second Year', credits: 142, approved_projects: 5, skills: ['C++', 'Arduino', 'Raspberry Pi', 'LoRaWAN'], domain_of_interest: 'Internet of Things', initials: 'DR', creditHistory: []
  },
  {
    id: 7, name: 'Nithya Raman', regNo: '2026CS107', email: 'nithya@university.edu', password: 'password', role: 'Student', status: 'Active', dept: 'Computer Science', academic_year: 'Third Year', credits: 138, approved_projects: 6, skills: ['Python', 'PyTorch', 'NLTK', 'FastAPI'], domain_of_interest: 'Machine Learning', initials: 'NR', creditHistory: []
  },
  {
    id: 8, name: 'Vignesh Kanna', regNo: '2026EC108', email: 'vignesh@university.edu', password: 'password', role: 'Student', status: 'Active', dept: 'Electronics', academic_year: 'Third Year', credits: 172, approved_projects: 7, skills: ['VHDL', 'Verilog', 'Embedded C', 'C++'], domain_of_interest: 'Internet of Things', initials: 'VK', creditHistory: []
  },
  {
    id: 9, name: 'Soundarya Devi', regNo: '2026IT109', email: 'soundarya@university.edu', password: 'password', role: 'Student', status: 'Active', dept: 'Information Technology', academic_year: 'Third Year', credits: 130, approved_projects: 4, skills: ['React', 'Tailwind', 'Node.js'], domain_of_interest: 'Web Development', initials: 'SD', creditHistory: []
  },
  {
    id: 10, name: 'Aravind Swamy', regNo: '2026CS110', email: 'aravind@university.edu', password: 'password', role: 'Student', status: 'Active', dept: 'Computer Science', academic_year: 'Second Year', credits: 120, approved_projects: 4, skills: ['Python', 'Django', 'PostgreSQL'], domain_of_interest: 'Cybersecurity', initials: 'AS', creditHistory: []
  },

  // FACULTY (Mentorship Availability & Expertise)
  { id: 13, name: 'Dr. Arumugam Pillai', email: 'arumugam@university.edu', password: 'password', role: 'Faculty', status: 'Active', dept: 'Computer Science', academic_year: 'Senior Professor', credits: 0, approved_projects: 0, skills: [], domain_of_interest: 'Machine Learning', specializations: ['Machine Learning', 'Cloud Computing', 'Cybersecurity'], maxPendingThreshold: 10, currentProjectsCount: 3, initials: 'AP' },
  { id: 14, name: 'Dr. Senthamizhan V', email: 'senthamizhan@university.edu', password: 'password', role: 'Faculty', status: 'Active', dept: 'Computer Science', academic_year: 'Associate Professor', credits: 0, approved_projects: 0, skills: [], domain_of_interest: 'Web Development', specializations: ['Web Development', 'Cybersecurity', 'Mobile Development'], maxPendingThreshold: 10, currentProjectsCount: 2, initials: 'SV' },
  { id: 15, name: 'Dr. Thenmozhi K', email: 'thenmozhi@university.edu', password: 'password', role: 'Faculty', status: 'Active', dept: 'Information Technology', academic_year: 'Associate Professor', credits: 0, approved_projects: 0, skills: [], domain_of_interest: 'Mobile Development', specializations: ['Mobile Development', 'Internet of Things', 'Web Development'], maxPendingThreshold: 10, currentProjectsCount: 1, initials: 'TK' },
  { id: 16, name: 'Dr. Kabilan Pandian', email: 'kabilan@university.edu', password: 'password', role: 'Faculty', status: 'Active', dept: 'Computer Science', academic_year: 'Assistant Professor', credits: 0, approved_projects: 0, skills: [], domain_of_interest: 'Blockchain', specializations: ['Blockchain', 'Machine Learning', 'Cloud Computing'], maxPendingThreshold: 10, currentProjectsCount: 4, initials: 'KP' },

  // ADMIN USER
  { id: 19, name: 'Admin User', email: 'admin@university.edu', password: 'password', role: 'Administrator', status: 'Active', dept: 'Platform Governance', academic_year: 'Head Administrator', credits: 0, approved_projects: 0, skills: [], domain_of_interest: 'All Domains', specializations: predefinedDomains, maxPendingThreshold: 999, initials: 'AU' }
];

let projects = [
  {
    id: 1,
    title: 'Smart Campus Assistant',
    type: 'Internal',
    status: 'IN_PROGRESS',
    author: 'Kavitha Sundaram',
    authorRegNo: '2026CS101',
    dept: 'Computer Science',
    category: 'Machine Learning',
    abstract: 'An intelligent AI assistant for university students to track coursework, navigate building maps, and receive real-time campus notifications.',
    tech: ['React Native', 'Node.js', 'Python', 'FastAPI'],
    github: 'https://github.com/kavitha/smart-campus-assistant',
    doc: 'https://docs.google.com/document/d/1campus-assistant',
    ppt: 'https://docs.google.com/presentation/d/1campus-assistant-ppt',
    demo: 'https://youtube.com/watch?v=demo',
    vercel: 'https://smart-campus.vercel.app',
    files: [],
    
    // Team Members
    teamMembers: [
      { name: 'Kavitha Sundaram', regNo: '2026CS101', email: 'kavitha@university.edu', role: 'Team Leader', dept: 'Computer Science' },
      { name: 'Karthik Raja', regNo: '2026CS102', email: 'karthik@university.edu', role: 'Backend Developer', dept: 'Computer Science' },
      { name: 'Ananya Selvam', regNo: '2026CS103', email: 'ananya@university.edu', role: 'Frontend Developer', dept: 'Computer Science' },
      { name: 'Priya Senthil', regNo: '2026IT105', email: 'priya@university.edu', role: 'UI/UX Designer', dept: 'Information Technology' }
    ],

    // Selected Faculty Guide
    facultyGuide: {
      name: 'Dr. Arumugam Pillai',
      email: 'arumugam@university.edu',
      status: 'FACULTY_CONFIRMED',
      requestedAt: '2026-09-01T10:00:00.000Z',
      respondedAt: '2026-09-01T14:30:00.000Z'
    },

    // Milestones
    milestones: [
      { id: 101, title: 'Requirement Analysis & System Architecture', description: 'Define user personas, data model, and API endpoint specs.', startDate: '2026-09-01', deadline: '2026-09-07', assignedMembers: ['Kavitha Sundaram', 'Karthik Raja'], progress: 100, status: 'COMPLETED' },
      { id: 102, title: 'Database Schema & Authentication API', description: 'Setup PostgreSQL schema and JWT login microservice.', startDate: '2026-09-08', deadline: '2026-09-14', assignedMembers: ['Karthik Raja'], progress: 100, status: 'COMPLETED' },
      { id: 103, title: 'Core UI Dashboard & Navigation Flow', description: 'Design mobile views for student schedule & map UI.', startDate: '2026-09-15', deadline: '2026-09-21', assignedMembers: ['Ananya Selvam', 'Priya Senthil'], progress: 100, status: 'COMPLETED' },
      { id: 104, title: 'AI Recommendation Engine & Integration', description: 'Train course recommendation model using Python PyTorch.', startDate: '2026-09-22', deadline: '2026-09-28', assignedMembers: ['Kavitha Sundaram'], progress: 50, status: 'IN_PROGRESS' },
      { id: 105, title: 'System Testing & Final Deployment', description: 'Run end-to-end integration tests and deploy on Vercel.', startDate: '2026-09-29', deadline: '2026-10-05', assignedMembers: ['Kavitha Sundaram', 'Karthik Raja', 'Ananya Selvam'], progress: 0, status: 'PENDING' }
    ],

    // Current Week Counter
    currentWeekNumber: 4,

    // Weekly Progress History
    weeklyReports: [
      {
        weekNumber: 1,
        startDate: '2026-09-01',
        endDate: '2026-09-07',
        plannedWork: 'Conduct requirement gathering with student reps and map DB entities.',
        completedWork: 'Finalized SRS document and baseline schema diagram.',
        currentWork: 'Setting up GitHub repository and CI workflow.',
        pendingWork: 'None',
        blockers: 'None',
        planNextWeek: 'Setup JWT authentication server and DB tables.',
        overallProgress: 20,
        submissionStatus: 'REVIEWED',
        submittedAt: '2026-09-07T20:00:00.000Z',
        lateDays: 0,
        memberContributions: [
          { studentName: 'Kavitha Sundaram', role: 'Team Leader', workCompleted: 'Authored SRS & domain schema', progress: 20 },
          { studentName: 'Karthik Raja', role: 'Backend Developer', workCompleted: 'Configured DB environment', progress: 20 }
        ],
        evidence: { githubLink: 'https://github.com/kavitha/smart-campus/commit/111', notes: 'SRS Document attached' },
        facultyFeedback: { author: 'Dr. Arumugam Pillai', text: 'Good requirement specification. Proceed to backend auth setup.', time: '2026-09-08T09:00:00.000Z' }
      },
      {
        weekNumber: 2,
        startDate: '2026-09-08',
        endDate: '2026-09-14',
        plannedWork: 'Develop JWT login endpoints and user database migrations.',
        completedWork: 'Implemented login/register REST APIs and user seed data.',
        currentWork: 'Connecting Express backend to PostgreSQL.',
        pendingWork: 'None',
        blockers: 'Minor CORS header issue resolved.',
        planNextWeek: 'Develop frontend dashboard and mobile components.',
        overallProgress: 40,
        submissionStatus: 'REVIEWED',
        submittedAt: '2026-09-14T21:15:00.000Z',
        lateDays: 0,
        memberContributions: [
          { studentName: 'Karthik Raja', role: 'Backend Developer', workCompleted: 'JWT auth controller & middleware', progress: 40 },
          { studentName: 'Ananya Selvam', role: 'Frontend Developer', workCompleted: 'Setup Vite React app boilerplate', progress: 35 }
        ],
        evidence: { githubLink: 'https://github.com/kavitha/smart-campus/commit/222', notes: 'API test collection' },
        facultyFeedback: { author: 'Dr. Arumugam Pillai', text: 'Auth mechanism looks secure. Ensure rate limiting is added.', time: '2026-09-15T11:00:00.000Z' }
      },
      {
        weekNumber: 3,
        startDate: '2026-09-15',
        endDate: '2026-09-21',
        plannedWork: 'Build frontend dashboard and interactive map navigation UI.',
        completedWork: 'Completed mobile-responsive dashboard layouts.',
        currentWork: 'Integrating map SVG views with location markers.',
        pendingWork: 'Offline map caching',
        blockers: 'None',
        planNextWeek: 'Train Python ML recommendation model for campus schedule.',
        overallProgress: 60,
        submissionStatus: 'REVIEWED',
        submittedAt: '2026-09-21T18:45:00.000Z',
        lateDays: 0,
        memberContributions: [
          { studentName: 'Ananya Selvam', role: 'Frontend Developer', workCompleted: 'Dashboard components & responsiveness', progress: 60 },
          { studentName: 'Priya Senthil', role: 'UI/UX Designer', workCompleted: 'Figma prototypes & icons', progress: 65 }
        ],
        evidence: { githubLink: 'https://github.com/kavitha/smart-campus/commit/333', notes: 'Figma link included' },
        facultyFeedback: { author: 'Dr. Arumugam Pillai', text: 'UI components are clean. Focus on ML integration for Week 4.', time: '2026-09-22T10:00:00.000Z' }
      }
    ],

    likes: 42,
    commentsCount: 2,
    views: 315,
    clones: 24,
    comments: []
  },
  {
    id: 2,
    title: 'AI-Powered Attendance System',
    type: 'Internal',
    status: 'COMPLETED',
    author: 'Ananya Selvam',
    authorRegNo: '2026CS103',
    dept: 'Computer Science',
    category: 'Machine Learning',
    abstract: 'An automated attendance management system using facial recognition to track student presence in classes.',
    tech: ['Python', 'OpenCV', 'Flask'],
    github: 'https://github.com/ananya/ai-attendance',
    doc: 'https://docs.google.com/document/d/1attendance',
    ppt: 'https://docs.google.com/presentation/d/1attendance-ppt',
    demo: 'https://youtube.com/watch?v=attendance-demo',
    vercel: 'https://ai-attendance.vercel.app',
    files: [],
    
    teamMembers: [
      { name: 'Ananya Selvam', regNo: '2026CS103', email: 'ananya@university.edu', role: 'Team Leader', dept: 'Computer Science' },
      { name: 'Priya Senthil', regNo: '2026IT105', email: 'priya@university.edu', role: 'Mobile Developer', dept: 'Information Technology' }
    ],

    facultyGuide: {
      name: 'Dr. Senthamizhan V',
      email: 'senthamizhan@university.edu',
      status: 'FACULTY_CONFIRMED',
      requestedAt: '2026-08-01T10:00:00.000Z',
      respondedAt: '2026-08-01T15:00:00.000Z'
    },

    milestones: [
      { id: 201, title: 'Dataset Collection & Preprocessing', description: 'Gather face images and normalize lighting.', startDate: '2026-08-01', deadline: '2026-08-10', assignedMembers: ['Ananya Selvam'], progress: 100, status: 'COMPLETED' },
      { id: 202, title: 'OpenCV Model Training & Validation', description: 'Train face recognition classifier.', startDate: '2026-08-11', deadline: '2026-08-20', assignedMembers: ['Ananya Selvam'], progress: 100, status: 'COMPLETED' },
      { id: 203, title: 'Flask Backend & Attendance Logging', description: 'Integrate model with DB.', startDate: '2026-08-21', deadline: '2026-08-30', assignedMembers: ['Priya Senthil'], progress: 100, status: 'COMPLETED' }
    ],

    currentWeekNumber: 4,
    weeklyReports: [
      {
        weekNumber: 1, startDate: '2026-08-01', endDate: '2026-08-07', plannedWork: 'Dataset gathering', completedWork: 'Collected 500 images', currentWork: 'Preprocessing', pendingWork: 'None', blockers: 'None', planNextWeek: 'Model training', overallProgress: 35, submissionStatus: 'REVIEWED', submittedAt: '2026-08-07T18:00:00.000Z', lateDays: 0, memberContributions: [], evidence: {}, facultyFeedback: { author: 'Dr. Senthamizhan V', text: 'Approved', time: '2026-08-08' }
      },
      {
        weekNumber: 2, startDate: '2026-08-08', endDate: '2026-08-14', plannedWork: 'OpenCV training', completedWork: '94% Accuracy model achieved', currentWork: 'Flask wrapper', pendingWork: 'None', blockers: 'None', planNextWeek: 'UI integration', overallProgress: 70, submissionStatus: 'REVIEWED', submittedAt: '2026-08-14T19:00:00.000Z', lateDays: 0, memberContributions: [], evidence: {}, facultyFeedback: { author: 'Dr. Senthamizhan V', text: 'Great accuracy!', time: '2026-08-15' }
      },
      {
        weekNumber: 3, startDate: '2026-08-15', endDate: '2026-08-21', plannedWork: 'UI & Final Testing', completedWork: 'Complete system integrated', currentWork: 'Documentation', pendingWork: 'None', blockers: 'None', planNextWeek: 'Final submission', overallProgress: 100, submissionStatus: 'REVIEWED', submittedAt: '2026-08-21T20:00:00.000Z', lateDays: 0, memberContributions: [], evidence: {}, facultyFeedback: { author: 'Dr. Senthamizhan V', text: 'Project completed successfully.', time: '2026-08-22' }
      }
    ],

    likes: 88, commentsCount: 4, views: 520, clones: 30, comments: []
  },
  {
    id: 3,
    title: 'Autonomous Swarm Robotics Controller',
    type: 'External',
    status: 'AWAITING_FACULTY',
    author: 'Kavin Kumar',
    authorRegNo: '2026CS104',
    dept: 'Computer Science',
    category: 'Machine Learning',
    abstract: 'Distributed path planning and obstacle avoidance algorithms for multi-UAV swarm formations operating in GPS-denied environments.',
    tech: ['ROS 2', 'C++', 'Python', 'Gazebo'],
    github: 'https://github.com/kavin/swarm-robotics',
    doc: 'https://docs.google.com/document/d/1swarm',
    ppt: '', demo: '', vercel: '', files: [],

    teamMembers: [
      { name: 'Kavin Kumar', regNo: '2026CS104', email: 'kavin@university.edu', role: 'Team Leader', dept: 'Computer Science' },
      { name: 'Vignesh Kanna', regNo: '2026EC108', email: 'vignesh@university.edu', role: 'Robotics Engineer', dept: 'Electronics' }
    ],

    facultyGuide: {
      name: 'Dr. Arumugam Pillai',
      email: 'arumugam@university.edu',
      status: 'FACULTY_REQUESTED',
      requestedAt: '2026-09-22T14:00:00.000Z',
      respondedAt: null
    },

    milestones: [
      { id: 301, title: 'Gazebo Simulation World Setup', description: 'Build 3D environment for ROS 2 nodes.', startDate: '2026-09-20', deadline: '2026-09-27', assignedMembers: ['Kavin Kumar'], progress: 30, status: 'IN_PROGRESS' }
    ],

    currentWeekNumber: 1,
    weeklyReports: [],
    likes: 15, commentsCount: 0, views: 90, clones: 5, comments: []
  }
];

// Persistent Notification Log
let notifications = [
  { id: 1, email: 'kavitha@university.edu', icon: 'check', text: 'Dr. Arumugam Pillai accepted your Faculty Guide request for "Smart Campus Assistant"', time: '2026-09-01T14:30:00.000Z', route: '/projects', read: false },
  { id: 2, email: 'kavitha@university.edu', icon: 'chat', text: 'Faculty Feedback added on Week 3 Report by Dr. Arumugam Pillai', time: '2026-09-22T10:00:00.000Z', route: '/projects', read: false },
  { id: 3, email: 'arumugam@university.edu', icon: 'bell', text: 'New Project Registration Request: "Autonomous Swarm Robotics Controller" by Kavin Kumar', time: '2026-09-22T14:00:00.000Z', route: '/guides', read: false }
];

// Persistent Activity Audit Log
let activityLog = [
  { id: 1, projectId: 1, actor: 'Kavitha Sundaram', action: 'PROJECT_REGISTERED', details: 'Registered project "Smart Campus Assistant"', timestamp: '2026-09-01T10:00:00.000Z' },
  { id: 2, projectId: 1, actor: 'Dr. Arumugam Pillai', action: 'FACULTY_ACCEPTED', details: 'Accepted as Faculty Guide', timestamp: '2026-09-01T14:30:00.000Z' },
  { id: 3, projectId: 1, actor: 'Kavitha Sundaram', action: 'WEEKLY_SUBMITTED', details: 'Submitted Week 1 Progress Report', timestamp: '2026-09-07T20:00:00.000Z' },
  { id: 4, projectId: 1, actor: 'Dr. Arumugam Pillai', action: 'WEEKLY_REVIEWED', details: 'Reviewed Week 1 Report with feedback', timestamp: '2026-09-08T09:00:00.000Z' }
];

let departments = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical'];

let accessTiers = [
  { min: 0, label: 'No Repository Access' },
  { min: 60, label: 'Idea Repository' },
  { min: 100, label: 'Internal Projects' },
  { min: 200, label: 'External Projects' }
];

let nextProjectId = 4;
let nextNotifId = 4;
let nextActivityId = 5;
let nextIdeaId = 3;
let nextRequestId = 103;

let ideas = [
  {
    id: 1,
    title: 'AI-Driven Smart Exam Proctoring System',
    category: 'Machine Learning',
    tech: ['Python', 'OpenCV', 'React', 'FastAPI'],
    description: 'Automated video and audio monitoring system for online proctored examinations using deep learning models to detect suspicious behavior.',
    publisher: 'Ananya Selvam',
    publisherEmail: 'ananya@university.edu',
    publisherRegNo: '2026CS103',
    dept: 'Computer Science',
    likes: 18,
    views: 142,
    createdAt: '2026-09-20T10:00:00.000Z',
    requiredRoles: [
      { roleId: 1, roleName: 'Backend Developer', requiredCount: 1, filledCount: 0 },
      { roleId: 2, roleName: 'ML Engineer', requiredCount: 1, filledCount: 1 },
      { roleId: 3, roleName: 'UI/UX Designer', requiredCount: 1, filledCount: 0 }
    ],
    teamMembers: [
      { name: 'Ananya Selvam', email: 'ananya@university.edu', regNo: '2026CS103', role: 'Team Leader', dept: 'Computer Science' },
      { name: 'Karthik Raja', email: 'karthik@university.edu', regNo: '2026CS102', role: 'ML Engineer', dept: 'Computer Science' }
    ],
    joinRequests: [
      {
        requestId: 101,
        applicantName: 'Kavin Kumar',
        applicantEmail: 'kavin@university.edu',
        applicantRegNo: '2026CS104',
        dept: 'Computer Science',
        requestedRole: 'Backend Developer',
        message: 'I have extensive experience with FastAPI and PostgreSQL microservices.',
        skills: 'Python, FastAPI, PostgreSQL',
        portfolioUrl: 'https://github.com/kavin',
        status: 'PENDING',
        appliedAt: '2026-09-22T15:30:00.000Z'
      }
    ]
  },
  {
    id: 2,
    title: 'Decentralized Academic Credentials Verification',
    category: 'Blockchain',
    tech: ['Solidity', 'Ethereum', 'React', 'Ethers.js'],
    description: 'Tamper-proof smart contract architecture on Ethereum for instant validation of university degree certificates and transcripts.',
    publisher: 'Kavitha Sundaram',
    publisherEmail: 'kavitha@university.edu',
    publisherRegNo: '2026CS101',
    dept: 'Computer Science',
    likes: 24,
    views: 210,
    createdAt: '2026-09-18T12:00:00.000Z',
    requiredRoles: [
      { roleId: 1, roleName: 'Smart Contract Developer', requiredCount: 1, filledCount: 1 },
      { roleId: 2, roleName: 'Frontend Engineer', requiredCount: 1, filledCount: 0 }
    ],
    teamMembers: [
      { name: 'Kavitha Sundaram', email: 'kavitha@university.edu', regNo: '2026CS101', role: 'Team Leader', dept: 'Computer Science' },
      { name: 'Dhanush Ram', email: 'dhanush@university.edu', regNo: '2026EC106', role: 'Smart Contract Developer', dept: 'Electronics' }
    ],
    joinRequests: [
      {
        requestId: 102,
        applicantName: 'Soundarya Devi',
        applicantEmail: 'soundarya@university.edu',
        applicantRegNo: '2026IT109',
        dept: 'Information Technology',
        requestedRole: 'Frontend Engineer',
        message: 'Proficient in React, Tailwind CSS, and Ethers.js integration.',
        skills: 'React, Tailwind, Web3.js',
        portfolioUrl: 'https://github.com/soundarya',
        status: 'PENDING',
        appliedAt: '2026-09-22T18:00:00.000Z'
      }
    ]
  }
];

// Persistent Credit Transactions Ledger
let creditTransactions = [
  { id: 2, userId: 1, userEmail: 'kavitha@university.edu', projectId: 1, weekNumber: 1, transactionType: 'WEEKLY_SUBMISSION', points: 10, reason: 'Week 1 On-Time Submission — Reviewed & Approved', createdAt: '2026-09-07T20:00:00.000Z' },
  { id: 3, userId: 1, userEmail: 'kavitha@university.edu', projectId: 1, weekNumber: 2, transactionType: 'WEEKLY_SUBMISSION', points: 10, reason: 'Week 2 On-Time Submission — Reviewed & Approved', createdAt: '2026-09-14T21:15:00.000Z' },
  { id: 4, userId: 1, userEmail: 'kavitha@university.edu', projectId: 1, weekNumber: 3, transactionType: 'WEEKLY_SUBMISSION', points: 10, reason: 'Week 3 On-Time Submission — Reviewed & Approved', createdAt: '2026-09-21T18:45:00.000Z' }
];
let nextCreditTxId = 5;

function addDaysToDate(dateStrOrObj, numDays) {
  const d = new Date(dateStrOrObj);
  d.setDate(d.getDate() + numDays);
  return d.toISOString().split('T')[0];
}

function addCreditTransaction(userId, projectId, weekNumber, transactionType, points, reason) {
  const user = users.find(u => u.id === userId || (u.email && u.email.toLowerCase() === (typeof userId === 'string' ? userId.toLowerCase() : '')));
  const targetUserId = user ? user.id : userId;
  const targetUserEmail = user ? user.email : '';

  // Unique constraint check: (targetUserId, projectId, weekNumber, transactionType)
  const exists = creditTransactions.some(t =>
    (t.userId === targetUserId || (t.userEmail && t.userEmail.toLowerCase() === targetUserEmail.toLowerCase())) &&
    t.projectId === parseInt(projectId) &&
    t.weekNumber === parseInt(weekNumber) &&
    t.transactionType === transactionType
  );

  if (exists) {
    console.log(`[Credit Engine] Duplicate credit transaction prevented for user ${targetUserEmail || targetUserId}, project ${projectId}, week ${weekNumber}, type ${transactionType}.`);
    return null;
  }

  const newTx = {
    id: nextCreditTxId++,
    userId: targetUserId,
    userEmail: targetUserEmail,
    projectId: parseInt(projectId),
    weekNumber: parseInt(weekNumber),
    transactionType,
    points: parseInt(points),
    reason,
    createdAt: getAppDateISO()
  };

  creditTransactions.unshift(newTx);

  if (user) {
    user.credits = (user.credits || 0) + parseInt(points);
    user.creditHistory = user.creditHistory || [];
    user.creditHistory.unshift({
      id: newTx.id,
      title: reason,
      points: parseInt(points),
      date: getAppDateFormatted(),
      type: transactionType.toLowerCase()
    });
  }

  return newTx;
}

function getUserTotalCredits(userIdOrEmail) {
  const user = users.find(u => u.id === userIdOrEmail || (u.email && u.email.toLowerCase() === (typeof userIdOrEmail === 'string' ? userIdOrEmail.toLowerCase() : '')));
  if (!user) return 0;
  return creditTransactions
    .filter(t => t.userId === user.id || (t.userEmail && t.userEmail.toLowerCase() === user.email.toLowerCase()))
    .reduce((sum, t) => sum + (t.points || 0), 0);
}

function getUserCreditHistory(userIdOrEmail) {
  const user = users.find(u => u.id === userIdOrEmail || (u.email && u.email.toLowerCase() === (typeof userIdOrEmail === 'string' ? userIdOrEmail.toLowerCase() : '')));
  if (!user) return [];
  return creditTransactions.filter(t => t.userId === user.id || (t.userEmail && t.userEmail.toLowerCase() === user.email.toLowerCase()));
}

// Helper: Log Activity
function logActivity(projectId, actor, action, details) {
  const newLog = {
    id: nextActivityId++,
    projectId: parseInt(projectId),
    actor,
    action,
    details,
    timestamp: getAppDateISO()
  };
  activityLog.unshift(newLog);
  return newLog;
}

// Helper: Add Notification
function addNotification(email, icon, text, route = '/projects') {
  const notif = {
    id: nextNotifId++,
    email,
    icon,
    text,
    time: getAppDateISO(),
    route,
    read: false
  };
  notifications.unshift(notif);
  return notif;
}

// Evaluates deadlines based on current application clock (Simulated or Real)
function evaluateWeeklyDeadlines() {
  const currTime = getCurrentApplicationTime();
  const currDateStr = currTime.toISOString().split('T')[0];

  projects.forEach((p) => {
    if (p.status !== 'IN_PROGRESS' && p.status !== 'APPROVED') return;

    // Check milestones overdue status
    if (p.milestones) {
      p.milestones.forEach((m) => {
        if (m.status !== 'COMPLETED' && m.deadline < currDateStr) {
          m.status = 'OVERDUE';
        }
      });
    }

    p.weeklyReports = p.weeklyReports || [];
    const currentWeekNum = p.currentWeekNumber || (p.weeklyReports.length > 0 ? Math.max(...p.weeklyReports.map(w => w.weekNumber)) : 1);
    p.currentWeekNumber = currentWeekNum;

    let currWeekReport = p.weeklyReports.find(w => w.weekNumber === currentWeekNum);

    if (!currWeekReport) {
      // Automatically create dynamic weekly cycle container
      const prevReport = p.weeklyReports.find(w => w.weekNumber === currentWeekNum - 1);
      const startDate = prevReport?.submittedAt ? prevReport.submittedAt.split('T')[0] : currDateStr;
      const dueDate = prevReport?.dueDate || prevReport?.endDate || addDaysToDate(startDate, 7);

      currWeekReport = {
        weekNumber: currentWeekNum,
        startDate: startDate,
        endDate: dueDate,
        dueDate: dueDate,
        plannedWork: '',
        completedWork: '',
        currentWork: '',
        pendingWork: '',
        blockers: '',
        planNextWeek: '',
        overallProgress: Math.min(100, (p.weeklyReports.length) * 20 + 20),
        submissionStatus: 'NOT_STARTED',
        submittedAt: null,
        lateDays: 0,
        lateReason: '',
        creditPoints: 0,
        memberContributions: (p.teamMembers || []).map(m => ({ studentName: m.name, role: m.role, workCompleted: '', progress: 0 })),
        evidence: {},
        facultyFeedback: null
      };
      p.weeklyReports.push(currWeekReport);
    }

    const dueDate = currWeekReport.dueDate || currWeekReport.endDate || '2026-09-28';

    // Dynamic deadline check based on dueDate
    if (currWeekReport.submissionStatus === 'NOT_STARTED' || currWeekReport.submissionStatus === 'DUE_TODAY' || currWeekReport.submissionStatus === 'OVERDUE') {
      if (currDateStr < dueDate) {
        currWeekReport.submissionStatus = 'NOT_STARTED';
      } else if (currDateStr === dueDate) {
        currWeekReport.submissionStatus = 'DUE_TODAY';
        const exists = notifications.some(n => n.text.includes(`Week ${currentWeekNum}`) && n.text.includes('Due Today') && n.route.includes(`id=${p.id}`));
        if (!exists) {
          (p.teamMembers || []).forEach(m => {
            addNotification(m.email, 'bell', `Weekly Progress Due Today for project "${p.title}" (Week ${currentWeekNum})`, `/projects?id=${p.id}&tab=weekly&week=${currentWeekNum}`);
          });
        }
      } else if (currDateStr > dueDate) {
        currWeekReport.submissionStatus = 'OVERDUE';
        const existsOverdue = notifications.some(n => n.text.includes(`Week ${currentWeekNum}`) && n.text.includes('Overdue') && n.route.includes(`id=${p.id}`));
        if (!existsOverdue) {
          (p.teamMembers || []).forEach(m => {
            addNotification(m.email, 'x', `Weekly Progress Overdue for project "${p.title}" (Week ${currentWeekNum})`, `/projects?id=${p.id}&tab=weekly&week=${currentWeekNum}`);
          });
          if (p.facultyGuide?.email) {
            addNotification(p.facultyGuide.email, 'x', `Weekly Progress Overdue: Team for "${p.title}" missed Week ${currentWeekNum} deadline`, `/projects?id=${p.id}&tab=weekly&week=${currentWeekNum}`);
          }
        }
      }
    }
  });
}

module.exports = {
  predefinedDomains,
  users,
  projects,
  ideas,
  notifications,
  activityLog,
  creditTransactions,
  departments,
  accessTiers,

  // Application Clock
  demoModeActive: () => demoModeActive,
  simulatedDate: () => simulatedDate,
  getCurrentApplicationTime,
  getAppDateISO,
  getAppDateFormatted,
  setSimulatedDate,
  resetRealTime,
  evaluateWeeklyDeadlines,

  // Credit Engine
  addDaysToDate,
  addCreditTransaction,
  getUserTotalCredits,
  getUserCreditHistory,

  // Logging & Notif
  logActivity,
  addNotification,

  getNextProjectId: () => nextProjectId++,
  getNextIdeaId: () => nextIdeaId++,
  getNextRequestId: () => nextRequestId++
};
