import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import AppSidebar, { SidebarNavLinks } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import UserProfileMenu from '@/components/UserProfileMenu';

function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
        <div className="border-b border-sidebar-border p-4 font-semibold">Inventory Admin</div>
        <div className="p-2">
          <SidebarNavLinks />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AdminHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <div className="md:hidden">
        <MobileNav />
      </div>
      <div className="flex flex-1 items-center justify-end">
        <UserProfileMenu />
      </div>
    </header>
  );
}

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminHeader />
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
