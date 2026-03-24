/**
 * Formats a number in Indian style (en-IN) with 2 decimal places.
 * Example: 1200000 -> 12,00,000.00
 */
export const formatIndianCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount) || amount === '') return '0.00';
    
    // Ensure it's a number
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
    
    if (isNaN(num)) return '0.00';

    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
};
