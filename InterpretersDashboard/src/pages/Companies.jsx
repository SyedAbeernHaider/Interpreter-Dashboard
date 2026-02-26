import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/api';
import { Avatar } from '../components/Avatar';
import { timeAgo } from '../utils/helpers';

export function Companies() {
    const { data, loading, error } = useApi(api.getCompanies);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const filtered = (data || []).filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.company_code || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalCalls = (data || []).reduce((s, c) => s + Number(c.total_calls || 0), 0);
    const totalCompleted = (data || []).reduce((s, c) => s + Number(c.completed_calls || 0), 0);
    const totalUsers = (data || []).reduce((s, c) => s + Number(c.total_users || 0), 0);

    return (
        <div className="page-content fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Companies</div>
                    <div className="page-description">
                        {data ? `${data.length} companies · ${totalUsers} users · ${totalCalls} total calls` : 'Loading...'}
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            {data && (
                <div className="grid-3 section">
                    <div className="card" style={{ borderColor: 'rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.05)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#a78bfa' }}>{data.length}</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Companies</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Registered organisations</div>
                            </div>
                        </div>
                    </div>
                    <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#60a5fa' }}>{totalUsers}</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Company Users</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Users linked to companies</div>
                            </div>
                        </div>
                    </div>
                    <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399' }}>{totalCompleted}</div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Completed Calls</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Across all companies</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card section">
                {/* Search */}
                <div className="search-bar" style={{ marginBottom: 16 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        placeholder="Search by name, email or code…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="loading-container"><div className="spinner" /><span>Loading companies…</span></div>
                ) : error ? (
                    <div className="empty-state">
                        <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
                        <span>Make sure the backend is running on port 3001</span>
                    </div>
                ) : !filtered.length ? (
                    <div className="empty-state"><p>No companies found</p></div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Code</th>
                                    <th>Users</th>
                                    <th>Total Calls</th>
                                    <th>Completed</th>
                                    <th>Cancelled</th>
                                    <th>Completion Rate</th>
                                    <th>Last Call</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(c => {
                                    const total = Number(c.total_calls) || 0;
                                    const completed = Number(c.completed_calls) || 0;
                                    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                                    return (
                                        <tr
                                            key={c.id}
                                            className="clickable-row"
                                            onClick={() => navigate(`/companies/${c.company_id}`)}
                                        >
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <Avatar name={c.name || '?'} />
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name || '—'}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {c.company_code
                                                    ? <span className="badge badge-purple">{c.company_code}</span>
                                                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                            </td>
                                            <td><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.total_users || 0}</span></td>
                                            <td><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{total}</span></td>
                                            <td><span style={{ color: '#34d399', fontWeight: 600 }}>{completed}</span></td>
                                            <td><span style={{ color: '#f87171', fontWeight: 600 }}>{c.cancelled_calls || 0}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 60, height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${rate}%`, height: '100%', borderRadius: 3,
                                                            background: rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444'
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rate}%</span>
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
            </div>
        </div>
    );
}
