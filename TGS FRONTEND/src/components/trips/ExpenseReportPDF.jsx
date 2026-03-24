import React, { forwardRef } from 'react';

const ExpenseReportPDF = forwardRef(({ trip }, ref) => {
    if (!trip) return null;

    const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const extractLocation = (desc) => {
        try {
            if (desc && desc.startsWith('{')) {
                const d = JSON.parse(desc);
                return `${d.origin || ''}${d.origin ? ' \u2192 ' : ''}${d.destination || d.location || d.hotelName || ''}`;
            }
        } catch(e) {}
        return desc;
    };

    return (
        <div 
            ref={ref} 
            style={{ 
                padding: '40px', 
                background: 'white', 
                width: '1000px', // Fixed width for A4 landscape or portrait rendering
                fontFamily: 'Arial, sans-serif',
                color: '#000',
                position: 'absolute',
                top: '-9999px', // Hide from viewport
                left: '-9999px'
            }}
        >
            <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '18px', textTransform: 'uppercase' }}>
                Travel Expenses Statement for the month of {new Date(trip.start_date).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                <tbody>
                    <tr>
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>Employee Name</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{trip.user_name || 'N/A'}</td>
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>Bank Name</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{trip.user_bank_name || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>Employee ID</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{trip.user_emp_id || 'N/A'}</td>
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>Account No.</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{trip.user_account_no || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>Project Name - State</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{trip.project_code || 'General'}</td>
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>IFSC Code</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{trip.user_ifsc_code || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>Trip Source</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{trip.consider_as_local ? (trip.user_base_location || trip.source) : (trip.source || 'N/A')}</td>
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>Team Members</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>
                            {(() => {
                                let members = [];
                                try {
                                    members = typeof trip.members === 'string' ? JSON.parse(trip.members) : (trip.members || []);
                                } catch (e) {
                                    members = Array.isArray(trip.members) ? trip.members : [trip.members];
                                }
                                return Array.isArray(members) ? members.map(m => typeof m === 'object' ? (m.name || m.employee_name) : m).join(', ') : String(trip.members || 'Solo');
                            })()}
                        </td>
                    </tr>
                </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
                <thead>
                    <tr>
                        <th rowSpan="2" style={{ border: '1px solid #000', padding: '4px' }}>Sl. No.</th>
                        <th colSpan="3" style={{ border: '1px solid #000', padding: '4px' }}>Departure</th>
                        <th colSpan="3" style={{ border: '1px solid #000', padding: '4px' }}>Arrival</th>
                        <th rowSpan="2" style={{ border: '1px solid #000', padding: '4px' }}>Mode of Travel</th>
                        <th rowSpan="2" style={{ border: '1px solid #000', padding: '4px' }}>own vehicle (km)</th>
                        <th rowSpan="2" style={{ border: '1px solid #000', padding: '4px' }}>Travel Amount</th>
                        <th colSpan="4" style={{ border: '1px solid #000', padding: '4px' }}>Stay & Food Expenses</th>
                    </tr>
                    <tr>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>Date</th>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>Time</th>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>Place</th>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>Date</th>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>Time</th>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>Place</th>
                        
                        <th style={{ border: '1px solid #000', padding: '4px' }}>Lodging</th>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>Food / DA</th>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>Incidental</th>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {trip.expenses && trip.expenses.length > 0 ? (
                        trip.expenses.map((exp, idx) => (
                            <tr key={idx}>
                                <td style={{ border: '1px solid #000', padding: '4px' }}>{idx + 1}</td>
                                <td style={{ border: '1px solid #000', padding: '4px' }}>{formatDate(exp.date)}</td>
                                <td style={{ border: '1px solid #000', padding: '4px' }}>-</td>
                                <td style={{ border: '1px solid #000', padding: '4px', maxWidth: '80px', wordWrap: 'break-word' }}>
                                    {exp.category === 'Travel' ? trip.source : '-'}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px' }}>{formatDate(exp.date)}</td>
                                <td style={{ border: '1px solid #000', padding: '4px' }}>-</td>
                                <td style={{ border: '1px solid #000', padding: '4px', maxWidth: '80px', wordWrap: 'break-word' }}>
                                    {exp.category === 'Travel' ? trip.destination : extractLocation(exp.description)}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px' }}>
                                    {exp.category === 'Travel' ? trip.travel_mode : exp.category}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px' }}>
                                    {trip.vehicle_type === 'Own' ? trip.distance || '-' : '-'}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                                    {exp.category === 'Travel' || exp.category === 'Fuel' ? formatCurrency(exp.amount) : '-'}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                                    {exp.category === 'Accommodation' ? formatCurrency(exp.amount) : '-'}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                                    {exp.category === 'Food' || exp.category === 'Meals' ? formatCurrency(exp.amount) : '-'}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                                    {exp.category === 'Incidental' || exp.category === 'Other' ? formatCurrency(exp.amount) : '-'}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                                    {formatCurrency(exp.amount)}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="14" style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
                                No expenses recorded.
                            </td>
                        </tr>
                    )}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan="13" style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                            Grand Total
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                            {formatCurrency(trip.total_expenses)}
                        </td>
                    </tr>
                    <tr>
                        <td colSpan="13" style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                            Advance Received
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                            {formatCurrency(trip.total_approved_advance)}
                        </td>
                    </tr>
                    <tr>
                        <td colSpan="13" style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                            Balance Payable / (Recoverable)
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold', color: trip.wallet_balance < 0 ? 'red' : 'green' }}>
                            {formatCurrency(Math.abs(trip.wallet_balance))}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                <div style={{ textAlign: 'center' }}>
                    <p>____________________</p>
                    <p>Signature of Employee</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p>____________________</p>
                    <p>Approved By (Manager)</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p>____________________</p>
                    <p>Accounts Department</p>
                </div>
            </div>
        </div>
    );
});

export default ExpenseReportPDF;
