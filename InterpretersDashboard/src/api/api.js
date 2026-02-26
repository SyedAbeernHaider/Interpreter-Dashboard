const BASE = 'http://localhost:3001/api';

async function get(path) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
}

export const api = {
    // Dashboard
    getDashboardStats: () => get('/dashboard/stats'),
    getCallsTrend: () => get('/dashboard/calls-trend'),
    getRecentSessions: () => get('/dashboard/recent-sessions'),
    getInterpreterStatus: () => get('/dashboard/interpreter-status'),

    // Interpreters
    getInterpreters: () => get('/interpreters'),
    getInterpreterById: (id, filter = 'all') =>
        get(`/interpreters/${encodeURIComponent(id)}?filter=${filter}`),

    // Customers
    getCustomers: () => get('/customers'),
    getCustomerById: (id) => get(`/customers/${encodeURIComponent(id)}`),

    // Missed Calls
    getMissedCalls: () => get('/missed-calls'),

    // Pending Calls
    getPendingCalls: () => get('/pending-calls'),

    // Companies
    getCompanies: () => get('/companies'),
    getCompanyById: (id) => get(`/companies/${encodeURIComponent(id)}`),
};
