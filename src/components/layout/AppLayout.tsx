import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Home,
  PlusCircle,
  FileText,
  MapPin,
  MessageSquare,
  Shield,
  LogOut,
  Bell,
  Search,
  User as UserIcon,
  Trophy,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ThemeToggle";
import foundItLogo from "@/assets/foundit-logo.png";

export const AppLayout = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { to: "/", label: t("nav.home"), icon: Home, end: true },
    { to: "/create", label: t("nav.newReport"), icon: PlusCircle },
    { to: "/my-reports", label: t("nav.myReports"), icon: FileText },
    { to: "/map", label: t("nav.map"), icon: MapPin },
    { to: "/messages", label: t("nav.messages"), icon: MessageSquare },
    { to: "/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="container flex h-18 py-2 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={foundItLogo} alt="FoundIt logo" className="h-12 md:h-14 w-auto" />
            <span className="sr-only">FoundIt</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`
                }
              >
                <Shield className="h-4 w-4" />
                {t("nav.admin")}
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <>
                <NotificationBell />
                <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                  <UserIcon className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{t("nav.profile")}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{t("nav.signOut")}</span>
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate("/auth")} className="bg-gradient-hero text-primary-foreground hover:opacity-90 shadow-glow">
                {t("nav.signIn")}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 rounded-2xl border border-white/10 bg-card/80 backdrop-blur-2xl shadow-elevated">
          <div className="grid grid-cols-6">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 pb-24 md:pb-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
};