<<<<<<< HEAD
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
=======
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Loader2 } from 'lucide-react';

const getPillStyles = (type) => {
    const t = (type || '').toUpperCase();
    switch (t) {
        case 'METRO': return { background: '#ef4444', color: '#ffffff' }; // Bright red
        case 'CITY': return { background: '#3b82f6', color: '#ffffff' }; // Blue
        case 'TOWN': return { background: '#10b981', color: '#ffffff' }; // Emerald
        case 'VILLAGE': return { background: '#f59e0b', color: '#ffffff' }; // Amber
        default: return { background: '#94a3b8', color: '#ffffff' }; // Slate
    }
};

const SearchableSelect = ({ 
    options = [], 
    value, 
    onChange, 
    placeholder = "Select an option...", 
    noDataMessage = "No data found",
    className = "",
    disabled = false,
    loading = false,
    error = null,
    style = {},
    searchByCodeOnly = false,
    emptyMessage = "",
    hideCodeBadge = false // New prop to hide redundant badge
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Find the current label for the value
    const selectedOption = options.find(opt => {
        if (typeof opt === 'object' && opt !== null) {
            const optValue = opt.value !== undefined ? opt.value : (opt.id || opt.name);
            const currentVal = typeof value === 'object' && value !== null ? (value.value || value.id || value.name) : value;
            return String(optValue) === String(currentVal);
        }
        return String(opt) === String(value);
    });
    
    const displayValue = selectedOption ? 
        (typeof selectedOption === 'object' ? (selectedOption.label || selectedOption.name || selectedOption.id) : selectedOption) 
        : (typeof value === 'object' && value !== null ? (value.label || value.name || value.id) : value);

    // Reset search term when modal closes
    useEffect(() => {
        if (!isOpen) setSearchTerm("");
    }, [isOpen]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => {
        const label = typeof opt === 'object' ? (opt.label || opt.name || opt.id) : opt;
        const code = typeof opt === 'object' ? (opt.code || opt.location_code || opt.external_id || "") : "";
        const search = searchTerm.toLowerCase();
        
        if (searchByCodeOnly) {
            return String(code).toLowerCase().includes(search);
        }
        
        return String(label).toLowerCase().includes(search) || String(code).toLowerCase().includes(search);
    });

    const handleSelect = (option) => {
        // If the original implementation passed the whole object, we should too if needed
        // but to keep it simple and compatible, we'll try to detect what the component expects
        // or just pass the option as is if it's an object
        onChange(option);
        setIsOpen(false);
        setSearchTerm("");
    };

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
                // Focus the input when opening
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        }
    };

    return (
        <div className={`searchable-select-container ${className} ${isOpen ? 'is-open' : ''}`} ref={wrapperRef} style={style}>
            <button
                type="button"
                className={`searchable-select-trigger ${isOpen ? 'active' : ''} ${error ? 'error' : ''}`}
                onClick={handleToggle}
                disabled={disabled}
            >
                <div className="select-trigger-inner">
                    {loading && <Loader2 size={12} className="animate-spin text-primary" />}
                    <span className="select-trigger-selected">
                        {displayValue || placeholder}
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                    </span>
                </div>
                <ChevronDown size={14} className={`select-arrow ${isOpen ? 'rotated' : ''}`} />
            </button>

            {isOpen && (
<<<<<<< HEAD
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
=======
                <div className="searchable-select-dropdown" style={{ 
                    position: 'absolute', 
                    top: 'calc(100% + 4px)', 
                    left: 0, 
                    width: '100%', 
                    maxHeight: '320px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden',
                    zIndex: 99999,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                }}>
                    <div className="searchable-select-search-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid #f1f5f9', background: '#ffffff', flexShrink: 0 }}>
                        <Search size={14} style={{ color: '#94a3b8', flexShrink: 0, marginRight: '0.625rem' }} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="searchable-select-input"
                            onClick={(e) => e.stopPropagation()}
                            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', padding: 0 }}
                        />
                        {searchTerm && (
                            <X 
                                size={14} 
                                style={{ cursor: 'pointer', color: '#94a3b8', flexShrink: 0, marginLeft: '0.625rem' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchTerm("");
                                }} 
                            />
                        )}
                    </div>
                    
                    <div className="searchable-select-list no-scrollbar" style={{ overflowY: 'auto', flex: 1, maxHeight: '260px', background: '#ffffff' }}>
                        {/* Support "Select All" or placeholder option if helpful, but mostly leave to Parent */}
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, index) => {
                                const optValue = typeof opt === 'object' && opt !== null ? (opt.value !== undefined ? opt.value : (opt.id || opt.name)) : opt;
                                const optLabel = typeof opt === 'object' && opt !== null ? (opt.label || opt.name || opt.id) : opt;
                                const optCode = typeof opt === 'object' && opt !== null ? (opt.code || opt.location_code || opt.external_id) : null;
                                
                                const currentVal = typeof value === 'object' && value !== null ? (value.value || value.id || value.name) : value;
                                const isSelected = String(optValue) === String(currentVal);
                                const isAllOption = String(optLabel).toLowerCase().includes('all') || optValue === '' || optValue === null;
                                
                                return (
                                    <button
                                        key={`${optValue}-${index}`}
                                        type="button"
                                        className={`searchable-select-item ${isSelected ? 'selected' : ''} ${isAllOption ? 'all-option' : ''}`}
                                        onClick={() => handleSelect(opt)}
                                        style={isSelected && isAllOption ? { background: 'rgba(187, 6, 51, 0.05)', color: 'var(--primary)', fontWeight: 600 } : {}}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center">
                                                <span className="font-bold">{optLabel}</span>
                                                {typeof opt === 'object' && opt.cluster_type && (
                                                    <span style={{ 
                                                        marginLeft: '1.5rem', 
                                                        fontSize: '10px', 
                                                        fontWeight: 900, 
                                                        padding: '2px 8px', 
                                                        borderRadius: '6px',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        ...getPillStyles(opt.cluster_type)
                                                    }}>
                                                        {opt.cluster_type}
                                                    </span>
                                                )}
                                            </div>
                                            {!hideCodeBadge && optCode && (
                                                <span style={{ fontSize: '10px', opacity: 0.6, padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', fontWeight: 700 }}>
                                                    {optCode}
                                                </span>
                                            )}
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
<<<<<<< HEAD
                            <div className="searchable-select-empty">
                                {emptyMessage || `No ${placeholder.toLowerCase()}s found`}
=======
                            <div className="searchable-select-empty" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>
                                {emptyMessage || noDataMessage}
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;