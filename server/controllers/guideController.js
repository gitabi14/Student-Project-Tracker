const dataStore = require('../services/dataStore');

exports.getGuideRequests = (req, res) => {
  try {
    const facultyName = req.user.name;

    // Filter projects where this faculty was selected as guide AND status is PENDING/FACULTY_REQUESTED
    const requests = [];
    dataStore.projects.forEach(p => {
      if (
        p.facultyGuide &&
        p.facultyGuide.name.toLowerCase() === facultyName.toLowerCase() &&
        (p.facultyGuide.status === 'FACULTY_REQUESTED' || p.facultyGuide.status === 'PENDING')
      ) {
        requests.push({
          id: p.id,
          projectId: p.id,
          project: p.title,
          student: p.author,
          authorRegNo: p.authorRegNo || '2026CS101',
          dept: p.dept,
          category: p.category,
          type: p.type || 'Internal',
          abstract: p.abstract,
          tech: p.tech || [],
          github: p.github || '',
          doc: p.doc || '',
          ppt: p.ppt || '',
          demo: p.demo || '',
          vercel: p.vercel || '',
          files: p.files || [],
          milestones: p.milestones || [],
          weeklyReports: p.weeklyReports || [],
          teamMembers: p.teamMembers || [],
          status: p.facultyGuide.status,
          requested: p.facultyGuide.requestedAt ? p.facultyGuide.requestedAt.split('T')[0] : 'Just now'
        });
      }
    });

    return res.json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.guideAction = (req, res) => {
  try {
    const { id, accept } = req.body;
    const proj = dataStore.projects.find(p => p.id === parseInt(id));

    if (!proj) {
      return res.status(404).json({ success: false, message: 'Project request not found' });
    }

    // Duplicate processing check: only allow PENDING / FACULTY_REQUESTED requests
    if (!proj.facultyGuide || (proj.facultyGuide.status !== 'FACULTY_REQUESTED' && proj.facultyGuide.status !== 'PENDING')) {
      return res.status(400).json({ success: false, message: 'This Faculty Guide request has already been processed.' });
    }

    if (accept) {
      proj.status = 'IN_PROGRESS';
      if (proj.facultyGuide) {
        proj.facultyGuide.status = 'FACULTY_CONFIRMED';
        proj.facultyGuide.respondedAt = dataStore.getAppDateISO();
      }

      dataStore.logActivity(proj.id, req.user.name, 'FACULTY_ACCEPTED', `Accepted Faculty Guide request for "${proj.title}"`);

      const appDateStr = dataStore.getAppDateFormatted();

      // Notify team members (NO credits awarded at faculty guide acceptance)
      (proj.teamMembers || []).forEach(m => {
        dataStore.addNotification(
          m.email,
          'check',
          `Faculty Guide request accepted for "${proj.title}" by ${req.user.name}. Project development started!`,
          `/projects?id=${proj.id}`
        );
      });

      // Initialize Dynamic Week 1 Cycle if not already present
      proj.weeklyReports = proj.weeklyReports || [];
      if (!proj.weeklyReports.some(w => w.weekNumber === 1)) {
        const week1Start = appDateStr;
        const week1Due = dataStore.addDaysToDate(week1Start, 7);
        proj.weeklyReports.push({
          weekNumber: 1,
          startDate: week1Start,
          endDate: week1Due,
          dueDate: week1Due,
          plannedWork: '',
          completedWork: '',
          currentWork: '',
          pendingWork: '',
          blockers: '',
          planNextWeek: '',
          overallProgress: 10,
          submissionStatus: 'NOT_STARTED',
          submittedAt: null,
          lateDays: 0,
          lateReason: '',
          creditPoints: 0,
          memberContributions: (proj.teamMembers || []).map(m => ({ studentName: m.name, role: m.role, workCompleted: '', progress: 0 })),
          evidence: {},
          facultyFeedback: null
        });
        proj.currentWeekNumber = 1;
      }

      return res.json({ success: true, message: `Faculty Guide request accepted for "${proj.title}". Project started!` });
    } else {
      proj.status = 'FACULTY_DECLINED';
      if (proj.facultyGuide) {
        proj.facultyGuide.status = 'FACULTY_DECLINED';
        proj.facultyGuide.respondedAt = dataStore.getAppDateISO();
      }

      dataStore.logActivity(proj.id, req.user.name, 'FACULTY_DECLINED', `Declined Faculty Guide request for "${proj.title}"`);

      // Notify Team Members
      (proj.teamMembers || []).forEach(m => {
        dataStore.addNotification(
          m.email,
          'x',
          `${req.user.name} declined Faculty Guide request for "${proj.title}". Please select another faculty guide.`,
          '/projects'
        );
      });

      return res.json({ success: true, message: `Declined request for "${proj.title}". Students notified to select another faculty member.` });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
