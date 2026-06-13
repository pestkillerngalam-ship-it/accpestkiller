'use client';

import { useEffect, useState } from 'react';
import { useAppStore, PageView } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  Bug,
  Moon,
  Sun,
  LogOut,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const navItems: { id: PageView; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'customers', label: 'Pelanggan', icon: <Users className="w-5 h-5" /> },
  { id: 'invoices', label: 'Invoice', icon: <FileText className="w-5 h-5" /> },
  { id: 'expenses', label: 'Pengeluaran', icon: <Receipt className="w-5 h-5" /> },
  { id: 'reports', label: 'Laporan', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'settings', label: 'Pengaturan', icon: <Settings className="w-5 h-5" /> },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const activePage = useAppStore((s) => s.activePage);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('PT Pest Killer Ngalam');

  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.logo) setCompanyLogo(data.logo);
          if (data.companyName) setCompanyName(data.companyName);
        }
      } catch {
        // silently fail
      }
    };
    fetchSettings();
  }, [token]);

  const handleNav = (page: PageView) => {
    setActivePage(page);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3">
        {companyLogo ? (
          <img src={companyLogo} alt="Logo" className="w-10 h-10 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <Bug className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-bold text-sm truncate">{companyName}</h2>
          <p className="text-xs text-muted-foreground">Akuntansi</p>
        </div>
      </div>
      <Separator />
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              activePage === item.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <Separator />
      <div className="p-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-emerald-600 text-white text-xs">
              {user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role === 'owner' ? 'Pemilik' : 'Admin'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 bg-card border-r flex-col h-screen sticky top-0">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const logout = useAppStore((s) => s.logout);
  const activePage = useAppStore((s) => s.activePage);
  const user = useAppStore((s) => s.user);

  const currentPageLabel = navItems.find((n) => n.id === activePage)?.label || 'Dashboard';

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar');
  };

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        <div className="flex items-center gap-3">
          <MobileSidebar />
          <motion.h1
            key={activePage}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg font-semibold"
          >
            {currentPageLabel}
          </motion.h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="w-5 h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute w-5 h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle tema</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-emerald-600 text-white text-xs">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}