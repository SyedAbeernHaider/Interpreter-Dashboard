import { useState, useEffect } from 'react';

export function DateFilter({ value, onChange }) {
    const isCustomValue = value && value.startsWith('custom_');
    const [customRange, setCustomRange] = useState({
        start: isCustomValue ? value.split('_')[1] : '',
        end: isCustomValue ? value.split('_')[2] : ''
    });

    useEffect(() => {
        if (isCustomValue) {
            const parts = value.split('_');
            setCustomRange({ start: parts[1], end: parts[2] });
        }
    }, [value, isCustomValue]);

    const filters = [
        { id: 'today', label: 'Today' },
        { id: 'yesterday', label: 'Yesterday' },
        { id: '1week', label: '1 Week' },
        { id: '1month', label: '1 Month' },
        { id: 'all', label: 'All Time' },
        { id: 'custom', label: 'Custom' },
    ];

    const handleFilterClick = (id) => {
        if (id === 'custom') {
            if (customRange.start && customRange.end) {
                onChange(`custom_${customRange.start}_${customRange.end}`);
            } else {
                onChange('custom');
            }
        } else {
            onChange(id);
        }
    };

    const handleDateChange = (fld, val) => {
        const newRange = { ...customRange, [fld]: val };
        setCustomRange(newRange);
        if (newRange.start && newRange.end) {
            onChange(`custom_${newRange.start}_${newRange.end}`);
        }
    };

    return (
        <div className="filter-wrapper">
            <div className="filter-tabs">
                {filters.map(f => (
                    <button
                        key={f.id}
                        className={`filter-tab ${(value === f.id || (f.id === 'custom' && isCustomValue)) ? 'active' : ''}`}
                        onClick={() => handleFilterClick(f.id)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {(value === 'custom' || isCustomValue) && (
                <div className="custom-range-picker fade-in">
                    <div className="date-input-group">
                        <IconCalendar />
                        <input
                            type="datetime-local"
                            className="date-input"
                            value={customRange.start}
                            onChange={(e) => handleDateChange('start', e.target.value)}
                        />
                    </div>
                    <span className="separator">to</span>
                    <div className="date-input-group">
                        <IconCalendar />
                        <input
                            type="datetime-local"
                            className="date-input"
                            value={customRange.end}
                            onChange={(e) => handleDateChange('end', e.target.value)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function IconCalendar() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}
