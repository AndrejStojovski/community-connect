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
    setReports((data ?? []) as ReportCardData[]);
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
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container py-12 md:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Community-powered recovery
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Lost something? Found something?
            </h1>
            <p className="text-primary-foreground/85 mt-3 text-lg">
              Post a report, browse the community feed, and let our matching engine connect lost items with their owners.
            </p>
            <div className="flex gap-3 mt-6">
              <Button asChild size="lg" variant="secondary">
                <Link to="/create">
                  <PlusCircle className="h-5 w-5 mr-2" /> Create report
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white">
                <Link to="/map">View map</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-8">
        {/* Filters */}
        <div className="bg-card rounded-xl shadow-card p-4 md:p-5 -mt-12 relative z-10 mb-8 border">
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
              <div key={i} className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No reports match your filters.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((r) => <ReportCard key={r.id} r={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}