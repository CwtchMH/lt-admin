import { useEffect, useState } from 'react';
import api, { unwrapApiData } from '../services/api';
import './Security.css';

function Security() {
    const [days, setDays] = useState(7);
    const [summary, setSummary] = useState(null);
    const [suspiciousUsers, setSuspiciousUsers] = useState([]);
    const [events, setEvents] = useState([]);
    const [eventUserFilter, setEventUserFilter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionKey, setActionKey] = useState('');

    useEffect(() => {
        loadSecurityData(eventUserFilter);
    }, [days, eventUserFilter]);

    const loadSecurityData = async (userFilter = eventUserFilter) => {
        try {
            setLoading(true);
            setError('');

            const userFilterQuery = userFilter ? `&userId=${userFilter}` : '';
            const [summaryResponse, suspiciousResponse, eventsResponse] = await Promise.all([
                api.get(`/api/admin/security/summary?days=${days}`),
                api.get(`/api/admin/security/suspicious-users?days=${days}&limit=50`),
                api.get(`/api/admin/security/events?days=${days}&limit=100${userFilterQuery}`),
            ]);

            setSummary(unwrapApiData(summaryResponse));
            setSuspiciousUsers(unwrapApiData(suspiciousResponse)?.users || []);
            setEvents(unwrapApiData(eventsResponse)?.events || []);
        } catch (err) {
            setError(err.message || 'Không thể tải dữ liệu bảo mật');
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleString('vi-VN');
    };

    const getSeverityLabel = (severity) => {
        switch (severity) {
            case 'critical':
                return 'Nghiêm trọng';
            case 'high':
                return 'Cao';
            case 'medium':
                return 'Trung bình';
            case 'low':
            default:
                return 'Thấp';
        }
    };

    const handleBlockUser = async (user) => {
            const defaultReason = user.blockedReason || 'Có dấu hiệu spam hoặc lạm dụng hệ thống';
            const reason = window.prompt(`Nhập lý do chặn "${user.name || user.email}":`, defaultReason);
        if (reason === null) {
            return;
        }

        try {
            setActionKey(`block-${user.userId}`);
            await api.post(`/api/admin/users/${user.userId}/block`, {
                reason: reason.trim() || defaultReason,
            });
            await loadSecurityData();
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
            setActionKey(`unblock-${user.userId}`);
            await api.post(`/api/admin/users/${user.userId}/unblock`);
            await loadSecurityData();
        } catch (err) {
            window.alert(err.message || 'Không thể bỏ chặn người dùng');
        } finally {
            setActionKey('');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Xóa "${user.name || user.email}"? Toàn bộ dữ liệu của user này sẽ bị xóa vĩnh viễn.`)) {
            return;
        }

        try {
            setActionKey(`delete-${user.userId}`);
            await api.delete(`/api/admin/users/${user.userId}`);
            if (eventUserFilter === user.userId) {
                setEventUserFilter(null);
                await loadSecurityData(null);
                return;
            }
            await loadSecurityData();
        } catch (err) {
            window.alert(err.message || 'Không thể xóa người dùng');
        } finally {
            setActionKey('');
        }
    };

    const stats = summary ? [
        {
            icon: 'fa-shield-alt',
            value: summary.totals?.totalEvents || 0,
            label: 'Tổng sự kiện',
            color: '#2563eb',
        },
        {
            icon: 'fa-exclamation-triangle',
            value: (summary.totals?.criticalEvents || 0) + (summary.totals?.highEvents || 0),
            label: 'Mức cao trở lên',
            color: '#dc2626',
        },
        {
            icon: 'fa-globe',
            value: summary.totals?.uniqueIps || 0,
            label: 'IP liên quan',
            color: '#7c3aed',
        },
        {
            icon: 'fa-user-lock',
            value: summary.totals?.blockedUsers || 0,
            label: 'Tài khoản bị chặn',
            color: '#b45309',
        },
        {
            icon: 'fa-users',
            value: summary.totals?.affectedUsers || 0,
            label: 'User bị ảnh hưởng',
            color: '#059669',
        },
    ] : [];

    if (loading) {
        return <div className="sec-loading"><i className="fas fa-spinner fa-spin"></i></div>;
    }

    if (error) {
        return (
            <div className="sec-error">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
                <button className="btn btn-primary" onClick={loadSecurityData}>Tải lại</button>
            </div>
        );
    }

    return (
        <div className="sec-page">
            <div className="sec-header">
                <div>
                    <h2><i className="fas fa-shield-alt"></i> Bất thường hệ thống</h2>
                    <p>Theo dõi các request vượt ngưỡng, hành vi đáng ngờ và thao tác xử lý nhanh.</p>
                </div>
                <div className="sec-header-actions">
                    <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                        <option value={1}>24 giờ qua</option>
                        <option value={7}>7 ngày</option>
                        <option value={14}>14 ngày</option>
                        <option value={30}>30 ngày</option>
                    </select>
                    {eventUserFilter && (
                        <button className="btn btn-secondary" onClick={() => setEventUserFilter(null)}>
                            <i className="fas fa-times-circle"></i>
                            Bỏ lọc user
                        </button>
                    )}
                </div>
            </div>

            <div className="sec-stats">
                {stats.map((item) => (
                    <div key={item.label} className="sec-stat">
                        <div className="sec-stat-icon" style={{ background: `${item.color}18`, color: item.color }}>
                            <i className={`fas ${item.icon}`}></i>
                        </div>
                        <div className="sec-stat-info">
                            <strong>{Number(item.value).toLocaleString('vi-VN')}</strong>
                            <span>{item.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="sec-grid">
                <section className="sec-panel">
                    <div className="sec-panel-header">
                        <h3><i className="fas fa-user-secret"></i> Người dùng đáng ngờ</h3>
                        <span>{suspiciousUsers.length} tài khoản</span>
                    </div>

                    {suspiciousUsers.length === 0 ? (
                        <div className="sec-empty">Chưa ghi nhận người dùng bất thường trong khoảng thời gian này.</div>
                    ) : (
                        <div className="sec-table-wrap">
                            <table className="sec-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Điểm rủi ro</th>
                                        <th>Sự kiện</th>
                                        <th>IP gần nhất</th>
                                        <th>Loại</th>
                                        <th>Trạng thái</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suspiciousUsers.map((user) => (
                                        <tr key={user.userId}>
                                            <td>
                                                <div className="sec-user">
                                                    <strong>{user.name || 'Không rõ'}</strong>
                                                    <span>{user.email || `User #${user.userId}`}</span>
                                                    <small>Cuối cùng: {formatDateTime(user.lastEventAt)}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="sec-risk">{user.riskScore}</span>
                                            </td>
                                            <td>
                                                <div className="sec-counts">
                                                    <span>Tổng: {user.totalEvents}</span>
                                                    <span>Cao+: {user.criticalEvents + user.highEvents}</span>
                                                </div>
                                            </td>
                                            <td>{user.lastIpAddress || '-'}</td>
                                            <td>
                                                <div className="sec-tags">
                                                    {(user.eventTypes || []).slice(0, 3).map((type) => (
                                                        <span key={type} className="sec-tag">{type}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>
                                                {user.isBlocked ? (
                                                    <div className="sec-status sec-status-blocked">
                                                        <strong>Đã chặn</strong>
                                                        <span>{user.blockedReason || 'Không có lý do'}</span>
                                                    </div>
                                                ) : (
                                                    <span className="sec-status sec-status-active">Đang hoạt động</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="sec-actions">
                                                    <button
                                                        className="btn btn-secondary"
                                                        onClick={() => setEventUserFilter(user.userId)}
                                                    >
                                                        Xem log
                                                    </button>
                                                    {user.isBlocked ? (
                                                        <button
                                                            className="sec-btn-unblock"
                                                            onClick={() => handleUnblockUser(user)}
                                                            disabled={actionKey === `unblock-${user.userId}`}
                                                        >
                                                            Bỏ chặn
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="sec-btn-block"
                                                            onClick={() => handleBlockUser(user)}
                                                            disabled={actionKey === `block-${user.userId}`}
                                                        >
                                                            Chặn
                                                        </button>
                                                    )}
                                                    <button
                                                        className="sec-btn-delete"
                                                        onClick={() => handleDeleteUser(user)}
                                                        disabled={actionKey === `delete-${user.userId}`}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="sec-panel sec-panel-side">
                    <div className="sec-panel-header">
                        <h3><i className="fas fa-layer-group"></i> Loại sự kiện nổi bật</h3>
                    </div>
                    <div className="sec-top-types">
                        {(summary?.topTypes || []).length === 0 ? (
                            <div className="sec-empty">Chưa có dữ liệu.</div>
                        ) : (
                            summary.topTypes.map((item) => (
                                <div key={item.type} className="sec-top-item">
                                    <span className="sec-tag">{item.type}</span>
                                    <strong>{Number(item.count || 0).toLocaleString('vi-VN')}</strong>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            <section className="sec-panel">
                <div className="sec-panel-header">
                    <h3><i className="fas fa-list-ul"></i> Nhật ký bất thường</h3>
                    <span>{eventUserFilter ? `Đang lọc theo user #${eventUserFilter}` : '100 bản ghi mới nhất'}</span>
                </div>

                {events.length === 0 ? (
                    <div className="sec-empty">Không có sự kiện phù hợp.</div>
                ) : (
                    <div className="sec-table-wrap">
                        <table className="sec-table">
                            <thead>
                                <tr>
                                    <th>Thời gian</th>
                                    <th>Mức độ</th>
                                    <th>User</th>
                                    <th>Sự kiện</th>
                                    <th>Thông tin</th>
                                    <th>Đường dẫn / IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((event) => (
                                    <tr key={event.id}>
                                        <td>{formatDateTime(event.createdAt)}</td>
                                        <td>
                                            <span className={`sec-badge sec-badge-${event.severity}`}>
                                                {getSeverityLabel(event.severity)}
                                            </span>
                                        </td>
                                        <td>
                                            {event.user ? (
                                                <div className="sec-user sec-user-inline">
                                                    <strong>{event.user.name || 'Không rõ'}</strong>
                                                    <span>{event.user.email || `User #${event.user.id}`}</span>
                                                </div>
                                            ) : (
                                                <span>Ẩn danh</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="sec-event">
                                                <strong>{event.type}</strong>
                                                <span>{event.message}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <code className="sec-code">
                                                {event.metadata ? JSON.stringify(event.metadata) : '-'}
                                            </code>
                                        </td>
                                        <td>
                                            <div className="sec-meta">
                                                <span>{event.requestPath || '-'}</span>
                                                <small>{event.ipAddress || '-'}</small>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default Security;
