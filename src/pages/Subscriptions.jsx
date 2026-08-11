import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from 'chart.js';
import api, { unwrapApiData } from '../services/api';
import './Subscriptions.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Subscriptions() {
    const [subscriptions, setSubscriptions] = useState([]);
    const [revenueSummary, setRevenueSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [markingPaidId, setMarkingPaidId] = useState(null);
    const [approvingId, setApprovingId] = useState(null);
    const [cancellingId, setCancellingId] = useState(null);

    useEffect(() => {
        loadSubscriptions();
    }, [page, statusFilter]);

    useEffect(() => {
        loadRevenueSummary();
    }, []);

    const loadSubscriptions = async () => {
        try {
            setLoading(true);
            setError('');

            let url = `/api/admin/subscriptions?page=${page}&limit=20`;
            if (statusFilter) {
                url += `&status=${statusFilter}`;
            }

            const response = await api.get(url);
            const data = unwrapApiData(response) || {};

            setSubscriptions(data.data || []);
            setTotalPages(data.totalPages || 1);
            setTotal(data.total || 0);
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách subscription');
        } finally {
            setLoading(false);
        }
    };

    const loadRevenueSummary = async () => {
        try {
            setSummaryLoading(true);
            const response = await api.get('/api/admin/revenue-summary');
            setRevenueSummary(unwrapApiData(response));
        } catch (err) {
            setError(err.message || 'Không thể tải thống kê doanh thu');
        } finally {
            setSummaryLoading(false);
        }
    };


    const refreshAll = async () => {
        await Promise.all([loadSubscriptions(), loadRevenueSummary()]);
    };

    const approveSubscription = async (id) => {
        try {
            setApprovingId(id);
            setError('');
            await api.post(`/api/admin/subscriptions/${id}/approve`);
            await refreshAll();
        } catch (err) {
            setError(err.message || 'Không thể phê duyệt subscription');
        } finally {
            setApprovingId(null);
        }
    };

    const markSubscriptionPaid = async (id) => {
        if (!window.confirm('Đánh dấu subscription này là đã thanh toán?')) {
            return;
        }

        try {
            setMarkingPaidId(id);
            setError('');
            await api.patch(`/api/admin/subscriptions/${id}/mark-paid`, {});
            await refreshAll();
        } catch (err) {
            setError(err.message || 'Không thể cập nhật thanh toán');
        } finally {
            setMarkingPaidId(null);
        }
    };

    const cancelSubscription = async (id) => {
        if (!window.confirm('Hủy subscription này?')) {
            return;
        }

        try {
            setCancellingId(id);
            setError('');
            await api.patch(`/api/admin/subscriptions/${id}/cancel`, {});
            await refreshAll();
        } catch (err) {
            setError(err.message || 'Không thể hủy subscription');
        } finally {
            setCancellingId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(Number(amount || 0));
    };

    const getPaymentText = (paymentStatus) => {
        const paymentMap = {
            PAID: 'Đã TT',
            PENDING: 'Chờ TT',
            EXPIRED: 'Hết hạn',
            CANCELLED: 'Đã hủy',
        };

        return paymentMap[paymentStatus] || paymentStatus || 'N/A';
    };

    const getUserName = (subscription) => subscription.userName || subscription.user?.name || '-';
    const getUserEmail = (subscription) => subscription.userEmail || subscription.user?.email || '-';

    const getDaysRemaining = (endDate) => {
        if (!endDate) return 0;

        const end = new Date(endDate);
        const now = new Date();
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

        return Math.max(0, diff);
    };

    const revenueChartData = useMemo(() => {
        if (!revenueSummary) {
            return null;
        }

        return {
            labels: revenueSummary.labels || [],
            datasets: [
                {
                    label: revenueSummary.rangeLabel || 'Doanh thu theo năm',
                    data: revenueSummary.data || [],
                    backgroundColor: 'rgba(37, 99, 235, 0.78)',
                    borderColor: '#2563eb',
                    borderWidth: 1,
                    borderRadius: 8,
                    maxBarThickness: 42,
                    categoryPercentage: 0.92,
                    barPercentage: 0.98,
                },
            ],
        };
    }, [revenueSummary]);

    const revenueChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => formatCurrency(context.parsed.y),
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => new Intl.NumberFormat('vi-VN', {
                        notation: 'compact',
                        compactDisplay: 'short',
                    }).format(value),
                },
            },
        },
    }), []);

    if (loading && subscriptions.length === 0 && summaryLoading) {
        return (
            <div className="loading-container">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <div className="subscriptions-page">
            <div className="section-header">
                <div className="header-left">
                    <h2>Thống kê doanh thu VIP</h2>
                    <span className="total-badge">{total} subscription</span>
                </div>
                <div className="section-actions">
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="filter-select"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="pending">Đang chờ</option>
                        <option value="active">Hoạt động</option>
                        <option value="expired">Hết hạn</option>
                        <option value="cancelled">Đã hủy</option>
                        <option value="failed">Thất bại</option>
                    </select>
                    <button className="btn btn-primary" onClick={refreshAll}>
                        <i className="fas fa-sync-alt"></i> Làm mới
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i> {error}
                    <button onClick={() => setError('')}><i className="fas fa-times"></i></button>
                </div>
            )}

            <div className="revenue-chart-panel">
                <div className="revenue-chart-header">
                    <div>
                        <h3>Doanh thu theo 12 tháng</h3>
                      
                    </div>
                    <span className="chart-year-badge">{revenueSummary?.rangeLabel || 'Theo năm'}</span>
                </div>
                <div className="revenue-chart-body">
                    {revenueChartData ? (
                        <Bar data={revenueChartData} options={revenueChartOptions} />
                    ) : (
                        <div className="chart-empty-state">Chưa có dữ liệu doanh thu</div>
                    )}
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Người dùng</th>
                            <th>Giá gói</th>
                            <th>Thời hạn</th>
                            <th>Còn lại</th>
                            <th>Thanh toán</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subscriptions.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="empty-cell">Không có dữ liệu</td>
                            </tr>
                        ) : (
                            subscriptions.map((sub) => {
                                const daysLeft = getDaysRemaining(sub.endDate);
                                const isExpiringSoon = sub.status === 'active' && daysLeft <= 7;
                                const isMarkingPaid = markingPaidId === sub.id;
                                const isApproving = approvingId === sub.id;
                                const isCancelling = cancellingId === sub.id;

                                return (
                                    <tr key={sub.id} className={isExpiringSoon ? 'expiring-soon' : ''}>
                                        <td>{sub.id}</td>
                                        <td className="user-cell">
                                            <span className="user-name">{getUserName(sub)}</span>
                                            <span className="user-email">{getUserEmail(sub)}</span>
                                        </td>
                                        <td className="price-cell">{formatCurrency(sub.price)}</td>
                                        <td className="date-range-cell">
                                            <span className="date-end">{formatDate(sub.endDate)}</span>
                                            <span className="date-start">{formatDate(sub.startDate)}</span>
                                        </td>
                                        <td>
                                            {sub.status === 'active' ? (
                                                <span className={`days-badge ${daysLeft <= 7 ? 'warning' : ''}`}>
                                                    {daysLeft} ngày
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <span className={`payment-badge ${sub.paymentStatus?.toLowerCase()}`}>
                                                {getPaymentText(sub.paymentStatus)}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <div className="actions-stack">
                                                {sub.canMarkPaid && (
                                                    <button
                                                        className="btn-icon btn-accent"
                                                        onClick={() => markSubscriptionPaid(sub.id)}
                                                        title="Mark paid"
                                                        disabled={isMarkingPaid}
                                                    >
                                                        <i className={`fas ${isMarkingPaid ? 'fa-spinner fa-spin' : 'fa-money-check-dollar'}`}></i>
                                                    </button>
                                                )}
                                                {sub.status === 'pending' && sub.paymentStatus === 'PAID' && (
                                                    <button
                                                        className="btn-icon btn-success"
                                                        onClick={() => approveSubscription(sub.id)}
                                                        title="Phê duyệt"
                                                        disabled={isApproving}
                                                    >
                                                        <i className={`fas ${isApproving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                                                    </button>
                                                )}
                                                {sub.canCancel && (
                                                    <button
                                                        className="btn-icon btn-danger"
                                                        onClick={() => cancelSubscription(sub.id)}
                                                        title="Hủy subscription"
                                                        disabled={isCancelling}
                                                    >
                                                        <i className={`fas ${isCancelling ? 'fa-spinner fa-spin' : 'fa-ban'}`}></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="page-btn"
                        disabled={page === 1}
                        onClick={() => setPage((prev) => prev - 1)}
                    >
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <span className="page-info">
                        Trang {page} / {totalPages}
                    </span>
                    <button
                        className="page-btn"
                        disabled={page === totalPages}
                        onClick={() => setPage((prev) => prev + 1)}
                    >
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
            )}
        </div>
    );
}

export default Subscriptions;
