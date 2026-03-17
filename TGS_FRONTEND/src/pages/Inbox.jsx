import React, { useState } from 'react';
import ApprovalInbox from './ApprovalInbox';
import MyRequests from './MyRequests';
import { CheckCircle, Archive } from 'lucide-react';

const Inbox = () => {
    const [view, setView] = useState('approvals');

    return (
        <div className="inbox-module" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="master-page-header" style={{ padding: '24px', paddingBottom: '0', background: '#f8fafc' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Inbox</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage your pending approvals and requests history.</p>
            </div>
            <div className="inbox-header-tabs" style={{ display: 'flex', gap: '20px', padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <button
                    onClick={() => setView('approvals')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, transition: 'all 0.2s', background: view === 'approvals' ? '#e0e7ff' : 'white', color: view === 'approvals' ? '#4f46e5' : '#64748b', border: view === 'approvals' ? '1px solid transparent' : '1px solid #cbd5e1' }}
                >
                    <CheckCircle size={18} />
                    Pending Approvals
                </button>
                <button
                    onClick={() => setView('requests')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, transition: 'all 0.2s', background: view === 'requests' ? '#fce7f3' : 'white', color: view === 'requests' ? '#db2777' : '#64748b', border: view === 'requests' ? '1px solid transparent' : '1px solid #cbd5e1' }}
                >
                    <Archive size={18} />
                    My Requests History
                </button>
            </div>
            <div className="inbox-content" style={{ flex: 1, overflow: 'auto', background: '#f8fafc' }}>
                {view === 'approvals' && <ApprovalInbox enforceTab="pending" />}
                {view === 'requests' && <div style={{ padding: '24px' }}><MyRequests enforceView="historical" /></div>}
            </div>
        </div>
    );
};

export default Inbox;
