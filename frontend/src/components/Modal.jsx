import { useState, useEffect, useRef } from 'react';

/**
 * Accessible modal dialog requiring user input before confirming.
 * The confirm button is disabled until the reason text is non-empty.
 */
export default function ReasonModal({
  isOpen,
  title,
  description,
  placeholder = 'Enter reason...',
  confirmText = 'Confirm',
  confirmVariant = 'primary', // 'primary' | 'danger' | 'success'
  loading = false,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim() || loading) return;
    onConfirm(reason.trim());
  };

  const isConfirmDisabled = !reason.trim() || loading;

  const btnClass = confirmVariant === 'danger'
    ? 'btn btn-danger'
    : confirmVariant === 'success'
    ? 'btn btn-success'
    : 'btn btn-primary';

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        {description && <p className="modal-desc">{description}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ margin: '1rem 0' }}>
            <label className="form-label">
              Reason <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              ref={inputRef}
              className="form-input"
              rows={3}
              placeholder={placeholder}
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={btnClass}
              disabled={isConfirmDisabled}
            >
              {loading ? 'Processing…' : confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
