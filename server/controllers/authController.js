const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dataStore = require('../services/dataStore');
const { JWT_SECRET } = require('../middleware/authMiddleware');

function helperInitials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, dept, year } = req.body;

    if (!name || !email || !password || !dept || !year) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = dataStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: dataStore.users.length + 1,
      name,
      email,
      password: hashedPassword,
      role: 'Student',
      status: 'Active',
      dept,
      academic_year: year,
      credits: 0,
      approved_projects: 0,
      skills: ['HTML', 'CSS', 'JavaScript'],
      domain_of_interest: 'Web Development',
      initials: helperInitials(name)
    };

    dataStore.users.push(newUser);

    // Notifications
    dataStore.notifications.unshift({
      id: dataStore.notifications.length + 1,
      email: email,
      icon: 'award',
      text: 'Welcome to ProjectHub! Start by editing your profile.',
      time: 'Just now'
    });
    dataStore.notifications.unshift({
      id: dataStore.notifications.length + 1,
      email: 'Administrator',
      icon: 'users',
      text: `New student registered: ${name}`,
      time: 'Just now'
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = newUser;
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }

    let user = dataStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Auto register demo profile for specified role if using demo accounts
      user = {
        id: dataStore.users.length + 1,
        name: role === 'Faculty' ? 'Faculty Member' : role === 'Administrator' ? 'Admin User' : 'Student User',
        email,
        password: await bcrypt.hash(password, 10),
        role,
        status: 'Active',
        dept: role === 'Student' ? 'Computer Science' : role === 'Faculty' ? 'Computer Science' : 'Platform Admin',
        academic_year: role === 'Student' ? 'Third Year' : '—',
        credits: role === 'Student' ? 100 : 0,
        approved_projects: role === 'Student' ? 3 : 0,
        skills: [],
        domain_of_interest: '',
        initials: helperInitials(role === 'Faculty' ? 'Faculty Member' : role === 'Administrator' ? 'Admin User' : 'Student User')
      };
      dataStore.users.push(user);
    } else {
      user.role = role;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      success: true,
      message: `Welcome back, ${user.name}`,
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = dataStore.users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDemoUsers = (req, res) => {
  try {
    const students = dataStore.users.filter(u => u.role === 'Student').map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      regNo: u.regNo || `2026CS10${u.id}`,
      dept: u.dept,
      academic_year: u.academic_year
    }));

    const faculty = dataStore.users.filter(u => u.role === 'Faculty').map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      dept: u.dept,
      academic_year: u.academic_year,
      specializations: u.specializations || [u.domain_of_interest]
    }));

    return res.json({
      success: true,
      students,
      faculty
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
