import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/api';
import { Avatar } from '../components/Avatar';
import { StatusBadge, ChatBadge } from '../components/StatusBadge';
import { formatDateTime, timeAgo, parsePKT } from '../utils/helpers';
import { DateFilter } from '../components/DateFilter';
import { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
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

export function CustomerDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState('calls');
    const [dateFilter, setDateFilter] = useState('all');
    const { data, loading, error } = useApi(() => api.getCustomerById(id, dateFilter), [id, dateFilter]);

    const { customer: cust, calls = [], missedByInterpreters = [] } = data || {};

    const completed = calls.filter(c => c.status === 2).length;
    const cancelled = calls.filter(c => c.status === 3).length;

    // Group calls by date for chart
    const dateMap = {};
    calls.forEach(c => {
        const d = parsePKT(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Karachi' });
        dateMap[d] = (dateMap[d] || 0) + 1;
    });
    const chartData = Object.entries(dateMap)
        .slice(-14)
        .map(([date, count]) => ({ date, Calls: count }));

    // Top interpreters who missed this customer's calls
    const interpreterMisses = {};
    missedByInterpreters.forEach(m => {
        const key = m.interpreter_name || m.interpreter_id;
        interpreterMisses[key] = (interpreterMisses[key] || 0) + 1;
    });
    const topMissers = Object.entries(interpreterMisses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return (
        <div className="page-content fade-in">
            <div className="breadcrumb">
                <a onClick={() => navigate('/customers')} style={{ cursor: 'pointer' }}>Customers</a>
                <span>/</span>
                <span>{cust?.name || 'Loading...'}</span>
            </div>

            {loading ? (
                <div className="loading-container" style={{ height: 400 }}>
                    <div className="spinner" />
                    <span>Loading customer data…</span>
                </div>
            ) : error ? (
                <div className="empty-state">
                    <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
                </div>
            ) : cust ? (
                <>
                    {/* ── Profile Header ─────────────────────────── */}
                    <div className="profile-header section">
                        <Avatar name={cust.name || ''} size="xl" />
                        <div className="profile-info">
                            <div className="profile-name">{cust.name || 'Unknown'}</div>
                            <div className="profile-meta">
                                {cust.email && <span>✉ {cust.email}</span>}
                                {cust.mobile_number && <span>📱 {cust.mobile_number}</span>}
                                {cust.city && <span>📍 {cust.city}{cust.country ? `, ${cust.country}` : ''}</span>}
                                {cust.gender && <span>👤 {cust.gender}</span>}
                            </div>
                            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <span className={`badge ${cust.status ? 'badge-green' : 'badge-gray'}`}>
                                    {cust.status ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`badge ${cust.type === 'company' ? 'badge-purple' : 'badge-blue'}`}>
                                    {cust.type || 'Customer'}
                                </span>
                                {cust.subscription_type && (
                                    <span className="badge badge-cyan">{cust.subscription_type}</span>
                                )}
                                {cust.is_chat ? <span className="badge badge-cyan">Chat Enabled</span> : null}
                            </div>
                        </div>
                        <div className="profile-stats">
                            {[
                                { label: 'Total Calls', value: calls.length, color: '#3b82f6' },
                                { label: 'Completed', value: completed, color: '#10b981' },
                                { label: 'Cancelled', value: cancelled, color: '#ef4444' },
                                { label: 'Missed', value: missedByInterpreters.length, color: '#f59e0b' },
                            ].map(s => (
                                <div key={s.label} className="mini-stat">
                                    <div className="mini-stat-value" style={{ color: s.color }}>{s.value}</div>
                                    <div className="mini-stat-label">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Charts Row ─────────────────────────────── */}
                    <div className="grid-2-1 section">
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Call Frequency (Last 14 Days)</div>
                            </div>
                            {chartData.length ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="Calls" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-state" style={{ height: 200 }}><p>No call data available</p></div>
                            )}
                        </div>

                        {/* Top interpreters who missed */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Interpreters Who Missed</div>
                            </div>
                            {topMissers.length ? (
                                <div>
                                    {topMissers.map(([name, count], i) => (
                                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                            <div style={{
                                                width: 24, height: 24, borderRadius: '50%',
                                                background: 'var(--border)', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: 11, fontWeight: 700,
                                                color: 'var(--text-muted)', flexShrink: 0
                                            }}>
                                                {i + 1}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{name}</div>
                                                <div style={{
                                                    height: 4, borderRadius: 2, background: 'var(--border)',
                                                    marginTop: 4, overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: 2,
                                                        background: '#ef4444',
                                                        width: `${(count / topMissers[0][1]) * 100}%`
                                                    }} />
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', flexShrink: 0 }}>{count}x</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state" style={{ height: 160 }}>
                                    <p style={{ color: '#34d399' }}>✓ No missed calls</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── History Tabs ────────────────────────────── */}
                    <div className="card section">
                        <div className="card-header">
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div className="filter-tabs">
                                    <button className={`filter-tab ${tab === 'calls' ? 'active' : ''}`} onClick={() => setTab('calls')}>
                                        Call History ({calls.length})
                                    </button>
                                    <button className={`filter-tab ${tab === 'missed' ? 'active' : ''}`} onClick={() => setTab('missed')}>
                                        Missed by Interpreters ({missedByInterpreters.length})
                                    </button>
                                </div>
                                <DateFilter value={dateFilter} onChange={setDateFilter} />
                            </div>
                        </div>

                        {tab === 'calls' ? (
                            !calls.length ? (
                                <div className="empty-state"><p>No call history</p></div>
                            ) : (
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
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
                                                            <Avatar name={c.interpreter_name || '?'} size="sm" />
                                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                                {c.interpreter_name || <span className="badge badge-gray">Unassigned</span>}
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
                            !missedByInterpreters.length ? (
                                <div className="empty-state">
                                    <p style={{ color: '#34d399' }}>✓ No missed calls from interpreters</p>
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Interpreter</th>
                                                <th>Missed At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {missedByInterpreters.map(m => (
                                                <tr key={m.missed_call_id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <Avatar name={m.interpreter_name || '?'} size="sm" />
                                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                                {m.interpreter_name || '—'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {formatDateTime(m.missed_call_time)}
                                                        <span style={{ marginLeft: 8, fontSize: 11 }}>({timeAgo(m.missed_call_time)})</span>
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
