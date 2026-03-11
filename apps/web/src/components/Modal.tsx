import React from 'react';
import './Modal.css';

interface ModalAction {
  label: string;
  onClick: () => void;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  isHtml?: boolean;
  actions?: ModalAction[];
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, message, type = 'info', isHtml = false, actions = [] }) => {
  if (!isOpen) return null;

  const titleId = 'modal-title';
  const messageId = 'modal-message';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header ${type}`}>
          <h3 id={titleId} className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {isHtml ? (
            <div id={messageId} className="modal-message" dangerouslySetInnerHTML={{ __html: message }} />
          ) : (
            <p id={messageId} className="modal-message">{message}</p>
          )}
        </div>
        <div className="modal-footer">
          {actions.map((a, idx) => (
            <button key={idx} className="modal-button" onClick={a.onClick}>
              {a.label}
            </button>
          ))}
          <button className="modal-button" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal; 