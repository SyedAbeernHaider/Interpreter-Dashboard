import { callStatusLabel, callStatusBadge } from '../utils/helpers';

export function StatusBadge({ status, notificationCount }) {
    let label = callStatusLabel(status);
    let badgeClass = callStatusBadge(status);

    if (status === 3 && notificationCount > 0) {
        label = 'Missed';
        badgeClass = 'badge-red'; // Keep it red for missed
    } else if (status === 3) {
        label = 'Cancelled';
        badgeClass = 'badge-gray'; // Use gray for cancelled (user just closed)
    }

    return (
        <span className={`badge ${badgeClass}`}>
            {label}
        </span>
    );
}

export function OnlineStatus({ online_status, on_call_status }) {
    if (on_call_status) return (
        <span className="badge badge-orange" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
            <span className="status-dot oncall pulse" /> On Call
        </span>
    );
    if (online_status) return (
        <span className="badge badge-green">
            <span className="status-dot online pulse" /> Online
        </span>
    );
    return (
        <span className="badge badge-gray">
            <span className="status-dot offline" /> Offline
        </span>
    );
}

export function ChatBadge({ is_chat }) {
    return is_chat
        ? <span className="badge badge-cyan">Chat</span>
        : <span className="badge badge-purple">Video</span>;
}
