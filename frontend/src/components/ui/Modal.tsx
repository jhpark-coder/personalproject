import React, { useEffect, useRef } from 'react';
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

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  isHtml = false,
  actions
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      
      // 액션이 없거나 단일 확인 버튼만 있을 때 Enter로 모달 닫기
      if (e.key === 'Enter' && (!actions || actions.length === 0)) {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 모달이 열렸을 때 첫 번째 포커스 가능한 요소로 포커스
      const firstFocusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable) {
        (firstFocusable as HTMLElement).focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, actions]);

  if (!isOpen) return null;

  const titleId = 'modal-title';
  const messageId = 'modal-message';

  return (
    <div 
      className="modal-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby={titleId} 
      aria-describedby={messageId} 
      onClick={onClose}
      ref={modalRef}
    >
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
          {actions && actions.length > 0 ? (
            actions.map((a, idx) => (
              <button key={idx} className="modal-button" onClick={a.onClick}>
                {a.label}
              </button>
            ))
          ) : (
            <button className="modal-button" onClick={onClose}>
              확인
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal; 