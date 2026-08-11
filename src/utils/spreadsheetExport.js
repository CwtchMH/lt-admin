const FORMULA_TRIGGER_PATTERN = /^[\s]*[=+\-@]/

export function sanitizeSpreadsheetCell(value) {
    if (value === null || value === undefined) {
        return ''
    }

    if (typeof value !== 'string') {
        return value
    }

    if (FORMULA_TRIGGER_PATTERN.test(value)) {
        return `'${value}`
    }

    return value
}

export function escapeCsvCell(value) {
    const sanitized = sanitizeSpreadsheetCell(value)

    if (typeof sanitized === 'number' || typeof sanitized === 'bigint') {
        return String(sanitized)
    }

    if (typeof sanitized === 'boolean') {
        return sanitized ? 'true' : 'false'
    }

    return `"${String(sanitized ?? '').replace(/"/g, '""')}"`
}

export function escapeHtmlCell(value) {
    return String(sanitizeSpreadsheetCell(value) ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}
