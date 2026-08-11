import { useState, useRef } from 'react';
import api from '../services/api';
import { parseCSV } from '../utils/csvParser';
import './BulkUpload.css';

const BulkUpload = ({ wordSetId, onSuccess, onCancel }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError('');

        if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
            setError("Vui lòng chọn file .csv");
            return;
        }

        try {
            const text = await file.text();
            const rows = parseCSV(text);

            if (rows.length < 1) {
                setError('File trống');
                return;
            }

            let hasHeader = false;
            let colMap = { word: 1, pronunciation: 2, meaning: 3, pos: 4, example: 5, notes: 6 };

            if (rows[0].length > 0) {
                const firstRow = rows[0].map(cell => cell.toLowerCase().trim());
                hasHeader = firstRow.some(cell =>
                    cell.includes('word') ||
                    cell.includes('pronunciation') ||
                    cell.includes('meaning') ||
                    cell.includes('pos') ||
                    cell.includes('bộ')
                );

                if (hasHeader) {
                    firstRow.forEach((header, index) => {
                        if (header === 'word' || header.includes('word')) colMap.word = index;
                        if (header.includes('pronunciation')) colMap.pronunciation = index;
                        if (header.includes('meaning') || header.includes('nghĩa')) colMap.meaning = index;
                        if (header === 'pos' || header.includes('loại')) colMap.pos = index;
                        if (header.includes('example') || header.includes('ví dụ')) colMap.example = index;
                        if (header.includes('note') || header.includes('ghi chú')) colMap.notes = index;
                    });
                } else if (rows[0].length === 6) {
                    colMap = { word: 0, pronunciation: 1, meaning: 2, pos: 3, example: 4, notes: 5 };
                }
            }

            const dataRows = hasHeader ? rows.slice(1) : rows;
            const parsedItems = [];

            for (let row of dataRows) {
                if (row.length < 2) continue;

                const term = row[colMap.word] || '';
                if (!term.trim()) continue;

                parsedItems.push({
                    term: term.trim(),
                    pronunciation: (row[colMap.pronunciation] || '').trim(),
                    meaning: (row[colMap.meaning] || '').trim(),
                    partOfSpeech: (row[colMap.pos] || '').trim(),
                    example: (row[colMap.example] || '').trim(),
                    notes: (row[colMap.notes] || '').trim(),
                });
            }

            if (parsedItems.length === 0) {
                setError('Không thể đọc dữ liệu. CSV Format: Word, Pronunciation, Meaning, POS, Example, Notes');
                return;
            }

            setItems(parsedItems);
            setPreview(true);

        } catch (err) {
            setError('Lỗi: ' + err.message);
        }
    };

    const handleUpload = async () => {
        if (items.length === 0) return;
        setLoading(true);
        setError('');

        try {
            const response = await api.post(`/api/admin/word-sets/${wordSetId}/vocabularies/bulk`, { items });
            if (response?.statusCode === 200 || response?.data) {
                alert(`Đã thêm ${items.length} từ vựng!`);
                setItems([]);
                setPreview(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                onSuccess?.();
            } else {
                setError('Upload thất bại (API Error)');
            }
        } catch (err) {
            setError(err.message || 'Upload thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bulk-upload-section">
            <p className="hint">
                File <strong>.csv</strong> encoding UTF-8. Thứ tự cột:<br />
                <strong>Word, Pronunciation, Meaning, PartOfSpeech, Example, Notes</strong>
            </p>

            <div className="file-input-row">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                />
            </div>

            {error && <div className="error-message">{error}</div>}

            {preview && items.length > 0 && (
                <div className="bulk-preview">
                    <h5>Xem trước ({items.length} từ)</h5>
                    <div className="preview-table-wrapper">
                        <table className="preview-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Word</th>
                                    <th>Pronunciation</th>
                                    <th>Meaning</th>
                                    <th>POS</th>
                                    <th>Example</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{idx + 1}</td>
                                        <td>{item.term}</td>
                                        <td>{item.pronunciation}</td>
                                        <td>{item.meaning}</td>
                                        <td>{item.partOfSpeech}</td>
                                        <td>{item.example}</td>
                                        <td>{item.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="form-actions">
                        <button className="btn btn-primary" onClick={handleUpload} disabled={loading}>
                            {loading ? 'Đang thêm...' : `Thêm ${items.length} từ`}
                        </button>
                        <button className="btn btn-secondary" onClick={onCancel}>
                            Hủy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUpload;
