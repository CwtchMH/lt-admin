import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import BulkUpload from '../components/BulkUpload';
import BulkImportPath from '../components/BulkImportPath';
import { escapeCsvCell, escapeHtmlCell } from '../utils/spreadsheetExport';
import './PathsManager.css';
import './PathsManagerResponsive.css';

const sortPathsByDisplayOrder = (items = []) =>
    [...items].sort((a, b) => {
        const orderDiff = (Number(a?.displayOrder) || 0) - (Number(b?.displayOrder) || 0);
        if (orderDiff !== 0) return orderDiff;
        return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
    });

const sortWordSetsByOrder = (items = []) =>
    [...items].sort((a, b) => {
        const orderDiff = (Number(a?.order) || 0) - (Number(b?.order) || 0);
        if (orderDiff !== 0) return orderDiff;
        return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
    });

function PathsManager() {
    const [loading, setLoading] = useState(false);

    // ===== NAVIGATION STATE =====
    const [viewMode, setViewMode] = useState('groups');
    const [currentGroup, setCurrentGroup] = useState(null);
    const [currentPath, setCurrentPath] = useState(null);
    const [currentWordSet, setCurrentWordSet] = useState(null);

    // ===== DATA STATE =====
    const [groups, setGroups] = useState([]);
    const [paths, setPaths] = useState([]);
    const [wordSets, setWordSets] = useState([]);
    const [vocabularies, setVocabularies] = useState([]);
    const [draggedPathId, setDraggedPathId] = useState(null);
    const [dragOverPathId, setDragOverPathId] = useState(null);
    const [savingPathOrder, setSavingPathOrder] = useState(false);
    const [draggedWordSetId, setDraggedWordSetId] = useState(null);
    const [dragOverWordSetId, setDragOverWordSetId] = useState(null);
    const [savingWordSetOrder, setSavingWordSetOrder] = useState(false);

    // ===== FORM STATE =====
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});

    // ===== AUDIO GEN STATE =====
    const [audioProgress, setAudioProgress] = useState({ show: false, current: 0, total: 0, generating: false });

    // ===== QUICK ADD STATE =====
    const [quickAdd, setQuickAdd] = useState({
        term: '', meaning: '', pronunciation: '', example: '', partOfSpeech: '', notes: ''
    });
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showBulkPathModal, setShowBulkPathModal] = useState(false);

    // Initial Load
    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/paths/groups');
            setGroups(res.data || res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadPaths = async (group) => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/paths');
            const allPaths = res.data || res;
            const filtered = allPaths.filter(p => {
                if (group.id === 'ungrouped') return !p.groupId;
                return p.groupId === group.id;
            });
            setPaths(sortPathsByDisplayOrder(filtered));
            setCurrentGroup(group);
            setViewMode('paths');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadWordSets = async (path) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/admin/paths/${path.id}/word-sets`);
            setWordSets(sortWordSetsByOrder(res.data || res));
            setCurrentPath(path);
            setViewMode('wordsets');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadVocabularies = async (ws) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/admin/word-sets/${ws.id}/vocabularies`);
            setVocabularies(res.data || res);
            setCurrentWordSet(ws);
            setViewMode('vocab');
        } catch (error) {
            console.error(error);
            setVocabularies([]);
        } finally {
            setLoading(false);
        }
    };

    // ===== NAVIGATION HANDLERS =====
    const goHome = () => { setViewMode('groups'); setCurrentGroup(null); setCurrentPath(null); setCurrentWordSet(null); loadGroups(); };
    const goToGroup = () => { setViewMode('paths'); setCurrentPath(null); setCurrentWordSet(null); loadPaths(currentGroup); };
    const goToPath = () => { setViewMode('wordsets'); setCurrentWordSet(null); loadWordSets(currentPath); };

    // ===== CRUD HANDLERS =====
    const handleOpenModal = (type, item = null) => {
        setModalType(type);
        setEditingItem(item);
        if (item) {
            if (type === 'path') {
                setFormData({
                    ...item,
                    groupId: item.groupId || '',
                    difficulty: item.difficulty || 1,
                    displayOrder: Number(item.displayOrder) || 0,
                });
            } else if (type === 'wordset') {
                setFormData({
                    ...item,
                    order: Number(item.order) || 0,
                });
            } else {
                setFormData({ ...item });
            }
        }
        else {
            if (type === 'group') setFormData({ name: '', description: '', order: 0 });
            if (type === 'group') setFormData({ name: '', description: '', order: 0 });
            if (type === 'path') setFormData({
                name: '',
                description: '',
                coverImage: '',
                difficulty: 1,
                displayOrder: paths.length,
                groupId: currentGroup.id === 'ungrouped' ? '' : currentGroup.id,
            });
            if (type === 'wordset') setFormData({ name: '', description: '', order: wordSets.length });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalType === 'group') {
                if (editingItem) await api.patch(`/api/admin/paths/groups/${editingItem.id}`, formData);
                else await api.post('/api/admin/paths/groups', formData);
                loadGroups();
            } else if (modalType === 'path') {
                // If formData.groupId is empty string or 'ungrouped', send null
                const payloadGroupId = (formData.groupId === '' || formData.groupId === 'ungrouped') ? null : formData.groupId;
                const data = { ...formData, groupId: payloadGroupId };
                if (editingItem) await api.patch(`/api/admin/paths/${editingItem.id}`, data);
                else await api.post('/api/admin/paths', data);
                loadPaths(currentGroup);
            } else if (modalType === 'wordset') {
                if (editingItem) await api.patch(`/api/admin/word-sets/${editingItem.id}`, formData);
                else await api.post(`/api/admin/paths/${currentPath.id}/word-sets`, formData);
                loadWordSets(currentPath);
            }
            setShowModal(false);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDelete = async (type, id) => {
        if (!confirm('Bạn có chắc chắn muốn xóa?')) return;
        try {
            if (type === 'group') { await api.delete(`/api/admin/paths/groups/${id}`); loadGroups(); }
            else if (type === 'path') { await api.delete(`/api/admin/paths/${id}`); loadPaths(currentGroup); }
            else if (type === 'wordset') { await api.delete(`/api/admin/word-sets/${id}`); loadWordSets(currentPath); }
            else if (type === 'vocab') {
                await api.delete(`/api/admin/path-vocabularies/${id}`);
                setVocabularies(prev => prev.filter(v => v.id !== id));
            }
        } catch (error) {
            alert(error.message);
        }
    };

    const persistPathOrder = async (orderedPaths, previousPaths) => {
        const previousOrderMap = new Map(previousPaths.map(path => [path.id, Number(path.displayOrder) || 0]));
        const updates = orderedPaths.filter(path => previousOrderMap.get(path.id) !== (Number(path.displayOrder) || 0));

        if (!updates.length) return;

        setSavingPathOrder(true);
        try {
            await Promise.all(
                updates.map(path =>
                    api.patch(`/api/admin/paths/${path.id}`, { displayOrder: Number(path.displayOrder) || 0 }),
                ),
            );
        } catch (error) {
            console.error(error);
            alert('Lưu thứ tự lộ trình thất bại.');
            setPaths(previousPaths);
        } finally {
            setSavingPathOrder(false);
        }
    };

    const persistWordSetOrder = async (orderedWordSets, previousWordSets) => {
        const previousOrderMap = new Map(previousWordSets.map(wordSet => [wordSet.id, Number(wordSet.order) || 0]));
        const updates = orderedWordSets.filter(wordSet => previousOrderMap.get(wordSet.id) !== (Number(wordSet.order) || 0));

        if (!updates.length) return;

        setSavingWordSetOrder(true);
        try {
            await Promise.all(
                updates.map(wordSet =>
                    api.patch(`/api/admin/word-sets/${wordSet.id}`, { order: Number(wordSet.order) || 0 }),
                ),
            );
        } catch (error) {
            console.error(error);
            alert('Lưu thứ tự bộ từ thất bại.');
            setWordSets(previousWordSets);
        } finally {
            setSavingWordSetOrder(false);
        }
    };

    const handlePathDragStart = (e, pathId) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', pathId);
        setDraggedPathId(pathId);
        setDragOverPathId(pathId);
    };

    const handlePathDragOver = (e, targetPathId) => {
        if (!draggedPathId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverPathId !== targetPathId) {
            setDragOverPathId(targetPathId);
        }
    };

    const handlePathDragEnd = () => {
        setDraggedPathId(null);
        setDragOverPathId(null);
    };

    const handlePathDrop = async (e, targetPathId) => {
        e.preventDefault();
        e.stopPropagation();

        const sourcePathId = draggedPathId || e.dataTransfer.getData('text/plain');
        if (!sourcePathId || sourcePathId === targetPathId) {
            handlePathDragEnd();
            return;
        }

        const sourceIndex = paths.findIndex(path => path.id === sourcePathId);
        const targetIndex = paths.findIndex(path => path.id === targetPathId);
        if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
            handlePathDragEnd();
            return;
        }

        const previousPaths = [...paths];
        const reorderedPaths = [...paths];
        const [movedPath] = reorderedPaths.splice(sourceIndex, 1);
        reorderedPaths.splice(targetIndex, 0, movedPath);

        const normalizedPaths = reorderedPaths.map((path, index) => ({
            ...path,
            displayOrder: index,
        }));

        setPaths(normalizedPaths);
        handlePathDragEnd();
        await persistPathOrder(normalizedPaths, previousPaths);
    };

    const handleWordSetDragStart = (e, wordSetId) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', wordSetId);
        setDraggedWordSetId(wordSetId);
        setDragOverWordSetId(wordSetId);
    };

    const handleWordSetDragOver = (e, targetWordSetId) => {
        if (!draggedWordSetId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverWordSetId !== targetWordSetId) {
            setDragOverWordSetId(targetWordSetId);
        }
    };

    const handleWordSetDragEnd = () => {
        setDraggedWordSetId(null);
        setDragOverWordSetId(null);
    };

    const handleWordSetDrop = async (e, targetWordSetId) => {
        e.preventDefault();
        e.stopPropagation();

        const sourceWordSetId = draggedWordSetId || e.dataTransfer.getData('text/plain');
        if (!sourceWordSetId || sourceWordSetId === targetWordSetId) {
            handleWordSetDragEnd();
            return;
        }

        const sourceIndex = wordSets.findIndex(wordSet => wordSet.id === sourceWordSetId);
        const targetIndex = wordSets.findIndex(wordSet => wordSet.id === targetWordSetId);
        if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
            handleWordSetDragEnd();
            return;
        }

        const previousWordSets = [...wordSets];
        const reorderedWordSets = [...wordSets];
        const [movedWordSet] = reorderedWordSets.splice(sourceIndex, 1);
        reorderedWordSets.splice(targetIndex, 0, movedWordSet);

        const normalizedWordSets = reorderedWordSets.map((wordSet, index) => ({
            ...wordSet,
            order: index,
        }));

        setWordSets(normalizedWordSets);
        handleWordSetDragEnd();
        await persistWordSetOrder(normalizedWordSets, previousWordSets);
    };

    // ===== AUDIO GENERATION HANDLERS =====

    // 1. Single Word Audio
    const handleGenerateAudio = async (vocab) => {
        try {
            await api.post(`/api/admin/word-sets/vocabularies/${vocab.id}/generate-audio`);
            setVocabularies(prev => prev.map(v => v.id === vocab.id ? { ...v, audio: 'generated' } : v));
        } catch (error) {
            console.error('Audio Error:', error);
        }
    };

    // 2. Full Path Audio (Iterative Process)
    const handleGeneratePathAudio = async () => {
        if (!currentPath) return;
        if (!confirm(`Sinh audio cho TOÀN BỘ lộ trình "${currentPath.name}"? Quá trình này có thể mất vài phút.`)) return;

        setAudioProgress({ show: true, current: 0, total: 0, generating: true });

        try {
            // Step 1: Fetch all Word Sets
            const setsRes = await api.get(`/api/admin/paths/${currentPath.id}/word-sets`);
            const sets = setsRes.data || setsRes;

            if (!sets.length) {
                alert('Lộ trình chưa có bộ từ nào.');
                setAudioProgress({ show: false, current: 0, total: 0, generating: false });
                return;
            }

            // Step 2: Fetch Vocabs for ALL Sets (to get IDs)
            // Note: Ideally backend should do this, but for progress bar visibility we do it here.
            let allVocabs = [];
            for (const s of sets) {
                const vocabsRes = await api.get(`/api/admin/word-sets/${s.id}/vocabularies`);
                const vocabs = vocabsRes.data || vocabsRes;
                allVocabs = [...allVocabs, ...vocabs];
            }

            const total = allVocabs.length;
            if (total === 0) {
                alert('Lộ trình chưa có từ vựng nào.');
                setAudioProgress({ show: false, current: 0, total: 0, generating: false });
                return;
            }

            setAudioProgress({ show: true, current: 0, total: total, generating: true });

            // Step 3: Iterate and Generate
            let count = 0;
            // Limit concurrency to 3
            const limit = 3;
            for (let i = 0; i < total; i += limit) {
                const chunk = allVocabs.slice(i, i + limit);
                await Promise.all(chunk.map(v => api.post(`/api/admin/word-sets/vocabularies/${v.id}/generate-audio`).catch(e => console.error(v.term, e))));
                count += chunk.length;
                setAudioProgress(prev => ({ ...prev, current: Math.min(count, total) }));
            }

            alert('Hoàn thành sinh audio cho lộ trình!');

        } catch (err) {
            alert('Lỗi: ' + err.message);
        } finally {
            setAudioProgress(prev => ({ ...prev, generating: false }));
            setTimeout(() => setAudioProgress({ show: false, current: 0, total: 0, generating: false }), 2000); // Close after delay
        }
    };

    // ===== VOCAB HANDLERS =====
    const handleQuickAdd = async (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            if (!quickAdd.term || !quickAdd.meaning) return;
            try {
                const res = await api.post(`/api/admin/word-sets/${currentWordSet.id}/vocabularies`, quickAdd);
                const newVocab = res.data || res;
                if (newVocab && (newVocab.id || newVocab.term)) {
                    loadVocabularies(currentWordSet);
                }
                setQuickAdd({ ...quickAdd, term: '', meaning: '', pronunciation: '', example: '', partOfSpeech: '', notes: '' });
                document.getElementById('qa-term').focus();
            } catch (error) {
                console.error(error);
                alert('Add failed');
            }
        }
    };

    // ===== EXPORT HANDLER =====
    const [showExportMenu, setShowExportMenu] = useState(false);

    const handleExportPath = async (format) => {
        if (!currentPath) return;
        setShowExportMenu(false);
        try {
            // Fetch all word sets
            const setsRes = await api.get(`/api/admin/paths/${currentPath.id}/word-sets`);
            const sets = setsRes.data || setsRes;
            if (!sets.length) { alert('Lộ trình chưa có bộ từ nào.'); return; }

            // Fetch all vocabs
            let allRows = [];
            for (const s of sets) {
                const vocabsRes = await api.get(`/api/admin/word-sets/${s.id}/vocabularies`);
                const vocabs = vocabsRes.data || vocabsRes;
                vocabs.forEach(v => {
                    allRows.push({
                        'Bộ từ': s.name,
                        'Từ vựng': v.term || '',
                        'Phiên âm': v.pronunciation || '',
                        'Loại từ': v.partOfSpeech || '',
                        'Nghĩa': v.meaning || '',
                        'Ví dụ': v.example || '',
                        'Ghi chú': v.notes || '',
                    });
                });
            }

            if (!allRows.length) { alert('Không có từ vựng nào để xuất.'); return; }

            const headers = Object.keys(allRows[0]);

            if (format === 'csv') {
                // CSV with BOM for Excel UTF-8 compatibility
                const csvContent = '\uFEFF' + headers.join(',') + '\n' + allRows.map(row =>
                    headers.map(h => escapeCsvCell(row[h])).join(',')
                ).join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentPath.name}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                // Excel (XLSX) using simple HTML table approach
                let tableHTML = '<table><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
                allRows.forEach(row => {
                    tableHTML += '<tr>' + headers.map(h => `<td>${escapeHtmlCell(row[h])}</td>`).join('') + '</tr>';
                });
                tableHTML += '</table>';
                const blob = new Blob(
                    [`<html><head><meta charset="utf-8"></head><body>${tableHTML}</body></html>`],
                    { type: 'application/vnd.ms-excel;charset=utf-8;' }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentPath.name}.xls`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            alert('Lỗi xuất file: ' + error.message);
        }
    };

    // Debounce timers for vocab field updates
    const updateTimers = useRef({});

    const handleUpdateVocab = useCallback((id, field, value) => {
        // Update UI immediately
        setVocabularies(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
        // Debounce API call - wait 500ms after last keystroke
        const timerKey = `${id}-${field}`;
        if (updateTimers.current[timerKey]) clearTimeout(updateTimers.current[timerKey]);
        updateTimers.current[timerKey] = setTimeout(async () => {
            try {
                await api.patch(`/api/admin/path-vocabularies/${id}`, { [field]: value });
            } catch (error) {
                console.error(error);
            }
            delete updateTimers.current[timerKey];
        }, 500);
    }, []);

    return (
        <div className="paths-manager">
            {/* BREADCRUMB */}
            <div className="pm-breadcrumb">
                <span className={`breadcrumb-item ${viewMode === 'groups' ? 'active' : ''}`} onClick={goHome}>
                    <i className="fas fa-layer-group"></i> Nhóm
                </span>

                {currentGroup && (
                    <>
                        <i className="fas fa-chevron-right breadcrumb-sep"></i>
                        <span className={`breadcrumb-item ${viewMode === 'paths' ? 'active' : ''}`} onClick={goToGroup}>
                            {currentGroup.name}
                        </span>
                    </>
                )}

                {currentPath && (
                    <>
                        <i className="fas fa-chevron-right breadcrumb-sep"></i>
                        <span className={`breadcrumb-item ${viewMode === 'wordsets' ? 'active' : ''}`} onClick={goToPath}>
                            {currentPath.name}
                        </span>
                    </>
                )}

                {currentWordSet && (
                    <>
                        <i className="fas fa-chevron-right breadcrumb-sep"></i>
                        <span className="breadcrumb-item active">
                            {currentWordSet.name}
                        </span>
                    </>
                )}
            </div>

            {/* CONTENT */}
            <div className="pm-content">
                {/* 1. GROUPS */}
                {viewMode === 'groups' && (
                    <div className="pm-grid">
                        <div className="pm-card add-new" onClick={() => handleOpenModal('group')}>
                            <i className="fas fa-plus-circle"></i>
                            <span>Thêm Nhóm</span>
                        </div>
                        {groups.map(group => (
                            <div key={group.id} className="pm-card" onClick={() => loadPaths(group)}>
                                <div className="pm-card-actions" onClick={e => e.stopPropagation()}>
                                    <button className="btn-card-action" onClick={() => handleOpenModal('group', group)}><i className="fas fa-pen"></i></button>
                                    <button className="btn-card-action danger" onClick={() => handleDelete('group', group.id)}><i className="fas fa-trash"></i></button>
                                </div>
                                <div className="pm-card-icon group"><i className="fas fa-folder"></i></div>
                                <div className="pm-card-info">
                                    <h3>{group.name}</h3>
                                    <p>{group.paths?.length || 0} lộ trình</p>
                                </div>
                            </div>
                        ))}

                        {/* UNGROUPED CARD */}
                        <div className="pm-card" style={{ borderStyle: 'dashed', borderColor: 'var(--text-secondary)' }} onClick={() => loadPaths({ id: 'ungrouped', name: 'Chưa phân nhóm' })}>
                            <div className="pm-card-icon group" style={{ color: 'var(--text-secondary)' }}>
                                <i className="fas fa-question-circle"></i>
                            </div>
                            <div className="pm-card-info">
                                <h3 style={{ color: 'var(--text-secondary)' }}>Chưa phân nhóm</h3>
                                <p>Các lộ trình lẻ</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. PATHS */}
                {viewMode === 'paths' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="pm-order-toolbar">
                            <div>
                                <strong>Thứ tự lộ trình trong nhóm:</strong> kéo thả biểu tượng <i className="fas fa-grip-vertical"></i> để sắp xếp.
                            </div>
                            <div className={`pm-order-status ${savingPathOrder ? 'saving' : ''}`}>
                                {savingPathOrder ? 'Đang lưu thứ tự...' : 'Đã sắp theo displayOrder'}
                            </div>
                        </div>

                        <div className="pm-grid">
                            <div className="pm-card add-new" onClick={() => handleOpenModal('path')}>
                                <i className="fas fa-plus-circle"></i>
                                <span>Thêm Lộ Trình</span>
                            </div>
                            {paths.map(path => (
                                <div
                                    key={path.id}
                                    className={`pm-card pm-path-card ${draggedPathId === path.id ? 'dragging' : ''} ${dragOverPathId === path.id && draggedPathId !== path.id ? 'drag-over' : ''}`}
                                    onClick={() => loadWordSets(path)}
                                    onDragOver={e => handlePathDragOver(e, path.id)}
                                    onDrop={e => handlePathDrop(e, path.id)}
                                >
                                    <div className="pm-card-actions" onClick={e => e.stopPropagation()}>
                                        <div
                                            className="pm-card-drag-handle"
                                            title="Kéo để sắp xếp thứ tự"
                                            draggable
                                            onDragStart={e => handlePathDragStart(e, path.id)}
                                            onDragEnd={handlePathDragEnd}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <i className="fas fa-grip-vertical"></i>
                                        </div>
                                        <button className="btn-card-action" onClick={() => handleOpenModal('path', path)}><i className="fas fa-pen"></i></button>
                                        <button className="btn-card-action danger" onClick={() => handleDelete('path', path.id)}><i className="fas fa-trash"></i></button>
                                    </div>
                                    <div className="pm-card-icon path"><i className="fas fa-map-signs"></i></div>
                                    <div className="pm-card-info">
                                        <h3>{path.name}</h3>
                                        <p>Độ khó: {path.difficulty || 1}/5</p>
                                    </div>
                                    <div className="pm-card-meta">
                                        <span>STT #{(Number(path.displayOrder) || 0) + 1}</span>
                                        <span>{path.wordSetCount || 0} bộ từ</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. WORD SETS */}
                {viewMode === 'wordsets' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                        <div className="pm-order-toolbar">
                            <div>
                                <strong>Thứ tự bộ từ trong lộ trình:</strong> kéo thả biểu tượng <i className="fas fa-grip-vertical"></i> để sắp xếp.
                            </div>
                            <div className={`pm-order-status ${savingWordSetOrder ? 'saving' : ''}`}>
                                {savingWordSetOrder ? 'Đang lưu thứ tự...' : 'Đã sắp theo order'}
                            </div>
                        </div>

                        {/* PATH ACTIONS HEADER */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <div style={{ position: 'relative' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowExportMenu(!showExportMenu)}>
                                    <i className="fas fa-download"></i> Xuất File
                                </button>
                                {showExportMenu && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                                        background: 'white', border: '1px solid #ddd', borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: '140px',
                                        overflow: 'hidden'
                                    }}>
                                        <button
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left' }}
                                            onMouseEnter={e => e.target.style.background = '#f3f4f6'}
                                            onMouseLeave={e => e.target.style.background = 'none'}
                                            onClick={() => handleExportPath('csv')}
                                        >
                                            <i className="fas fa-file-csv" style={{ color: '#16a34a' }}></i> Xuất CSV
                                        </button>
                                        <button
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left' }}
                                            onMouseEnter={e => e.target.style.background = '#f3f4f6'}
                                            onMouseLeave={e => e.target.style.background = 'none'}
                                            onClick={() => handleExportPath('excel')}
                                        >
                                            <i className="fas fa-file-excel" style={{ color: '#16a34a' }}></i> Xuất Excel
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={handleGeneratePathAudio}>
                                <i className="fas fa-music"></i> Sinh Audio Toàn Lộ Trình
                            </button>
                        </div>

                        <div className="pm-grid">
                            <div className="pm-card add-new" onClick={() => handleOpenModal('wordset')}>
                                <i className="fas fa-plus-circle"></i>
                                <span>Thêm Bộ Từ</span>
                            </div>

                            <div className="pm-card add-new" style={{ borderColor: 'var(--success)', color: 'var(--success)', backgroundColor: '#f0fdf4' }} onClick={() => setShowBulkPathModal(true)}>
                                <i className="fas fa-file-excel"></i>
                                <span>Import CSV (Multi)</span>
                            </div>

                            {wordSets.map(ws => (
                                <div
                                    key={ws.id}
                                    className={`pm-card pm-wordset-card ${draggedWordSetId === ws.id ? 'dragging' : ''} ${dragOverWordSetId === ws.id && draggedWordSetId !== ws.id ? 'drag-over' : ''}`}
                                    onClick={() => loadVocabularies(ws)}
                                    onDragOver={e => handleWordSetDragOver(e, ws.id)}
                                    onDrop={e => handleWordSetDrop(e, ws.id)}
                                >
                                    <div className="pm-card-actions" onClick={e => e.stopPropagation()}>
                                        <div
                                            className="pm-card-drag-handle"
                                            title="Kéo để sắp xếp thứ tự"
                                            draggable
                                            onDragStart={e => handleWordSetDragStart(e, ws.id)}
                                            onDragEnd={handleWordSetDragEnd}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <i className="fas fa-grip-vertical"></i>
                                        </div>
                                        <button className="btn-card-action" onClick={() => handleOpenModal('wordset', ws)}><i className="fas fa-pen"></i></button>
                                        <button className="btn-card-action danger" onClick={() => handleDelete('wordset', ws.id)}><i className="fas fa-trash"></i></button>
                                    </div>
                                    <div className="pm-card-icon set"><i className="fas fa-box-open"></i></div>
                                    <div className="pm-card-info">
                                        <h3>{ws.name}</h3>
                                        <p>{ws.description || 'Bộ từ trong lộ trình'}</p>
                                    </div>
                                    <div className="pm-card-meta">
                                        <span>STT #{(Number(ws.order) || 0) + 1}</span>
                                        <span>{ws.vocabularyCount || 0} từ</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. VOCAB VIEW */}
                {viewMode === 'vocab' && (
                    <div className="vocab-panel">
                        <div className="vocab-header">
                            <div>
                                <h3>{currentWordSet.name}</h3>
                                <small>{vocabularies.length} từ vựng</small>
                            </div>
                            <div className="vocab-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowBulkModal(true)}>
                                    <i className="fas fa-file-csv"></i> Nhập CSV
                                </button>
                            </div>
                        </div>
                        <div className="vocab-content">
                            <table className="vocab-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '20%' }}>Từ Vựng (Pronunciation)</th>
                                        <th style={{ width: '10%' }}>Loại Từ (POS)</th>
                                        <th style={{ width: '20%' }}>Nghĩa (Meaning)</th>
                                        <th style={{ width: '20%' }}>Ví Dụ (Example)</th>
                                        <th style={{ width: '20%' }}>Ghi Chú (Notes)</th>
                                        <th style={{ width: '10%' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* QUICK ADD */}
                                    <tr className="tr-quick-add">
                                        <td>
                                            <div className="cell-term-wrapper">
                                                <input id="qa-term" className="input-term-main" placeholder="Nhập từ..."
                                                    value={quickAdd.term} onChange={e => setQuickAdd({ ...quickAdd, term: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleQuickAdd(e)} />
                                                <input className="input-pron-sub" placeholder="/pronunciation/"
                                                    value={quickAdd.pronunciation} onChange={e => setQuickAdd({ ...quickAdd, pronunciation: e.target.value })} />
                                            </div>
                                        </td>
                                        <td>
                                            <input
                                                list="pos-options"
                                                className="input-pos"
                                                placeholder="Loại từ..."
                                                value={quickAdd.partOfSpeech}
                                                onChange={e => setQuickAdd({ ...quickAdd, partOfSpeech: e.target.value })}
                                            />
                                            <datalist id="pos-options">
                                                <option value="noun">Noun</option>
                                                <option value="verb">Verb</option>
                                                <option value="adj">Adj</option>
                                                <option value="adv">Adv</option>
                                                <option value="phrase">Phrase</option>
                                                <option value="prep">Prep</option>
                                                <option value="conj">Conj</option>
                                                <option value="pron">Pron</option>
                                            </datalist>
                                        </td>
                                        <td>
                                            <input className="smart-input" placeholder="Nghĩa..."
                                                value={quickAdd.meaning} onChange={e => setQuickAdd({ ...quickAdd, meaning: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleQuickAdd(e)} />
                                        </td>
                                        <td>
                                            <input className="smart-input" placeholder="Ví dụ..."
                                                value={quickAdd.example} onChange={e => setQuickAdd({ ...quickAdd, example: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleQuickAdd(e)} />
                                        </td>
                                        <td>
                                            <input className="smart-input" placeholder="Ghi chú..."
                                                value={quickAdd.notes} onChange={e => setQuickAdd({ ...quickAdd, notes: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleQuickAdd(e)} />
                                        </td>
                                        <td><button className="btn btn-primary btn-sm" onClick={handleQuickAdd}>Thêm</button></td>
                                    </tr>

                                    {/* LIST */}
                                    {vocabularies.map(v => (
                                        <tr key={v.id}>
                                            <td>
                                                <div className="cell-term-wrapper">
                                                    <input className="input-term-main" value={v.term} onChange={e => handleUpdateVocab(v.id, 'term', e.target.value)} />
                                                    <input className="input-pron-sub" value={v.pronunciation || ''} placeholder="/.../" onChange={e => handleUpdateVocab(v.id, 'pronunciation', e.target.value)} />
                                                </div>
                                            </td>
                                            <td>
                                                <input
                                                    list="pos-options"
                                                    className={`input-pos ${v.partOfSpeech}`}
                                                    value={v.partOfSpeech || ''}
                                                    placeholder="Loại từ..."
                                                    onChange={e => handleUpdateVocab(v.id, 'partOfSpeech', e.target.value)}
                                                />
                                            </td>
                                            <td><textarea rows="2" className="smart-input" style={{ resize: 'none' }} value={v.meaning} onChange={e => handleUpdateVocab(v.id, 'meaning', e.target.value)} /></td>
                                            <td><textarea rows="2" className="smart-input" style={{ resize: 'none' }} value={v.example || ''} onChange={e => handleUpdateVocab(v.id, 'example', e.target.value)} /></td>
                                            <td><textarea rows="2" className="smart-input" style={{ resize: 'none' }} value={v.notes || ''} placeholder="Ghi chú..." onChange={e => handleUpdateVocab(v.id, 'notes', e.target.value)} /></td>
                                            <td>
                                                <div className="cell-actions">
                                                    <button className={`btn-audio ${v.audio ? 'has-audio' : ''}`} onClick={() => handleGenerateAudio(v)} title="Sinh Audio">
                                                        <i className="fas fa-volume-up"></i>
                                                    </button>
                                                    <button className="btn-icon" onClick={() => handleDelete('vocab', v.id)}><i className="fas fa-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* SHARED MODAL */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingItem ? 'Sửa' : 'Thêm'} ITEM</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label>Tên *</label><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required autoFocus /></div>
                                <div className="form-group"><label>Mô tả</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                                {modalType === 'path' && (
                                    <>
                                        <div className="form-group">
                                            <label>Nhóm Lộ Trình</label>
                                            <select
                                                value={formData.groupId || ''}
                                                onChange={e => setFormData({ ...formData, groupId: e.target.value })}
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                                            >
                                                <option value="">-- Chưa phân nhóm --</option>
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Độ khó</label>
                                            <select value={formData.difficulty || 1} onChange={e => setFormData({ ...formData, difficulty: parseInt(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                <option value={1}>⭐ Rất dễ</option>
                                                <option value={2}>⭐⭐ Dễ</option>
                                                <option value={3}>⭐⭐⭐ Trung bình</option>
                                                <option value={4}>⭐⭐⭐⭐ Khó</option>
                                                <option value={5}>⭐⭐⭐⭐⭐ Rất khó</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Thứ tự hiển thị (số nhỏ hiển thị trước)</label>
                                            <input type="number" value={formData.displayOrder || 0} onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })} min="0" />
                                        </div>
                                    </>
                                )}
                                {modalType === 'group' && (
                                    <div className="form-group">
                                        <label>Thứ tự nhóm (số nhỏ hiển thị trước)</label>
                                        <input type="number" value={formData.order || 0} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} min="0" />
                                    </div>
                                )}
                                {modalType === 'wordset' && (
                                    <div className="form-group">
                                        <label>Thứ tự bộ từ (số nhỏ hiển thị trước)</label>
                                        <input type="number" value={formData.order || 0} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} min="0" />
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AUDIO PROGRESS MODAL */}
            {audioProgress.show && (
                <div className="modal-overlay">
                    <div className="modal" style={{ width: '400px' }}>
                        <div className="modal-header">
                            <h3>Đang sinh Audio...</h3>
                        </div>
                        <div className="progress-modal-body">
                            <i className="fas fa-robot fa-spin" style={{ fontSize: '3rem', color: 'var(--primary)' }}></i>
                            <div className="progress-bar-container">
                                <div className="progress-bar-fill" style={{ width: `${(audioProgress.current / audioProgress.total) * 100}%` }}></div>
                            </div>
                            <div className="progress-stats">
                                <span>Generating...</span>
                                <span>{audioProgress.current} / {audioProgress.total}</span>
                            </div>
                            {!audioProgress.generating && (
                                <button className="btn btn-primary" onClick={() => setAudioProgress({ ...audioProgress, show: false })}>Đóng</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* BULK MODALS */}
            {showBulkPathModal && currentPath && (
                <div className="modal-overlay" onClick={() => setShowBulkPathModal(false)}>
                    <div className="modal" style={{ width: '800px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Import CSV: {currentPath.name}</h3><button className="btn-icon" onClick={() => setShowBulkPathModal(false)}><i className="fas fa-times"></i></button></div>
                        <div className="modal-body"><BulkImportPath pathId={currentPath.id} onSuccess={() => { setShowBulkPathModal(false); loadWordSets(currentPath); }} onCancel={() => setShowBulkPathModal(false)} /></div>
                    </div>
                </div>
            )}
            {showBulkModal && currentWordSet && (
                <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
                    <div className="modal" style={{ width: '800px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Import CSV: {currentWordSet.name}</h3><button className="btn-icon" onClick={() => setShowBulkModal(false)}><i className="fas fa-times"></i></button></div>
                        <div className="modal-body"><BulkUpload wordSetId={currentWordSet.id} onSuccess={() => { setShowBulkModal(false); loadVocabularies(currentWordSet); }} onCancel={() => setShowBulkModal(false)} /></div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PathsManager;
