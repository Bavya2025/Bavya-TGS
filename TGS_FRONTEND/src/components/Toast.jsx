import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, ShieldAlert } from 'lucide-react';

const Toast = ({ id, type = 'info', message, onClose, onConfirm, onCancel, autoClose = true }) => {
    useEffect(() => {
        if (!autoClose || type === 'confirm') return;
        const timer = setTimeout(() => {
            onClose(id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [id, onClose, autoClose, type]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={20} />;
            case 'warning': return <AlertTriangle size={20} />;
            case 'error': return <AlertCircle size={20} />;
            case 'confirm': return <ShieldAlert size={24} />;
            default: return <Info size={20} />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
            case 'warning': return 'bg-amber-50 text-amber-800 border-amber-200';
            case 'error': return 'bg-red-50 text-red-800 border-red-200';
            default: return 'bg-blue-50 text-blue-800 border-blue-200';
        }
    };

    // Render confirm as a centered modal overlay
    if (type === 'confirm') {
        return (
            <div
                className="toast-confirm-overlay"
                onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
            >
                <div className="toast-confirm-dialog animate-scale-in">
                    <div className="toast-confirm-icon-wrap">
                        <ShieldAlert size={32} className="toast-confirm-icon" />
                    </div>
                    <div className="toast-confirm-body">
                        <h3 className="toast-confirm-title">Confirm Action</h3>
                        <p className="toast-confirm-message">{message}</p>
                    </div>
                    <div className="toast-confirm-actions">
                        <button className="toast-btn-action cancel" onClick={onCancel}>
                            Cancel
                        </button>
                        <button className="toast-btn-action confirm" onClick={onConfirm}>
                            Yes, Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`toast-item animate-slide-in ${getStyles()}`}>
            <div className={`toast-icon ${type}`}>{getIcon()}</div>
            <div className="toast-content">
                <p>{message}</p>
            </div>
            <button onClick={() => onClose(id)} className="toast-close">
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
