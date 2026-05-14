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
import { Search, PlusCircle, Sparkles } from "lucide-react";
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
          className="absolute inset-0 w-full h-full object-cover opacity-50 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background" aria-hidden />
        <div className="absolute inset-0 bg-gradient-hero opacity-15 blur-3xl mix-blend-screen" aria-hidden />
        <div className="container py-12 md:py-24 relative">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium mb-5 text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> {t("home.tagline")}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              {t("home.heroLine1")}{" "}
              <span className="text-gradient">{t("home.heroLine2")}</span>
            </h1>
            <p className="text-muted-foreground mt-4 md:mt-5 text-base md:text-lg leading-relaxed">
              {t("home.heroSubtitle")}
            </p>
            <div className="flex flex-wrap gap-3 mt-6 md:mt-7">
              <Button asChild size="lg" className="bg-gradient-hero text-primary-foreground hover:opacity-90 shadow-glow">
                <Link to="/create">
                  <PlusCircle className="h-5 w-5 mr-2" /> {t("home.createCta")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10">
                <Link to="/map">{t("home.viewMap")}</Link>
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3 mt-6 md:mt-8 max-w-md">
              <div className="glass rounded-xl px-4 py-3">
                <div className="text-2xl font-bold text-gradient">{stats.total}</div>
                <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{t("home.stats.reports")}</div>
              </div>
              <div className="glass rounded-xl px-4 py-3">
                <div className="text-2xl font-bold text-emerald-400">{stats.recovered}</div>
                <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{t("home.stats.recovered")}</div>
              </div>
              <div className="glass rounded-xl px-4 py-3">
                <div className="text-2xl font-bold">{stats.active}</div>
                <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{t("home.stats.active")}</div>
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