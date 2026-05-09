import React from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';

interface ModalAction {
  label: string;
  onClick: () => void;
}

interface ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  type?: 'success' | 'error' | 'info';
  isHtml?: boolean;
  actions?: ModalAction[];
}

const typeClasses = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

const Modal: React.FC<ModalProps> = ({
  isOpen = false,
  onClose = () => undefined,
  title = '알림',
  message = '',
  type = 'info',
  isHtml = false,
  actions = [],
}) => {
  if (!isOpen) return null;

  const titleId = 'modal-title';
  const messageId = 'modal-message';
  const safeMessage = isHtml
    ? message.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
    : message;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onClick={onClose}
    >
      <Card className="w-full max-w-md border-white/80 bg-white shadow-soft" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5">
          <div className="min-w-0">
            <div className={cn('mb-3 w-fit rounded-md border px-2.5 py-1 text-xs font-bold', typeClasses[type])}>
              {type === 'success' ? '성공' : type === 'error' ? '오류' : '안내'}
            </div>
            <CardTitle id={titleId} className="text-lg font-black text-slate-950">
              {title}
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </Button>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <p id={messageId} className="whitespace-pre-line text-sm leading-6 text-slate-700">
            {safeMessage}
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 p-5 pt-0">
          {actions.map((action) => (
            <Button key={action.label} variant="outline" onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
          <Button onClick={onClose}>확인</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Modal;
