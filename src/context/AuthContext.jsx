import { createContext, useContext, useEffect, useState } from 'react';
import {
    api,
    API_BASE_URL,
    ADMIN_TOKEN_KEY,
    ADMIN_USER_KEY,
    clearAdminSession,
    getStoredAdminToken,
    unwrapApiData,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = getStoredAdminToken();
            const savedUser = localStorage.getItem(ADMIN_USER_KEY);

            if (!token) {
                setLoading(false);
                return;
            }

            if (savedUser) {
                try {
                    const cachedUser = JSON.parse(savedUser);
                    if (cachedUser?.role !== 'admin') {
                        clearAdminSession();
                        setLoading(false);
                        return;
                    }
                    setUser(cachedUser);
                } catch {
                    clearAdminSession();
                    setLoading(false);
                    return;
                }
            }

            try {
                const response = await api.get('/api/admin/me');
                const adminData = unwrapApiData(response);

                if (adminData?.role !== 'admin') {
                    throw new Error('Tài khoản không có quyền admin');
                }

                localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminData));
                setUser(adminData);
            } catch (error) {
                const message = String(error.message || '').toLowerCase();
                const isNonFatalError =
                    message.includes('network error') ||
                    message.includes('request timeout') ||
                    message.includes('failed to fetch') ||
                    error.name === 'AbortError';

                if (!isNonFatalError) {
                    clearAdminSession();
                    setUser(null);
                }

                console.warn('[Auth] checkAuth error:', error.message);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const payload = await response.json();
            const data = unwrapApiData(payload);

            if (!data?.token || !data?.user) {
                throw new Error(payload?.message || 'Đăng nhập thất bại');
            }

            if (data.user.role !== 'admin') {
                throw new Error('Tài khoản không có quyền admin');
            }

            localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
            localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.user));
            setUser(data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        clearAdminSession();
        setUser(null);
    };

    const value = {
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
