import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Topbar() {
    const location = useLocation();
    const { logout, user } = useAuth();

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
                <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {user?.name || 'Admin'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {user?.email || 'Super Admin'}
                        </div>
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

                <button className="logout-btn" onClick={logout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    Logout
                </button>
            </div>
        </div>
    );
}
