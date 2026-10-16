import { NavLink } from 'react-router-dom';
import { FolderTree, LayoutDashboard, Package, ShoppingCart, Users } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const linkClass = (isActive) =>
  cn(
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    isActive && 'bg-sidebar-primary text-sidebar-primary-foreground'
  );

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/customers', label: 'Customers', icon: Users },
];

export function SidebarNavLinks() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {nav.map((item) => (
          <SidebarMenuItem key={item.to}>
            <NavLink to={item.to} end={item.end} className={({ isActive }) => linkClass(isActive)}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export default function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            IM
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Inventory Admin</p>
            <p className="text-xs text-sidebar-foreground/70">Order & stock</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNavLinks />
      </SidebarContent>
      <SidebarFooter>Mini IMS · dev build</SidebarFooter>
    </Sidebar>
  );
}
