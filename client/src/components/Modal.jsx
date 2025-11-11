import './Modal.css';

export default function Modal({ title, onClose, actions, children, dismissDisabled = false }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-container">
        <header className="modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={dismissDisabled}
          >
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {actions && <footer className="modal-footer">{actions}</footer>}
      </div>
    </div>
  );
}
