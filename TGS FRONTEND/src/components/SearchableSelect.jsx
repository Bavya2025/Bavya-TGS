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
        <div className={`searchable-select-container ${isOpen ? 'is-open' : ''}`} ref={dropdownRef} style={style}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`searchable-select-trigger ${isOpen ? 'active' : ''} ${error ? 'error' : ''}`}
            >
                <div className="select-trigger-inner">
                    {loading && <RefreshCw size={12} className="animate-spin text-primary" />}
                    <div className="select-trigger-content">
                        {typeof value === 'object' && value !== null ? (
                            <div className="select-trigger-value-group">
                                {value.label || value.name || value.id}
                                {value.cluster_type && (
                                    <span className={`select-type-badge ${value.cluster_type.toLowerCase()}`}>
                                        {value.cluster_type}
                                    </span>
                                )}
                                {(value.code || value.location_code || value.external_id) && (
                                    <span className="select-code-badge">
                                        {value.code || value.location_code || value.external_id}
                                    </span>
                                )}
                            </div>
                        ) : (
                            (() => {
                                if (!value) return <span className="select-placeholder">{placeholder}</span>;
                                const selectedOpt = options?.find(o => 
                                    (typeof o === 'object' ? (o.id || o.value || (o.name === value)) : o) == value
                                );
                                const displayValue = selectedOpt 
                                    ? (typeof selectedOpt === 'object' ? (selectedOpt.label || selectedOpt.name || selectedOpt.id) : selectedOpt)
                                    : value;
                                return <span className="select-value">{displayValue}</span>;
                            })()
                        )}
                    </div>
                </div>
                <ChevronDown size={14} className={`select-arrow ${isOpen ? 'rotated' : ''}`} />
            </button>

            {isOpen && (
                <div className="searchable-select-dropdown glass">
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
                                <RefreshCw size={14} className="animate-spin text-primary" />
                                <span>Loading data...</span>
                            </div>
                        ) : error ? (
                            <div className="searchable-select-status text-red-500">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        ) : filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const optName = typeof opt === 'string' ? opt : (opt.label || opt.name || opt.id || '');
                                const optType = typeof opt === 'object' ? (opt.cluster_type || opt.type || '') : '';
                                const optCode = typeof opt === 'object' ? (opt.code || opt.location_code || opt.external_id || '') : '';
                                const isSelected = (typeof value === 'object' && value !== null) 
                                    ? (value.id === opt.id || value.name === optName)
                                    : (value === (opt.id || opt.value || optName));

                                return (
                                    <button
                                        key={opt.id || idx}
                                        type="button"
                                        onClick={() => handleSelect(opt)}
                                        className={`searchable-select-item ${isSelected ? 'selected' : ''}`}
                                    >
                                        <div className="select-item-inner">
                                            <div className="select-item-main">
                                                <span className="select-name-text">
                                                    {optName}
                                                </span>
                                                {optType && (
                                                    <span className={`select-type-badge ${optType.toLowerCase()}`}>
                                                        {optType}
                                                    </span>
                                                )}
                                            </div>
                                            {optCode && (
                                                <span className="select-code-badge">
                                                    {optCode}
                                                </span>
                                            )}
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
