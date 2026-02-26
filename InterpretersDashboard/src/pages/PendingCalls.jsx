import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/api';
import { Avatar } from '../components/Avatar';
import { formatDateTime, timeAgo } from '../utils/helpers';

export function PendingCalls() {
    const { data, loading, error } = useApi(api.getPendingCalls);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const allPending = data?.allPending || [];
    const frequentUsers = data?.frequentPendingUsers || [];

    const filtered = allPending.filter(m =>
        (m.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.customer_email || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-content fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Pending Calls</div>
                    <div className="page-description">
                        Active and inactive call requests from the last 30 days waiting for an interpreter
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid-3 section">
                <div className="card" style={{ borderLeft: '4px solid var(--accent-orange)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Current Pending</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{allPending.length}</div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Waiting Customers</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{frequentUsers.length}</div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Wait Time</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>Live</div>
                </div>
            </div>

            <div className="grid-2-1 section">
                {/* All Pending Table */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Recent Pending Requests</div>
                        <div className="search-bar" style={{ maxWidth: 250 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                placeholder="Search customer…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-container"><div className="spinner" /></div>
                    ) : !filtered.length ? (
                        <div className="empty-state">
                            <p>No pending calls found</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Request Time</th>
                                        <th>Waiting For</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(m => (
                                        <tr key={m.monitoring_id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <Avatar name={m.customer_name} size="sm" />
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.customer_name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.customer_email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{formatDateTime(m.created_at)}</td>
                                            <td>
                                                <span className="badge badge-orange">
                                                    {timeAgo(m.created_at)}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => navigate(`/customers/${m.customer_id}`)}
                                                >
                                                    Profile →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Frequent Users */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Frequent Pending Users</div>
                    </div>
                    {loading ? (
                        <div className="loading-container"><div className="spinner" /></div>
                    ) : !frequentUsers.length ? (
                        <div className="empty-state">
                            <p>No data available</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {frequentUsers.map(user => (
                                <div key={user.customer_id} className="stat-card" style={{ padding: '12px 16px', gap: 12 }}>
                                    <Avatar name={user.name} size="sm" />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-orange)' }}>{user.pending_count}</div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>REQUESTS</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
