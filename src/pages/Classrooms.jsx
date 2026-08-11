import { useEffect, useMemo, useState } from 'react';
import api, { unwrapApiData } from '../services/api';
import './Classrooms.css';

const TEACHER_MONTH_OPTIONS = [
    { value: 1, label: '1 tháng' },
    { value: 3, label: '3 tháng' },
    { value: 6, label: '6 tháng' },
    { value: 12, label: '12 tháng' },
    { value: 24, label: '24 tháng' },
];

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN');
};

const getDaysRemaining = (value) => {
    if (!value) return null;
    const expiresAt = new Date(value);
    if (Number.isNaN(expiresAt.getTime())) return null;
    return Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
};

function Classrooms() {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [showAddTeacher, setShowAddTeacher] = useState(false);
    const [teacherForm, setTeacherForm] = useState({ email: '', months: 6, notes: '' });
    const [accessForm, setAccessForm] = useState({ months: 6, notes: '' });

    useEffect(() => {
        loadTeachers();
    }, []);

    const activeTeacherCount = useMemo(
        () => teachers.filter((teacher) => teacher.isTeacherActive).length,
        [teachers],
    );

    const classroomCount = useMemo(
        () => teachers.reduce((total, teacher) => total + Number(teacher.classroomCount || 0), 0),
        [teachers],
    );

    const loadTeachers = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/api/admin/teachers');
            const data = unwrapApiData(response) || [];
            setTeachers(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách giáo viên');
        } finally {
            setLoading(false);
        }
    };

    const setTeacherFormField = (field, value) => {
        setTeacherForm((current) => ({ ...current, [field]: value }));
    };

    const setAccessFormField = (field, value) => {
        setAccessForm((current) => ({ ...current, [field]: value }));
    };

    const openTeacherDetail = (teacher) => {
        setSelectedTeacher(teacher);
        setAccessForm({ months: 6, notes: '' });
    };

    const closeTeacherDetail = () => {
        if (saving) return;
        setSelectedTeacher(null);
    };

    const openAddTeacher = () => {
        setTeacherForm({ email: '', months: 6, notes: '' });
        setShowAddTeacher(true);
    };

    const closeAddTeacher = () => {
        if (saving) return;
        setShowAddTeacher(false);
    };

    const addTeacher = async (event) => {
        event.preventDefault();
        if (!teacherForm.email.trim()) {
            setError('Vui lòng nhập Gmail giáo viên');
            return;
        }

        try {
            setSaving(true);
            setError('');
            await api.post('/api/admin/users/activate-teacher', {
                email: teacherForm.email.trim(),
                months: Number(teacherForm.months),
                notes: teacherForm.notes.trim() || 'Admin thêm giáo viên',
            });
            closeAddTeacher();
            await loadTeachers();
        } catch (err) {
            setError(err.message || 'Không thể thêm giáo viên');
        } finally {
            setSaving(false);
        }
    };

    const updateTeacherAccess = async (event) => {
        event.preventDefault();
        if (!selectedTeacher) return;

        try {
            setSaving(true);
            setError('');
            const response = await api.patch(`/api/admin/users/${selectedTeacher.id}/teacher-access`, {
                months: Number(accessForm.months),
                notes: accessForm.notes.trim() || 'Admin chỉnh thời gian giáo viên',
            });
            const data = unwrapApiData(response);
            setSelectedTeacher((current) => current ? {
                ...current,
                isTeacherActive: true,
                teacherAccessExpiresAt: data?.user?.teacherAccessExpiresAt || current.teacherAccessExpiresAt,
            } : current);
            await loadTeachers();
        } catch (err) {
            setError(err.message || 'Không thể cập nhật thời gian giáo viên');
        } finally {
            setSaving(false);
        }
    };

    const deleteTeacherAccess = async () => {
        if (!selectedTeacher) return;
        if (!window.confirm(`Xóa quyền giáo viên của "${selectedTeacher.name || selectedTeacher.email}"?`)) return;

        try {
            setSaving(true);
            setError('');
            await api.delete(`/api/admin/users/${selectedTeacher.id}/teacher-access`);
            setSelectedTeacher(null);
            await loadTeachers();
        } catch (err) {
            setError(err.message || 'Không thể xóa giáo viên');
        } finally {
            setSaving(false);
        }
    };

    const renderAccess = (teacher) => {
        const days = getDaysRemaining(teacher.teacherAccessExpiresAt);
        if (!teacher.isTeacherActive || !teacher.teacherAccessExpiresAt) {
            return <span className="teacher-status inactive">Hết quyền</span>;
        }

        return (
            <span className={days <= 7 ? 'teacher-status warning' : 'teacher-status active'}>
                Còn {days} ngày
            </span>
        );
    };

    const selectedClassrooms = selectedTeacher?.classrooms || [];

    return (
        <div className="classrooms-page">
            <section className="teacher-toolbar admin-card">
                <div>
                    <h2>Danh sách giáo viên</h2>
                    <p>{activeTeacherCount} giáo viên còn quyền, {classroomCount} lớp học</p>
                </div>
                <div className="toolbar-actions">
                    <button className="btn btn-secondary" type="button" onClick={loadTeachers} disabled={loading}>
                        <i className="fas fa-rotate"></i> Tải lại
                    </button>
                    <button className="btn btn-primary" type="button" onClick={openAddTeacher}>
                        <i className="fas fa-user-plus"></i> Thêm giáo viên
                    </button>
                </div>
            </section>

            {error && <div className="alert alert-error">{error}</div>}

            <section className="admin-card teacher-list-card">
                {loading ? (
                    <div className="loading-state">Đang tải giáo viên...</div>
                ) : teachers.length ? (
                    <div className="teacher-list">
                        {teachers.map((teacher) => (
                            <button
                                key={teacher.id}
                                type="button"
                                className="teacher-row"
                                onClick={() => openTeacherDetail(teacher)}
                            >
                                <div className="teacher-main">
                                    <span className="teacher-avatar">{(teacher.name || teacher.email || '?').charAt(0).toUpperCase()}</span>
                                    <span>
                                        <strong>{teacher.name || 'Chưa đặt tên'}</strong>
                                        <small>{teacher.email}</small>
                                    </span>
                                </div>
                                <div className="teacher-meta">
                                    {renderAccess(teacher)}
                                    <span>{teacher.classroomCount || 0} lớp</span>
                                    <span>{teacher.studentCount || 0} học sinh</span>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">Chưa có giáo viên nào.</div>
                )}
            </section>

            {showAddTeacher && (
                <div className="modal-backdrop" role="presentation" onClick={closeAddTeacher}>
                    <div className="teacher-modal" role="dialog" aria-modal="true" aria-labelledby="add-teacher-title" onClick={(event) => event.stopPropagation()}>
                        <button className="modal-close" type="button" onClick={closeAddTeacher} disabled={saving} aria-label="Đóng">
                            &times;
                        </button>
                        <h3 id="add-teacher-title">Thêm giáo viên</h3>
                        <form className="teacher-form" onSubmit={addTeacher}>
                            <label>
                                Gmail giáo viên
                                <input
                                    type="email"
                                    value={teacherForm.email}
                                    onChange={(event) => setTeacherFormField('email', event.target.value)}
                                    placeholder="teacher@example.com"
                                />
                            </label>
                            <label>
                                Thời gian làm giáo viên
                                <select value={teacherForm.months} onChange={(event) => setTeacherFormField('months', Number(event.target.value))}>
                                    {TEACHER_MONTH_OPTIONS.map((item) => (
                                        <option key={item.value} value={item.value}>{item.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Ghi chú
                                <input
                                    value={teacherForm.notes}
                                    onChange={(event) => setTeacherFormField('notes', event.target.value)}
                                    placeholder="Ghi chú nội bộ"
                                />
                            </label>
                            <div className="modal-actions">
                                <button className="btn btn-secondary" type="button" onClick={closeAddTeacher} disabled={saving}>Hủy</button>
                                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Thêm giáo viên'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedTeacher && (
                <div className="modal-backdrop" role="presentation" onClick={closeTeacherDetail}>
                    <div className="teacher-modal teacher-detail-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-detail-title" onClick={(event) => event.stopPropagation()}>
                        <button className="modal-close" type="button" onClick={closeTeacherDetail} disabled={saving} aria-label="Đóng">
                            &times;
                        </button>

                        <div className="teacher-detail-head">
                            <span className="teacher-avatar large">{(selectedTeacher.name || selectedTeacher.email || '?').charAt(0).toUpperCase()}</span>
                            <div>
                                <h3 id="teacher-detail-title">{selectedTeacher.name || 'Chưa đặt tên'}</h3>
                                <p>{selectedTeacher.email}</p>
                                <p>Hết hạn: {formatDate(selectedTeacher.teacherAccessExpiresAt)}</p>
                            </div>
                        </div>

                        <div className="modal-section">
                            <h4>Lớp học của giáo viên</h4>
                            {selectedClassrooms.length ? (
                                <div className="classroom-mini-list">
                                    {selectedClassrooms.map((classroom) => (
                                        <div className="classroom-mini-row" key={classroom.id}>
                                            <div>
                                                <strong>{classroom.name}</strong>
                                                <small>Mã {classroom.code}</small>
                                            </div>
                                            <div>
                                                <span>{classroom.studentCount || 0} học sinh</span>
                                                <small>{classroom.slotLimit || 0} slot</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state compact">Giáo viên này chưa có lớp.</div>
                            )}
                        </div>

                        <form className="teacher-form modal-section" onSubmit={updateTeacherAccess}>
                            <h4>Chỉnh thời gian làm giáo viên</h4>
                            <label>
                                Đặt lại thời hạn từ hôm nay
                                <select value={accessForm.months} onChange={(event) => setAccessFormField('months', Number(event.target.value))}>
                                    {TEACHER_MONTH_OPTIONS.map((item) => (
                                        <option key={item.value} value={item.value}>{item.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Ghi chú
                                <input
                                    value={accessForm.notes}
                                    onChange={(event) => setAccessFormField('notes', event.target.value)}
                                    placeholder="Lý do chỉnh thời gian"
                                />
                            </label>
                            <div className="modal-actions split">
                                <button className="btn btn-danger" type="button" onClick={deleteTeacherAccess} disabled={saving}>
                                    Xóa giáo viên
                                </button>
                                <button className="btn btn-primary" type="submit" disabled={saving}>
                                    {saving ? 'Đang lưu...' : 'Lưu thời gian'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Classrooms;
