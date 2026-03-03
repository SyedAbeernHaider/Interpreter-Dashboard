import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/api';
import { Avatar } from '../components/Avatar';
import { Pagination } from '../components/Pagination';
import { timeAgo, formatDate } from '../utils/helpers';

import { DateFilter } from '../components/DateFilter';

export function Customers() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [tab, setTab] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, loading, error } = useApi(
        () => api.getCustomers(dateFilter, page, debouncedSearch, tab),
        [dateFilter, page, debouncedSearch, tab]
    );

    const navigate = useNavigate();

    const customers = data?.data || [];
    const pagination = data?.pagination || {};
    const stats = data?.stats || {};

    return (
        <div className="page-content fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Customers</div>
                    <div className="page-description">
                        User activity and experience monitoring
                    </div>
                </div>
                <DateFilter value={dateFilter} onChange={(f) => { setDateFilter(f); setPage(1); }} />
            </div>

            {/* Alert cards */}
            {data && (
                <div className="grid-4 section">
                    <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#60a5fa' }}>{pagination.total || 0}</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Customers</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Found for current filter</div>
                            </div>
                        </div>
                    </div>
                    <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399' }}>{stats.frequent_count || 0}</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Frequent Callers</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Min. 2 calls in every active month</div>
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
                    <div className="card" style={{ borderColor: 'rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.05)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6' }}>{stats.both_count || 0}</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Frequent + Neglected</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Meeting both criteria</div>
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
                            All
                        </button>
                        <button className={`filter-tab ${tab === 'frequent' ? 'active' : ''}`} onClick={() => { setTab('frequent'); setPage(1); }}>
                            🔥 Frequent
                        </button>
                        <button className={`filter-tab ${tab === 'neglected' ? 'active' : ''}`} onClick={() => { setTab('neglected'); setPage(1); }}>
                            ⚠️ Neglected
                        </button>
                        <button className={`filter-tab ${tab === 'both' ? 'active' : ''}`} onClick={() => { setTab('both'); setPage(1); }}>
                            🔥 + ⚠️ Both
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container"><div className="spinner" /><span>Loading customers…</span></div>
                ) : error ? (
                    <div className="empty-state">
                        <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
                        <span>Make sure the backend is running on port 3001</span>
                    </div>
                ) : !customers.length ? (
                    <div className="empty-state">
                        <p>No customers found</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Attributes</th>
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
                                {customers.map(c => {
                                    const total = Number(c.total_calls) || 0;
                                    const missed = Number(c.missed_by_interpreters) || 0;
                                    const missRate = total > 0 ? Math.round((missed / total) * 100) : 0;
                                    const isFrequent = !!c.is_frequent;
                                    const isNeglected = total > 0 && missed > 0 && (missed / total) > 0.4;

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
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                    <span className={`badge ${c.type === 'company' ? 'badge-purple' : 'badge-blue'}`}>
                                                        {c.type || 'customer'}
                                                    </span>
                                                    {isFrequent && <span className="badge badge-green" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>🔥 Frequent</span>}
                                                    {isNeglected && <span className="badge badge-red" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>⚠️ Neglected</span>}
                                                </div>
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
