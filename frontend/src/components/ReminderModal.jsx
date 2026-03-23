import React, { useState } from 'react';
import { X, Bell, Calendar, Tag, FileText } from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';



const ReminderModal = ({ isOpen, onClose, tripId, defaultTitle, defaultCategory, onUpdate }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: defaultTitle || '',
    message: '',
    remind_at: '',
    category: defaultCategory || 'other',
    trip: tripId || null
  });

  const CATEGORIES = [
    { value: 'trip_start', label: 'Trip Starting' },
    { value: 'advance_request', label: 'Advance Request' },
    { value: 'expense_entry', label: 'Expense Entry' },
    { value: 'claim_submission', label: 'Claim Submission' },
    { value: 'other', label: 'Other' }
  ];

  React.useEffect(() => {
    if (isOpen && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('Notification permission status:', permission);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.remind_at) {
      showToast('Please select a reminder time', 'warning');
      return;
    }

    if (Notification.permission === 'denied') {
        showToast('Notifications are blocked! Please enable them in browser settings to receive alerts outside the app.', 'warning');
    } else if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }

    setLoading(true);
    try {
      await api.post('/api/notifications/reminders/', formData);
      showToast('Reminder set successfully!', 'success');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error setting reminder:', error);
      const errorData = error.response?.data;
      let errorMessage = 'Failed to set reminder. Please check your data.';
      
      if (errorData) {
          if (errorData.non_field_errors) {
              errorMessage = errorData.non_field_errors[0];
          } else if (typeof errorData === 'object') {
              // Get the first error from any field
              const firstKey = Object.keys(errorData)[0];
              const firstError = errorData[firstKey];
              errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
          }
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reminder-modal-overlay">
      <div className="reminder-modal-container">
        <div className="reminder-modal-header">
          <div className="header-title">
            <Bell size={20} className="header-icon ringing" />
            <div className="title-group">
              <h3>Set Trip Reminder</h3>
              <span className="trip-id-indicator">{tripId}</span>
            </div>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="reminder-form">
          <div className="form-group">
            <label><Tag size={16} /> Category</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              required
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label><FileText size={16} /> Title</label>
            <input 
              type="text"
              value={formData.title}
              readOnly
              placeholder="e.g., Start Trip at 9 AM"
              required
              className="bg-slate-50 cursor-not-allowed"
              style={{ background: '#f8fafc', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label><FileText size={16} /> Message</label>
            <textarea 
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="Additional details for the reminder..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label><Calendar size={16} /> Set Date & Time</label>
            <input 
              type="datetime-local"
              value={formData.remind_at}
              onChange={(e) => setFormData({...formData, remind_at: e.target.value})}
              required
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={loading} style={{ background: 'var(--primary)', color: 'white', border: 'none' }}>
              {loading ? 'Setting...' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReminderModal;
