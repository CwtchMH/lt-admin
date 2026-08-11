import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Chat from './pages/Chat';
import './App.css';

// Lazy load all pages for code splitting - only Dashboard + Login load eagerly
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardDetails = lazy(() => import('./pages/DashboardDetails'));
const Users = lazy(() => import('./pages/Users'));
const Categories = lazy(() => import('./pages/Categories'));
const Activity = lazy(() => import('./pages/Activity'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const Affiliate = lazy(() => import('./pages/Affiliate'));
const ShopManager = lazy(() => import('./pages/ShopManager'));
const PathsManager = lazy(() => import('./pages/PathsManager'));
const Classrooms = lazy(() => import('./pages/Classrooms'));
const Security = lazy(() => import('./pages/Security'));

const PageLoader = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--primary)', fontSize: '0.95rem' }}>
        <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i> Đang tải trang...
    </div>
);

// Protected Route component
function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <div className="loading-screen">Đang tải...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Suspense fallback={<PageLoader />}>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/dashboard/details" element={<DashboardDetails />} />
                                    <Route path="/users" element={<Users />} />
                                    <Route path="/categories" element={<Categories />} />
                                    <Route path="/activity" element={<Activity />} />
                                    <Route path="/chat" element={<Chat />} />
                                    <Route path="/subscriptions" element={<Subscriptions />} />
                                    <Route path="/affiliate" element={<Affiliate />} />
                                    <Route path="/shop" element={<ShopManager />} />
                                    <Route path="/paths" element={<PathsManager />} />
                                    <Route path="/classrooms" element={<Classrooms />} />
                                    <Route path="/security" element={<Security />} />
                                    <Route path="/word-puzzles" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </Suspense>
                        </Layout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;
