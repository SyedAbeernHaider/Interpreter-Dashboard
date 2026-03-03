import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/api';
import { Avatar } from '../components/Avatar';
import { Pagination } from '../components/Pagination';
import { formatDateTime, timeAgo } from '../utils/helpers';
import { DateFilter } from '../components/DateFilter';

export function MissedCalls() {
    const [dateFilter, setDateFilter] = useState('today');
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, loading, error } = useApi(
        () => api.getMissedCalls(dateFilter, page, debouncedSearch),
        [dateFilter, page, debouncedSearch]
    );

    const navigate = useNavigate();

    const missedCalls = data?.data || [];
    const pagination = data?.pagination || {};
    const stats = data?.stats || {};

    const totalCount = pagination.total || 0;

    return (
        <div className="page-content fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Missed Calls</div>
                    <div className="page-description">
                        Analysis of missed call events for the selected period
                    </div>
                </div>
                <DateFilter value={dateFilter} onChange={(val) => { setDateFilter(val); setPage(1); }} />
            </div>

            {/* Stats */}
            {data && (
                <div className="grid-3 section">
                    {[
                        { label: 'Total Missed', value: totalCount, color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.2)' },
                        { label: 'Interpreters Involved', value: stats.unique_interpreters || 0, color: '#3b82f6', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.2)' },
                        { label: 'Customers Affected', value: stats.unique_customers || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)' },
                    ].map(s => (
                        <div key={s.label} className="card" style={{ borderColor: s.border, background: s.bg }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="card section">
                {/* Search */}
                <div style={{ marginBottom: 16 }}>
                    <div className="search-bar" style={{ maxWidth: 360 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            placeholder="Search by interpreter or customer…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container"><div className="spinner" /><span>Loading missed calls…</span></div>
                ) : error ? (
                    <div className="empty-state">
                        <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
                        <span>Make sure the backend is running on port 3001</span>
                    </div>
                ) : !missedCalls.length ? (
                    <div className="empty-state">
                        <p>No missed calls found</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Interpreter</th>
                                    <th>Customer</th>
                                    <th>Missed At</th>
                                    <th>Time Ago</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {missedCalls.map((m, idx) => {
                                    const interpName = m.interpreter_name_detail || m.interpreter_name || '—';
                                    const custName = m.customer_name_detail || m.user_name || '—';
                                    return (
                                        <tr key={m.response_id}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                {idx + 1}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Avatar name={interpName} size="sm" />
                                                    <div>
                                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{interpName}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                            ID: {m.interpreter_id?.slice(0, 8)}…
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Avatar name={custName} size="sm" />
                                                    <div>
                                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{custName}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                            ID: {m.customer_id?.slice(0, 8)}…
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {formatDateTime(m.missed_call_time)}
                                            </td>
                                            <td>
                                                <span className="badge badge-red">
                                                    {timeAgo(m.missed_call_time)}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => navigate(`/interpreters/${m.interpreter_id}`)}
                                                    >
                                                        Interpreter →
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => navigate(`/customers/${m.customer_id}`)}
                                                    >
                                                        Customer →
                                                    </button>
                                                </div>
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
