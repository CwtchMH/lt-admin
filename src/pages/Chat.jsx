import { useEffect, useState } from 'react';
import api from '../services/api';
import './Chat.css';

const PAGE_SIZE = 10;
const REQUEST_SIZE = PAGE_SIZE + 1;
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const HAS_TIME = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/;
const HAS_TIME_ZONE = new RegExp('(?:Z|[+-]\\d{2}:?\\d{2})' + String.fromCharCode(36), 'i');

function Chat() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadMessages(true);
    }, []);

    const loadMessages = async (reset = false) => {
        const nextOffset = reset ? 0 : offset;

        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            setError('');
            // Endpoint moderation rieng: co senderEmail + senderIsBlocked, nam sau
            // AdminGuard nen email khong lo ra payload cong khai.
            const response = await api.get(`/api/admin/chat/messages?limit=${REQUEST_SIZE}&offset=${nextOffset}&sort=desc`);
            const payload = response?.data || response || [];
            const data = Array.isArray(payload) ? payload : [];
            const nextBatch = data.slice(0, PAGE_SIZE);

            setMessages((prev) => (reset ? nextBatch : [...prev, ...nextBatch]));
            setOffset(nextOffset + nextBatch.length);
            setHasMore(data.length > PAGE_SIZE);
        } catch (err) {
            setError('Không thể tải tin nhắn');
            if (reset) {
                setMessages([]);
                setOffset(0);
                setHasMore(false);
            }
        } finally {
            if (reset) {
                setLoading(false);
            } else {
                setLoadingMore(false);
            }
        }
    };

    const handleBlock = async (msg) => {
        const label = msg.userName || msg.senderEmail || ('User ' + msg.userId);
        const defaultReason = 'Spam hoặc lạm dụng Global Chat';
        const reason = window.prompt(`Nhập lý do chặn "${label}":`, defaultReason);
        if (reason === null) return;

        try {
            await api.post(`/api/admin/users/${msg.userId}/block`, {
                reason: reason.trim() || defaultReason,
            });
            await loadMessages(true);
        } catch (err) {
            alert(`Lỗi khi chặn: ${err.message || 'Không thể chặn người dùng'}`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;

        try {
            await api.delete(`/api/admin/chat/messages/${id}`);
            await loadMessages(true);
        } catch (err) {
            alert(`Lỗi khi xóa tin nhắn: ${err.message || 'Không thể xóa tin nhắn'}`);
        }
    };

    const parseBackendTimestamp = (value) => {
        if (!value) return null;
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

        const raw = String(value).trim();
        if (!raw) return null;

        const normalized = raw.replace(' ', 'T');
        const date = new Date(
            HAS_TIME.test(raw) && !HAS_TIME_ZONE.test(raw)
                ? normalized + '+07:00'
                : normalized,
        );

        return Number.isNaN(date.getTime()) ? null : date;
    };

    const formatTime = (timestamp) => {
        const date = parseBackendTimestamp(timestamp);
        if (!date) return '-';

        return new Intl.DateTimeFormat('vi-VN', {
            timeZone: VIETNAM_TIME_ZONE,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour12: false,
        }).format(date);
    };

    if (loading) return <div className="loading">Đang tải...</div>;

    return (
        <div className="chat-manager">
            <div className="page-header">
                <div>
                    <h2>Quản lý Global Chat</h2>
                    <p className="chat-subtitle">Mặc định hiện 10 tin nhắn mới nhất. Bấm xem thêm để tải tiếp.</p>
                </div>
                <button className="btn btn-primary" onClick={() => loadMessages(true)}>
                    <i className="fas fa-sync"></i> Làm mới
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="table-container">
                <table className="data-table">
                    <colgroup>
                        <col className="chat-col-id" />
                        <col className="chat-col-sender" />
                        <col className="chat-col-content" />
                        <col className="chat-col-delete" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Người gửi</th>
                            <th>Nội dung</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {messages.map((msg) => (
                            <tr key={msg.id}>
                                <td>#{msg.id}</td>
                                <td>
                                    <div className="user-cell">
                                        <img
                                            src={msg.avatar || 'https://via.placeholder.com/30'}
                                            alt="avatar"
                                            className="avatar-small"
                                            onError={(e) => {
                                                e.currentTarget.src = 'https://via.placeholder.com/30';
                                            }}
                                        />
                                        <div className="sender-meta">
                                            <span className="sender-name">
                                                {msg.userName || ('User ' + msg.userId)}
                                                {msg.senderIsBlocked && <span className="sender-blocked-badge">Đã chặn</span>}
                                            </span>
                                            {msg.senderEmail && <span className="sender-email">{msg.senderEmail}</span>}
                                            <span className="message-time">{formatTime(msg.createdAt)}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="message-cell">
                                    <div className="message-content" title={msg.content}>
                                        {msg.content}
                                    </div>
                                </td>
                                <td className="delete-cell">
                                    {!msg.senderIsBlocked && (
                                        <button
                                            className="btn-icon block"
                                            onClick={() => handleBlock(msg)}
                                            title="Chặn người gửi"
                                        >
                                            <i className="fas fa-user-lock"></i>
                                        </button>
                                    )}
                                    <button
                                        className="btn-icon delete"
                                        onClick={() => handleDelete(msg.id)}
                                        title="Xóa tin nhắn"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {messages.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center">Chưa có tin nhắn nào</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {messages.length > 0 && (
                <div className="chat-footer">
                    <span className="chat-count">Đang hiển thị {messages.length} tin nhắn mới nhất</span>
                    {hasMore && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => loadMessages(false)}
                            disabled={loadingMore}
                        >
                            {loadingMore ? 'Đang tải...' : 'Xem thêm'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default Chat;
