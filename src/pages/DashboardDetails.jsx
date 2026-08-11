import { useEffect, useState } from 'react';
import api, { unwrapApiData } from '../services/api';
import './Dashboard.css';

function DashboardDetails() {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/api/admin/stats');
            setOverview(unwrapApiData(response));
        } catch (err) {
            setError(err.message || 'Không thể tải thống kê nội dung');
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num?.toString() || '0';
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
                <button onClick={loadStats} className="btn btn-primary">
                    Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-page-title">
                <h2>Thống kê nội dung</h2>
            </div>

            <div className="dashboard-row two-columns">
                <div className="panel">
                    <div className="panel-header">
                        <h3><i className="fas fa-road"></i> Lộ trình học tập</h3>
                    </div>
                    <div className="panel-body">
                        <div className="mini-stats-grid">
                            <div className="mini-stat">
                                <i className="fas fa-layer-group" style={{ color: '#6366f1' }}></i>
                                <div className="mini-stat-info">
                                    <span className="mini-stat-value">{formatNumber(overview?.totalPathGroups)}</span>
                                    <span className="mini-stat-label">Nhóm</span>
                                </div>
                            </div>
                            <div className="mini-stat">
                                <i className="fas fa-map-signs" style={{ color: '#8b5cf6' }}></i>
                                <div className="mini-stat-info">
                                    <span className="mini-stat-value">{formatNumber(overview?.totalLearningPaths)}</span>
                                    <span className="mini-stat-label">Lộ trình</span>
                                </div>
                            </div>
                            <div className="mini-stat">
                                <i className="fas fa-boxes" style={{ color: '#ec4899' }}></i>
                                <div className="mini-stat-info">
                                    <span className="mini-stat-value">{formatNumber(overview?.totalWordSets)}</span>
                                    <span className="mini-stat-label">Bộ từ</span>
                                </div>
                            </div>
                            <div className="mini-stat">
                                <i className="fas fa-book" style={{ color: '#0ea5e9' }}></i>
                                <div className="mini-stat-info">
                                    <span className="mini-stat-value">{formatNumber(overview?.totalPathVocabularies)}</span>
                                    <span className="mini-stat-label">Từ vựng</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-header">
                        <h3><i className="fas fa-folder-open"></i> Nội dung người dùng</h3>
                    </div>
                    <div className="panel-body">
                        <div className="mini-stats-grid cols-2">
                            <div className="mini-stat">
                                <i className="fas fa-folder" style={{ color: '#f59e0b' }}></i>
                                <div className="mini-stat-info">
                                    <span className="mini-stat-value">{formatNumber(overview?.totalCategories)}</span>
                                    <span className="mini-stat-label">Bộ sưu tập</span>
                                </div>
                            </div>
                            <div className="mini-stat">
                                <i className="fas fa-spell-check" style={{ color: '#8b5cf6' }}></i>
                                <div className="mini-stat-info">
                                    <span className="mini-stat-value">{formatNumber(overview?.totalCustomVocabularies)}</span>
                                    <span className="mini-stat-label">Từ tự tạo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardDetails;
