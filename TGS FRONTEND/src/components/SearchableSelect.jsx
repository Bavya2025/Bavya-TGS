import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, RefreshCw, AlertCircle } from 'lucide-react';

const SearchableSelect = ({ options, value, onChange, placeholder, loading, error, disabled, style, searchByCodeOnly, emptyMessage }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = (options || []).filter(opt => {
        const optName = typeof opt === 'string' ? opt : (opt.name || opt.id || '');
        const optCode = typeof opt === 'object' && opt !== null ? (opt.code || opt.location_code || opt.external_id || '') : '';
        const searchStr = search.toLowerCase();

        if (searchByCodeOnly) {
            return String(optCode).toLowerCase().includes(searchStr);
        }

        return String(optName).toLowerCase().includes(searchStr) || String(optCode).toLowerCase().includes(searchStr);
    });

    const handleSelect = (selectedOpt) => {
        onChange(selectedOpt);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="searchable-select-container" ref={dropdownRef} style={style}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`searchable-select-trigger ${isOpen ? 'active' : ''} ${error ? 'error' : ''}`}
            >
                <div className="select-trigger-inner">
                    {loading && <RefreshCw size={12} className="animate-spin text-primary" />}
                    <span className="select-trigger-selected">
                        {typeof value === 'object' && value !== null
                            ? (
                                <div className="select-trigger-selected">
                                    {(value.code || value.location_code || value.external_id) && (
                                        <span className="select-code-badge select-trigger-badge">
                                            {value.code || value.location_code || value.external_id}
                                        </span>
                                    )}
                                    <span>{value.name || value.id}</span>
                                </div>
                            )
                            : (value || placeholder)}
                    </span>
                </div>
                <ChevronDown size={14} className={`select-arrow ${isOpen ? 'rotated' : ''}`} />
            </button>

            {isOpen && (
                <div className="searchable-select-dropdown">
                    <div className="searchable-select-search-container">
                        <Search size={14} className="professional-input-icon select-search-icon" />
                        <input
                            autoFocus
                            type="text"
                            placeholder={`Search ${placeholder}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="searchable-select-input"
                        />
                    </div>

                    <div className="searchable-select-list no-scrollbar">
                        <button
                            type="button"
                            onClick={() => handleSelect('')}
                            className={`searchable-select-item ${!value ? 'all-option' : ''}`}
                        >
                            {placeholder === 'Continent' ? 'Select Continent' : `All ${placeholder}s`}
                        </button>

                        {loading ? (
                            <div className="searchable-select-status">
                                <RefreshCw size={14} className="animate-spin" />
                                <span>Loading data...</span>
                            </div>
                        ) : error ? (
                            <div className="searchable-select-status text-red-500">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        ) : filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const optName = typeof opt === 'string' ? opt : (opt.name || opt.id || '');
                                return (
                                    <button
                                        key={opt.id || idx}
                                        type="button"
                                        onClick={() => handleSelect(opt)}
                                        className={`searchable-select-item ${value === optName ? 'selected' : ''}`}
                                    >
                                        <div className="select-item-inner">
                                            {(opt.code || opt.location_code || opt.external_id) && (
                                                <span className="select-code-badge">
                                                    {opt.code || opt.location_code || opt.external_id}
                                                </span>
                                            )}
                                            <span className="select-name-text">
                                                {optName.startsWith(opt.code || opt.location_code || opt.external_id || 'NEVER_MATCH')
                                                    ? optName.replace(opt.code || opt.location_code || opt.external_id, '').trim()
                                                    : optName}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="searchable-select-empty">
                                {emptyMessage || `No ${placeholder.toLowerCase()}s found`}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;