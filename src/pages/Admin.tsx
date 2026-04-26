import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, Users, FileText, CheckCircle2, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface Stats {
  total: number;
  active: number;
  resolved: number;
  byCategory: Record<string, number>;
  byType: { lost: number; found: number };
}

export default function Admin() {
  const [reports, setReports] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const load = async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    const rows = r ?? [];
    setReports(rows);
    setProfiles(p ?? []);
    const byCategory: Record<string, number> = {};
    let active = 0, resolved = 0, lost = 0, found = 0;
    for (const x of rows) {
      byCategory[x.category] = (byCategory[x.category] ?? 0) + 1;
      if (x.status === "active") active++;
      if (x.status === "resolved") resolved++;
      if (x.type === "lost") lost++; else found++;
    }
    setStats({ total: rows.length, active, resolved, byCategory, byType: { lost, found } });
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Report deleted"); load(); }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FileText />} label="Total reports" value={stats?.total ?? 0} />
        <StatCard icon={<BarChart3 />} label="Active" value={stats?.active ?? 0} />
        <StatCard icon={<CheckCircle2 />} label="Resolved" value={stats?.resolved ?? 0} />
        <StatCard icon={<Users />} label="Users" value={profiles.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Reports by category</h3>
          <div className="space-y-2">
            {stats && Object.entries(stats.byCategory).sort((a,b) => b[1]-a[1]).map(([cat, count]) => {
              const max = Math.max(...Object.values(stats.byCategory));
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat}</span><span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-hero" style={{ width: `${(count/max)*100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Lost vs Found</h3>
          <div className="flex h-40 items-end gap-6 justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 bg-[hsl(var(--lost))] rounded-t" style={{ height: `${Math.min((stats?.byType.lost ?? 0) * 12, 140)}px` }} />
              <div className="text-sm font-medium">Lost</div>
              <div className="text-2xl font-bold">{stats?.byType.lost ?? 0}</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 bg-[hsl(var(--found))] rounded-t" style={{ height: `${Math.min((stats?.byType.found ?? 0) * 12, 140)}px` }} />
              <div className="text-sm font-medium">Found</div>
              <div className="text-2xl font-bold">{stats?.byType.found ?? 0}</div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">All reports</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 space-y-2">
          {reports.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-4">
              <Badge className={`border-0 ${r.type === "lost" ? "bg-[hsl(var(--lost))]" : "bg-[hsl(var(--found))]"} text-white`}>
                {r.type.toUpperCase()}
              </Badge>
              <Link to={`/reports/${r.id}`} className="flex-1 hover:underline truncate">
                <div className="font-semibold truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.category} · {r.location_text} · {format(new Date(r.created_at), "MMM d, yyyy")}
                </div>
              </Link>
              <Badge variant="secondary" className="capitalize">{r.status}</Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                    <AlertDialogDescription>The report and its messages will be removed.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(r.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-2">
          {profiles.map((p) => (
            <Card key={p.id} className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-semibold">
                {p.display_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{p.display_name}</div>
                <div className="text-xs text-muted-foreground">
                  Joined {format(new Date(p.created_at), "MMM d, yyyy")}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card className="p-5 shadow-card">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  </Card>
);