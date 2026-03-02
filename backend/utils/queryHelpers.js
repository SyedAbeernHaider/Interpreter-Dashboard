/**
 * Get PKT (UTC+5) date string in YYYY-MM-DD format.
 * The database stores timestamps in PKT (as-is), so we
 * calculate PKT date boundaries in JS and use them directly.
 */
function getPKTDate(daysOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    // Use local date components (server is in PKT)
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getDateFilter(filter, column = 'created_at') {
    if (filter === 'today') {
        const today = getPKTDate(0);
        const tomorrow = getPKTDate(1);
        return `AND ${column} >= '${today} 00:00:00' AND ${column} < '${tomorrow} 00:00:00'`;
    } else if (filter === 'yesterday') {
        const yesterday = getPKTDate(-1);
        const today = getPKTDate(0);
        return `AND ${column} >= '${yesterday} 00:00:00' AND ${column} < '${today} 00:00:00'`;
    } else if (filter === '1week') {
        const weekAgo = getPKTDate(-7);
        return `AND ${column} >= '${weekAgo} 00:00:00'`;
    } else if (filter === '1month') {
        const monthAgo = getPKTDate(-30);
        return `AND ${column} >= '${monthAgo} 00:00:00'`;
    }
    return '';
}

function getPagination(page = 1, limit = 20) {
    const p = Math.max(1, parseInt(page));
    const l = Math.max(1, parseInt(limit));
    const offset = (p - 1) * l;
    return { limit: l, offset, page: p };
}

module.exports = { getDateFilter, getPagination, getPKTDate };
