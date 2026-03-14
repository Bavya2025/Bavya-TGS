import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Loader2 } from 'lucide-react';

const SearchableSelect = ({ 
    options, 
    value, 
    onChange, 
    placeholder = "Select an option...", 
    noDataMessage = "No data found",
    className = "",
    disabled = false,
    loading = false,
    error = null
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Find the current label for the value
    const selectedOption = options.find(opt => {
        const optValue = typeof opt === 'object' ? opt.value : opt;
        return String(optValue) === String(value);
    });
    
    const displayValue = selectedOption ? 
        (typeof selectedOption === 'object' ? selectedOption.label : selectedOption) 
        : "";

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
        const label = typeof opt === 'object' ? opt.label : opt;
        return String(label).toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleSelect = (option) => {
        const optValue = typeof option === 'object' ? option.value : option;
        onChange(optValue);
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
        <div className={`searchable-select-container ${className}`} ref={wrapperRef}>
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
                <div className="searchable-select-dropdown">
                    <div className="searchable-select-search-container">
                        <Search size={14} className="professional-input-icon select-search-icon" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="searchable-select-input"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                        {searchTerm && (
                            <X 
                                size={14} 
                                className="clear-icon" 
                                style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchTerm("");
                                }} 
                            />
                        )}
                    </div>
                    
                    <div className="searchable-select-list no-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, index) => {
                                const optValue = typeof opt === 'object' ? opt.value : opt;
                                const optLabel = typeof opt === 'object' ? opt.label : opt;
                                return (
                                    <button
                                        key={`${optValue}-${index}`}
                                        type="button"
                                        className={`searchable-select-item ${String(optValue) === String(value) ? 'selected' : ''}`}
                                        onClick={() => handleSelect(opt)}
                                    >
                                        {optLabel}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="searchable-select-empty">{noDataMessage}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;