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

type FilterType = "all" | "lost" | "found";
type FilterStatus = "all" | "active" | "matched" | "resolved" | "archived";

export default function Home() {
  const [reports, setReports] = useState<ReportCardData[]>([]);
  const [loading, setLoading] = useState(true);
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
        <div className="absolute inset-0 bg-gradient-hero opacity-20 blur-3xl" aria-hidden />
        <div className="container py-16 md:py-24 relative">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium mb-5 text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Community-powered recovery
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Lost something?{" "}
              <span className="text-gradient">Found something?</span>
            </h1>
            <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
              Post a report, browse the community feed, and let our matching engine reconnect lost items with their owners.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Button asChild size="lg" className="bg-gradient-hero text-primary-foreground hover:opacity-90 shadow-glow">
                <Link to="/create">
                  <PlusCircle className="h-5 w-5 mr-2" /> Create report
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10">
                <Link to="/map">View map</Link>
              </Button>
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
                placeholder="Search title, description, location…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="md:col-span-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
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
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
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
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="lost">Lost</TabsTrigger>
                <TabsTrigger value="found">Found</TabsTrigger>
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
            No reports match your filters.
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