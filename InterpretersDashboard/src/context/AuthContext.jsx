import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => sessionStorage.getItem('auth_token'));
    const [user, setUser] = useState(() => {
        const u = sessionStorage.getItem('auth_user');
        return u ? JSON.parse(u) : null;
    });
    const [loading, setLoading] = useState(true);

    // Verify token on mount
    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }
        fetch(`${API_BASE}/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => {
                if (!r.ok) throw new Error('Invalid');
                return r.json();
            })
            .then(data => {
                setUser(data.user);
                setLoading(false);
            })
            .catch(() => {
                logout();
                setLoading(false);
            });
    }, []);

    const login = async (email, password) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        sessionStorage.setItem('auth_token', data.token);
        sessionStorage.setItem('auth_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        if (token) {
            fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => { });
        }
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
    };

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
