const BASE = import.meta.env.VITE_API_URL || '/api';

async function get(path) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
}

export const api = {
    // Dashboard
    getDashboardStats: (f = 'today') => get(`/dashboard/stats?filter=${f}`),
    getCallsTrend: () => get('/dashboard/calls-trend'),
    getRecentSessions: (f = 'today') => get(`/dashboard/recent-sessions?filter=${f}`),
    getInterpreterStatus: () => get('/dashboard/interpreter-status'),

    // Interpreters
    getInterpreters: (f = 'all', p = 1, s = '') => get(`/interpreters?filter=${f}&page=${p}&search=${encodeURIComponent(s)}`),
    getInterpreterById: (id, f = 'all') =>
        get(`/interpreters/${encodeURIComponent(id)}?filter=${f}`),

    // Customers
    getCustomers: (f = 'all', p = 1, s = '', sf = 'all') => get(`/customers?filter=${f}&page=${p}&search=${encodeURIComponent(s)}&subFilter=${sf}`),
    getCustomerById: (id, f = 'all') => get(`/customers/${encodeURIComponent(id)}?filter=${f}`),

    // Missed Calls
    getMissedCalls: (f = 'all', p = 1, s = '') => get(`/missed-calls?filter=${f}&page=${p}&search=${encodeURIComponent(s)}`),

    // Disconnected Calls (Status 0)
    getDisconnectedCalls: (f = 'all', p = 1, s = '') => get(`/pending-calls?filter=${f}&page=${p}&search=${encodeURIComponent(s)}`),

    // Companies
    getCompanies: (f = 'all', p = 1, s = '') => get(`/companies?filter=${f}&page=${p}&search=${encodeURIComponent(s)}`),
    getCompanyById: (id, f = 'all') => get(`/companies/${encodeURIComponent(id)}?filter=${f}`),
};
