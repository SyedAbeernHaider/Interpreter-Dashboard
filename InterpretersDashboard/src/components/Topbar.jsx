import { useNavigate, useLocation } from 'react-router-dom';

export function Topbar() {
    const location = useLocation();

    // Simple breadcrumb logic based on path
    const pathParts = location.pathname.split('/').filter(p => p);
    const pageName = pathParts.length > 0
        ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
        : 'Dashboard';

    return (
        <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--gradient-brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>ConnectHear</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Platform / {pageName}
                    </div>
                </div>
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Search Trigger */}
                <button className="btn-ghost" style={{ padding: 8, borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                </button>

                {/* Notifications */}
                <button className="btn-ghost" style={{ padding: 8, borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: 'var(--accent-red)', borderRadius: '50%', border: '2px solid white' }} />
                </button>

                <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Admin User</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Super Admin</div>
                    </div>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--gradient-purple)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 13,
                        boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)'
                    }}>
                        AD
                    </div>
                </div>
            </div>
        </div>
    );
}
