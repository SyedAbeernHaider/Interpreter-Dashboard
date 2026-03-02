import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/api';
import { Avatar } from '../components/Avatar';
import { OnlineStatus, StatusBadge, ChatBadge } from '../components/StatusBadge';
import { formatDateTime, formatDate, timeAgo, formatDuration } from '../utils/helpers';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

import { DateFilter } from '../components/DateFilter';

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

export function InterpreterDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');
    const [tab, setTab] = useState('calls');

    const { data, loading, error } = useApi(
        () => api.getInterpreterById(id, filter),
        [id, filter]
    );

    const { interpreter: interp, calls = [], missed = [], dailyStats = [] } = data || {};

    const totalCalls = calls.length;
    const completedCalls = calls.filter(c => c.status === 2).length;
    const avgDuration = calls.filter(c => c.duration).reduce((acc, c, _, arr) => acc + Number(c.duration) / arr.length, 0);

    const chartData = dailyStats.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Total: Number(d.total),
        Completed: Number(d.completed),
    }));

    return (
        <div className="page-content fade-in">
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <a onClick={() => navigate('/interpreters')} style={{ cursor: 'pointer' }}>Interpreters</a>
                <span>/</span>
                <span>{interp?.name || 'Loading...'}</span>
            </div>

            {loading ? (
                <div className="loading-container" style={{ height: 400 }}>
                    <div className="spinner" />
                    <span>Loading interpreter data…</span>
                </div>
            ) : error ? (
                <div className="empty-state">
                    <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
                </div>
            ) : interp ? (
                <>
                    {/* ── Profile Header ─────────────────────────── */}
                    <div className="profile-header section">
                        <Avatar name={interp.name || ''} size="xl" />
                        <div className="profile-info">
                            <div className="profile-name">{interp.name || 'Unknown'}</div>
                            <div className="profile-meta">
                                <span>✉ {interp.email}</span>
                                {interp.mobile_number && <span>📱 {interp.mobile_number}</span>}
                                {interp.occupation && <span>💼 {interp.occupation}</span>}
                                {interp.address && <span>📍 {interp.address}</span>}
                                {interp.gender && <span>👤 {interp.gender}</span>}
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <OnlineStatus online_status={interp.online_status} on_call_status={interp.on_call_status} />
                            </div>
                        </div>
                        <div className="profile-stats">
                            {[
                                { label: 'Completed Calls', value: totalCalls, color: '#10b981' },
                                { label: 'Missed Notifications', value: missed.length, color: '#ef4444' },
                                { label: 'Avg Duration', value: avgDuration ? `${Math.round(avgDuration)}s` : '—', color: '#f59e0b' },
                            ].map(s => (
                                <div key={s.label} className="mini-stat">
                                    <div className="mini-stat-value" style={{ color: s.color }}>{s.value}</div>
                                    <div className="mini-stat-label">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Charts ─────────────────────────────────── */}
                    <div className="grid-2 section">
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Call Activity (30 Days)</div>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="Completed" fill="#10b981" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Call Trend</div>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* ── Call History + Missed ─────────────────── */}
                    <div className="card section">
                        <div className="card-header">
                            <div style={{ display: 'flex', gap: 4 }}>
                                <div className="filter-tabs">
                                    <button
                                        className={`filter-tab ${tab === 'calls' ? 'active' : ''}`}
                                        onClick={() => setTab('calls')}
                                    >
                                        Completed Calls ({totalCalls})
                                    </button>
                                    <button
                                        className={`filter-tab ${tab === 'missed' ? 'active' : ''}`}
                                        onClick={() => setTab('missed')}
                                    >
                                        Missed ({missed.length})
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <DateFilter value={filter} onChange={setFilter} />
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        window.location.href = `/api/interpreters/${id}/export?filter=${filter}`;
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Export Excel
                                </button>
                            </div>
                        </div>

                        {tab === 'calls' ? (
                            !calls.length ? (
                                <div className="empty-state"><p>No calls in this period</p></div>
                            ) : (
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Customer</th>
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
                        ) : (
                            !missed.length ? (
                                <div className="empty-state">
                                    <p style={{ color: '#34d399' }}>✓ No missed calls — great performance!</p>
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Customer</th>
                                                <th>Missed At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {missed.map(m => (
                                                <tr key={m.missed_call_id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <Avatar name={m.customer_name || m.user_name || '?'} size="sm" />
                                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                                {m.customer_name || m.user_name || '—'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {formatDateTime(m.missed_call_time)}
                                                        <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 11 }}>
                                                            ({timeAgo(m.missed_call_time)})
                                                        </span>
                                                    </td>
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
