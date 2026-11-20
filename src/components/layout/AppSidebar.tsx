import { Link, useRouterState } from "@tanstack/react-router";
import { Calculator, FileText, Info, LayoutDashboard, ShieldAlert, Upload } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Company Analysis", url: "/company-analysis", icon: Upload },
  { title: "Investment Assessment", url: "/investment-assessment", icon: ShieldAlert },
  { title: "Cash Impact Calculator", url: "/cash-impact", icon: Calculator },
  { title: "AI Due Diligence Report", url: "/report", icon: FileText },
  { title: "About CashTrap", url: "/about", icon: Info },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader className="px-3 py-4">
        <Logo collapsed={collapsed} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter className="px-4 pb-4 text-[11px] leading-relaxed text-sidebar-foreground/60">
          Screening prototype for PE due diligence. Not investment advice.
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
