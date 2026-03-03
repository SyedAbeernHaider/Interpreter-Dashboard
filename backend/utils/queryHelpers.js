/**
 * Get PKT (UTC+5) date string in YYYY-MM-DD format.
 * The database stores timestamps in PKT (as-is), so we
 * calculate PKT date boundaries in JS and use them directly.
 */
function getPKTDate(daysOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    // Explicitly format in Asia/Karachi timezone regardless of server timezone
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d);
    return parts; // returns YYYY-MM-DD
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
    } else if (filter && filter.startsWith('custom_')) {
        const parts = filter.split('_');
        if (parts.length === 3) {
            let start = parts[1];
            let end = parts[2];
            // Format for MySQL: replace 'T' with space if it's a datetime-local string
            start = start.replace('T', ' ');
            end = end.replace('T', ' ');

            // If only date was provided (10 chars), add time boundaries
            if (start.length === 10) start += ' 00:00:00';
            if (end.length === 10) end += ' 23:59:59';

            // If time was provided but no seconds (16 chars like YYYY-MM-DD HH:mm), add seconds
            if (start.length === 16) start += ':00';
            if (end.length === 16) end += ':59';

            return `AND ${column} >= '${start}' AND ${column} <= '${end}'`;
        }
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
