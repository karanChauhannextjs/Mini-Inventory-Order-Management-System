import { X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DismissibleAlert({ message, onDismiss, variant = 'destructive', className }) {
  if (!message) return null;

  return (
    <Alert variant={variant} className={cn('relative pr-10', className)}>
      <AlertDescription>{message}</AlertDescription>
      {onDismiss && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
}
