import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Layout.css';

function Layout({ children }) {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems = [
        { path: '/dashboard', icon: 'fas fa-chart-line', label: 'Dashboard' },
        { path: '/dashboard/details', icon: 'fas fa-th-large', label: 'Thống kê nội dung' },
        { path: '/users', icon: 'fas fa-users', label: 'Người dùng' },
        { path: '/categories', icon: 'fas fa-folder', label: 'Danh mục' },
        { path: '/paths', icon: 'fas fa-map', label: 'Lộ trình' },
        { path: '/classrooms', icon: 'fas fa-chalkboard-teacher', label: 'Lớp học' },
        { path: '/shop', icon: 'fas fa-shopping-bag', label: 'Cửa hàng' },
        { path: '/chat', icon: 'fas fa-comments', label: 'Global Chat' },
        { path: '/activity', icon: 'fas fa-user-clock', label: 'Hoạt động' },
        { path: '/subscriptions', icon: 'fas fa-credit-card', label: 'Doanh thu VIP' },
        { path: '/affiliate', icon: 'fas fa-handshake', label: 'Affiliate' },
    ];

    useEffect(() => {
        // Close sidebar on route change (mobile)
        setSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="admin-container">
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="logo">
                    <h2><i className="fas fa-brain"></i> AI Vocab Admin</h2>
                </div>
                <nav className="nav-menu">
                    <ul>
                        {navItems.map(item => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    end={item.path === '/dashboard'}
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <i className={item.icon}></i> {item.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <button
                    className='mobile-menu-toggle'
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label='Toggle menu'
                >
                    <i className='fas fa-bars'></i>
                </button>

                <div className="content-wrapper">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default Layout;
