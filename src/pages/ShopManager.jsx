import { useState, useEffect } from 'react';
import { api, API_BASE_URL, unwrapApiData } from '../services/api';
import './ShopManager.css';

export default function ShopManager() {
    const CURRENT_R2_PUBLIC_BASE_URL = 'https://pub-d7e02113980f48ab8bc1fd93bac0addf.r2.dev';
    const LEGACY_R2_PUBLIC_BASE_URLS = [
        'https://pub-2f91437ba6264fd9859166205a859012.r2.dev',
    ];
    const DEFAULT_CUSTOM_UPLOAD_PRICING = {
        avatar: { initialPrice: 20000, replacePrice: 5000 },
        background: { initialPrice: 20000, replacePrice: 5000 },
    };
    const [items, setItems] = useState([]);
    const [customUploadPricing, setCustomUploadPricing] = useState(DEFAULT_CUSTOM_UPLOAD_PRICING);
    const [loading, setLoading] = useState(true);
    const [savingPricing, setSavingPricing] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [useUrlInput, setUseUrlInput] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'background',
        description: '',
        price: 0,
        imageUrl: '',
        imageFile: null,
        isActive: true,
        metadata: null
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const [itemsRes, pricingRes] = await Promise.all([
                api.get('/api/admin/shop/items?includeInactive=true'),
                api.get('/api/admin/shop/custom-upload-pricing'),
            ]);
            setItems(itemsRes.data || itemsRes || []);
            const pricingData = pricingRes.data || pricingRes || {};
            setCustomUploadPricing({
                avatar: {
                    ...DEFAULT_CUSTOM_UPLOAD_PRICING.avatar,
                    ...(pricingData.avatar || {}),
                },
                background: {
                    ...DEFAULT_CUSTOM_UPLOAD_PRICING.background,
                    ...(pricingData.background || {}),
                },
            });
        } catch (error) {

            // Don't show alert to avoid annoying the user
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePricingChange = (type, field, value) => {
        const numericValue = Math.max(0, Number(value) || 0);
        setCustomUploadPricing((prev) => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: numericValue,
            },
        }));
    };

    const handleSaveCustomUploadPricing = async () => {
        setSavingPricing(true);
        try {
            const res = await api.patch('/api/admin/shop/custom-upload-pricing', customUploadPricing);
            const pricingData = res.data || res || {};
            setCustomUploadPricing({
                avatar: {
                    ...DEFAULT_CUSTOM_UPLOAD_PRICING.avatar,
                    ...(pricingData.avatar || {}),
                },
                background: {
                    ...DEFAULT_CUSTOM_UPLOAD_PRICING.background,
                    ...(pricingData.background || {}),
                },
            });
            alert('Đã cập nhật giá upload cá nhân!');
        } catch (error) {
            alert('Lỗi: ' + (error.message || 'Không thể cập nhật giá upload cá nhân'));
        } finally {
            setSavingPricing(false);
        }
    };

    const getImageUrl = (url) => {
        if (!url) return '';
        const normalizedUrl = url.trim();
        for (const legacyBaseUrl of LEGACY_R2_PUBLIC_BASE_URLS) {
            if (normalizedUrl.startsWith(`${legacyBaseUrl}/shop-user-uploads/`)) {
                return `${CURRENT_R2_PUBLIC_BASE_URL}${normalizedUrl.slice(legacyBaseUrl.length)}`;
            }
        }
        if (normalizedUrl.startsWith('http')) return normalizedUrl;
        if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/:?#]|$)/i.test(normalizedUrl)) {
            return `https://${normalizedUrl}`;
        }
        return `${API_BASE_URL}${normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`}`;
    };

    const VISUAL_TYPES = new Set(['avatar', 'background']);
    const IMAGE_ONLY_TYPES = new Set(['wrong_answer_meme', 'correct_answer_meme']);
    const AUDIO_ONLY_TYPES = new Set(['sound', 'typing_sound']);
    const VIDEO_URL_PATTERN = /\.(?:mp4|webm|mov|m4v|avi|mkv|m3u8|ogv)(?:$|[?#])/i;
    const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
    const isLikelyVideoUrl = (url) => typeof url === 'string' && VIDEO_URL_PATTERN.test(url.trim());
    const parseUrl = (url) => {
        if (typeof url !== 'string') return null;

        const normalizedUrl = url.trim();
        if (!normalizedUrl) return null;

        const candidateUrl = /^https?:\/\//i.test(normalizedUrl) || normalizedUrl.startsWith('/')
            ? normalizedUrl
            : `https://${normalizedUrl}`;

        try {
            return new URL(candidateUrl);
        } catch {
            return null;
        }
    };
    const extractYouTubeVideoId = (url) => {
        const parsedUrl = parseUrl(url);
        if (!parsedUrl) return '';

        const hostname = parsedUrl.hostname.replace(/^www\./i, '').toLowerCase();
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

        if (hostname === 'youtu.be') {
            return YOUTUBE_ID_PATTERN.test(pathSegments[0] || '') ? pathSegments[0] : '';
        }

        if (
            hostname === 'youtube.com'
            || hostname === 'm.youtube.com'
            || hostname === 'music.youtube.com'
            || hostname === 'youtube-nocookie.com'
        ) {
            if (pathSegments[0] === 'watch') {
                const videoId = parsedUrl.searchParams.get('v') || '';
                return YOUTUBE_ID_PATTERN.test(videoId) ? videoId : '';
            }

            if (['embed', 'shorts', 'live', 'v'].includes(pathSegments[0])) {
                const videoId = pathSegments[1] || '';
                return YOUTUBE_ID_PATTERN.test(videoId) ? videoId : '';
            }

            const videoId = parsedUrl.searchParams.get('v') || '';
            return YOUTUBE_ID_PATTERN.test(videoId) ? videoId : '';
        }

        return '';
    };
    const isEmbeddableYouTubeUrl = (url) => Boolean(extractYouTubeVideoId(url));
    const buildYouTubeEmbedUrl = (url) => {
        const videoId = extractYouTubeVideoId(url);
        if (!videoId) return '';

        const params = new URLSearchParams({
            autoplay: '1',
            mute: '1',
            controls: '0',
            loop: '1',
            playlist: videoId,
            playsinline: '1',
            rel: '0',
            modestbranding: '1',
            iv_load_policy: '3',
        });

        return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    };
    const restartVideoPlayback = (event) => {
        const mediaElement = event?.currentTarget;
        if (!mediaElement) return;

        try {
            mediaElement.currentTime = 0;
            const playPromise = mediaElement.play?.();
            if (playPromise?.catch) {
                playPromise.catch(() => { });
            }
        } catch {
            // Ignore autoplay restrictions or transient playback errors.
        }
    };
    const shouldShowVisualPreview = !AUDIO_ONLY_TYPES.has(formData.type);

    const isVideoSource = (sourceUrl, file = null) => {
        if (file?.type) {
            return file.type.startsWith('video/');
        }

        return isLikelyVideoUrl(sourceUrl || '') || isEmbeddableYouTubeUrl(sourceUrl || '');
    };

    const renderVisualMedia = ({ src, alt, className, isVideo, style }) => {
        if (!src) {
            return null;
        }

        if (isEmbeddableYouTubeUrl(src)) {
            return (
                <iframe
                    src={buildYouTubeEmbedUrl(src)}
                    title={alt || 'YouTube preview'}
                    className={className}
                    style={{ ...style, border: 0 }}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            );
        }

        if (isVideo) {
            return (
                <video
                    src={src}
                    className={className}
                    style={style}
                    autoPlay
                    muted
                    loop
                    playsInline
                    onEnded={restartVideoPlayback}
                />
            );
        }

        return (
            <img
                src={src}
                alt={alt}
                className={className}
                style={style}
            />
        );
    };

    const validateAssetSelection = () => {
        if (VISUAL_TYPES.has(formData.type) && formData.imageFile) {
            if (!formData.imageFile.type?.match(/^(image|video)\//)) {
                return 'Avatar va hinh nen chi ho tro file anh hoac video.';
            }
        }

        if (IMAGE_ONLY_TYPES.has(formData.type) && formData.imageFile && !formData.imageFile.type?.startsWith('image/')) {
            return 'Anh/GIF meme tra loi chi ho tro file anh.';
        }

        if (AUDIO_ONLY_TYPES.has(formData.type) && formData.imageFile && !formData.imageFile.type?.startsWith('audio/')) {
            return 'Vat pham am thanh chi ho tro file audio.';
        }

        if (AUDIO_ONLY_TYPES.has(formData.type) && isEmbeddableYouTubeUrl(formData.imageUrl || '')) {
            return 'Vat pham am thanh chi ho tro file hoac link audio, khong ho tro YouTube.';
        }

        return null;
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, imageFile: file, imageUrl: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const assetError = validateAssetSelection();
        if (assetError) {
            alert(assetError);
            return;
        }

        try {
            const formDataObj = new FormData();
            formDataObj.append('name', formData.name);
            formDataObj.append('type', formData.type);
            if (formData.description) formDataObj.append('description', formData.description);
            formDataObj.append('price', formData.price);
            formDataObj.append('isActive', String(formData.isActive));

            if (formData.metadata) {
                formDataObj.append('metadata', JSON.stringify(formData.metadata));
            }

            if (formData.imageFile) {
                formDataObj.append('image', formData.imageFile);
            } else if (formData.imageUrl) {
                formDataObj.append('imageUrl', formData.imageUrl);
            }

            if (editingItem) {
                await api.patch(`/api/admin/shop/items/${editingItem.id}`, formDataObj);
                alert('Cập nhật thành công!');
            } else {
                await api.post('/api/admin/shop/items', formDataObj);
                alert('Tạo item mới thành công!');
            }
            resetForm();
            fetchItems();
        } catch (error) {

            alert('Lỗi: ' + (error.message || 'Không thể lưu item'));
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setUseUrlInput(Boolean(item.imageUrl));
        setFormData({
            name: item.name,
            type: item.type,
            description: item.description || '',
            price: item.price,
            imageUrl: item.imageUrl || '',
            imageFile: null,
            isActive: item.isActive,
            metadata: item.metadata || null
        });
        setIsItemModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa vật phẩm này?')) {
            try {
                const response = await api.delete(`/api/admin/shop/items/${id}`);
                unwrapApiData(response);
                setItems((currentItems) => currentItems.filter((item) => item.id !== id));
                alert('Xóa thành công!');
                fetchItems();
            } catch (error) {

                alert('Lỗi: ' + (error.message || 'Không thể xóa item'));
            }
        }
    };

    const resetForm = () => {
        setEditingItem(null);
        setIsItemModalOpen(false);
        setUseUrlInput(false);
        setFormData({
            name: '',
            type: 'background',
            description: '',
            price: 0,
            imageUrl: '',
            imageFile: null,
            isActive: true,
            metadata: null
        });
    };

    const openCreateModal = () => {
        resetForm();
        setIsItemModalOpen(true);
    };

    if (loading) {
        return <div className="loading">Đang tải...</div>;
    }

    return (
        <div className="shop-manager">
            <h1>🛒 Quản lý Shop</h1>

            <div className="custom-upload-pricing">
                <div className="custom-upload-pricing-header">
                    <div>
                        <h2>Giá ô upload cá nhân</h2>
                        <p>Áp dụng cho 2 ô tự upload trong tab ảnh đại diện và hình nền của user.</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveCustomUploadPricing}
                        disabled={savingPricing}
                    >
                        {savingPricing ? 'Đang lưu...' : 'Lưu giá upload'}
                    </button>
                </div>

                <div className="custom-upload-pricing-grid">
                    {[
                        { type: 'avatar', label: '🧑 Ảnh đại diện tự upload' },
                        { type: 'background', label: '🖼️ Hình nền tự upload' },
                    ].map(({ type, label }) => (
                        <div className="custom-upload-pricing-card" key={type}>
                            <h3>{label}</h3>
                            <div className="pricing-input-row">
                                <label>
                                    Mua ô lần đầu
                                    <input
                                        type="number"
                                        min="0"
                                        value={customUploadPricing[type]?.initialPrice || 0}
                                        onChange={(e) => handlePricingChange(type, 'initialPrice', e.target.value)}
                                    />
                                </label>
                                <label>
                                    Đổi ảnh mỗi lần
                                    <input
                                        type="number"
                                        min="0"
                                        value={customUploadPricing[type]?.replacePrice || 0}
                                        onChange={(e) => handlePricingChange(type, 'replacePrice', e.target.value)}
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="shop-list-toolbar">
                <h2>Danh sách Items ({items.length})</h2>
                <button type="button" className="btn btn-primary" onClick={openCreateModal}>
                    + Thêm vật phẩm
                </button>
            </div>

            {isItemModalOpen && (
                <div className="shop-modal-overlay" onMouseDown={resetForm}>
                    <div className="shop-modal-panel" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="shop-modal-header">
                            <h2>{editingItem ? 'Chỉnh sửa Item' : 'Tạo Item Mới'}</h2>
                            <button type="button" className="shop-modal-close" onClick={resetForm} aria-label="Đóng">
                                ×
                            </button>
                        </div>
                        <div className="shop-form-section shop-form-modal">
                    <form onSubmit={handleSubmit} className="shop-form">
                        <div className="form-group">
                            <label>Tên Item *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Loại vật phẩm *</label>
                            <select
                                value={formData.type}
                                onChange={(e) => {
                                    const newType = e.target.value;
                                    setFormData({ ...formData, type: newType, metadata: null });
                                }}
                                required
                            >
                                <option value="avatar">🧑 Ảnh đại diện</option>
                                <option value="background">🖼️ Hình nền</option>
                                <option value="streak_freeze">❄️ Đá hồi Streak</option>
                                <option value="wrong_answer_meme">Ảnh/GIF trả lời sai</option>
                                <option value="correct_answer_meme">Ảnh/GIF trả lời đúng</option>
                                <option value="sound">🔊 Âm thanh meme</option>
                                <option value="typing_sound">⌨️ Âm gõ phím</option>
                            </select>
                        </div>


                        <div className="form-group">
                            <label>Mô tả</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label>Giá (coins) *</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                                required
                                min="0"
                            />
                        </div>

                        <div className="form-group">
                            <label>Hình ảnh</label>

                            {/* Tab selection for upload type */}
                            <div className="image-input-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <button
                                    type="button"
                                    className={`tab-btn ${!useUrlInput ? 'active' : ''}`}
                                    onClick={() => setUseUrlInput(false)}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        background: !useUrlInput ? '#4CAF50' : '#fff',
                                        color: !useUrlInput ? '#fff' : '#333',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    📁 Tải file lên
                                </button>
                                <button
                                    type="button"
                                    className={`tab-btn ${useUrlInput ? 'active' : ''}`}
                                    onClick={() => setUseUrlInput(true)}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        background: useUrlInput ? '#4CAF50' : '#fff',
                                        color: useUrlInput ? '#fff' : '#333',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    🔗 Nhập URL
                                </button>
                            </div>

                            {useUrlInput ? (
                                <div>
                                    <input
                                        type="text"
                                        placeholder={VISUAL_TYPES.has(formData.type)
                                            ? 'https://... (ho tro anh, video, YouTube: PNG, JPG, GIF, WebP, MP4, WebM, youtu.be/...)'
                                            : 'https://... (ho tro PNG, JPG, GIF, WebP)'}
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value, imageFile: null })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                    {VISUAL_TYPES.has(formData.type) && isVideoSource(formData.imageUrl) && (
                                        <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', fontWeight: '600' }}>
                                            Link video/YouTube duoc phep va se hien thi dang video tren trang user.
                                        </p>
                                    )}
                                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                        💡 Có thể dùng link từ Pinterest, Imgur, hoặc bất kỳ URL ảnh nào
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        accept={(formData.type === 'sound' || formData.type === 'typing_sound')
                                            ? 'audio/*'
                                            : VISUAL_TYPES.has(formData.type)
                                                ? 'image/*,video/*'
                                                : 'image/*'}
                                        onChange={handleImageChange}
                                        className="file-input"
                                    />
                                    {formData.type === 'sound' && (
                                        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                            🎵 Hỗ trợ MP3, OGG, WAV. File sẽ được phát khi người dùng trả lời sai.
                                        </p>
                                    )}
                                </>
                            )}

                            <div className="image-preview-container">
                                {shouldShowVisualPreview && formData.imageFile
                                    ? renderVisualMedia({
                                        src: URL.createObjectURL(formData.imageFile),
                                        alt: 'Preview',
                                        className: 'image-preview',
                                        isVideo: isVideoSource('', formData.imageFile),
                                    })
                                    : shouldShowVisualPreview && formData.imageUrl
                                        ? renderVisualMedia({
                                            src: getImageUrl(formData.imageUrl),
                                            alt: 'Current',
                                            className: 'image-preview',
                                            isVideo: isVideoSource(getImageUrl(formData.imageUrl)),
                                            style: isEmbeddableYouTubeUrl(getImageUrl(formData.imageUrl))
                                                ? { width: '100%', height: '200px' }
                                                : undefined,
                                        })
                                        : null}
                            </div>
                        </div>

                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                Đang hoạt động
                            </label>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                                {editingItem ? 'Cập nhật' : 'Tạo mới'}
                            </button>
                            <button type="button" onClick={resetForm} className="btn btn-secondary">
                                Hủy
                            </button>
                        </div>
                    </form>
                </div>
                    </div>
                </div>
            )}

            <div className="shop-content">

                {/* Items List */}
                <div className="shop-list-section">
                    <div className="items-grid">
                        {items.map(item => (
                            <div key={item.id} className={`item-card ${!item.isActive ? 'inactive' : ''}`}>
                                {(item.type === 'sound' || item.type === 'typing_sound') && item.imageUrl ? (
                                    <div
                                        className="item-image"
                                        style={{
                                            background: item.type === 'typing_sound'
                                                ? 'linear-gradient(135deg, #38b2ac 0%, #48bb78 100%)'
                                                : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', fontSize: '2rem'
                                        }}
                                        onClick={() => {
                                            const audio = new Audio(getImageUrl(item.imageUrl));
                                            audio.play().catch(() => { });
                                        }}
                                        title="Nhấn để nghe thử"
                                    >
                                        🔊
                                    </div>
                                ) : item.type === 'streak_freeze' ? (
                                    <div
                                        className="item-image"
                                        style={{
                                            background: 'linear-gradient(135deg, #67e8f9 0%, #3b82f6 100%)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '2rem'
                                        }}
                                    >
                                        ❄️
                                    </div>
                                ) : item.imageUrl ? (
                                    renderVisualMedia({
                                        src: getImageUrl(item.imageUrl),
                                        alt: item.name,
                                        className: 'item-image',
                                        isVideo: VISUAL_TYPES.has(item.type) && isVideoSource(getImageUrl(item.imageUrl)),
                                    })
                                ) : null}
                                <div className="item-info">
                                    <h3>{item.name}</h3>
                                    <span className="item-type">
                                        {item.type === 'avatar' ? '🧑 Ảnh đại diện'
                                            : item.type === 'background' ? '🖼️ Hình nền'
                                                : item.type === 'streak_freeze' ? '❄️ Đá hồi Streak'
                                                    : item.type === 'sound' ? '🔊 Âm thanh meme'
                                                        : item.type === 'typing_sound' ? '⌨️ Âm gõ phím'
                                                            : item.type === 'wrong_answer_meme' ? 'Meme trả lời sai'
                                                                : item.type === 'correct_answer_meme' ? 'Meme trả lời đúng'
                                                                    : item.type}
                                    </span>
                                    <p className="item-description">{item.description}</p>
                                    <div className="item-price">💰 {item.price} coins</div>
                                    <div className="item-status">
                                        {item.isActive ? '✅ Hoạt động' : '❌ Không hoạt động'}
                                    </div>
                                </div>
                                <div className="item-actions">
                                    <button onClick={() => handleEdit(item)} className="btn-edit">
                                        ✏️ Sửa
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="btn-delete">
                                        🗑️ Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
