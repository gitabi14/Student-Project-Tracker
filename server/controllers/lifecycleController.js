const dataStore = require('../services/dataStore');

// 1. Search students from database by name or register number
exports.searchStudents = (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      const allStudents = dataStore.users
        .filter(u => u.role === 'Student')
        .map(u => ({ id: u.id, name: u.name, regNo: u.regNo || `REG${u.id}`, dept: u.dept, email: u.email }));
      return res.json({ success: true, students: allStudents });
    }

    const q = query.toLowerCase().trim();
    const matches = dataStore.users.filter(u => {
      if (u.role !== 'Student') return false;
      const reg = u.regNo ? u.regNo.toLowerCase() : '';
      return u.name.toLowerCase().includes(q) || reg.includes(q) || u.dept.toLowerCase().includes(q);
    }).map(u => ({ id: u.id, name: u.name, regNo: u.regNo || `REG${u.id}`, dept: u.dept, email: u.email }));

    return res.json({ success: true, students: matches });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Search available faculty guides showing expertise & current workload
exports.searchFacultyGuides = (req, res) => {
  try {
    const { domain } = req.query;
    const facultyList = dataStore.users.filter(u => u.role === 'Faculty').map(f => {
      // Calculate current assigned projects count
      const activeCount = dataStore.projects.filter(p => p.facultyGuide && p.facultyGuide.name === f.name && p.status !== 'COMPLETED').length;
      return {
        id: f.id,
        name: f.name,
        dept: f.dept,
        email: f.email,
        specializations: f.specializations || [f.domain_of_interest],
        currentProjectsCount: activeCount,
        maxThreshold: f.maxPendingThreshold || 10,
        availabilityStatus: activeCount < (f.maxPendingThreshold || 10) ? 'Available' : 'Busy'
      };
    });

    if (domain && domain !== 'all') {
      const filtered = facultyList.filter(f => f.specializations.some(s => s.toLowerCase() === domain.toLowerCase()));
      return res.json({ success: true, faculty: filtered });
    }

    return res.json({ success: true, faculty: facultyList });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Milestone CRUD & Progress Calculation
exports.createMilestone = (req, res) => {
  try {
    const { projectId, title, description, startDate, deadline, assignedMembers } = req.body;
    const project = dataStore.projects.find(p => p.id === parseInt(projectId));

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.milestones = project.milestones || [];
    const newId = Date.now();
    const newMilestone = {
      id: newId,
      title,
      description,
      startDate: startDate || dataStore.getAppDateFormatted(),
      deadline: deadline || dataStore.getAppDateFormatted(),
      assignedMembers: Array.isArray(assignedMembers) ? assignedMembers : [],
      progress: 0,
      status: 'PENDING'
    };

    project.milestones.push(newMilestone);
    dataStore.logActivity(project.id, req.user.name, 'MILESTONE_CREATED', `Created milestone "${title}"`);

    return res.status(201).json({ success: true, milestone: newMilestone, message: 'Milestone created' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMilestoneStatus = (req, res) => {
  try {
    const { milestoneId, progress, status } = req.body;
    let targetProject = null;
    let targetMilestone = null;

    dataStore.projects.forEach(p => {
      if (p.milestones) {
        const found = p.milestones.find(m => m.id === parseInt(milestoneId));
        if (found) {
          targetProject = p;
          targetMilestone = found;
        }
      }
    });

    if (!targetMilestone || !targetProject) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    if (progress !== undefined) targetMilestone.progress = parseInt(progress);
    if (status) targetMilestone.status = status;

    if (targetMilestone.progress === 100) {
      targetMilestone.status = 'COMPLETED';
    }

    dataStore.logActivity(targetProject.id, req.user.name, 'MILESTONE_UPDATED', `Updated "${targetMilestone.title}" to ${targetMilestone.progress}% (${targetMilestone.status})`);

    // Recalculate project overall progress based on milestones
    if (targetProject.milestones && targetProject.milestones.length > 0) {
      const sum = targetProject.milestones.reduce((acc, m) => acc + (m.progress || 0), 0);
      const overall = Math.round(sum / targetProject.milestones.length);
      targetProject.overallProgress = overall;
    }

    return res.json({ success: true, milestone: targetMilestone, message: 'Milestone updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Submit Weekly Progress Report
exports.submitWeeklyReport = (req, res) => {
  try {
    const { projectId, weekNumber, plannedWork, completedWork, currentWork, pendingWork, blockers, planNextWeek, overallProgress, memberContributions, githubLink, notes, lateReason } = req.body;
    const project = dataStore.projects.find(p => p.id === parseInt(projectId));

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const appDateStr = dataStore.getAppDateFormatted();
    project.weeklyReports = project.weeklyReports || [];
    let reportIndex = project.weeklyReports.findIndex(w => w.weekNumber === parseInt(weekNumber));

    let existingReport = reportIndex !== -1 ? project.weeklyReports[reportIndex] : null;
    const dueDate = existingReport?.dueDate || existingReport?.endDate || '2026-09-28';
    const isLate = appDateStr > dueDate;

    if (isLate && (!lateReason || !lateReason.trim())) {
      return res.status(400).json({ success: false, message: 'Reason for Late Submission is required for overdue weekly reports.' });
    }

    const submissionStatus = isLate ? 'LATE_REQUEST_PENDING' : 'SUBMITTED';

    // Preserve previous review history if resubmitting after CHANGES_REQUESTED
    const reviewHistory = existingReport?.reviewHistory || [];
    if (existingReport && existingReport.submissionStatus === 'CHANGES_REQUESTED') {
      reviewHistory.unshift({
        id: Date.now(),
        author: req.user.name,
        decision: 'STUDENT_RESUBMITTED',
        comment: 'Student updated and resubmitted report after requested changes.',
        timestamp: dataStore.getAppDateISO(),
        creditPoints: 0
      });
    }

    const updatedReport = {
      weekNumber: parseInt(weekNumber),
      startDate: existingReport?.startDate || '2026-09-22',
      endDate: dueDate,
      dueDate: dueDate,
      plannedWork,
      completedWork,
      currentWork,
      pendingWork,
      blockers: blockers || 'None',
      planNextWeek,
      overallProgress: parseInt(overallProgress) || 50,
      submissionStatus: submissionStatus,
      submittedAt: dataStore.getAppDateISO(),
      submittedBy: req.user.name,
      lateDays: isLate ? Math.max(1, Math.ceil((new Date(appDateStr) - new Date(dueDate)) / (1000 * 60 * 60 * 24))) : 0,
      lateReason: isLate ? lateReason.trim() : '',
      creditPoints: 0, // Credits awarded ONLY after Faculty Approval
      memberContributions: Array.isArray(memberContributions) ? memberContributions : [],
      evidence: { githubLink, notes },
      facultyFeedback: existingReport?.facultyFeedback || null,
      reviewHistory: reviewHistory
    };

    if (reportIndex !== -1) {
      project.weeklyReports[reportIndex] = updatedReport;
    } else {
      project.weeklyReports.push(updatedReport);
    }

    if (!isLate) {
      const isResubmission = existingReport && existingReport.submissionStatus === 'CHANGES_REQUESTED';
      dataStore.logActivity(
        project.id,
        req.user.name,
        'WEEKLY_SUBMITTED',
        `Submitted Week ${weekNumber} Progress Report ${isResubmission ? '(Resubmission after changes requested)' : '(Awaiting Faculty Review)'}`
      );

      // Notify Faculty Guide
      if (project.facultyGuide && project.facultyGuide.email) {
        dataStore.addNotification(
          project.facultyGuide.email,
          'chat',
          isResubmission
            ? `Week ${weekNumber} has been resubmitted after requested changes for "${project.title}" by ${req.user.name}.`
            : `Weekly Progress Submitted: Week ${weekNumber} progress has been submitted for "${project.title}" by ${req.user.name}.`,
          `/projects?id=${project.id}&tab=weekly&week=${weekNumber}`
        );
      }

      return res.status(200).json({
        success: true,
        report: updatedReport,
        creditsAwarded: 0,
        message: `Week ${weekNumber} progress report submitted successfully. Awaiting Faculty Review.`
      });
    } else {
      // LATE SUBMISSION FLOW:
      dataStore.logActivity(project.id, req.user.name, 'LATE_SUBMISSION_REQUESTED', `Submitted Late Request for Week ${weekNumber} (Reason: ${lateReason})`);

      // Send RED Persistent Notification to Faculty Guide
      if (project.facultyGuide && project.facultyGuide.email) {
        dataStore.addNotification(
          project.facultyGuide.email,
          'bell',
          `🔴 LATE WEEKLY REPORT REQUEST for Week ${weekNumber} of "${project.title}" by ${req.user.name}. Reason: "${lateReason}"`,
          `/projects?id=${project.id}&tab=weekly&week=${weekNumber}&lateRequest=true`
        );
      }

      return res.status(200).json({
        success: true,
        report: updatedReport,
        isLateRequest: true,
        message: `Late submission request for Week ${weekNumber} sent to your Faculty Guide for review.`
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Faculty Review / Action on Late Submission Request (MANDATORY COMMENT REQUIRED)
exports.respondLateRequest = (req, res) => {
  try {
    const { projectId, weekNumber, approve, rejectReason, feedbackText, comment } = req.body;
    const project = dataStore.projects.find(p => p.id === parseInt(projectId));

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const report = (project.weeklyReports || []).find(w => w.weekNumber === parseInt(weekNumber));
    if (!report) {
      return res.status(404).json({ success: false, message: 'Weekly report not found' });
    }

    // MANDATORY COMMENT VALIDATION
    const commentText = feedbackText || rejectReason || comment || '';
    if (!commentText || !commentText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Faculty review comment is required before taking action on a weekly report.'
      });
    }

    const appDateStr = dataStore.getAppDateFormatted();
    report.reviewHistory = report.reviewHistory || [];

    if (approve) {
      report.submissionStatus = 'REVIEWED';
      report.creditPoints = 5;

      const reviewEntry = {
        id: Date.now(),
        author: req.user.name,
        decision: 'LATE_APPROVED',
        comment: commentText.trim(),
        timestamp: dataStore.getAppDateISO(),
        creditPoints: 5
      };

      report.facultyFeedback = {
        author: req.user.name,
        text: commentText.trim(),
        decision: 'LATE_APPROVED',
        time: dataStore.getAppDateISO()
      };
      report.reviewHistory.unshift(reviewEntry);

      // Award +5 Late Approved Credits to all team members (with anti-duplicate protection)
      (project.teamMembers || []).forEach(m => {
        dataStore.addCreditTransaction(
          m.email,
          project.id,
          weekNumber,
          'WEEKLY_LATE_SUBMISSION',
          5,
          `Late Week ${weekNumber} Submission Approved by Faculty Guide: "${project.title}"`
        );
      });

      // AUTOMATIC NEXT WEEK CYCLE CREATION (Week X + 1)
      const nextWeekNum = parseInt(weekNumber) + 1;
      const nextWeekExists = project.weeklyReports.some(w => w.weekNumber === nextWeekNum);
      if (!nextWeekExists) {
        const nextStartDate = appDateStr;
        const nextDueDate = dataStore.addDaysToDate(nextStartDate, 7);
        project.weeklyReports.push({
          weekNumber: nextWeekNum,
          startDate: nextStartDate,
          endDate: nextDueDate,
          dueDate: nextDueDate,
          plannedWork: '',
          completedWork: '',
          currentWork: '',
          pendingWork: '',
          blockers: '',
          planNextWeek: '',
          overallProgress: report.overallProgress || 50,
          submissionStatus: 'NOT_STARTED',
          submittedAt: null,
          lateDays: 0,
          lateReason: '',
          creditPoints: 0,
          memberContributions: (project.teamMembers || []).map(m => ({ studentName: m.name, role: m.role, workCompleted: '', progress: 0 })),
          evidence: {},
          facultyFeedback: null,
          reviewHistory: []
        });
        project.currentWeekNumber = nextWeekNum;
      }

      dataStore.logActivity(project.id, req.user.name, 'LATE_REQUEST_APPROVED', `Faculty approved Late Request for Week ${weekNumber} (+5 Credits)`);

      // Notify Team Members
      (project.teamMembers || []).forEach(m => {
        dataStore.addNotification(
          m.email,
          'check',
          `Your Week ${weekNumber} late submission request has been approved by Faculty Guide (${req.user.name}). +5 credits awarded!`,
          `/projects?id=${project.id}&tab=weekly&week=${weekNumber}`
        );
      });

      return res.json({ success: true, report, creditsAwarded: 5, message: `Late submission request approved for Week ${weekNumber}. +5 credits awarded.` });
    } else {
      report.submissionStatus = 'LATE_REJECTED';

      const reviewEntry = {
        id: Date.now(),
        author: req.user.name,
        decision: 'LATE_REJECTED',
        comment: commentText.trim(),
        timestamp: dataStore.getAppDateISO(),
        creditPoints: 0
      };

      report.facultyFeedback = {
        author: req.user.name,
        text: commentText.trim(),
        decision: 'LATE_REJECTED',
        time: dataStore.getAppDateISO()
      };
      report.reviewHistory.unshift(reviewEntry);

      dataStore.logActivity(project.id, req.user.name, 'LATE_REQUEST_REJECTED', `Faculty rejected Late Request for Week ${weekNumber}`);

      (project.teamMembers || []).forEach(m => {
        dataStore.addNotification(
          m.email,
          'x',
          `Your Week ${weekNumber} late submission request was rejected by Faculty Guide (${req.user.name}). Feedback: "${commentText.trim()}"`,
          `/projects?id=${project.id}&tab=weekly&week=${weekNumber}`
        );
      });

      return res.json({ success: true, report, message: `Late submission request rejected for Week ${weekNumber}.` });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Faculty Review Weekly Progress Report Feedback & Approval (MANDATORY COMMENT REQUIRED)
exports.reviewWeeklyReport = (req, res) => {
  try {
    const { projectId, weekNumber, approve, feedbackText, comment } = req.body;
    const project = dataStore.projects.find(p => p.id === parseInt(projectId));

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const report = (project.weeklyReports || []).find(w => w.weekNumber === parseInt(weekNumber));
    if (!report) {
      return res.status(404).json({ success: false, message: 'Weekly report not found' });
    }

    // MANDATORY COMMENT VALIDATION
    const commentText = feedbackText || comment || '';
    if (!commentText || !commentText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Faculty review comment is required before taking action on a weekly report.'
      });
    }

    const appDateStr = dataStore.getAppDateFormatted();
    report.reviewHistory = report.reviewHistory || [];

    if (approve) {
      report.submissionStatus = 'REVIEWED';
      report.creditPoints = 10;

      const reviewEntry = {
        id: Date.now(),
        author: req.user.name,
        decision: 'APPROVED',
        comment: commentText.trim(),
        timestamp: dataStore.getAppDateISO(),
        creditPoints: 10
      };

      report.facultyFeedback = {
        author: req.user.name,
        text: commentText.trim(),
        decision: 'APPROVED',
        time: dataStore.getAppDateISO()
      };
      report.reviewHistory.unshift(reviewEntry);

      // Award +10 On-Time Weekly Credits to all team members ONLY AFTER Faculty Approval
      (project.teamMembers || []).forEach(m => {
        dataStore.addCreditTransaction(
          m.email,
          project.id,
          weekNumber,
          'WEEKLY_SUBMISSION',
          10,
          `Week ${weekNumber} On-Time Submission Approved by Faculty Guide: "${project.title}"`
        );
      });

      // AUTOMATIC NEXT WEEK CYCLE CREATION (Week X + 1)
      const nextWeekNum = parseInt(weekNumber) + 1;
      const nextWeekExists = project.weeklyReports.some(w => w.weekNumber === nextWeekNum);
      if (!nextWeekExists) {
        const nextStartDate = appDateStr;
        const nextDueDate = dataStore.addDaysToDate(nextStartDate, 7);
        project.weeklyReports.push({
          weekNumber: nextWeekNum,
          startDate: nextStartDate,
          endDate: nextDueDate,
          dueDate: nextDueDate,
          plannedWork: '',
          completedWork: '',
          currentWork: '',
          pendingWork: '',
          blockers: '',
          planNextWeek: '',
          overallProgress: report.overallProgress || 50,
          submissionStatus: 'NOT_STARTED',
          submittedAt: null,
          lateDays: 0,
          lateReason: '',
          creditPoints: 0,
          memberContributions: (project.teamMembers || []).map(m => ({ studentName: m.name, role: m.role, workCompleted: '', progress: 0 })),
          evidence: {},
          facultyFeedback: null,
          reviewHistory: []
        });
        project.currentWeekNumber = nextWeekNum;
      }

      dataStore.logActivity(project.id, req.user.name, 'WEEKLY_REVIEWED', `Faculty approved Week ${weekNumber} Report (+10 Credits Awarded)`);

      // Notify Team Members
      (project.teamMembers || []).forEach(m => {
        dataStore.addNotification(
          m.email,
          'check',
          `Week ${weekNumber} progress has been approved by ${req.user.name}. +10 credits awarded!`,
          `/projects?id=${project.id}&tab=weekly&week=${weekNumber}`
        );
      });

      return res.json({ success: true, report, creditsAwarded: 10, message: `Week ${weekNumber} report approved with feedback. +10 credits awarded.` });
    } else {
      report.submissionStatus = 'CHANGES_REQUESTED';

      const reviewEntry = {
        id: Date.now(),
        author: req.user.name,
        decision: 'CHANGES_REQUESTED',
        comment: commentText.trim(),
        timestamp: dataStore.getAppDateISO(),
        creditPoints: 0
      };

      report.facultyFeedback = {
        author: req.user.name,
        text: commentText.trim(),
        decision: 'CHANGES_REQUESTED',
        time: dataStore.getAppDateISO()
      };
      report.reviewHistory.unshift(reviewEntry);

      dataStore.logActivity(project.id, req.user.name, 'WEEKLY_REVIEWED', `Faculty requested changes for Week ${weekNumber}`);

      (project.teamMembers || []).forEach(m => {
        dataStore.addNotification(
          m.email,
          'x',
          `Changes have been requested for Week ${weekNumber} by ${req.user.name}. Feedback: "${commentText.trim()}"`,
          `/projects?id=${project.id}&tab=weekly&week=${weekNumber}`
        );
      });

      return res.json({ success: true, report, message: `Changes requested from team for Week ${weekNumber}.` });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 7. Complete Project (+50 Credits ONLY AFTER Final Completion)
exports.completeProject = (req, res) => {
  try {
    const { projectId } = req.body;
    const project = dataStore.projects.find(p => p.id === parseInt(projectId));

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check completion requirements
    const uncompletedMilestones = (project.milestones || []).filter(m => m.status !== 'COMPLETED');
    if (uncompletedMilestones.length > 0) {
      return res.status(400).json({ success: false, message: `Cannot complete project. ${uncompletedMilestones.length} milestone(s) remain incomplete.` });
    }

    const unreviewedReports = (project.weeklyReports || []).filter(w => w.submissionStatus === 'SUBMITTED' || w.submissionStatus === 'LATE_REQUEST_PENDING' || w.submissionStatus === 'CHANGES_REQUESTED');
    if (unreviewedReports.length > 0) {
      return res.status(400).json({ success: false, message: `Cannot complete project. ${unreviewedReports.length} weekly report(s) are pending review or changes.` });
    }

    project.status = 'COMPLETED';
    dataStore.logActivity(project.id, req.user.name, 'PROJECT_COMPLETED', `Project "${project.title}" officially marked COMPLETED by Faculty Guide (+50 Credits Awarded)`);

    // Award +50 Project Completion Credits to all team members
    (project.teamMembers || []).forEach(m => {
      dataStore.addCreditTransaction(
        m.email,
        project.id,
        999,
        'PROJECT_COMPLETION',
        50,
        `Final Project Completed: "${project.title}"`
      );

      dataStore.addNotification(
        m.email,
        'award',
        `🎉 Project "${project.title}" has been officially COMPLETED! +50 completion credits awarded!`,
        `/projects?id=${project.id}`
      );
    });

    return res.json({ success: true, project, message: 'Project officially completed! +50 project completion credits awarded.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 8. Get User Credits & Credit History Ledger
exports.getUserCredits = (req, res) => {
  try {
    const userIdOrEmail = req.user ? req.user.email : '';
    const totalCredits = dataStore.getUserTotalCredits(userIdOrEmail);
    const history = dataStore.getUserCreditHistory(userIdOrEmail);

    return res.json({
      success: true,
      totalCredits,
      history
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
