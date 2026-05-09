import React from 'react';
import { Send } from 'lucide-react';
import { Button } from './ui/button';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  placeholder: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  placeholder,
}) => {
  return (
    <div className="border-t border-border bg-white p-3">
      <div className="flex items-end gap-2 rounded-lg border border-input bg-background p-2 shadow-sm" role="group" aria-label="메시지 입력 영역">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          aria-label="메시지 입력"
          title="Enter로 전송, Shift+Enter로 줄바꿈"
          rows={1}
          className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button type="button" size="icon" onClick={onSend} aria-label="메시지 전송">
          <Send size={17} />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
