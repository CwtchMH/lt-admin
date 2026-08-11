import { useEffect, useMemo, useState } from 'react';
import api, { unwrapApiData } from '../services/api';
import './Subscriptions.css';
import './Affiliate.css';

function Affiliate() {
    const [orders, setOrders] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [monthlyPayouts, setMonthlyPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [updatingWithdrawalId, setUpdatingWithdrawalId] = useState(null);

    useEffect(() => {
        loadAffiliateOrders();
    }, [page, statusFilter]);

    useEffect(() => {
        loadWithdrawals();
    }, []);

    const loadAffiliateOrders = async () => {
        try {
            setLoading(true);
            setError('');
            let url = `/api/admin/affiliate-orders?page=${page}&limit=50`;
            if (statusFilter) {
                url += `&status=${statusFilter}`;
            }
            const response = await api.get(url);
            const data = unwrapApiData(response) || {};
            setOrders(data.data || []);
            setMonthlyPayouts(data.monthlyPayouts || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách đơn affiliate');
        } finally {
            setLoading(false);
        }
    };

    const loadWithdrawals = async () => {
        try {
            setWithdrawalsLoading(true);
            setError('');
            const response = await api.get('/api/admin/withdrawal-requests');
            setWithdrawals(unwrapApiData(response) || []);
        } catch (err) {
            setError(err.message || 'Không thể tải yêu cầu rút tiền');
        } finally {
            setWithdrawalsLoading(false);
        }
    };

    const refreshAll = async () => {
        await Promise.all([loadAffiliateOrders(), loadWithdrawals()]);
    };

    const updateWithdrawalStatus = async (id, status) => {
        try {
            setUpdatingWithdrawalId(id);
            setError('');
            await api.patch(`/api/admin/withdrawal-requests/${id}/status`, { status });
            await loadWithdrawals();
        } catch (err) {
            setError(err.message || 'Không thể cập nhật yêu cầu rút tiền');
        } finally {
            setUpdatingWithdrawalId(null);
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(Number(amount || 0));

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const getStatusText = (status) => {
        const statusMap = {
            pending: 'Đang chờ',
            active: 'Hoạt động',
            expired: 'Hết hạn',
            cancelled: 'Đã hủy',
            failed: 'Thất bại',
        };
        return statusMap[status] || status;
    };

    const getPaymentText = (status) => {
        const paymentMap = {
            PAID: 'Đã TT',
            PENDING: 'Chờ TT',
            EXPIRED: 'Hết hạn',
            CANCELLED: 'Đã hủy',
        };
        return paymentMap[status] || status || 'N/A';
    };

    const summary = useMemo(() => {
        const paidOrders = orders.filter((order) => order.paymentStatus === 'PAID');
        return {
            paidCount: paidOrders.length,
            paidRevenue: paidOrders.reduce((sum, order) => sum + Number(order.price || 0), 0),
            pendingWithdrawals: withdrawals.filter((item) => item.status === 'pending').length,
            withdrawalAmount: withdrawals.reduce((sum, item) => sum + Number(item.amount || 0), 0),
            monthlyPayouts,
        };
    }, [orders, withdrawals, monthlyPayouts]);

    if (loading && withdrawalsLoading && orders.length === 0 && withdrawals.length === 0) {
        return (
            <div className="loading-container">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Đang tải dữ liệu affiliate...</p>
            </div>
        );
    }

    return (
        <div className="affiliate-page">
            <div className="section-header">
                <div className="header-left">
                    <h2>Affiliate</h2>
                    <span className="total-badge">{total} đơn</span>
                </div>
                <div className="section-actions">
                    <select
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
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

            <div className="affiliate-summary-grid">
                <div className="affiliate-summary-card">
                    <span>Đơn đã thanh toán</span>
                    <strong>{summary.paidCount}</strong>
                </div>
                <div className="affiliate-summary-card">
                    <span>Doanh thu affiliate</span>
                    <strong>{formatCurrency(summary.paidRevenue)}</strong>
                </div>
                <div className="affiliate-summary-card">
                    <span>Lệnh rút đang chờ</span>
                    <strong>{summary.pendingWithdrawals}</strong>
                </div>
                <div className="affiliate-summary-card">
                    <span>Tổng tiền đã yêu cầu rút</span>
                    <strong>{formatCurrency(summary.withdrawalAmount)}</strong>
                </div>
                {summary.monthlyPayouts.map((item) => (
                    <div className="affiliate-summary-card" key={`${item.year}-${item.month}`}>
                        <span>Phải trả {item.label}</span>
                        <strong>{formatCurrency(item.amount)}</strong>
                    </div>
                ))}
            </div>

            <section className="affiliate-panel">
                <div className="affiliate-panel-header">
                    <div>
                        <h3>Danh sách đơn affiliate</h3>
                        <p>Các đơn thanh toán có nhập mã giới thiệu.</p>
                    </div>
                    <span className="total-badge">{orders.length} đang hiển thị</span>
                </div>
                <div className="affiliate-table-wrap">
                    <table className="affiliate-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Người mua</th>
                                <th>Gói</th>
                                <th>Số tiền</th>
                                <th>Mã giới thiệu</th>
                                <th>Người giới thiệu</th>
                                <th>Hoa hồng</th>
                                <th>Trạng thái</th>
                                <th>Thanh toán</th>
                                <th>Ngày tạo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="empty-cell">Chưa có đơn affiliate</td>
                                </tr>
                            ) : orders.map((order) => (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td>
                                        <div className="affiliate-user-cell">
                                            <strong>{order.userName || order.user?.name || '-'}</strong>
                                            <span>{order.userEmail || order.user?.email || '-'}</span>
                                        </div>
                                    </td>
                                    <td>{order.type}</td>
                                    <td className="price-cell">{formatCurrency(order.price)}</td>
                                    <td><code>{order.referralCodeUsed}</code></td>
                                    <td>
                                        <div className="affiliate-user-cell">
                                            <strong>{order.referrerName || `User #${order.referrerUserId || '-'}`}</strong>
                                            <span>{order.referrerEmail || '-'}</span>
                                        </div>
                                    </td>
                                    <td>{formatCurrency(order.referralRewardAmount)}</td>
                                    <td><span className={`badge badge-${order.status}`}>{getStatusText(order.status)}</span></td>
                                    <td><span className={`payment-badge ${order.paymentStatus?.toLowerCase()}`}>{getPaymentText(order.paymentStatus)}</span></td>
                                    <td>{formatDate(order.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="pagination">
                        <button className="page-btn" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>
                            <i className="fas fa-chevron-left"></i>
                        </button>
                        <span className="page-info">Trang {page} / {totalPages}</span>
                        <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((prev) => prev + 1)}>
                            <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>
                )}
            </section>

            <section className="affiliate-panel">
                <div className="affiliate-panel-header">
                    <div>
                        <h3>Lệnh rút tiền affiliate</h3>
                        <p>Người dùng rút được khi số dư từ 30.000đ.</p>
                    </div>
                    <span className="total-badge">{withdrawals.length} yêu cầu</span>
                </div>
                <div className="withdrawals-list">
                    {withdrawals.length === 0 ? (
                        <div className="affiliate-empty-state">Chưa có yêu cầu rút tiền</div>
                    ) : withdrawals.map((request) => {
                        const isUpdating = updatingWithdrawalId === request.id;
                        return (
                            <div className="withdrawal-card" key={request.id}>
                                <div>
                                    <strong>{request.userName || request.user?.name || '-'}</strong>
                                    <span>{request.userEmail || request.user?.email || '-'}</span>
                                    {request.payoutInfo && <small>{request.payoutInfo}</small>}
                                </div>
                                <b>{formatCurrency(request.amount)}</b>
                                <span className={`badge badge-${request.status}`}>{request.status}</span>
                                <div className="actions-stack">
                                    {request.status === 'pending' && (
                                        <>
                                            <button
                                                className="btn-icon btn-success"
                                                title="Đã chuyển tiền"
                                                disabled={isUpdating}
                                                onClick={() => updateWithdrawalStatus(request.id, 'paid')}
                                            >
                                                <i className={`fas ${isUpdating ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                                            </button>
                                            <button
                                                className="btn-icon btn-danger"
                                                title="Từ chối và hoàn số dư"
                                                disabled={isUpdating}
                                                onClick={() => updateWithdrawalStatus(request.id, 'rejected')}
                                            >
                                                <i className={`fas ${isUpdating ? 'fa-spinner fa-spin' : 'fa-times'}`}></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

export default Affiliate;

