import { LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { notifyError, notifySuccess } from '@/lib/toast';

export default function UserProfileMenu() {
  const navigate = useNavigate();
  const { user, logout, logoutPending } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!user) return null;

  async function confirmLogout() {
    try {
      const res = await logout();
      notifySuccess(res?.message || 'Signed out');
      setLogoutOpen(false);
      navigate('/login', { replace: true });
    } catch (err) {
      notifyError(err.message);
      setLogoutOpen(false);
      navigate('/login', { replace: true });
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex min-w-0 items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-left transition-colors hover:bg-accent sm:px-3"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </span>
          <span className="min-w-0 max-w-[9rem] sm:max-w-xs">
            <span className="block truncate text-sm font-medium leading-tight">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
          </DialogHeader>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium capitalize">{user.role || 'user'}</dd>
            </div>
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>Close</Button>
            <Button variant="destructive" onClick={() => { setProfileOpen(false); setLogoutOpen(true); }}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Sign out?"
        description="Are you sure you want to sign out? You will need to sign in again to use the admin panel."
        confirmLabel="OK"
        pendingLabel="Signing out…"
        isPending={logoutPending}
        onConfirm={confirmLogout}
      />
    </>
  );
}
