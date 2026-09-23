const dataStore = require('../services/dataStore');

exports.getReviews = (req, res) => {
  try {
    const userName = req.user ? req.user.name : '';
    const userRole = req.user ? req.user.role : '';

    let reviews = [];
    let reports = [];

    if (userRole === 'Administrator') {
      reviews = dataStore.reviewQueue;
      reports = dataStore.reports || [];
    } else if (userRole === 'Faculty') {
      reviews = dataStore.reviewQueue.filter(r => r.faculty && r.faculty.toLowerCase() === userName.toLowerCase());
      reports = (dataStore.reports || []).filter(rep => rep.assignedFaculty && rep.assignedFaculty.toLowerCase() === userName.toLowerCase());
    } else {
      reviews = dataStore.reviewQueue.filter(r => r.author && r.author.toLowerCase() === userName.toLowerCase());
    }

    return res.json({ success: true, reviews, reports });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.reviewAction = (req, res) => {
  try {
    const { id, approve, feedback } = req.body;

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Faculty review comment is required before taking action.'
      });
    }

    const r = dataStore.reviewQueue.find(x => x.id === parseInt(id));

    if (!r) {
      return res.status(404).json({ success: false, message: 'Review item not found' });
    }

    dataStore.reviewQueue = dataStore.reviewQueue.filter(x => x.id !== parseInt(id));
    const authorUser = dataStore.users.find(u => u.name === r.author);
    const facultyUser = dataStore.users.find(u => u.name === req.user.name);

    if (r.isEnhancement) {
      const proj = dataStore.projects.find(p => p.id === r.projectId);
      if (approve) {
        if (proj) {
          proj.enhancements = proj.enhancements || [];
          proj.enhancements.push({
            title: r.enhancementTitle,
            details: r.details + (feedback ? ` | Faculty Note: ${feedback}` : ''),
            author: r.author
          });

          const ownerUser = dataStore.users.find(u => u.name === proj.author);
          if (ownerUser) {
            ownerUser.credits = (ownerUser.credits || 0) + 10;
            ownerUser.creditHistory = ownerUser.creditHistory || [];
            ownerUser.creditHistory.unshift({
              id: Date.now(),
              title: `Project Enhanced: "${proj.title}" by ${r.author}`,
              points: 10,
              date: new Date().toISOString().split('T')[0],
              type: 'enhancement'
            });
            dataStore.notifications.unshift({
              id: dataStore.notifications.length + 1,
              email: ownerUser.email,
              icon: 'award',
              text: `Your project "${proj.title}" was enhanced by ${r.author}. +10 credits awarded.${feedback ? ` Faculty Note: "${feedback}"` : ''}`,
              time: 'Just now'
            });
          }
          if (authorUser) {
            authorUser.credits = (authorUser.credits || 0) + 10;
            authorUser.creditHistory = authorUser.creditHistory || [];
            authorUser.creditHistory.unshift({
              id: Date.now() + 1,
              title: `Approved Enhancement on "${proj.title}"`,
              points: 10,
              date: new Date().toISOString().split('T')[0],
              type: 'enhancement'
            });
            dataStore.notifications.unshift({
              id: dataStore.notifications.length + 1,
              email: authorUser.email,
              icon: 'award',
              text: `Your enhancement on "${proj.title}" was approved. +10 credits awarded.${feedback ? ` Faculty Note: "${feedback}"` : ''}`,
              time: 'Just now'
            });
          }
        }
        return res.json({ success: true, message: 'Enhancement approved! +10 credits awarded' });
      } else {
        if (authorUser) {
          dataStore.notifications.unshift({
            id: dataStore.notifications.length + 1,
            email: authorUser.email,
            icon: 'x',
            text: `Your enhancement was rejected.${feedback ? ` Feedback: "${feedback}"` : ''}`,
            time: 'Just now'
          });
        }
        return res.json({ success: true, message: 'Enhancement rejected' });
      }
    } else {
      const proj = dataStore.projects.find(p => p.id === parseInt(id));
      const credits = (r.type === 'External') ? 20 : 15;

      if (approve) {
        if (proj) {
          proj.status = 'Approved';
          if (feedback) {
            proj.comments = proj.comments || [];
            proj.comments.push({
              id: Date.now(),
              author: req.user.name,
              text: `Faculty Review Feedback: ${feedback}`,
              time: 'Just now'
            });
          }
        }
        if (authorUser) {
          authorUser.credits = (authorUser.credits || 0) + credits;
          authorUser.approved_projects = (authorUser.approved_projects || 0) + 1;
          authorUser.creditHistory = authorUser.creditHistory || [];
          authorUser.creditHistory.unshift({
            id: Date.now(),
            title: `Project Approved: "${r.title}"`,
            points: credits,
            date: new Date().toISOString().split('T')[0],
            type: 'approval'
          });
          dataStore.notifications.unshift({
            id: dataStore.notifications.length + 1,
            email: authorUser.email,
            icon: 'star',
            text: `Your project "${r.title}" was approved! +${credits} credits awarded.${feedback ? ` Faculty Feedback: "${feedback}"` : ''}`,
            time: 'Just now',
            route: '/profile'
          });
        }
        return res.json({ success: true, message: `${r.title} approved — +${credits} credits awarded to ${r.author}` });
      } else {
        if (proj) {
          proj.status = 'Changes Requested';
          if (feedback) {
            proj.comments = proj.comments || [];
            proj.comments.push({
              id: Date.now(),
              author: req.user.name,
              text: `Faculty Review Feedback (Changes Requested): ${feedback}`,
              time: 'Just now'
            });
          }
        }
        if (authorUser) {
          dataStore.notifications.unshift({
            id: dataStore.notifications.length + 1,
            email: authorUser.email,
            icon: 'x',
            text: `Your project "${r.title}" needs changes.${feedback ? ` Feedback: "${feedback}"` : ''}`,
            time: 'Just now',
            route: '/projects'
          });
        }
        return res.json({ success: true, message: `${r.title} sent back for changes with feedback` });
      }
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
