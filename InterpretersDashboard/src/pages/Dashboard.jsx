import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../api/api';
import { formatDateTime, timeAgo, parsePKT } from '../utils/helpers';
import { StatusBadge, ChatBadge } from '../components/StatusBadge';
import { Avatar } from '../components/Avatar';
import { DateFilter } from '../components/DateFilter';
import { useState } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS_PIE = ['#10b981', '#fb923c', '#6366f1'];

function StatCard({ icon, label, value, color, onClick }) {
    return (
        <div
            className={`stat-card fade-in ${onClick ? 'clickable' : ''}`}
            onClick={onClick}
            style={onClick ? { cursor: 'pointer' } : {}}
        >
            <div className={`stat-icon ${color}`}>{icon}</div>
            <div className="stat-info">
                <div className="stat-value">{value ?? '—'}</div>
                <div className="stat-label">{label}</div>
            </div>
            {onClick && (
                <div style={{ position: 'absolute', top: 12, right: 12, color: 'var(--text-muted)', opacity: 0.5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
            )}
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="recharts-default-tooltip">
            <div className="recharts-tooltip-label" style={{ marginBottom: 8, fontWeight: 700 }}>{label}</div>
            {payload.map(p => (
                <div key={p.name} style={{ color: p.color, fontSize: 12, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                    <span>{p.name}:</span> <strong>{p.value}</strong>
                </div>
            ))}
        </div>
    );
}

export function Dashboard() {
    const [dateFilter, setDateFilter] = useState('today');

    const { data: stats, loading: l1 } = useApi(() => api.getDashboardStats(dateFilter), [dateFilter]);
    const { data: trend, loading: l2 } = useApi(api.getCallsTrend);
    const { data: recent, loading: l3 } = useApi(() => api.getRecentSessions(dateFilter), [dateFilter]);
    const { data: interpStatus, loading: l4 } = useApi(api.getInterpreterStatus);
    const navigate = useNavigate();

    const trendData = (trend || []).map(r => ({
        date: parsePKT(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Karachi' }),
        Total: Number(r.total),
        Completed: Number(r.completed),
        Missed: Number(r.missed),
        Cancelled: Number(r.cancelled),
        Disconnected: Number(r.disconnected),
    }));

    const pieData = interpStatus || [];

    return (
        <div className="page-content fade-in">
            {/* ── Stats Row ────────────────────────────────── */}
            <div className="section">
                <div className="page-header">
                    <div>
                        <div className="page-title">Executive Overview</div>
                        <div className="page-description">Platform performance and activity metrics</div>
                    </div>
                    <DateFilter value={dateFilter} onChange={setDateFilter} />
                </div>

                {l1 ? <div className="loading-container"><div className="spinner" /></div> : (
                    <div className="grid-3">
                        <StatCard
                            color="blue"
                            label="Total Interpreters"
                            value={stats?.total_interpreters}
                            icon={<IconUsers />}
                            onClick={() => navigate('/interpreters')}
                        />
                        <StatCard
                            color="green"
                            label="Online Now"
                            value={stats?.active_interpreters}
                            icon={<IconWifi />}
                            onClick={() => navigate('/interpreters')}
                        />
                        <StatCard
                            color="orange"
                            label="On Call Now"
                            value={stats?.on_call}
                            icon={<IconPhone />}
                            onClick={() => navigate('/interpreters')}
                        />
                        <StatCard
                            color="purple"
                            label="Total Customers"
                            value={stats?.total_customers}
                            icon={<IconUser />}
                            onClick={() => navigate('/customers')}
                        />
                        <StatCard
                            color="blue"
                            label="Total Calls"
                            value={stats?.calls_today}
                            icon={<IconActivity />}
                        />
                        <StatCard
                            color="green"
                            label="Completed Calls"
                            value={stats?.completed_today}
                            icon={<IconCheck />}
                        />
                        <StatCard
                            color="red"
                            label="Missed Calls"
                            value={stats?.missed_today}
                            icon={<IconPhoneMissed />}
                            onClick={() => navigate('/missed-calls')}
                        />
                        <StatCard
                            color="pink"
                            label="Cancelled Calls"
                            value={stats?.cancelled_today}
                            icon={<IconXCircle />}
                        />
                    </div>
                )}
            </div>

            {/* ── Charts Row ───────────────────────────────── */}
            <div className="grid-2-1 section">
                {/* Area Chart - Call Trend */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Call Volume Patterns</div>
                            <div className="card-subtitle">Performance over the last 7 days</div>
                        </div>
                    </div>
                    {l2 ? <div className="loading-container" style={{ height: 260 }}><div className="spinner" /></div> : (
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                                <defs>
                                    <linearGradient id="colTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colCompleted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="Total" stroke="#6366f1" fill="url(#colTotal)" strokeWidth={3} />
                                <Area type="monotone" dataKey="Completed" stroke="#10b981" fill="url(#colCompleted)" strokeWidth={3} />
                                <Area type="monotone" dataKey="Missed" stroke="#ef4444" fill="none" strokeWidth={2} />
                                <Area type="monotone" dataKey="Cancelled" stroke="#ec4899" fill="none" strokeWidth={2} strokeDasharray="6 4" />
                                <Area type="monotone" dataKey="Disconnected" stroke="#94a3b8" fill="none" strokeWidth={2} dotted />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Pie Chart - Interpreter Status */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Live Availability</div>
                            <div className="card-subtitle">Real-time status distribution</div>
                        </div>
                    </div>
                    {l4 ? <div className="loading-container" style={{ height: 260 }}><div className="spinner" /></div> : (
                        <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={95}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        align="center"
                                        iconType="circle"
                                        iconSize={10}
                                        formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>{v}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>


            {/* ── Recent Sessions ──────────────────────────── */}
            <div className="card section">
                <div className="card-header">
                    <div>
                        <div className="card-title">Recent Sessions</div>
                        <div className="card-subtitle">Latest call sessions</div>
                    </div>
                </div>
                {l3 ? (
                    <div className="loading-container"><div className="spinner" /></div>
                ) : !recent?.length ? (
                    <div className="empty-state">
                        <IconActivity size={40} />
                        <p>No sessions found</p>
                    </div>
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
                                    <th>Started</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent.map(s => (
                                    <tr key={s.monitoring_id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Avatar name={s.customer_name || '?'} size="sm" />
                                                <div>
                                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.customer_name || 'Unknown'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.customer_email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{s.interpreter_name || <span className="badge badge-gray">Unassigned</span>}</td>
                                        <td><ChatBadge is_chat={s.is_chat} /></td>
                                        <td><StatusBadge status={s.status} notificationCount={s.notification_count} /></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.duration ? `${s.duration}s` : '—'}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDateTime(s.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconUsers() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IconUser() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconPhone() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5 2 2 0 0 1 3.59 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.91A16 16 0 0 0 13 16l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
}
function IconPhoneMissed() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="23" y1="1" x2="1" y2="23" /><path d="M16.5 4.5A14.5 14.5 0 0 1 5.24 14.87M9.5 1.5A14.5 14.5 0 0 1 22.27 14.13" /><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 2 2 0 0 1-.45-2.11" /><path d="M3.5 3.5A19.79 19.79 0 0 0 1.61 5 2 2 0 0 0 3.59 7h3a2 2 0 0 0 2-1.72" /></svg>;
}
function IconWifi() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" /></svg>;
}
function IconActivity() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
}
function IconCheck() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconClock() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function IconXCircle() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;
}
