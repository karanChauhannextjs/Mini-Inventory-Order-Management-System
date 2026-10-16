import * as React from 'react';
import { cn } from '@/lib/utils';

const SidebarContext = React.createContext({ collapsed: false });

function SidebarProvider({ className, children, ...props }) {
  return (
    <SidebarContext.Provider value={{ collapsed: false }}>
      <div className={cn('flex min-h-svh w-full', className)} {...props}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({ className, children, ...props }) {
  return (
    <aside
      className={cn(
        'hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

function SidebarHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-2 p-4', className)} {...props} />;
}

function SidebarContent({ className, ...props }) {
  return <div className={cn('flex flex-1 flex-col gap-2 overflow-auto px-2 py-2', className)} {...props} />;
}

function SidebarFooter({ className, ...props }) {
  return <div className={cn('mt-auto p-4 text-xs text-sidebar-foreground/60', className)} {...props} />;
}

function SidebarGroup({ className, ...props }) {
  return <div className={cn('flex w-full flex-col gap-1', className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }) {
  return (
    <div className={cn('px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70', className)} {...props} />
  );
}

function SidebarMenu({ className, ...props }) {
  return <ul className={cn('flex w-full flex-col gap-1', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }) {
  return <li className={cn('list-none', className)} {...props} />;
}

const SidebarMenuButton = React.forwardRef(({ className, isActive, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    data-active={isActive}
    className={cn(
      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground',
      className
    )}
    {...props}
  />
));
SidebarMenuButton.displayName = 'SidebarMenuButton';

function SidebarInset({ className, ...props }) {
  return <main className={cn('flex flex-1 flex-col overflow-auto bg-muted/30', className)} {...props} />;
}

function SidebarRail({ className, ...props }) {
  return <div className={cn('flex h-14 items-center gap-2 border-b bg-background px-4 md:hidden', className)} {...props} />;
}

export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarRail,
};
