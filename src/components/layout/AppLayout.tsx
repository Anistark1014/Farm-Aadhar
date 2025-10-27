import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import FloatingAutomationStatus from "@/components/FloatingAutomationStatus";

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-x-hidden overflow-y-auto">
            <div className="max-w-full">
              <Outlet />
            </div>
          </main>
        </div>
        {/* Floating Automation Status - Available on all pages */}
        <FloatingAutomationStatus />
      </div>
    </SidebarProvider>
  );
}