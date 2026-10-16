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
import { validateSignupForm } from '@/lib/validation';

export default function SignupPage() {
  const navigate = useNavigate();
  const { register, registerPending } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Your products and orders stay private to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <DismissibleAlert message={error} onDismiss={() => setError('')} className="mb-4" />
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              const validation = validateSignupForm({ name, email, password, confirmPassword });
              if (!validation.ok) {
                setFieldErrors(validation.errors);
                return;
              }
              setFieldErrors({});
              try {
                const res = await register({ name, email, password });
                notifySuccess(res.message || 'Account created');
                navigate('/', { replace: true });
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <div className="grid gap-2">
              <RequiredLabel htmlFor="name">Name</RequiredLabel>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                aria-invalid={!!fieldErrors.name}
              />
              <FieldError message={fieldErrors.name} />
            </div>
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
              <RequiredLabel htmlFor="password">Password (min 6 characters)</RequiredLabel>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                aria-invalid={!!fieldErrors.password}
              />
              <FieldError message={fieldErrors.password} />
            </div>
            <div className="grid gap-2">
              <RequiredLabel htmlFor="confirmPassword">Confirm password</RequiredLabel>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              <FieldError message={fieldErrors.confirmPassword} />
            </div>
            <Button type="submit" className="w-full" disabled={registerPending}>
              {registerPending ? 'Creating…' : 'Sign up'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
