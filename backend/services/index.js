const dashboardService = require('./dashboardService');
const interpreterService = require('./interpreterService');
const customerService = require('./customerService');
const companyService = require('./companyService');
const callService = require('./callService');

module.exports = {
    ...dashboardService,
    ...interpreterService,
    ...customerService,
    ...companyService,
    ...callService
};
