const dataStore = require('../services/dataStore');

exports.getProfile = (req, res) => {
  try {
    const targetName = req.query.name || req.params.name || (req.user ? req.user.name : '');
    if (!targetName) {
      return res.status(400).json({ success: false, message: 'Name parameter required' });
    }

    const user = dataStore.users.find(u => u.name.toLowerCase() === targetName.toLowerCase());

    if (!user) {
      // Fallback: If user is referenced in projects but not in users list, return dynamic profile
      const userProjects = dataStore.projects.filter(p => 
        p.author.toLowerCase() === targetName.toLowerCase() ||
        (p.collaborators && p.collaborators.some(c => c.toLowerCase() === targetName.toLowerCase()))
      );

      const tempUser = {
        name: targetName,
        email: `${targetName.toLowerCase().replace(/\s+/g, '')}@university.edu`,
        role: 'Student',
        dept: userProjects[0]?.dept || 'Computer Science',
        academic_year: 'Third Year',
        credits: Math.max(120, userProjects.length * 20 + 60),
        approved_projects: Math.max(3, userProjects.length),
        skills: userProjects[0]?.tech || ['JavaScript', 'React', 'Python'],
        domain_of_interest: userProjects[0]?.category || 'Software Engineering',
        initials: targetName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        creditHistory: [
          { id: 1, title: `Approved Project Submissions (${userProjects.length} builds)`, points: userProjects.length * 20, date: '2026-07-28', type: 'approval' },
          { id: 2, title: 'Platform Initial Tier Bonus', points: 60, date: '2026-07-01', type: 'bonus' }
        ]
      };

      return res.json({
        success: true,
        user: tempUser,
        portfolio: userProjects.filter(p => p.status === 'Approved' || p.type !== 'Idea'),
        ideas: userProjects.filter(p => p.type === 'Idea'),
        inReview: userProjects.filter(p => p.status === 'In Review' || p.status === 'Pending Guide')
      });
    }

    const portfolio = dataStore.projects.filter(p => 
      (p.author.toLowerCase() === user.name.toLowerCase() || (p.collaborators && p.collaborators.some(c => c.toLowerCase() === user.name.toLowerCase()))) && 
      p.status === 'Approved'
    );
    const ideas = dataStore.projects.filter(p => p.author.toLowerCase() === user.name.toLowerCase() && p.type === 'Idea');
    const inReview = dataStore.projects.filter(p => p.author.toLowerCase() === user.name.toLowerCase() && (p.status === 'In Review' || p.status === 'Pending Guide'));

    const { password: _, ...userClean } = user;
    userClean.credits = dataStore.getUserTotalCredits(user.email);
    userClean.creditHistory = dataStore.getUserCreditHistory(user.email);

    return res.json({
      success: true,
      user: userClean,
      portfolio,
      ideas,
      inReview
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = (req, res) => {
  try {
    const { domainOfInterest, skills } = req.body;
    const user = dataStore.users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (domainOfInterest !== undefined) user.domain_of_interest = domainOfInterest;
    if (skills !== undefined) {
      user.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    const { password: _, ...userClean } = user;
    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userClean
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
