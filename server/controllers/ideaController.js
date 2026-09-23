const dataStore = require('../services/dataStore');

// 1. Get all published ideas for all authenticated users
exports.getIdeas = (req, res) => {
  try {
    const { category, search } = req.query;
    let list = [...dataStore.ideas];

    if (category && category !== 'all') {
      list = list.filter(i => i.category.toLowerCase() === category.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(i => 
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.publisher && i.publisher.toLowerCase().includes(q))
      );
    }

    return res.json({ success: true, ideas: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Publish a new idea with required roles
exports.publishIdea = (req, res) => {
  try {
    const { title, category, tech, description, requiredRoles } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({ success: false, message: 'Title, domain category, and description are required.' });
    }

    const publisher = req.user.name;
    const publisherEmail = req.user.email;
    const publisherRegNo = req.user.regNo || '2026CS101';
    const dept = req.user.dept || 'Computer Science';

    // Format tech array
    const techArray = Array.isArray(tech)
      ? tech
      : (typeof tech === 'string' ? tech.split(',').map(t => t.trim()).filter(Boolean) : []);

    // Format required roles array: [{ roleName, requiredCount }]
    const formattedRoles = (Array.isArray(requiredRoles) ? requiredRoles : []).map((r, idx) => ({
      roleId: idx + 1,
      roleName: r.roleName || 'Team Member',
      requiredCount: parseInt(r.requiredCount) || 1,
      filledCount: 0
    }));

    const newIdea = {
      id: dataStore.getNextIdeaId(),
      title,
      category,
      tech: techArray,
      description,
      publisher,
      publisherEmail,
      publisherRegNo,
      dept,
      likes: 0,
      views: 1,
      createdAt: dataStore.getAppDateISO(),
      requiredRoles: formattedRoles,
      teamMembers: [
        { name: publisher, email: publisherEmail, regNo: publisherRegNo, role: 'Team Leader', dept }
      ],
      joinRequests: []
    };

    dataStore.ideas.unshift(newIdea);

    // Award +5 credits for publishing an idea
    const user = dataStore.users.find(u => u.email.toLowerCase() === publisherEmail.toLowerCase());
    if (user) {
      user.credits = (user.credits || 0) + 5;
      user.creditHistory = user.creditHistory || [];
      user.creditHistory.unshift({
        id: Date.now(),
        title: `Idea Published: "${title}"`,
        points: 5,
        date: dataStore.getAppDateFormatted(),
        type: 'idea'
      });
    }

    // Persistent notification: IDEA_PUBLISHED
    dataStore.addNotification(
      publisherEmail,
      'bulb',
      `Your idea "${title}" was published live! Peers can now apply to open positions. (+5 credits)`,
      '/ideas'
    );

    return res.status(201).json({ success: true, idea: newIdea, message: 'Idea published successfully! +5 credits awarded.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Submit a role-based join request for an idea
exports.submitJoinRequest = (req, res) => {
  try {
    const { id } = req.params;
    const { requestedRole, message, skills, portfolioUrl } = req.body;

    const idea = dataStore.ideas.find(i => i.id === parseInt(id));
    if (!idea) {
      return res.status(404).json({ success: false, message: 'Idea not found' });
    }

    const applicantName = req.user.name;
    const applicantEmail = req.user.email;
    const applicantRegNo = req.user.regNo || '2026CS101';
    const dept = req.user.dept || 'Computer Science';

    if (idea.publisherEmail.toLowerCase() === applicantEmail.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'You cannot apply to your own published idea.' });
    }

    // Find requested role in idea.requiredRoles
    const targetRole = (idea.requiredRoles || []).find(r => r.roleName.toLowerCase() === requestedRole.toLowerCase());
    if (!targetRole) {
      return res.status(400).json({ success: false, message: `Role "${requestedRole}" is not required for this project.` });
    }

    if (targetRole.filledCount >= targetRole.requiredCount) {
      return res.status(400).json({ success: false, message: `Position Filled: All ${targetRole.requiredCount} slots for "${requestedRole}" are taken.` });
    }

    // Check if applicant already submitted request
    const existingReq = (idea.joinRequests || []).find(r => r.applicantEmail.toLowerCase() === applicantEmail.toLowerCase());
    if (existingReq) {
      return res.status(400).json({ success: false, message: `You have already submitted a join request for this idea (Status: ${existingReq.status}).` });
    }

    const newRequest = {
      requestId: dataStore.getNextRequestId(),
      applicantName,
      applicantEmail,
      applicantRegNo,
      dept,
      requestedRole: targetRole.roleName,
      message: message || 'Enthusiastic to collaborate on this project!',
      skills: skills || 'JavaScript, Python',
      portfolioUrl: portfolioUrl || '',
      status: 'PENDING',
      appliedAt: dataStore.getAppDateISO()
    };

    idea.joinRequests = idea.joinRequests || [];
    idea.joinRequests.unshift(newRequest);

    // Persistent Notification: JOIN_REQUEST_RECEIVED (to publisher)
    dataStore.addNotification(
      idea.publisherEmail,
      'bell',
      `New Join Request received from ${applicantName} (${applicantRegNo}) for role "${targetRole.roleName}" on idea "${idea.title}"`,
      '/ideas'
    );

    return res.json({ success: true, request: newRequest, message: `Join request submitted for role "${targetRole.roleName}"!` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Respond to join request (ACCEPT or REJECT)
exports.respondJoinRequest = (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { action } = req.body; // 'ACCEPT' | 'REJECT'

    const idea = dataStore.ideas.find(i => i.id === parseInt(id));
    if (!idea) {
      return res.status(404).json({ success: false, message: 'Idea not found' });
    }

    if (idea.publisherEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Only the idea publisher can accept or reject join requests.' });
    }

    const joinReq = (idea.joinRequests || []).find(r => r.requestId === parseInt(requestId));
    if (!joinReq) {
      return res.status(404).json({ success: false, message: 'Join request not found' });
    }

    if (action === 'ACCEPT') {
      joinReq.status = 'ACCEPTED';

      // Update role filled count
      const targetRole = (idea.requiredRoles || []).find(r => r.roleName.toLowerCase() === joinReq.requestedRole.toLowerCase());
      if (targetRole) {
        targetRole.filledCount = Math.min(targetRole.requiredCount, targetRole.filledCount + 1);

        // Check if role is now fully filled
        if (targetRole.filledCount >= targetRole.requiredCount) {
          dataStore.addNotification(
            idea.publisherEmail,
            'check',
            `All position slots for role "${targetRole.roleName}" on "${idea.title}" have been filled!`,
            '/ideas'
          );
        }
      }

      // Add applicant to team members
      idea.teamMembers = idea.teamMembers || [];
      const alreadyMember = idea.teamMembers.some(m => m.email.toLowerCase() === joinReq.applicantEmail.toLowerCase());
      if (!alreadyMember) {
        idea.teamMembers.push({
          name: joinReq.applicantName,
          email: joinReq.applicantEmail,
          regNo: joinReq.applicantRegNo,
          role: joinReq.requestedRole,
          dept: joinReq.dept
        });
      }

      // Persistent Notification: JOIN_REQUEST_ACCEPTED (to applicant)
      dataStore.addNotification(
        joinReq.applicantEmail,
        'check',
        `🎉 Congratulations! ${req.user.name} ACCEPTED your join request for role "${joinReq.requestedRole}" on idea "${idea.title}"`,
        '/ideas'
      );

      return res.json({ success: true, message: `Accepted ${joinReq.applicantName} for role "${joinReq.requestedRole}". Team member added.` });
    } else {
      joinReq.status = 'REJECTED';

      // Persistent Notification: JOIN_REQUEST_REJECTED (to applicant)
      dataStore.addNotification(
        joinReq.applicantEmail,
        'x',
        `Your join request for role "${joinReq.requestedRole}" on idea "${idea.title}" was declined by the publisher.`,
        '/ideas'
      );

      return res.json({ success: true, message: `Declined join request from ${joinReq.applicantName}.` });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Toggle Like on Idea
exports.toggleLikeIdea = (req, res) => {
  try {
    const { id } = req.params;
    const idea = dataStore.ideas.find(i => i.id === parseInt(id));

    if (!idea) {
      return res.status(404).json({ success: false, message: 'Idea not found' });
    }

    idea.likes = (idea.likes || 0) + 1;
    return res.json({ success: true, likes: idea.likes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
