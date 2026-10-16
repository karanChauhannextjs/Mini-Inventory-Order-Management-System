import { Label } from '@/components/ui/label';

export function RequiredLabel({ htmlFor, children }) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
    </Label>
  );
}

export function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-destructive" role="alert">{message}</p>;
}
