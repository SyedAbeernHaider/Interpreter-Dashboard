import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/api';
import { Avatar } from '../components/Avatar';
import { StatusBadge, ChatBadge } from '../components/StatusBadge';
import { formatDateTime, timeAgo } from '../utils/helpers';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="tooltip-custom">
            <div className="label">{label}</div>
            {payload.map(p => (
                <div key={p.name} style={{ color: p.color, marginTop: 2 }}>
                    {p.name}: <strong>{p.value}</strong>
                </div>
            ))}
        </div>
    );
}

export function CompanyDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState('users');
    const [userSearch, setUserSearch] = useState('');
    const { data, loading, error } = useApi(() => api.getCompanyById(id), [id]);

    const { company, users = [], calls = [], dailyStats = [] } = data || {};

    const completedCalls = calls.filter(c => c.status === 2).length;
    const cancelledCalls = calls.filter(c => c.status === 3).length;
    const filteredUsers = users.filter(u =>
        (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
    );

    const chartData = dailyStats.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Completed: Number(d.completed),
        Cancelled: Number(d.cancelled),
    }));

    return (
        <div className="page-content fade-in">
            <div className="breadcrumb">
                <a onClick={() => navigate('/companies')} style={{ cursor: 'pointer' }}>Companies</a>
                <span>/</span>
                <span>{company?.name || 'Loading...'}</span>
            </div>

            {loading ? (
                <div className="loading-container" style={{ height: 400 }}>
                    <div className="spinner" />
                    <span>Loading company data…</span>
                </div>
            ) : error ? (
                <div className="empty-state">
                    <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
                </div>
            ) : company ? (
                <>
                    {/* ── Profile Header ─────────────────────────── */}
                    <div className="profile-header section">
                        <Avatar name={company.name || '?'} size="xl" />
                        <div className="profile-info">
                            <div className="profile-name">{company.name || 'Unknown Company'}</div>
                            <div className="profile-meta">
                                {company.email && <span>✉ {company.email}</span>}
                                {company.city && <span>📍 {company.city}{company.country ? `, ${company.country}` : ''}</span>}
                                {company.company_code && <span>🏷 Code: {company.company_code}</span>}
                            </div>
                            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <span className={`badge ${company.status ? 'badge-green' : 'badge-gray'}`}>
                                    {company.status ? 'Active' : 'Inactive'}
                                </span>
                                {company.is_chat ? <span className="badge badge-cyan">Chat Enabled</span> : null}
                                {company.is_archive ? <span className="badge badge-gray">Archived</span> : null}
                            </div>
                        </div>
                        <div className="profile-stats">
                            {[
                                { label: 'Users', value: users.length, color: '#a78bfa' },
                                { label: 'Total Calls', value: calls.length, color: '#3b82f6' },
                                { label: 'Completed', value: completedCalls, color: '#10b981' },
                                { label: 'Cancelled', value: cancelledCalls, color: '#ef4444' },
                            ].map(s => (
                                <div key={s.label} className="mini-stat">
                                    <div className="mini-stat-value" style={{ color: s.color }}>{s.value}</div>
                                    <div className="mini-stat-label">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Call Trend Chart ────────────────────────── */}
                    <div className="card section">
                        <div className="card-header">
                            <div className="card-title">Call Activity (Last 30 Days)</div>
                        </div>
                        {chartData.length ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="Completed" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" />
                                    <Bar dataKey="Cancelled" fill="#ef4444" radius={[3, 3, 0, 0]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state" style={{ height: 180 }}>
                                <p>No call data in last 30 days</p>
                            </div>
                        )}
                    </div>

                    {/* ── Tabs: Users / Call History ──────────────── */}
                    <div className="card section">
                        <div className="card-header">
                            <div className="filter-tabs">
                                <button className={`filter-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
                                    👥 Users ({users.length})
                                </button>
                                <button className={`filter-tab ${tab === 'calls' ? 'active' : ''}`} onClick={() => setTab('calls')}>
                                    📞 All Call History ({calls.length})
                                </button>
                            </div>
                        </div>

                        {/* Users tab */}
                        {tab === 'users' && (
                            <>
                                <div className="search-bar" style={{ marginBottom: 14 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                    </svg>
                                    <input
                                        placeholder="Search users…"
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                    />
                                </div>
                                {!filteredUsers.length ? (
                                    <div className="empty-state"><p>No users found</p></div>
                                ) : (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>User</th>
                                                    <th>Total Calls</th>
                                                    <th>Completed</th>
                                                    <th>Cancelled</th>
                                                    <th>Last Call</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map(u => (
                                                    <tr
                                                        key={u.id}
                                                        className="clickable-row"
                                                        onClick={() => navigate(`/customers/${u.customer_id}`)}
                                                    >
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <Avatar name={u.name || '?'} />
                                                                <div>
                                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name || '—'}</div>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.total_calls || 0}</span></td>
                                                        <td><span style={{ color: '#34d399', fontWeight: 600 }}>{u.completed_calls || 0}</span></td>
                                                        <td><span style={{ color: '#f87171', fontWeight: 600 }}>{u.cancelled_calls || 0}</span></td>
                                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                            {u.last_call ? timeAgo(u.last_call) : '—'}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${u.status ? 'badge-green' : 'badge-gray'}`}>
                                                                {u.status ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}

                        {/* All calls tab */}
                        {tab === 'calls' && (
                            !calls.length ? (
                                <div className="empty-state"><p>No call history</p></div>
                            ) : (
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Customer</th>
                                                <th>Interpreter</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                                <th>Duration</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {calls.map(c => (
                                                <tr key={c.monitoring_id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <Avatar name={c.customer_name || '?'} size="sm" />
                                                            <div>
                                                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.customer_name || '—'}</div>
                                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.customer_email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {c.interpreter_name
                                                            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <Avatar name={c.interpreter_name} size="sm" />
                                                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.interpreter_name}</span>
                                                            </div>
                                                            : <span className="badge badge-gray">Unassigned</span>}
                                                    </td>
                                                    <td><ChatBadge is_chat={c.is_chat} /></td>
                                                    <td><StatusBadge status={c.status} /></td>
                                                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.duration ? `${c.duration}s` : '—'}</td>
                                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDateTime(c.created_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </div>
                </>
            ) : null}
        </div>
    );
}
