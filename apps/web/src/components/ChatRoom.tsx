import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, MessagesSquare } from 'lucide-react';
import MessageInput from './MessageInput';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface Message {
  sender: string;
  content: string;
  timestamp: string;
  type: string;
}

interface ChatRoomProps {
  currentUser: string | null;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onBack: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, messages, onSendMessage, onBack }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim() && currentUser) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return '오늘';
    if (date.toDateString() === yesterday.toDateString()) return '어제';
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const groupMessagesByDate = (items: Message[]) => {
    const groups: { [key: string]: Message[] } = {};

    items.forEach((message) => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    });

    return groups;
  };

  if (!currentUser) {
    return (
      <div className="flex h-full min-h-[560px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-muted-foreground">
        <MessagesSquare className="size-11 text-slate-300" strokeWidth={1.8} />
        <p className="text-sm font-medium">채팅을 시작하려면 사용자 목록에서 대상을 선택하세요.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} title="사용자 목록으로 돌아가기">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-950">{currentUser}와의 채팅</h2>
          <p className="text-xs text-muted-foreground">실시간 상담</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <MessageCircle className="size-9 text-slate-300" strokeWidth={1.8} />
            <p className="text-sm font-medium">아직 메시지가 없습니다. 대화를 시작해보세요.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
              <div key={date} className="space-y-3">
                <div className="flex justify-center">
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">{date}</span>
                </div>
                {dateMessages.map((message, index) => {
                  const isAdmin = message.sender === '관리자';
                  return (
                    <div key={`${date}-${index}-${message.timestamp}`} className={cn('flex flex-col gap-1', isAdmin ? 'items-end' : 'items-start')}>
                      <div
                        className={cn(
                          'max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-6 shadow-sm',
                          isAdmin ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-white text-slate-900',
                        )}
                      >
                        {message.content}
                      </div>
                      <div className="px-1 text-[11px] text-muted-foreground">{formatTime(message.timestamp)}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-100 bg-white p-3">
        <MessageInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          placeholder={`${currentUser}에게 메시지 보내기...`}
        />
      </div>
    </div>
  );
};

export default ChatRoom;
