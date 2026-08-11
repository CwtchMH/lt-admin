import { useState, useEffect } from 'react';
import api from '../services/api';
import './Categories.css';

function Categories() {
    const [categories, setCategories] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [userIdFilter, setUserIdFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', description: '', ispublic: false });
    const [saving, setSaving] = useState(false);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
        return () => clearTimeout(handle);
    }, [searchTerm]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, userIdFilter]);

    useEffect(() => {
        loadCategories();
    }, [page, debouncedSearch, userIdFilter]);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: ITEMS_PER_PAGE.toString(),
            });
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (userIdFilter) params.append('userId', userIdFilter);

            const response = await api.get(`/api/admin/categories?${params.toString()}`);
            if (response?.data) {
                const data = response.data;
                setCategories(data.data || data);
                setTotalPages(data.totalPages || Math.ceil((data.total || data.length || 0) / ITEMS_PER_PAGE));
                setTotal(data.total || data.data?.length || 0);
            }
            setLoading(false);
        } catch (err) {
            setError('Không thể tải danh mục');
            setLoading(false);
        }
    };

    const togglePublic = async (id, currentStatus) => {
        try {
            await api.post(`/api/admin/categories/${id}/toggle-public`);
            setCategories(cats =>
                cats.map(cat => (cat.id === id ? { ...cat, ispublic: !currentStatus } : cat))
            );
        } catch (err) {
            setError('Không thể cập nhật trạng thái');
        }
    };

    const addCategory = async () => {
        if (!newCategory.name.trim()) return;
        try {
            setSaving(true);
            await api.post('/api/admin/categories', newCategory);
            setShowAddModal(false);
            setNewCategory({ name: '', description: '', ispublic: false });
            loadCategories();
            setSaving(false);
        } catch (err) {
            setError('Không thể tạo danh mục');
            setSaving(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const clearFilters = () => {
        setSearchTerm('');
        setUserIdFilter('');
    };

    return (
        <div className="categories-page">
            <div className="section-header section-header--stack">
                <div>
                    <p className="eyebrow">Tài nguyên</p>
                    <h2>Quản lý danh mục</h2>
                    <p className="subtext">Tìm kiếm server-side, lọc theo User ID, quản lý public/private.</p>
                </div>
                <div className="section-actions">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Tìm danh mục theo tên/mô tả..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="clear-btn" onClick={() => setSearchTerm('')} aria-label="Xóa tìm kiếm">
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                        <i className="fas fa-search"></i>
                    </div>
                    <div className="search-box small">
                        <input
                            type="number"
                            min="1"
                            placeholder="Filter User ID"
                            value={userIdFilter}
                            onChange={(e) => setUserIdFilter(e.target.value)}
                        />
                        {userIdFilter && (
                            <button className="clear-btn" onClick={() => setUserIdFilter('')} aria-label="Xóa User ID">
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                        <i className="fas fa-user"></i>
                    </div>
                    <button className="btn btn-secondary" onClick={clearFilters}>
                        <i className="fas fa-undo"></i> Xóa lọc
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <i className="fas fa-plus"></i> Thêm danh mục
                    </button>
                </div>
            </div>

            <div className="insight-bar">
                <div className="pill">
                    <i className="fas fa-layer-group"></i>
                    <span>{total ? `${total.toLocaleString('vi-VN')} danh mục` : 'Danh mục'}</span>
                </div>
                {debouncedSearch && (
                    <div className="pill pill--ghost">
                        <i className="fas fa-search"></i>
                        <span>Đang tìm: "{debouncedSearch}"</span>
                    </div>
                )}
                {userIdFilter && (
                    <div className="pill pill--ghost">
                        <i className="fas fa-user"></i>
                        <span>User ID: {userIdFilter}</span>
                    </div>
                )}
            </div>

            {error && (
                <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i> {error}
                    <button onClick={() => setError('')}><i className="fas fa-times"></i></button>
                </div>
            )}

            <div className="table-container responsive-table">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên danh mục</th>
                            <th>Mô tả</th>
                            <th>User ID</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="loading-cell">
                                    <i className="fas fa-spinner fa-spin"></i> Đang tải...
                                </td>
                            </tr>
                        ) : categories.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="empty-cell">Không có dữ liệu</td>
                            </tr>
                        ) : (
                            categories.map(cat => (
                                <tr key={cat.id}>
                                    <td>{cat.id}</td>
                                    <td>{cat.name}</td>
                                    <td className="description-cell">{cat.description || '-'}</td>
                                    <td>{cat.userId || '-'}</td>
                                    <td>
                                        <span className={`badge ${cat.ispublic ? 'badge-public' : 'badge-private'}`}>
                                            {cat.ispublic ? 'Công khai' : 'Riêng tư'}
                                        </span>
                                    </td>
                                    <td>{formatDate(cat.createdAt)}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-icon"
                                            onClick={() => togglePublic(cat.id, cat.ispublic)}
                                            title={cat.ispublic ? 'Ẩn' : 'Công khai'}
                                        >
                                            <i className={`fas fa-${cat.ispublic ? 'eye-slash' : 'eye'}`}></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && categories.length > 0 && (
                <div className="card-grid mobile-only">
                    {categories.map(cat => (
                        <div className="category-card" key={cat.id}>
                            <div className="card-row">
                                <span className="label">ID</span>
                                <strong>#{cat.id}</strong>
                            </div>
                            <div className="card-row">
                                <span className="label">Tên</span>
                                <strong>{cat.name}</strong>
                            </div>
                            <div className="card-row">
                                <span className="label">Mô tả</span>
                                <p className="muted">{cat.description || '-'}</p>
                            </div>
                            <div className="pill-row">
                                <span className="pill pill--ghost"><i className="fas fa-user"></i> {cat.userId || '—'}</span>
                                <span className={`pill ${cat.ispublic ? 'pill--success' : 'pill--warning'}`}>
                                    <i className={`fas fa-${cat.ispublic ? 'globe' : 'lock'}`}></i>
                                    {cat.ispublic ? 'Công khai' : 'Riêng tư'}
                                </span>
                            </div>
                            <div className="card-footer">
                                <span className="muted">{formatDate(cat.createdAt)}</span>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => togglePublic(cat.id, cat.ispublic)}
                                >
                                    <i className={`fas fa-${cat.ispublic ? 'eye-slash' : 'eye'}`}></i>
                                    {cat.ispublic ? 'Ẩn' : 'Công khai'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <>
                    <div className="pagination desktop-only">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <i className="fas fa-chevron-left"></i>
                        </button>
                        <span>Trang {page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>

                    <div className="pagination mobile-pagination mobile-only">
                        <button
                            className="wide-btn"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <i className="fas fa-chevron-left"></i> Trước
                        </button>
                        <span>Trang {page}/{totalPages}</span>
                        <button
                            className="wide-btn"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Sau <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </>
            )}

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Thêm danh mục mới</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Tên danh mục *</label>
                                <input
                                    type="text"
                                    value={newCategory.name}
                                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                    placeholder="Nhập tên danh mục"
                                />
                            </div>
                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea
                                    value={newCategory.description}
                                    onChange={e => setNewCategory({ ...newCategory, description: e.target.value })}
                                    placeholder="Nhập mô tả"
                                    rows="3"
                                />
                            </div>
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={newCategory.ispublic}
                                        onChange={e => setNewCategory({ ...newCategory, ispublic: e.target.checked })}
                                    />
                                    Công khai
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                Hủy
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={addCategory}
                                disabled={saving || !newCategory.name.trim()}
                            >
                                {saving ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                                ) : (
                                    <>Thêm</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Categories;
