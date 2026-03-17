import React, { useState, useEffect } from 'react';
import { IndianRupee } from 'lucide-react';

/**
 * A premium input component for Indian Currency.
 * Formats values with commas and ensures the Rupee symbol is inside.
 */
const IndianCurrencyInput = ({ value, onChange, placeholder, disabled, className = "" }) => {
    // We maintain a local string value for the input to handle typing
    const [localValue, setLocalValue] = useState('');

    useEffect(() => {
        // Sync with external value if it changes
        if (value === undefined || value === null || value === '' || value === 0) {
            if (value === 0 && localValue !== '') {
                // If it's 0 and we have a local value (like "0." or ""), don't overwrite yet
            } else if (value === 0 && localValue === '') {
                setLocalValue('0');
            } else if (value === '') {
                setLocalValue('');
            }
            return;
        }
        
        const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
        if (!isNaN(numValue)) {
            // Check if we already have a formatted version that matches the value
            const currentRaw = parseFloat(localValue.replace(/,/g, ''));
            if (currentRaw !== numValue) {
                const formatted = new Intl.NumberFormat('en-IN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }).format(numValue);
                setLocalValue(formatted);
            }
        }
    }, [value]);

    const handleChange = (e) => {
        // Remove everything except numbers and dots
        let val = e.target.value.replace(/[^0-9.]/g, '');
        
        // Prevent multiple decimals
        if ((val.match(/\./g) || []).length > 1) return;

        // Allow typing (don't force formatting while active to avoid cursor jumps)
        setLocalValue(val);
        
        const rawNum = val === '' ? 0 : parseFloat(val);
        onChange(rawNum);
    };

    const handleBlur = () => {
        // Pretty format on blur
        if (localValue === '') return;
        const num = parseFloat(localValue.replace(/,/g, ''));
        if (!isNaN(num)) {
            const formatted = new Intl.NumberFormat('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num);
            setLocalValue(formatted);
        }
    };

    return (
        <div className={`currency-input-wrapper group ${className}`}>
            <div className="currency-symbol-container">
                <IndianRupee size={16} />
            </div>
            <input
                type="text"
                disabled={disabled}
                placeholder={placeholder || "0.00"}
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                className="premium-select-input"
            />
        </div>
    );
};

export default IndianCurrencyInput;
