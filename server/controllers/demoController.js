const dataStore = require('../services/dataStore');

exports.getDemoState = (req, res) => {
  try {
    return res.json({
      success: true,
      demoModeActive: dataStore.demoModeActive(),
      simulatedDate: dataStore.simulatedDate(),
      currentAppTime: dataStore.getCurrentApplicationTime().toISOString(),
      formattedAppDate: dataStore.getAppDateFormatted()
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.setSimulatedDate = (req, res) => {
  try {
    const { dateString, action } = req.body;

    let targetDate = dataStore.getCurrentApplicationTime();

    if (action === 'reset') {
      const realIso = dataStore.resetRealTime();
      return res.json({
        success: true,
        message: 'Demo clock reset to real system time',
        simulatedDate: null,
        demoModeActive: false,
        currentAppTime: realIso
      });
    }

    if (action === 'plus1day') {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (action === 'plus3days') {
      targetDate.setDate(targetDate.getDate() + 3);
    } else if (action === 'plus7days') {
      targetDate.setDate(targetDate.getDate() + 7);
    } else if (action === 'endOfWeek') {
      targetDate = new Date('2026-09-28T23:59:59.000Z');
    } else if (dateString) {
      targetDate = new Date(dateString);
    }

    const newIso = dataStore.setSimulatedDate(targetDate.toISOString());

    return res.json({
      success: true,
      message: `Demo application date updated to ${targetDate.toISOString().split('T')[0]}`,
      simulatedDate: newIso,
      demoModeActive: true,
      currentAppTime: newIso
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
