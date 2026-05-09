import * as React from 'react';
import { cn } from '../../lib/utils';

const Page = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('min-h-dvh w-full bg-slate-50 pb-24 text-foreground', className)}
      {...props}
    />
  ),
);
Page.displayName = 'Page';

const PageHeader = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <header
      ref={ref}
      className={cn('border-b border-white/60 bg-white/95 shadow-sm backdrop-blur', className)}
      {...props}
    />
  ),
);
PageHeader.displayName = 'PageHeader';

const PageHeaderContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4', className)}
      {...props}
    />
  ),
);
PageHeaderContent.displayName = 'PageHeaderContent';

const PageMain = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <main
      ref={ref}
      className={cn('mx-auto w-full max-w-6xl px-4 py-4', className)}
      {...props}
    />
  ),
);
PageMain.displayName = 'PageMain';

export { Page, PageHeader, PageHeaderContent, PageMain };
