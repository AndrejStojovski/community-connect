import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ReportCard, ReportCardData } from "@/components/reports/ReportCard";
import { CATEGORIES } from "@/lib/categories";
import { Search, PlusCircle, Sparkles, ArrowRight, ShieldCheck, Users, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import heroBg from "@/assets/hero-bg.jpg";

type FilterType = "all" | "lost" | "found";
type FilterStatus = "all" | "active" | "matched" | "resolved" | "archived";

export default function Home() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<ReportCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, recovered: 0, active: 0 });
  const [type, setType] = useState<FilterType>("all");
  const [status, setStatus] = useState<FilterStatus>("active");
  const [category, setCategory] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(60);
    if (type !== "all") q = q.eq("type", type);
    if (status !== "all") q = q.eq("status", status);
    if (category !== "all") q = q.eq("category", category);
    if (from) q = q.gte("event_date", from);
    if (to) q = q.lte("event_date", to);
    const { data } = await q;
    const rows = (data ?? []) as ReportCardData[] & Array<{ user_id: string }>;
    const userIds = Array.from(new Set(rows.map((r) => (r as unknown as { user_id: string }).user_id)));
    let posterMap: Record<string, ReportCardData["poster"]> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name,reputation_score,verified_claims")
        .in("id", userIds);
      (profs ?? []).forEach((p) => {
        posterMap[p.id] = {
          display_name: p.display_name,
          reputation_score: p.reputation_score ?? 0,
          verified_claims: p.verified_claims ?? 0,
        };
      });
    }
    setReports(
      rows.map((r) => ({
        ...r,
        poster: posterMap[(r as unknown as { user_id: string }).user_id] ?? null,
      })) as ReportCardData[]
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, category, from, to]);

  useEffect(() => {
    (async () => {
      const [{ count: total }, { count: recovered }, { count: active }] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "resolved"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setStats({ total: total ?? 0, recovered: recovered ?? 0, active: active ?? 0 });
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return reports;
    const k = keyword.toLowerCase();
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(k) ||
        r.description.toLowerCase().includes(k) ||
        r.location_text.toLowerCase().includes(k)
    );
  }, [reports, keyword]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroBg}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-90 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]"
        />
        {/* Animated gradient orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl animate-pulse-glow" />
          <div className="absolute top-10 -right-32 h-[26rem] w-[26rem] rounded-full bg-primary-glow/25 blur-3xl animate-pulse-glow" style={{ animationDelay: "1.2s" }} />
          <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-fuchsia-500/15 blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/30 to-background" aria-hidden />
        <div className="container py-16 md:py-28 relative">
          <div className="max-w-3xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-strong text-xs font-medium mb-6 text-foreground/85 shadow-glow">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <Sparkles className="h-3.5 w-3.5 text-primary" /> {t("home.tagline")}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.02]">
              {t("home.heroLine1")}
              <br />
              <span className="text-gradient">{t("home.heroLine2")}</span>
            </h1>
            <p className="text-muted-foreground mt-5 md:mt-6 text-base md:text-xl leading-relaxed max-w-2xl">
              {t("home.heroSubtitle")}
            </p>
            <div className="flex flex-wrap gap-3 mt-7 md:mt-9">
              <Button asChild size="lg" className="group bg-gradient-hero text-primary-foreground hover:opacity-90 shadow-glow h-12 px-6 text-base">
                <Link to="/create">
                  <PlusCircle className="h-5 w-5 mr-2" /> {t("home.createCta")}
                  <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur">
                <Link to="/map">{t("home.viewMap")}</Link>
              </Button>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verified claims</div>
              <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> Community moderated</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary-glow" /> Free to use</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mt-8 md:mt-10 max-w-xl">
              <div className="glass-strong rounded-2xl px-4 py-4 hover-lift">
                <div className="text-3xl md:text-4xl font-bold text-gradient tabular-nums">{stats.total}</div>
                <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground mt-1">{t("home.stats.reports")}</div>
              </div>
              <div className="glass-strong rounded-2xl px-4 py-4 hover-lift">
                <div className="text-3xl md:text-4xl font-bold text-emerald-400 tabular-nums">{stats.recovered}</div>
                <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground mt-1">{t("home.stats.recovered")}</div>
              </div>
              <div className="glass-strong rounded-2xl px-4 py-4 hover-lift">
                <div className="text-3xl md:text-4xl font-bold tabular-nums">{stats.active}</div>
                <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground mt-1">{t("home.stats.active")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-10">
        {/* Filters */}
        <div className="glass-strong rounded-2xl shadow-card p-4 md:p-5 relative z-10 mb-8 animate-scale-in">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("home.filters.searchPlaceholder")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="md:col-span-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder={t("home.filters.category")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("home.filters.allCategories")}</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Select value={status} onValueChange={(v) => setStatus(v as FilterStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("home.filters.allStatuses")}</SelectItem>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="matched">{t("common.matched")}</SelectItem>
                  <SelectItem value="resolved">{t("common.resolved")}</SelectItem>
                  <SelectItem value="archived">{t("common.archived")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 grid grid-cols-2 gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <Tabs value={type} onValueChange={(v) => setType(v as FilterType)}>
              <TabsList>
                <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
                <TabsTrigger value="lost">{t("common.lost")}</TabsTrigger>
                <TabsTrigger value="found">{t("common.found")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-card/40 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground glass rounded-2xl">
            {t("home.empty")}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
            {filtered.map((r) => <ReportCard key={r.id} r={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}