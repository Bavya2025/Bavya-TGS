import React, { useEffect } from 'react';
import { X, ZoomIn, Download } from 'lucide-react';

const ImageModal = ({ isOpen, onClose, imageUrl, title = 'Image Preview' }) => {
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

    if (!isOpen || !imageUrl) return null;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `receipt_${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="image-modal-overlay" onClick={onClose}>
            <div className="image-modal-container scale-up" onClick={e => e.stopPropagation()}>
                <div className="image-modal-header">
                    <div className="header-left">
                        <ZoomIn size={18} className="text-primary" />
                        <h3>{title}</h3>
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn-modal" onClick={handleDownload} title="Download Image">
                            <Download size={18} />
                        </button>
                        <button className="icon-btn-modal close" onClick={onClose} title="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="image-modal-body">
                    <img src={imageUrl} alt={title} className="preview-img-full" />
                </div>
            </div>
        </div>
    );
};

export default ImageModal;
