import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';

interface LoadingStateProps {
  title?: string;
}

export function LoadingState({ title = '불러오는 중입니다.' }: LoadingStateProps) {
  return (
    <Card className="border-white/80 bg-white shadow-sm">
      <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm font-semibold">{title}</p>
      </CardContent>
    </Card>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Card className="border-red-200 bg-red-50 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-5 text-red-700">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm font-semibold leading-6">{message}</p>
        </div>
        {onRetry && (
          <Button type="button" variant="outline" className="w-fit border-red-200 bg-white" onClick={onRetry}>
            다시 시도
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
