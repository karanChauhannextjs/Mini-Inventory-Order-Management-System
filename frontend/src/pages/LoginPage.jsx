import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DismissibleAlert from '@/components/DismissibleAlert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError, RequiredLabel } from '@/components/FormHelpers';
import PasswordInput from '@/components/PasswordInput';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { notifySuccess } from '@/lib/toast';
import { validateLoginForm } from '@/lib/validation';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginPending } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your inventory and orders</CardDescription>
        </CardHeader>
        <CardContent>
          <DismissibleAlert message={error} onDismiss={() => setError('')} className="mb-4" />
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              const validation = validateLoginForm({ email, password });
              if (!validation.ok) {
                setFieldErrors(validation.errors);
                return;
              }
              setFieldErrors({});
              try {
                const res = await login({ email, password });
                notifySuccess(res.message || 'Welcome back');
                navigate('/', { replace: true });
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <div className="grid gap-2">
              <RequiredLabel htmlFor="email">Email</RequiredLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={!!fieldErrors.email}
              />
              <FieldError message={fieldErrors.email} />
            </div>
            <div className="grid gap-2">
              <RequiredLabel htmlFor="password">Password</RequiredLabel>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-invalid={!!fieldErrors.password}
              />
              <FieldError message={fieldErrors.password} />
            </div>
            <Button type="submit" className="w-full" disabled={loginPending}>
              {loginPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
