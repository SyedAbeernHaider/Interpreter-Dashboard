import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/api';
import { Avatar } from '../components/Avatar';
import { OnlineStatus } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { formatDateTime, timeAgo, parsePKT } from '../utils/helpers';

export function Interpreters() {

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, loading, error } = useApi(
        () => api.getInterpreters('all', page, debouncedSearch),
        [page, debouncedSearch]
    );

    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const navigate = useNavigate();

    const interpreters = data?.data || [];
    const pagination = data?.pagination || {};

    const filtered = interpreters
        .filter(i => {
            const matchStatus =
                filterStatus === 'all' ||
                (filterStatus === 'online' && i.online_status && !i.on_call_status) ||
                (filterStatus === 'oncall' && i.on_call_status) ||
                (filterStatus === 'offline' && !i.online_status);
            return matchStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'calls') return Number(b.total_calls || 0) - Number(a.total_calls || 0);
            if (sortBy === 'missed') return Number(b.missed_calls || 0) - Number(a.missed_calls || 0);
            if (sortBy === 'last') return parsePKT(b.last_call_time || 0) - parsePKT(a.last_call_time || 0);
            return 0;
        });

    const online = interpreters.filter(i => i.online_status && !i.on_call_status).length;
    const onCall = interpreters.filter(i => i.on_call_status).length;
    const offline = interpreters.filter(i => !i.online_status).length;

    return (
        <div className="page-content fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Interpreters</div>
                    <div className="page-description">
                        Call performance statistics
                    </div>
                </div>
            </div>

            {/* Quick stats */}
            {data && (
                <div className="grid-4 section">
                    {[
                        { label: 'Total', value: pagination.total || 0, color: '#3b82f6' },
                        { label: 'Online', value: online, color: '#10b981' },
                        { label: 'On Call', value: onCall, color: '#f59e0b' },
                        { label: 'Offline', value: offline, color: '#4b5a72' },
                    ].map(s => (
                        <div
                            key={s.label}
                            className="card"
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}
                        >
                            <div style={{ width: 10, height: 40, borderRadius: 4, background: s.color, flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -1 }}>{s.value}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
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

                    {/* Status filter */}
                    <div className="filter-tabs">
                        {['all', 'online', 'oncall', 'offline'].map(s => (
                            <button
                                key={s}
                                className={`filter-tab ${filterStatus === s ? 'active' : ''}`}
                                onClick={() => { setFilterStatus(s); setPage(1); }}
                            >
                                {s === 'all' ? 'All' : s === 'oncall' ? 'On Call' : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Sort */}
                    <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="name">Sort: Name</option>
                        <option value="calls">Sort: Total Calls</option>
                        <option value="missed">Sort: Missed Calls</option>
                        <option value="last">Sort: Last Call</option>
                    </select>
                </div>

                {loading ? (
                    <div className="loading-container"><div className="spinner" /><span>Loading interpreters…</span></div>
                ) : error ? (
                    <div className="empty-state">
                        <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
                        <span>Make sure the backend is running on port 3001</span>
                    </div>
                ) : !filtered.length ? (
                    <div className="empty-state">
                        <p>No interpreters found</p>
                        <span>Try adjusting your filters</span>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Interpreter</th>
                                    <th>Status</th>
                                    <th>Total Calls</th>
                                    <th>Missed</th>
                                    <th>Last Call</th>
                                    <th>Joined</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(i => (
                                    <tr
                                        key={i.id}
                                        className="clickable-row"
                                        onClick={() => navigate(`/interpreters/${i.interpreter_id}`)}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <Avatar name={i.name || ''} />
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i.name || '—'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><OnlineStatus online_status={i.online_status} on_call_status={i.on_call_status} /></td>
                                        <td>
                                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{i.total_calls || 0}</span>
                                        </td>
                                        <td>
                                            <span style={{ color: i.missed_calls > 0 ? '#f87171' : 'var(--text-muted)', fontWeight: 600 }}>
                                                {i.missed_calls || 0}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {i.last_call_time ? timeAgo(i.last_call_time) : '—'}
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {i.created_at ? parsePKT(i.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' }) : '—'}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={e => { e.stopPropagation(); navigate(`/interpreters/${i.interpreter_id}`); }}
                                            >
                                                View →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
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
