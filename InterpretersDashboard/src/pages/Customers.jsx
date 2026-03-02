import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/api';
import { Avatar } from '../components/Avatar';
import { Pagination } from '../components/Pagination';
import { timeAgo, formatDate } from '../utils/helpers';

export function Customers() {

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, loading, error } = useApi(
        () => api.getCustomers('all', page, debouncedSearch),
        [page, debouncedSearch]
    );

    const [tab, setTab] = useState('active');
    const navigate = useNavigate();

    const customers = data?.data || [];
    const pagination = data?.pagination || {};
    const stats = data?.stats || {};

    const activeUsers = customers
        .filter(c => Number(c.total_calls) >= 2)
        .sort((a, b) => Number(b.total_calls) - Number(a.total_calls));

    const neglectedUsers = customers
        .filter(c => {
            const total = Number(c.total_calls) || 0;
            const missed = Number(c.missed_by_interpreters) || 0;
            return total > 0 && missed > 0 && missed / Math.max(total, 1) > 0.4;
        })
        .sort((a, b) => Number(b.missed_by_interpreters) - Number(a.missed_by_interpreters));

    const displayed = tab === 'active' ? activeUsers : tab === 'neglected' ? neglectedUsers : customers;

    return (
        <div className="page-content fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Customers</div>
                    <div className="page-description">
                        Behavior and engagement analysis
                    </div>
                </div>
            </div>

            {/* Alert cards */}
            {data && (
                <div className="grid-3 section">
                    <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#60a5fa' }}>{pagination.total || 0}</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Customers</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>All registered users</div>
                            </div>
                        </div>
                    </div>
                    <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399' }}>{stats.frequent_count || 0}</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Frequent Callers</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Users with 2+ calls</div>
                            </div>
                        </div>
                    </div>
                    <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#f87171' }}>{stats.neglected_count || 0}</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Neglected Users</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>High interpreter miss rate (&gt;40%)</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card section">
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                    {/* Search */}
                    <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            placeholder="Search by name or email…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="filter-tabs">
                        <button className={`filter-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => { setTab('all'); setPage(1); }}>
                            All ({customers.length})
                        </button>
                        <button className={`filter-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => { setTab('active'); setPage(1); }}>
                            🔥 Frequent ({activeUsers.length})
                        </button>
                        <button className={`filter-tab ${tab === 'neglected' ? 'active' : ''}`} onClick={() => { setTab('neglected'); setPage(1); }}>
                            ⚠️ Neglected ({neglectedUsers.length})
                        </button>
                    </div>
                </div>

                {/* Neglected banner */}
                {tab === 'neglected' && neglectedUsers.length > 0 && (
                    <div style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8,
                        padding: '10px 14px',
                        marginBottom: 16,
                        fontSize: 13,
                        color: '#f87171',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center'
                    }}>
                        ⚠️ These customers frequently call but interpreters often miss their calls. Consider reviewing interpreter availability.
                    </div>
                )}

                {loading ? (
                    <div className="loading-container"><div className="spinner" /><span>Loading customers…</span></div>
                ) : error ? (
                    <div className="empty-state">
                        <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
                        <span>Make sure the backend is running on port 3001</span>
                    </div>
                ) : !displayed.length ? (
                    <div className="empty-state">
                        <p>No customers found</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Total Calls</th>
                                    <th>Completed</th>
                                    <th>Cancelled</th>
                                    <th>Missed by Interpreters</th>
                                    <th>Miss Rate</th>
                                    <th>Last Call</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayed.map(c => {
                                    const total = Number(c.total_calls) || 0;
                                    const missed = Number(c.missed_by_interpreters) || 0;
                                    const missRate = total > 0 ? Math.round((missed / total) * 100) : 0;
                                    return (
                                        <tr
                                            key={c.id}
                                            className="clickable-row"
                                            onClick={() => navigate(`/customers/${c.customer_id}`)}
                                        >
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <Avatar name={c.name || ''} />
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name || '—'}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${c.type === 'company' ? 'badge-purple' : 'badge-blue'}`}>
                                                    {c.type || 'customer'}
                                                </span>
                                            </td>
                                            <td><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{total}</span></td>
                                            <td><span style={{ color: '#34d399', fontWeight: 600 }}>{c.completed_calls || 0}</span></td>
                                            <td><span style={{ color: '#f87171', fontWeight: 600 }}>{c.cancelled_calls || 0}</span></td>
                                            <td>
                                                <span style={{ color: missed > 0 ? '#f87171' : 'var(--text-muted)', fontWeight: 600 }}>{missed}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: 50, height: 5, borderRadius: 3,
                                                        background: 'var(--border)',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            width: `${missRate}%`,
                                                            height: '100%',
                                                            background: missRate > 60 ? '#ef4444' : missRate > 30 ? '#f59e0b' : '#10b981',
                                                            borderRadius: 3,
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{missRate}%</span>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {c.last_call ? timeAgo(c.last_call) : '—'}
                                            </td>
                                            <td>
                                                <span className={`badge ${c.status ? 'badge-green' : 'badge-gray'}`}>
                                                    {c.status ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination
                    pagination={pagination}
                    onPageChange={(p) => {
                        setPage(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                />
            </div>
        </div>
    );
}
