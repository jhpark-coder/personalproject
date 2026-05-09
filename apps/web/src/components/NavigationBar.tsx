import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, CalendarDays, Dumbbell, Home, MessageCircle, ShieldCheck, UserCircle, Utensils } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { API_ENDPOINTS } from '../config/api';
import { authFetch } from '../shared/lib/http';
import { logger } from '../shared/lib/logger';
import { cn } from '../lib/utils';

interface NavigationBarProps {
  className?: string;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ className = '' }) => {
  const location = useLocation();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = (user?.role || 'ROLE_USER') === 'ROLE_ADMIN';
  const chatPath = isAdmin ? '/chat-dashboard' : '/chat';

  const navItems = [
    { to: '/', label: '홈', icon: Home },
    { to: '/calendar', label: '캘린더', icon: CalendarDays },
    { to: '/programs', label: '운동 정보', icon: Dumbbell },
    { to: '/diet', label: '식단', icon: Utensils },
    { to: '/notifications', label: '알림', icon: Bell, badge: unreadCount },
    { to: '/profile', label: '마이페이지', icon: UserCircle },
  ];
  const desktopNavItems = [
    ...navItems,
    {
      to: chatPath,
      label: isAdmin ? '상담 관리' : '상담',
      icon: isAdmin ? ShieldCheck : MessageCircle,
      activePaths: ['/chat', '/chat-dashboard', '/chat-stats'],
    },
  ];

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.id) return;

      try {
        const response = await authFetch(`${API_ENDPOINTS.NOTIFICATIONS}/user/${user.id}/unread-count`);
        if (response.ok) {
          const data = await response.json();
          const count = typeof data === 'number' ? data : data?.unreadCount ?? 0;
          setUnreadCount(count);
        }
      } catch (err) {
        logger.error('읽지 않은 알림 개수 조회 실패:', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const renderNavItems = (layout: 'mobile' | 'desktop') => {
    const items = layout === 'desktop' ? desktopNavItems : navItems;

    return items.map(({ to, label, icon: Icon, badge, activePaths }) => {
      const active = activePaths?.includes(location.pathname) ?? isActive(to);
      return (
        <Link
          key={`${layout}-${to}`}
          to={to}
          className={cn(
            'group relative flex items-center rounded-lg font-semibold transition-colors',
            layout === 'mobile'
              ? 'min-w-0 flex-1 flex-col justify-center gap-1 px-1 py-2 text-[11px]'
              : 'gap-3 px-3 py-2.5 text-sm',
            active
              ? layout === 'mobile'
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/12 text-white'
              : layout === 'mobile'
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-300 hover:bg-white/10 hover:text-white',
          )}
          aria-current={active ? 'page' : undefined}
        >
          <span
            className={cn(
              'relative inline-flex shrink-0 items-center justify-center',
              layout === 'mobile' ? 'size-5' : 'size-6',
            )}
            aria-hidden="true"
          >
            <Icon size={layout === 'mobile' ? 18 : 20} strokeWidth={2.2} />
            {!!badge && badge > 0 && (
              <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-black leading-4 text-white">
                {badge}
              </span>
            )}
          </span>
          <span className={cn('max-w-full truncate', layout === 'desktop' && 'text-[0.92rem]')}>
            {label}
          </span>
          {layout === 'desktop' && active && (
            <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-white" aria-hidden="true" />
          )}
        </Link>
      );
    });
  };

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 gap-1 border-t border-border bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur lg:hidden',
          className,
        )}
        aria-label="주요 메뉴"
      >
        {renderNavItems('mobile')}
      </nav>

      <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-60 border-r border-white/10 bg-slate-950 px-3 py-4 text-white lg:block">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-950">
            FM
          </span>
          <span className="text-base font-black">FitMate</span>
        </div>
        <nav className="mt-5 grid gap-1" aria-label="주요 메뉴">
          {renderNavItems('desktop')}
        </nav>
      </aside>
    </>
  );
};

export default NavigationBar;
