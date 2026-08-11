/**
 * RFC 4180-compliant CSV parser
 * Handles: quoted fields with commas, escaped quotes (""), newlines in quotes, BOM
 */
export function parseCSV(text) {
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }

    const rows = [];
    let i = 0;
    const len = text.length;

    while (i < len) {
        const row = [];
        // Parse each field in the row
        while (i < len) {
            let value = '';

            // Skip leading whitespace (but not newlines)
            while (i < len && (text[i] === ' ' || text[i] === '\t')) i++;

            if (i >= len) break;

            // Check for newline (end of row)
            if (text[i] === '\n') {
                i++;
                break;
            }
            if (text[i] === '\r') {
                i++;
                if (i < len && text[i] === '\n') i++;
                break;
            }

            if (text[i] === '"') {
                // Quoted field — read until closing quote
                i++; // skip opening quote
                while (i < len) {
                    if (text[i] === '"') {
                        if (i + 1 < len && text[i + 1] === '"') {
                            // Escaped quote ""
                            value += '"';
                            i += 2;
                        } else {
                            // Closing quote
                            i++; // skip closing quote
                            break;
                        }
                    } else {
                        value += text[i];
                        i++;
                    }
                }
                // Skip to comma or end of line
                while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
                    i++;
                }
            } else {
                // Unquoted field — read until comma or newline
                while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
                    value += text[i];
                    i++;
                }
                value = value.trim();
            }

            row.push(value);

            // If we hit a comma, move past it and continue parsing fields
            if (i < len && text[i] === ',') {
                i++;
                // If comma is at end of line, add empty field
                if (i >= len || text[i] === '\n' || text[i] === '\r') {
                    row.push('');
                }
            } else {
                // End of line or end of text — skip newline chars
                if (i < len && text[i] === '\r') i++;
                if (i < len && text[i] === '\n') i++;
                break;
            }
        }

        // Only add non-empty rows
        if (row.length > 0 && row.some(cell => cell !== '')) {
            rows.push(row);
        }
    }

    return rows;
}
