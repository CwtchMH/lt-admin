import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import api, { unwrapApiData } from '../services/api';
import './Activity.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

function Activity() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [days, setDays] = useState(7);
    const [showNewUsersModal, setShowNewUsersModal] = useState(false);
    const [newUsersTrend, setNewUsersTrend] = useState(null);
    const [trendLoading, setTrendLoading] = useState(false);
    const [trendError, setTrendError] = useState('');

    useEffect(() => {
        loadActivity();
    }, [days]);

    useEffect(() => {
        if (!showNewUsersModal) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setShowNewUsersModal(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showNewUsersModal]);

    const loadActivity = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/api/admin/activity/summary?days=${days}`);
            const data = unwrapApiData(response);
            setSummary(data);
        } catch (err) {
            setError(err.message || 'Không thể tải dữ liệu hoạt động');
        } finally {
            setLoading(false);
        }
    };

    const loadNewUsersTrend = async (forceReload = false) => {
        if (trendLoading) return;
        if (newUsersTrend && !forceReload) return;

        try {
            setTrendLoading(true);
            setTrendError('');
            const response = await api.get('/api/admin/activity/new-users-trend?months=3');
            const data = unwrapApiData(response);
            setNewUsersTrend(data);
        } catch (err) {
            setTrendError(err.message || 'Không thể tải xu hướng người dùng mới');
        } finally {
            setTrendLoading(false);
        }
    };

    const handleOpenNewUsersModal = async () => {
        setShowNewUsersModal(true);
        if (!newUsersTrend) {
            await loadNewUsersTrend();
        }
    };

    const formatTime = (value) => {
        if (!value) return '-';

        const date = new Date(value);
        const now = new Date();
        const diff = (now - date) / 1000;

        if (diff < 60) return 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        return date.toLocaleDateString('vi-VN');
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } },
        },
    };

    const dailyData = summary?.dailyLogins?.length
        ? {
            labels: summary.dailyLogins.map((item) => item.date.split('-').slice(1).join('/')),
            datasets: [
                {
                    label: 'Lượt đăng nhập',
                    data: summary.dailyLogins.map((item) => item.totalLogins),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#6366f1',
                },
                {
                    label: 'Số người đăng nhập',
                    data: summary.dailyLogins.map((item) => item.uniqueUsers),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#22c55e',
                    borderDash: [5, 5],
                },
            ],
        }
        : null;

    const hourlyData = summary?.hourlyLogins?.length
        ? {
            labels: summary.hourlyLogins.map((item) => `${item.hour}h`),
            datasets: [
                {
                    data: summary.hourlyLogins.map((item) => item.count),
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderRadius: 4,
                },
            ],
        }
        : null;

    const trendMonths = newUsersTrend?.months || [];
    const trendSummary = newUsersTrend?.summary || {};
    const newUsersTrendData = trendMonths.length
        ? {
            labels: trendMonths.map((item) => item.label),
            datasets: [
                {
                    label: 'Người dùng mới',
                    data: trendMonths.map((item) => item.count),
                    backgroundColor: ['rgba(34, 197, 94, 0.72)', 'rgba(59, 130, 246, 0.72)', 'rgba(99, 102, 241, 0.82)'],
                    borderColor: ['#22c55e', '#3b82f6', '#6366f1'],
                    borderWidth: 1,
                    borderRadius: 8,
                    maxBarThickness: 52,
                },
            ],
        }
        : null;

    if (loading) {
        return <div className="act-loading"><i className="fas fa-spinner fa-spin"></i></div>;
    }

    if (error) {
        return (
            <div className="act-error">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
                <button className="btn btn-primary" onClick={loadActivity}>Thử lại</button>
            </div>
        );
    }

    const stats = [
        { icon: 'fa-sign-in-alt', value: summary?.totals?.totalLogins || 0, label: 'Lượt đăng nhập', color: '#6366f1' },
        { icon: 'fa-users', value: summary?.totals?.uniqueUsers || 0, label: 'Người dùng', color: '#22c55e' },
        { icon: 'fa-calendar-check', value: summary?.totals?.todayLogins || 0, label: 'Hôm nay (lượt)', color: '#f59e0b' },
        { icon: 'fa-user-check', value: summary?.totals?.todayUniqueUsers || 0, label: 'Hôm nay (người)', color: '#3b82f6' },
        { icon: 'fa-fire', value: summary?.totals?.streakUsers || 0, label: 'Giữ streak', color: '#ef4444' },
    ];

    return (
        <div className="act-page">
            <div className="act-header">
                <h2><i className="fas fa-chart-line"></i> Hoạt động</h2>
                <div className="act-header-actions">
                    <button className="btn btn-secondary" onClick={handleOpenNewUsersModal}>
                        <i className="fas fa-user-plus"></i>
                        Xem user mới 3 tháng
                    </button>
                    <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                        <option value={7}>7 ngày</option>
                        <option value={14}>14 ngày</option>
                        <option value={30}>30 ngày</option>
                    </select>
                </div>
            </div>

            <div className="act-stats">
                {stats.map((item, index) => (
                    <div key={index} className="act-stat">
                        <div className="act-stat-icon" style={{ background: `${item.color}15`, color: item.color }}>
                            <i className={`fas ${item.icon}`}></i>
                        </div>
                        <div className="act-stat-info">
                            <strong>{item.value.toLocaleString()}</strong>
                            <span>{item.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="act-charts">
                <div className="act-chart">
                    <h4>Đăng nhập theo ngày</h4>
                    <div className="act-chart-container">
                        {dailyData && (
                            <Line
                                data={dailyData}
                                options={{
                                    ...chartOptions,
                                    plugins: { legend: { display: true, position: 'top' } },
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className="act-chart">
                    <h4>Theo giờ (24h)</h4>
                    <div className="act-chart-container">
                        {hourlyData && <Bar data={hourlyData} options={chartOptions} />}
                    </div>
                </div>
            </div>

            <div className="act-recent">
                <h4>Đăng nhập gần đây</h4>
                <div className="act-list">
                    {summary?.latestLogins?.length ? (
                        summary.latestLogins.slice(0, 10).map((login, index) => (
                            <div key={index} className="act-item">
                                <div className="act-avatar">
                                    {(login.name || login.email || '?')[0].toUpperCase()}
                                </div>
                                <div className="act-info">
                                    <strong>{login.name || 'Người dùng'}</strong>
                                    <span>{login.email}</span>
                                </div>
                                <div className="act-meta">
                                    <span className="act-count">{login.loginCount}x</span>
                                    <span className="act-time">{formatTime(login.loginAt)}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="act-empty">Chưa có dữ liệu</div>
                    )}
                </div>
            </div>

            {showNewUsersModal && (
                <div className="act-modal-overlay" onClick={() => setShowNewUsersModal(false)}>
                    <div className="act-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="act-modal-header">
                            <div>
                                <h3><i className="fas fa-user-plus"></i> Người dùng mới 3 tháng gần đây</h3>
                            </div>
                            <button
                                className="btn-icon"
                                type="button"
                                onClick={() => setShowNewUsersModal(false)}
                                aria-label="Đóng popup"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="act-modal-body">
                            {trendLoading ? (
                                <div className="act-modal-state">
                                    <i className="fas fa-spinner fa-spin"></i>
                                    <span>Đang tải xu hướng người dùng mới...</span>
                                </div>
                            ) : trendError ? (
                                <div className="act-modal-state error">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <span>{trendError}</span>
                                    <button className="btn btn-primary" onClick={() => loadNewUsersTrend(true)}>
                                        Thử lại
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="act-trend-summary">
                                        {trendMonths.map((month) => (
                                            <div key={`${month.year}-${month.month}`} className="act-trend-card">
                                                <span>{month.label}</span>
                                                <strong>{month.count.toLocaleString()}</strong>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="act-trend-highlight">
                                        <div className="act-trend-highlight-card">
                                            <span>Tháng này</span>
                                            <strong>{(trendSummary.currentMonthNewUsers || 0).toLocaleString()}</strong>
                                        </div>
                                        <div className="act-trend-highlight-card">
                                            <span>So với tháng trước</span>
                                            <strong className={(trendSummary.monthlyNewUsersDelta || 0) < 0 ? 'negative' : ''}>
                                                {(trendSummary.monthlyNewUsersDelta || 0) > 0 ? '+' : ''}
                                                {trendSummary.monthlyGrowthPercent || 0}%
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="act-modal-chart">
                                        {newUsersTrendData && <Bar data={newUsersTrendData} options={chartOptions} />}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Activity;
