"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Home, History, Settings, Bot, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOutUser } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export function MainSidebar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOutUser();
    router.push("/login");
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">CryptoSight AI</h1>
          <div className="ml-auto">
             <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" passHref>
              <SidebarMenuButton asChild isActive={pathname === "/"}>
                <span>
                  <Home />
                  Home
                </span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          { user &&
            <SidebarMenuItem>
              <Link href="/history" passHref>
                <SidebarMenuButton asChild isActive={pathname === "/history"}>
                  <span>
                    <History />
                    Analysis History
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          }
          <SidebarMenuItem>
            <Link href="/settings" passHref>
              <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                <span>
                  <Settings />
                  Settings
                </span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between p-2">
           {loading ? (
             <div className="w-full h-10 bg-muted animate-pulse rounded-md" />
           ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-left h-auto px-2 py-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL ?? ''} />
                      <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate">{user.email}</span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
           ) : (
            <Link href="/login" className="w-full">
               <Button variant="outline" className="w-full">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
               </Button>
            </Link>
           )}
        </div>
      </SidebarFooter>
    </>
  );
}
