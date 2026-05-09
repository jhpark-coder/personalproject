import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, MessageCircle, MessagesSquare, Radio, UserRound } from 'lucide-react';
import NavigationBar from './NavigationBar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Page, PageHeader, PageHeaderContent, PageMain } from './ui/page';

interface ChatStatsProps {
  onlineUsers?: number;
  totalMessages?: number;
}

interface StoredMessage {
  sender?: string;
  content?: string;
  timestamp?: string;
  type?: string;
}

interface ChatRoomSnapshot {
  userId: string;
  messages: StoredMessage[];
}

const readStoredRooms = () => {
  if (typeof window === 'undefined') return [];

  const raw = window.localStorage.getItem('chat_allMessages');
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap<ChatRoomSnapshot>((entry) => {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !Array.isArray(entry[1])) return [];
      return [{ userId: entry[0], messages: entry[1] as StoredMessage[] }];
    });
  } catch {
    return [];
  }
};

const formatDateTime = (value?: string) => {
  if (!value) return '기록 없음';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '기록 없음';

  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ChatStats: React.FC<ChatStatsProps> = ({ onlineUsers = 0, totalMessages }) => {
  const [rooms, setRooms] = useState<ChatRoomSnapshot[]>([]);

  useEffect(() => {
    setRooms(readStoredRooms());
  }, []);

  const snapshot = useMemo(() => {
    const messages = rooms.flatMap((room) =>
      room.messages.map((message) => ({
        ...message,
        roomUserId: room.userId,
      })),
    );
    const latestMessage = [...messages]
      .filter((message) => message.timestamp)
      .sort((a, b) => new Date(b.timestamp ?? '').getTime() - new Date(a.timestamp ?? '').getTime())[0];
    const adminMessages = messages.filter((message) => message.sender === '관리자').length;
    const userMessages = messages.length - adminMessages;
    const activeRooms = rooms.filter((room) => room.messages.length > 0).length;
    const todayKey = new Date().toDateString();
    const todayMessages = messages.filter((message) => {
      if (!message.timestamp) return false;
      const date = new Date(message.timestamp);
      return !Number.isNaN(date.getTime()) && date.toDateString() === todayKey;
    }).length;

    return {
      activeRooms,
      adminMessages,
      latestMessage,
      messages,
      todayMessages,
      userMessages,
    };
  }, [rooms]);

  const messageCount = totalMessages ?? snapshot.messages.length;
  const statCards = [
    {
      label: '온라인 사용자',
      value: onlineUsers,
      detail: '현재 연결된 상담 대상',
      icon: Radio,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: '전체 메시지',
      value: messageCount,
      detail: '저장된 상담 기록 기준',
      icon: MessagesSquare,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: '상담방',
      value: snapshot.activeRooms,
      detail: '대화 기록이 있는 사용자',
      icon: UserRound,
      tone: 'bg-violet-50 text-violet-700',
    },
    {
      label: '오늘 메시지',
      value: snapshot.todayMessages,
      detail: '오늘 주고받은 대화',
      icon: Activity,
      tone: 'bg-orange-50 text-orange-700',
    },
  ];

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent className="justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessagesSquare className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950">채팅 통계</h1>
              <p className="mt-1 text-sm font-medium text-muted-foreground">상담 대화량과 운영 상태를 확인합니다.</p>
            </div>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            로컬 기록 기준
          </Badge>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="grid gap-4">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="채팅 요약">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-white/80 bg-white shadow-sm">
                <CardContent className="grid gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                    </div>
                    <div className={`flex size-11 items-center justify-center rounded-lg ${item.tone}`}>
                      <Icon className="size-5" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                <MessageCircle className="size-5 text-primary" />
                최근 상담 기록
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rooms.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <MessagesSquare className="size-11 text-slate-300" />
                  <div>
                    <p className="font-bold text-slate-950">아직 저장된 상담 기록이 없습니다.</p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      관리자가 사용자와 대화를 시작하면 이 화면에 기록이 쌓입니다.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => window.location.assign('#/chat-dashboard')}>
                    상담 대시보드 열기
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {rooms.slice(0, 8).map((room) => {
                    const latest = room.messages[room.messages.length - 1];
                    return (
                      <div key={room.userId} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto]">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-950">{room.userId}</p>
                          <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
                            {latest?.content || '메시지 없음'}
                          </p>
                        </div>
                        <div className="text-left text-xs font-semibold text-muted-foreground sm:text-right">
                          <p>{room.messages.length}개</p>
                          <p>{formatDateTime(latest?.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <aside className="grid content-start gap-4">
            <Card className="border-white/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Clock3 className="size-5 text-primary" />
                  운영 상태
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-bold text-muted-foreground">최근 메시지</p>
                  <p className="mt-1 font-semibold text-slate-950">{formatDateTime(snapshot.latestMessage?.timestamp)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs font-bold text-blue-700">사용자 발신</p>
                    <p className="mt-1 text-lg font-black text-blue-950">{snapshot.userMessages}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs font-bold text-emerald-700">관리자 응답</p>
                    <p className="mt-1 text-lg font-black text-emerald-950">{snapshot.adminMessages}</p>
                  </div>
                </div>
                <p className="rounded-lg border border-slate-100 bg-white p-3 text-sm font-medium leading-6 text-muted-foreground">
                  실시간 온라인 수는 채팅 서버 연결 상태에 따라 갱신됩니다. 기록 통계는 브라우저에 저장된 상담 내역을 기준으로 표시됩니다.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </PageMain>

      <NavigationBar />
    </Page>
  );
};

export default ChatStats;
