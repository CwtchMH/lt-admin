import { useEffect, useState } from 'react';
import api, { unwrapApiData } from '../services/api';
import './Users.css';

const SUBSCRIPTION_TYPES = [
    { value: 'pro_1_month', label: '1 tháng' },
    { value: 'pro_3_months', label: '3 tháng' },
    { value: 'pro_6_months', label: '6 tháng' },
    { value: 'pro_1_year', label: '1 năm' },
];

function Users() {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ totalUsers: 0, proUsers: 0, freeUsers: 0, blockedUsers: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [exporting, setExporting] = useState(false);
    const [activateEmail, setActivateEmail] = useState('');
    const [activateType, setActivateType] = useState('pro_1_month');
    const [selectedVipUser, setSelectedVipUser] = useState(null);
    const [activating, setActivating] = useState(false);
    const [actionKey, setActionKey] = useState('');

    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        loadUsers(page);
    }, [page]);

    const loadStats = async () => {
        try {
            const response = await api.get('/api/admin/users/stats');
            const data = unwrapApiData(response);
            setStats(data || { totalUsers: 0, proUsers: 0, freeUsers: 0, blockedUsers: 0 });
        } catch (err) {
            setError(err.message || 'Không thể tải thống kê người dùng');
        }
    };

    const loadUsers = async (targetPage = 1) => {
        try {
            setLoading(true);
            setError('');

            const response = await api.get(`/api/admin/users?page=${targetPage}&limit=${ITEMS_PER_PAGE}`);
            const data = unwrapApiData(response);

            setUsers(data?.data || []);
            setTotalPages(data?.totalPages || 1);
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async () => {
        if (!searchTerm.trim()) {
            setPage(1);
            await loadUsers(1);
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await api.get(`/api/admin/users/search?q=${encodeURIComponent(searchTerm.trim())}&limit=${ITEMS_PER_PAGE}`);
            const data = unwrapApiData(response);

            setUsers(Array.isArray(data) ? data : []);
            setPage(1);
            setTotalPages(1);
        } catch (err) {
            setError(err.message || 'Lỗi tìm kiếm người dùng');
        } finally {
            setLoading(false);
        }
    };

    const reloadAll = async () => {
        await Promise.all([loadStats(), searchTerm.trim() ? searchUsers() : loadUsers(page)]);
    };

    const handleActivateVip = async (event) => {
        event.preventDefault();

        if (!activateEmail.trim()) {
            window.alert('Vui lòng nhập email');
            return;
        }

        try {
            setActivating(true);
            const response = await api.post('/api/admin/users/activate-vip', {
                email: activateEmail.trim(),
                type: activateType,
                notes: selectedVipUser ? `VIP popup for user #${selectedVipUser.id}` : '',
            });
            unwrapApiData(response);

            window.alert('Kích hoạt hoặc gia hạn VIP thành công.');
            closeVipModal();
            await reloadAll();
        } catch (err) {
            window.alert(err.message || 'Không thể kích hoạt VIP');
        } finally {
            setActivating(false);
        }
    };

    const openVipModal = (user) => {
        setSelectedVipUser(user);
        setActivateEmail(user.email || '');
        setActivateType('pro_1_month');
    };

    const closeVipModal = () => {
        if (activating) return;
        setSelectedVipUser(null);
        setActivateEmail('');
        setActivateType('pro_1_month');
    };

    const handleUpdateStorageLimit = async (user) => {
        const currentLimit = user.storageLimitOverride || user.storageLimit || 0;
        const input = window.prompt(
            `Nhập giới hạn lưu trữ mới cho "${user.name || user.email}". Để trống để dùng giới hạn theo gói.`,
            user.storageLimitOverride ? String(user.storageLimitOverride) : String(currentLimit),
        );

        if (input === null) {
            return;
        }

        const trimmedInput = input.trim();
        const storageLimitOverride = trimmedInput === '' ? null : Number(trimmedInput);

        if (storageLimitOverride !== null && (!Number.isFinite(storageLimitOverride) || storageLimitOverride < 0)) {
            window.alert('Giới hạn lưu trữ phải là số không âm.');
            return;
        }

        try {
            setActionKey(`storage-${user.id}`);
            await api.patch(`/api/admin/users/${user.id}/storage-limit`, {
                storageLimitOverride,
            });
            await reloadAll();
        } catch (err) {
            window.alert(err.message || 'Không thể cập nhật giới hạn lưu trữ');
        } finally {
            setActionKey('');
        }
    };

    const handleBlockUser = async (user) => {
        const defaultReason = user.blockedReason || 'Có dấu hiệu spam hoặc lạm dụng hệ thống';
        const reason = window.prompt(`Nhập lý do chặn "${user.name || user.email}":`, defaultReason);

        if (reason === null) {
            return;
        }

        try {
            setActionKey(`block-${user.id}`);
            await api.post(`/api/admin/users/${user.id}/block`, {
                reason: reason.trim() || defaultReason,
            });
            await reloadAll();
        } catch (err) {
            window.alert(err.message || 'Không thể chặn người dùng');
        } finally {
            setActionKey('');
        }
    };

    const handleUnblockUser = async (user) => {
        if (!window.confirm(`Bỏ chặn "${user.name || user.email}"?`)) {
            return;
        }

        try {
            setActionKey(`unblock-${user.id}`);
            await api.post(`/api/admin/users/${user.id}/unblock`);
            await reloadAll();
        } catch (err) {
            window.alert(err.message || 'Không thể bỏ chặn người dùng');
        } finally {
            setActionKey('');
        }
    };

    const handleDeactivateVip = async (user) => {
        if (!window.confirm(`Hủy VIP của "${user.name || user.email}"?\n\nCác gói VIP còn hiệu lực sẽ bị ngắt ngay.`)) {
            return;
        }

        try {
            setActionKey(`deactivate-vip-${user.id}`);
            await api.post(`/api/admin/users/${user.id}/deactivate-vip`);
            await reloadAll();
        } catch (err) {
            window.alert(err.message || 'Không thể hủy VIP');
        } finally {
            setActionKey('');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Xóa "${user.name || user.email}"?\n\nToàn bộ bộ từ, folder, tiến độ học, chat, shop và lịch sử liên quan sẽ bị xóa vĩnh viễn.`)) {
            return;
        }

        try {
            setActionKey(`delete-${user.id}`);
            await api.delete(`/api/admin/users/${user.id}`);
            await reloadAll();
        } catch (err) {
            window.alert(err.message || 'Không thể xóa người dùng');
        } finally {
            setActionKey('');
        }
    };

    const exportUsers = async () => {
        try {
            setExporting(true);
            const timestamp = new Date().toISOString().split('T')[0];
            await api.download('/api/admin/users/export', `danh-sach-nguoi-dung-${timestamp}.csv`);
        } catch (err) {
            setError(err.message || 'Xuất file thất bại');
        } finally {
            setExporting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

    const getDaysRemaining = (expiresAt) => {
        if (!expiresAt) return null;
        const expires = new Date(expiresAt);
        const now = new Date();
        return Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
    };

    const clearSearch = async () => {
        setSearchTerm('');
        setPage(1);
        await loadUsers(1);
    };

    const filteredUsers = users.filter((user) => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'vip') return user.isVip;
        if (filterStatus === 'free') return !user.isVip;
        if (filterStatus === 'blocked') return user.isBlocked;
        return true;
    });

    return (
        <div className="users-page">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">&#128101;</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.totalUsers}</div>
                        <div className="stat-label">Tổng user</div>
                    </div>
                </div>
                <div className="stat-card pro">
                    <div className="stat-icon">&#11088;</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.proUsers}</div>
                        <div className="stat-label">VIP</div>
                    </div>
                </div>
                <div className="stat-card free">
                    <div className="stat-icon">&#127381;</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.freeUsers}</div>
                        <div className="stat-label">Miễn phí</div>
                    </div>
                </div>
                <div className="stat-card blocked">
                    <div className="stat-icon">&#128274;</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.blockedUsers}</div>
                        <div className="stat-label">Bị chặn</div>
                    </div>
                </div>
            </div>

            <div className="section-card">
                <div className="section-header">
                    <h3>&#128101; Danh sách người dùng ({filteredUsers.length})</h3>
                    <div className="section-actions">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên, email hoặc ID..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        searchUsers();
                                    }
                                }}
                            />
                            <button className="search-btn" onClick={searchUsers} title="Tìm kiếm">
                                <i className="fas fa-search"></i>
                            </button>
                            {searchTerm && (
                                <button className="clear-btn" onClick={clearSearch} title="Xóa tìm kiếm">
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(event) => setFilterStatus(event.target.value)}
                            className="filter-select"
                        >
                            <option value="all">Tất cả</option>
                            <option value="vip">Chỉ VIP</option>
                            <option value="free">Chỉ miễn phí</option>
                            <option value="blocked">Đã bị chặn</option>
                        </select>
                        <button className="btn btn-success" onClick={exportUsers} disabled={exporting}>
                            {exporting ? (
                                <><i className="fas fa-spinner fa-spin"></i> Đang xuất...</>
                            ) : (
                                <><i className="fas fa-file-export"></i> Xuất CSV</>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        <i className="fas fa-exclamation-circle"></i> {error}
                    </div>
                )}

                <div className="table-container">
                    <table className="data-table">
                        <colgroup>
                            <col className="users-col-user" />
                            <col className="users-col-status" />
                            <col className="users-col-vip" />
                            <col className="users-col-storage" />
                            <col className="users-col-actions" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Người dùng</th>
                                <th>Trạng thái</th>
                                <th>Hết hạn VIP</th>
                                <th>Lưu trữ</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="loading-cell">
                                        <i className="fas fa-spinner fa-spin"></i> Đang tải...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="empty-cell">Không có dữ liệu phù hợp</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const daysRemaining = getDaysRemaining(user.vipExpiresAt);
                                    const isExpiredVip = typeof daysRemaining === 'number' && daysRemaining <= 0;

                                    return (
                                        <tr key={user.id}>
                                            <td className="user-cell">
                                                <div className="user-meta">
                                                    <div className="user-name-row">
                                                        <span className="user-name">{user.name || 'Chưa đặt tên'}</span>
                                                        {user.avatar ? (
                                                            <img className="user-avatar" src={user.avatar} alt="" referrerPolicy="no-referrer" />
                                                        ) : (
                                                            <span className="user-avatar user-avatar-fallback">
                                                                {(user.name || user.email || '?').charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="user-email">{user.email}</span>
                                                    <span className="user-sub">ID #{user.id}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="status-stack">
                                                    {user.isVip ? (
                                                        <span className="badge badge-vip">&#11088; VIP</span>
                                                    ) : (
                                                        <span className="badge badge-regular">Miễn phí</span>
                                                    )}
                                                    {user.isBlocked && (
                                                        <span className="badge badge-blocked">&#128274; Đã chặn</span>
                                                    )}
                                                    {user.isTeacherActive && (
                                                        <span className="badge badge-teacher">Giáo viên</span>
                                                    )}
                                                    {user.isBlocked && user.blockedReason && (
                                                        <span className="blocked-reason">{user.blockedReason}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="vip-date-cell">
                                                    {user.isVip && user.vipExpiresAt ? (
                                                        <span className={isExpiredVip || daysRemaining <= 7 ? 'expiring-soon' : ''}>
                                                            VIP: {formatDate(user.vipExpiresAt)}
                                                            {daysRemaining > 0 && ` (${daysRemaining} ngày)`}
                                                            {isExpiredVip && ' (đã hết hạn)'}
                                                        </span>
                                                    ) : (
                                                        <span>VIP: -</span>
                                                    )}
                                                    {user.teacherAccessExpiresAt ? (
                                                        <span>GV: {formatDate(user.teacherAccessExpiresAt)}</span>
                                                    ) : (
                                                        <span>GV: -</span>
                                                    )}
                                                    <small>Tạo: {formatDate(user.createdAt)}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="storage-cell">
                                                    <strong>{formatNumber(user.wordCount)} / {formatNumber(user.storageLimit)}</strong>
                                                    <span>Còn {formatNumber(user.storageRemaining)} từ</span>
                                                    <span>{formatNumber(user.categoryCount)} bộ từ</span>
                                                    {user.storageLimitOverride ? (
                                                        <small>Override: {formatNumber(user.storageLimitOverride)}</small>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="actions-cell">
                                                <div className="action-grid">
                                                    <button
                                                        className="btn-activate"
                                                        onClick={() => openVipModal(user)}
                                                        title={user.isVip ? 'Gia hạn VIP' : 'Kích hoạt VIP'}
                                                    >
                                                        + VIP
                                                    </button>

                                                    <button
                                                        className="btn-storage"
                                                        onClick={() => handleUpdateStorageLimit(user)}
                                                        disabled={actionKey === `storage-${user.id}`}
                                                        title="Cập nhật giới hạn lưu trữ"
                                                    >
                                                        Lưu trữ
                                                    </button>

                                                    {(user.isVip || user.vipExpiresAt) && (
                                                        <button
                                                            className="btn-deactivate"
                                                            onClick={() => handleDeactivateVip(user)}
                                                            disabled={actionKey === `deactivate-vip-${user.id}`}
                                                            title="Hủy VIP người dùng"
                                                        >
                                                            Hủy VIP
                                                        </button>
                                                    )}

                                                    {user.role !== 'admin' && (
                                                        user.isBlocked ? (
                                                            <button
                                                                className="btn-unblock"
                                                                onClick={() => handleUnblockUser(user)}
                                                                disabled={actionKey === `unblock-${user.id}`}
                                                            >
                                                                Bỏ chặn
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="btn-block"
                                                                onClick={() => handleBlockUser(user)}
                                                                disabled={actionKey === `block-${user.id}`}
                                                            >
                                                                Chặn
                                                            </button>
                                                        )
                                                    )}

                                                    {user.role !== 'admin' && (
                                                        <button
                                                            className="btn-delete"
                                                            onClick={() => handleDeleteUser(user)}
                                                            disabled={actionKey === `delete-${user.id}`}
                                                            title="Xóa người dùng"
                                                        >
                                                            &#128465;
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
                        <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                            <i className="fas fa-chevron-left"></i> Trước
                        </button>
                        <span>Trang {page} / {totalPages}</span>
                        <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
                            Sau <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>
                )}
            </div>

            {selectedVipUser && (
                <div className="modal-backdrop" role="presentation" onClick={closeVipModal}>
                    <div className="vip-modal" role="dialog" aria-modal="true" aria-labelledby="vip-modal-title" onClick={(event) => event.stopPropagation()}>
                        <button className="modal-close" type="button" onClick={closeVipModal} disabled={activating} aria-label="Đóng">
                            &times;
                        </button>
                        <h3 id="vip-modal-title">&#11088; Nâng VIP</h3>
                        <form onSubmit={handleActivateVip} className="vip-modal-form">
                            <label>
                                <span>Tên</span>
                                <input type="text" value={selectedVipUser.name || 'Chưa đặt tên'} readOnly />
                            </label>
                            <label>
                                <span>Email</span>
                                <input type="email" value={activateEmail} readOnly />
                            </label>
                            <label>
                                <span>Số tháng</span>
                                <select value={activateType} onChange={(event) => setActivateType(event.target.value)}>
                                    {SUBSCRIPTION_TYPES.map((item) => (
                                        <option key={item.value} value={item.value}>{item.label}</option>
                                    ))}
                                </select>
                            </label>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeVipModal} disabled={activating}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={activating}>
                                    {activating ? 'Đang xử lý...' : 'Nâng VIP'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Users;
