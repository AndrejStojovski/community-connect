import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
  const [hideMobileBar, setHideMobileBar] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      if (y < 80) setHideMobileBar(false);
      else if (delta > 6) setHideMobileBar(true);
      else if (delta < -6) setHideMobileBar(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <header className="hidden md:block sticky top-0 z-40 border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="container flex h-16 md:h-24 py-2 items-center justify-between gap-1 md:gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <img src={foundItLogo} alt="FoundIt logo" className="h-10 md:h-20 w-auto drop-shadow-[0_0_24px_hsl(var(--primary)/0.35)]" />
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
      </header>

      {/* Mobile bottom header (auto-hides on scroll down) */}
      <div
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 transition-transform duration-300 ${
          hideMobileBar ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-card/85 backdrop-blur-2xl shadow-elevated overflow-hidden">
          <div className="flex items-center justify-between gap-1 px-3 py-2 border-b border-white/5">
            <Link to="/" className="flex items-center shrink-0">
              <img src={foundItLogo} alt="FoundIt logo" className="h-8 w-auto drop-shadow-[0_0_16px_hsl(var(--primary)/0.35)]" />
            </Link>
            <div className="flex items-center gap-0.5">
              <LanguageSwitcher />
              <ThemeToggle />
              {user ? (
                <>
                  <NotificationBell />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/profile")} aria-label={t("nav.profile")}>
                    <UserIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut} aria-label={t("nav.signOut")}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => navigate("/auth")} className="h-8 bg-gradient-hero text-primary-foreground hover:opacity-90 shadow-glow">
                  {t("nav.signIn")}
                </Button>
              )}
            </div>
          </div>
          <nav className={`grid ${isAdmin ? "grid-cols-7" : "grid-cols-6"}`}>
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
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <Shield className="h-5 w-5" />
                <span>{t("nav.admin")}</span>
              </NavLink>
            )}
          </nav>
        </div>
      </div>

      <main className="flex-1 pb-32 md:pb-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
};