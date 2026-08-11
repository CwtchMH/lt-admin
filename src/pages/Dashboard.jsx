import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import api, { unwrapApiData } from '../services/api';
import './Dashboard.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

function Dashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, []);

    const getLastSevenDayLabels = () => {
        const formatter = new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
        });

        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            return formatter.format(date);
        });
    };

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError('');
            // /dashboard gộp sẵn đúng các con số trang này hiển thị và được cache
            // 60s ở backend. Trước đây đây là 4 request và ~18 truy vấn SQL.
            const dashboardResponse = await api.get('/api/admin/dashboard');
            const dashboard = unwrapApiData(dashboardResponse);

            setDashboardData({
                overview: dashboard?.overview || {},
                userGrowth: dashboard?.userGrowth || {},
                charts: {
                    newUsersLastSevenDays: {
                        labels: dashboard?.charts?.newUsersLastSevenDays?.labels?.length
                            ? dashboard.charts.newUsersLastSevenDays.labels
                            : getLastSevenDayLabels(),
                        data: dashboard?.charts?.newUsersLastSevenDays?.data || [],
                    },
                },
            });
        } catch (err) {
            setError(err.message || 'Không thể tải dữ liệu dashboard');
        } finally {
            setLoading(false);
        }
    };

    const overview = dashboardData?.overview || {};
    const userGrowth = dashboardData?.userGrowth || {};

    const newUsersChartData = dashboardData?.charts?.newUsersLastSevenDays
        ? {
            labels: dashboardData.charts.newUsersLastSevenDays.labels || [],
            datasets: [
                {
                    label: 'Người dùng mới',
                    data: dashboardData.charts.newUsersLastSevenDays.data || [],
                    backgroundColor: 'rgba(34, 197, 94, 0.72)',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    borderRadius: 8,
                    maxBarThickness: 36,
                },
            ],
        }
        : null;

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num?.toString() || '0';
    };

    const formatCurrency = (num) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(num || 0);
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { font: { size: 11 } },
            },
            x: {
                ticks: { font: { size: 11 } },
            },
        },
    };

    if (loading) {
        return (
            <div className="loading-container">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <i className="fas fa-exclamation-triangle"></i>
                <p>{error}</p>
                <button onClick={loadDashboardData} className="btn btn-primary">
                    Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-row">
                <div className="key-metrics">
                    <div className="metric-card highlight">
                        <div className="metric-icon users">
                            <i className="fas fa-users"></i>
                        </div>
                        <div className="metric-content">
                            <span className="metric-value">{formatNumber(overview.totalUsers)}</span>
                            <span className="metric-label">Tổng user</span>
                        </div>
                    </div>

                    <div className="metric-card highlight">
                        <div className="metric-icon vip">
                            <i className="fas fa-crown"></i>
                        </div>
                        <div className="metric-content">
                            <span className="metric-value">{formatNumber(overview.vipUsers)}</span>
                            <span className="metric-label">VIP</span>
                            <span className="metric-sub">
                                {overview.totalUsers > 0 ? ((overview.vipUsers / overview.totalUsers) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>

                    <div className="metric-card highlight">
                        <div className="metric-icon revenue">
                            <i className="fas fa-money-bill-wave"></i>
                        </div>
                        <div className="metric-content">
                            <span className="metric-value">{formatCurrency(overview.currentMonthRevenue || 0)}</span>
                            <span className="metric-label">DT tháng này</span>
                            <span className="metric-sub">Phân bổ theo thời gian sử dụng</span>
                        </div>
                    </div>

                    <div className="metric-card highlight">
                        <div className="metric-icon revenue">
                            <i className="fas fa-calendar-plus"></i>
                        </div>
                        <div className="metric-content">
                            <span className="metric-value">{formatCurrency(overview.nextMonthRevenue || 0)}</span>
                            <span className="metric-label">DT tháng sau</span>
                            <span className="metric-sub">Giá trị đã có sẵn cho tháng kế tiếp</span>
                        </div>
                    </div>

                    <div className="metric-card highlight">
                        <div className="metric-icon active">
                            <i className="fas fa-check-circle"></i>
                        </div>
                        <div className="metric-content">
                            <span className="metric-value">{formatNumber(overview.activeSubscriptions)}</span>
                            <span className="metric-label">VIP đang chạy</span>
                        </div>
                    </div>

                    <div className="metric-card highlight">
                        <div className="metric-icon growth">
                            <i className="fas fa-calendar-alt"></i>
                        </div>
                        <div className="metric-content">
                            <span className="metric-value">{formatNumber(userGrowth.lastThreeMonthsNewUsers)}</span>
                            <span className="metric-label">Mới 3 tháng</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-row charts-row">
                <div className="panel flex-half">
                    <div className="panel-header">
                        <h3><i className="fas fa-user-plus"></i> Người dùng mới 7 ngày gần nhất</h3>
                    </div>
                    <div className="panel-body chart-container">
                        {newUsersChartData && <Bar data={newUsersChartData} options={chartOptions} />}
                    </div>
                </div>
            </div>

            <div className="dashboard-actions">
                <Link className="dashboard-detail-link" to="/dashboard/details">
                    <i className="fas fa-th-large"></i>
                    Xem thống kê nội dung
                </Link>
            </div>
        </div>
    );
}

export default Dashboard;
