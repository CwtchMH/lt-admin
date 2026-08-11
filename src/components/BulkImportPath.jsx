import { useState, useRef } from 'react';
import api from '../services/api';
import { parseCSV } from '../utils/csvParser';
import './BulkUpload.css';

const BulkImportPath = ({ pathId, onSuccess, onCancel }) => {
    const [groupedData, setGroupedData] = useState(null); // { SetName: [items...] }
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError('');
        setGroupedData(null);

        // Verify CSV
        if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
            setError("Vui lòng chọn file .csv");
            return;
        }

        try {
            const text = await file.text();
            const rows = parseCSV(text);

            if (rows.length < 1) {
                setError('File trống.');
                return;
            }

            // Detect Headers roughly to find indexes
            let headerRow = rows[0].map(c => c.toLowerCase());

            // Allow user to omit headers, but try to detect if first row is header
            const hasHeader = headerRow.some(h => h.includes('set') || h.includes('bộ') || h.includes('word'));
            const dataRows = hasHeader ? rows.slice(1) : rows;

            // Map columns (Default: Set, Word, Pron, Meaning, POS, Ex, Notes)
            // 0, 1, 2, 3, 4, 5, 6

            const groups = {};
            let count = 0;

            for (let row of dataRows) {
                if (row.length < 3) continue; // Skip invalid rows
                const setName = row[0] || 'Unknown Set';
                const term = row[1];
                const meaning = row[3]; // Approx index 3

                if (!term) continue;

                if (!groups[setName]) groups[setName] = [];
                groups[setName].push({
                    term,
                    pronunciation: row[2] || '',
                    meaning: meaning || '',
                    partOfSpeech: row[4] || '',
                    example: row[5] || '',
                    notes: row[6] || ''
                });
                count++;
            }

            if (count === 0) {
                setError('Không tìm thấy dữ liệu hợp lệ. File CSV phải có dạng: Bộ từ, Word, Pronunciation, Meaning, POS, Example, Notes');
                return;
            }

            setGroupedData({ groups, count });

        } catch (err) {
            setError('Lỗi đọc file: ' + err.message);
        }
    };

    const handleImport = async () => {
        if (!groupedData) return;
        setLoading(true);
        setError('');

        const sets = Object.entries(groupedData.groups);
        let completed = 0;
        let errors = [];

        try {
            for (const [setName, items] of sets) {
                setProgress(`Đang nhập bộ: "${setName}"(${items.length} từ)...`);
                try {
                    // 1. Create Word Set
                    const setRes = await api.post(`/api/admin/paths/${pathId}/word-sets`, {
                        name: setName,
                        description: 'Imported via CSV'
                    });

                    const newSet = setRes.data || setRes;
                    if (!newSet || !newSet.id) throw new Error(`Could not create set ${setName}`);

                    // 2. Bulk Add Vocabs
                    await api.post(`/api/admin/word-sets/${newSet.id}/vocabularies/bulk`, { items });

                    completed++;
                } catch (e) {
                    console.error(e);
                    errors.push(`${setName}: ${e.message}`);
                }
            }

            if (errors.length > 0) {
                alert(`Hoàn thành ${completed}/${sets.length} bộ. Lỗi:\n` + errors.join('\n'));
            } else {
                alert(`Thành công! Đã thêm ${sets.length} bộ từ và ${groupedData.count} từ vựng.`);
            }
            onSuccess?.();

        } catch (err) {
            setError('Lỗi hệ thống: ' + err.message);
        } finally {
            setLoading(false);
            setProgress('');
        }
    };

    return (
        <div className="bulk-upload-section">
            <p className="hint">
                File <strong>.csv</strong> encoding UTF-8. <br />
                Thứ tự cột: <strong>Bộ từ, Word, Pronunciation, Meaning, POS, Example, Notes</strong>
            </p>

            <div className="file-input-row" style={{ marginBottom: '1rem' }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={loading}
                />
            </div>

            {loading && (
                <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--primary)' }}>
                    <i className="fas fa-spinner fa-spin"></i> {progress}
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {groupedData && !loading && (
                <div className="bulk-preview">
                    <h5>Xem trước: {Object.keys(groupedData.groups).length} bộ từ - {groupedData.count} từ vựng</h5>

                    <div className="preview-table-wrapper">
                        <table className="preview-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Bộ Từ</th>
                                    <th>Word</th>
                                    <th>Pronunciation</th>
                                    <th>Meaning</th>
                                    <th>POS</th>
                                    <th>Example</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(groupedData.groups).map(([setName, items]) => (
                                    items.map((item, idx) => (
                                        <tr key={`${setName}-${idx}`}>
                                            {/* Show Set Name only on first row of group for clarity? Or every row. Let's do every row for safety. */}
                                            <td><strong>{setName}</strong></td>
                                            <td>{item.term}</td>
                                            <td>{item.pronunciation}</td>
                                            <td>{item.meaning}</td>
                                            <td>{item.partOfSpeech}</td>
                                            <td>{item.example}</td>
                                            <td>{item.notes}</td>
                                        </tr>
                                    ))
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="form-actions">
                        <button className="btn btn-primary" onClick={handleImport}>
                            <i className="fas fa-file-import"></i> Bắt đầu Import
                        </button>
                        <button className="btn btn-secondary" onClick={onCancel}>Hủy</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkImportPath;
