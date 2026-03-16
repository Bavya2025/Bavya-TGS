import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Loader2 } from 'lucide-react';

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
    emptyMessage = ""
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
                    </span>
                </div>
                <ChevronDown size={14} className={`select-arrow ${isOpen ? 'rotated' : ''}`} />
            </button>

            {isOpen && (
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
                                            <span>{optLabel}</span>
                                            {optCode && (
                                                <span style={{ fontSize: '10px', opacity: 0.6, padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', fontWeight: 700 }}>
                                                    {optCode}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="searchable-select-empty" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>
                                {emptyMessage || noDataMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;