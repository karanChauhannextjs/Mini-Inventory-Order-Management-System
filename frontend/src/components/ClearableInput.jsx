import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function ClearableInput({
  value,
  onChange,
  onClear,
  className,
  wrapperClassName,
  ...props
}) {
  const hasValue = Boolean(value);

  const clear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onChange?.({ target: { value: '' } });
  };

  return (
    <div className={cn('relative max-w-full', wrapperClassName)}>
      <Input
        value={value}
        onChange={onChange}
        className={cn(hasValue && 'pr-9', className)}
        {...props}
      />
      {hasValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={clear}
          aria-label="Clear"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
