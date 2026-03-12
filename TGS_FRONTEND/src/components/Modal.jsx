import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, type = 'info', actions, size = 'md' }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={24} className="text-success" />;
            case 'warning':
                return <AlertTriangle size={24} className="text-warning" />;
            case 'error':
                return <X size={24} className="text-danger" />;
            default:
                return <Info size={24} className="text-info" />;
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-container premium-card animate-scale-in ${size === 'lg' ? 'modal-lg' : ''} ${size === 'xl' ? 'modal-xl' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-row">
                        {getIcon()}
                        <h3>{title}</h3>
                    </div>
                </div>
                
                <div className="modal-body">
                    {children}
                </div>

                <div className="modal-actions">
                    {actions ? actions : (
                        <button className="btn-primary" onClick={onClose}>Close</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;
