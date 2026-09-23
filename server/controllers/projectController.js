const dataStore = require('../services/dataStore');

function checkProjectAccess(p, currentUser) {
  return true; // Full lifecycle visibility for active student development platform
}

exports.getProjects = (req, res) => {
  try {
    dataStore.evaluateWeeklyDeadlines();
    let { filter, domain, search, sort, page = 1, limit = 50 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    let list = dataStore.projects.filter(p => {
      // Type Filter
      if (filter && filter !== 'all' && p.type.toLowerCase() !== filter.toLowerCase()) return false;
      
      // Domain Filter
      if (domain && domain !== 'all') {
        if (domain === 'Other') {
          if (!p.category.toLowerCase().startsWith('other')) return false;
        } else if (p.category.toLowerCase() !== domain.toLowerCase()) {
          return false;
        }
      }

      // Search Filter
      if (search) {
        const q = search.toLowerCase();
        const techStr = p.tech ? p.tech.join(' ').toLowerCase() : '';
        const hay = `${p.title} ${p.author} ${p.dept} ${p.category} ${techStr}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sortFns = {
      latest: (a, b) => b.id - a.id,
      popular: (a, b) => (b.views * 1.0) - (a.views * 1.0),
      views: (a, b) => b.views - a.views
    };

    list.sort(sortFns[sort] || sortFns.latest);

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginatedList = list.slice(startIndex, startIndex + limit);

    return res.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      appDateFormatted: dataStore.getAppDateFormatted(),
      projects: paginatedList
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProjectById = (req, res) => {
  try {
    dataStore.evaluateWeeklyDeadlines();
    const id = parseInt(req.params.id);
    const project = dataStore.projects.find(p => p.id === id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    project.views += 1;
    return res.json({ success: true, project, appDateFormatted: dataStore.getAppDateFormatted() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

function normalizeUrl(str) {
  if (!str || !str.trim()) return '';
  let val = str.trim();
  if (!val.startsWith('http://') && !val.startsWith('https://')) {
    val = 'https://' + val.replace(/^\/+/, '');
  }
  return val;
}

exports.submitProject = (req, res) => {
  try {
    const { title, category, customDomainName, tech, abstract, github, doc, ppt, cert, demo, vercel, type, selectedFacultyGuide, teamMembers, initialMilestones } = req.body;
    const user = dataStore.users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());

    if (!title || !category || !tech || !abstract || !type) {
      return res.status(400).json({ success: false, message: 'Title, domain category, tech stack, abstract, and project type are required' });
    }

    const normGithub = normalizeUrl(github);
    const normDoc = normalizeUrl(doc);
    const normPpt = normalizeUrl(ppt);
    const normCert = normalizeUrl(cert);
    const normDemo = normalizeUrl(demo);
    const normVercel = normalizeUrl(vercel);

    const techArray = Array.isArray(tech) ? tech : tech.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const newId = dataStore.getNextProjectId();

    let uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      uploadedFiles = req.files.map(f => ({
        fileName: f.originalname,
        filePath: f.path.replace(/\\/g, '/'),
        fileType: f.mimetype
      }));
    }

    // Parse team members JSON if passed as string (e.g. multipart/form-data)
    let parsedTeamMembers = [];
    if (teamMembers) {
      parsedTeamMembers = typeof teamMembers === 'string' ? JSON.parse(teamMembers) : teamMembers;
    } else {
      parsedTeamMembers = [{ name: user ? user.name : 'Student', regNo: user ? user.regNo || '2026CS101' : 'REG101', role: 'Team Leader', dept: user ? user.dept : 'Computer Science', email: user ? user.email : 'student@university.edu' }];
    }

    // Parse initial milestones
    let parsedMilestones = [];
    if (initialMilestones) {
      parsedMilestones = typeof initialMilestones === 'string' ? JSON.parse(initialMilestones) : initialMilestones;
    } else {
      parsedMilestones = [
        { id: 1, title: 'Requirement Analysis & Architecture Setup', description: 'Define database schema and core API specifications.', startDate: dataStore.getAppDateFormatted(), deadline: '2026-09-28', assignedMembers: [user ? user.name : 'Student'], progress: 0, status: 'PENDING' }
      ];
    }

    // Selected Faculty Guide
    const chosenFacultyName = selectedFacultyGuide || 'Dr. Arumugam Pillai';
    const facultyUser = dataStore.users.find(u => u.name === chosenFacultyName);

    const newProj = {
      id: newId,
      type,
      status: 'AWAITING_FACULTY',
      title,
      author: user ? user.name : 'Student',
      authorRegNo: user ? user.regNo || '2026CS101' : '2026CS101',
      dept: user ? user.dept : 'Computer Science',
      category,
      likes: 0,
      commentsCount: 0,
      views: 0,
      clones: 0,
      liked: false,
      abstract,
      github: normGithub,
      doc: normDoc,
      ppt: normPpt,
      cert: normCert,
      demo: normDemo,
      vercel: normVercel,
      tech: techArray,
      teamMembers: parsedTeamMembers,
      facultyGuide: {
        name: chosenFacultyName,
        email: facultyUser ? facultyUser.email : 'arumugam@university.edu',
        status: 'FACULTY_REQUESTED',
        requestedAt: dataStore.getAppDateISO(),
        respondedAt: null
      },
      milestones: parsedMilestones,
      currentWeekNumber: 1,
      weeklyReports: [],
      files: uploadedFiles,
      comments: []
    };

    dataStore.projects.unshift(newProj);

    // Log Activity Audit
    dataStore.logActivity(newId, user ? user.name : 'Student', 'PROJECT_REGISTERED', `Registered project "${title}"`);

    // Notify Selected Faculty Guide
    dataStore.addNotification(
      facultyUser ? facultyUser.email : 'arumugam@university.edu',
      'bell',
      `New Project Registration Request: "${title}" by ${user ? user.name : 'Student'}. Accept as Faculty Guide?`,
      '/guides'
    );

    // Notify Team Members
    parsedTeamMembers.forEach(m => {
      if (m.email && m.email !== (user ? user.email : '')) {
        dataStore.addNotification(
          m.email,
          'users',
          `You have been added to team for project "${title}" as ${m.role}`,
          '/projects'
        );
      }
    });

    return res.status(201).json({
      success: true,
      message: `Project registered — Faculty Guide request sent to ${chosenFacultyName}`,
      project: newProj
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.publishIdea = (req, res) => {
  try {
    const { title, category, tech, description } = req.body;
    const user = dataStore.users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());

    if (!title || !category || !tech || !description) {
      return res.status(400).json({ success: false, message: 'Title, category, tech stack, and description are required' });
    }

    const techArray = Array.isArray(tech) ? tech : tech.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const newId = dataStore.getNextProjectId();

    const newIdea = {
      id: newId,
      type: 'Idea',
      status: 'PLANNING',
      title,
      author: user.name,
      dept: user.dept,
      category,
      likes: 0,
      commentsCount: 0,
      views: 0,
      abstract: description,
      description,
      tech: techArray,
      teamMembers: [{ name: user.name, regNo: user.regNo || '2026CS101', role: 'Idea Creator', dept: user.dept, email: user.email }],
      milestones: [],
      weeklyReports: [],
      comments: []
    };

    dataStore.projects.unshift(newIdea);
    user.credits = (user.credits || 0) + 5;

    dataStore.logActivity(newId, user.name, 'IDEA_PUBLISHED', `Published idea "${title}"`);

    return res.status(201).json({
      success: true,
      message: 'Idea published successfully',
      project: newIdea
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleLike = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const p = dataStore.projects.find(x => x.id === id);
    if (!p) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    p.liked = !p.liked;
    p.likes += p.liked ? 1 : -1;
    return res.json({ success: true, likes: p.likes, liked: p.liked });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.postComment = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { text } = req.body;
    const user = dataStore.users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text cannot be empty' });
    }

    const p = dataStore.projects.find(x => x.id === id);
    if (!p) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    p.comments = p.comments || [];
    const newComment = {
      id: p.comments.length + 1,
      author: user.name,
      text: text.trim(),
      time: 'Just now'
    };

    p.comments.push(newComment);
    p.commentsCount = p.comments.length;

    return res.status(201).json({ success: true, comment: newComment, commentsCount: p.commentsCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.reportProject = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { category, reason } = req.body;
    const p = dataStore.projects.find(x => x.id === id);
    if (!p) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const user = dataStore.users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());
    const assignedFaculty = p.facultyGuide?.name || 'Dr. Arumugam Pillai';

    const reportObj = {
      id: Date.now(),
      projectId: p.id,
      projectTitle: p.title,
      reporter: user ? user.name : 'User',
      reporterEmail: user ? user.email : '',
      category: category || 'General Violation',
      reason: reason || 'Inappropriate or non-compliant content',
      status: 'Pending',
      assignedFaculty,
      createdAt: 'Just now'
    };

    if (!dataStore.reports) dataStore.reports = [];
    dataStore.reports.unshift(reportObj);

    dataStore.addNotification(
      assignedFaculty,
      'bell',
      `Report assigned for review: "${p.title}" reported by ${user ? user.name : 'User'}: ${category || 'Violation'}`,
      '/reviews?tab=reports'
    );

    return res.json({ success: true, message: `Report filed — assigned to ${assignedFaculty} for faculty investigation` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProject = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = dataStore.projects.findIndex(x => x.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const deleted = dataStore.projects.splice(index, 1)[0];
    return res.json({ success: true, message: `Project "${deleted.title}" removed successfully` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.cloneProject = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const p = dataStore.projects.find(x => x.id === id);
    if (!p) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    p.clones = (p.clones || 0) + 1;
    return res.json({ success: true, message: 'Clone recorded', clones: p.clones });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
