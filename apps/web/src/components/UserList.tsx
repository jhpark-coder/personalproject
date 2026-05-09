import React from 'react';
import { Users } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';

interface User {
  username: string;
  status: 'online' | 'offline';
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

interface UserListProps {
  users: User[];
  currentUser: string | null;
  onSelectUser: (username: string) => void;
  unreadCounts: Map<string, number>;
}

const UserList: React.FC<UserListProps> = ({ users, currentUser, onSelectUser, unreadCounts }) => {
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return 0;
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
  });

  const onlineCount = sortedUsers.filter(user => user.status === 'online').length;
  const offlineCount = sortedUsers.filter(user => user.status === 'offline').length;

  return (
    <Card className="h-full border-white/80 bg-white shadow-sm">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center justify-between gap-2 text-base font-black">
          <span>사용자 목록</span>
          <span className="text-xs font-bold text-muted-foreground">
            온라인 {onlineCount} · 오프라인 {offlineCount}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 p-4 pt-0">
        {sortedUsers.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 text-center text-muted-foreground">
            <Users size={34} strokeWidth={1.8} />
            <p className="text-sm font-semibold">접속한 사용자가 없습니다.</p>
          </div>
        ) : (
          sortedUsers.map((user) => {
            const unread = unreadCounts.get(user.username) || 0;
            const active = currentUser === user.username;
            return (
              <button
                key={user.username}
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  active ? 'border-primary bg-blue-50' : 'border-border bg-white hover:bg-muted',
                  user.status === 'offline' && 'opacity-70',
                )}
                onClick={() => onSelectUser(user.username)}
              >
                <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
                  {user.username.charAt(0).toUpperCase()}
                  <span
                    className={cn(
                      'absolute bottom-0 right-0 size-3 rounded-full border-2 border-white',
                      user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400',
                    )}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-slate-950">{user.username}</span>
                    {user.status === 'offline' && <span className="text-xs text-muted-foreground">오프라인</span>}
                    {user.lastMessage && (
                      <span className="ml-auto shrink-0 text-xs font-semibold text-muted-foreground">
                        {formatTime(user.lastMessage.timestamp)}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {user.lastMessage?.content || '메시지 없음'}
                  </span>
                </span>
                {unread > 0 && <Badge className="shrink-0">{unread}</Badge>}
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default UserList;
