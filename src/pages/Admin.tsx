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
import { Trash2, Users, FileText, CheckCircle2, BarChart3, ShieldAlert, Activity, Gavel, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { BanDialog } from "@/components/admin/BanDialog";
import { useAuth } from "@/hooks/useAuth";

interface Stats {
  total: number;
  active: number;
  resolved: number;
  byCategory: Record<string, number>;
  byType: { lost: number; found: number };
}

export default function Admin() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [bans, setBans] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [pendingClaims, setPendingClaims] = useState<any[]>([]);

  const load = async () => {
    const [{ data: r }, { data: p }, { data: b }, { data: a }, { data: c }] = await Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_bans").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("claims").select("*, reports(title)").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    const rows = r ?? [];
    setReports(rows);
    setProfiles(p ?? []);
    setBans(b ?? []);
    setAudit(a ?? []);
    setPendingClaims(c ?? []);
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
    else {
      if (user) await supabase.from("admin_audit_logs").insert({ actor_id: user.id, action: "delete_report", target_type: "report", target_id: id });
      toast.success("Report deleted"); load();
    }
  };

  const unban = async (id: string, userId: string) => {
    const { error } = await supabase.from("user_bans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (user) await supabase.from("admin_audit_logs").insert({ actor_id: user.id, action: "unban_user", target_type: "user", target_id: userId });
    toast.success("Ban lifted");
    load();
  };

  const overrideClaim = async (claimId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("claims").update({ status }).eq("id", claimId);
    if (error) { toast.error(error.message); return; }
    if (user) await supabase.from("admin_audit_logs").insert({ actor_id: user.id, action: `override_claim_${status}`, target_type: "claim", target_id: claimId });
    toast.success(`Claim ${status}`);
    load();
  };

  const isUserBanned = (uid: string) => bans.some((b) => b.user_id === uid && (!b.expires_at || new Date(b.expires_at) > new Date()) && b.ban_type !== "warning");

  return (
    <div className="container py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow">
          <ShieldAlert className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-sm text-muted-foreground">Moderation, audit logs, and platform health</p>
        </div>
      </div>

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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="reports">All reports</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="queue">
            <Gavel className="h-3.5 w-3.5 mr-1.5" />
            Moderation queue
            {pendingClaims.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingClaims.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bans">Bans ({bans.filter(b => !b.expires_at || new Date(b.expires_at) > new Date()).length})</TabsTrigger>
          <TabsTrigger value="audit"><Activity className="h-3.5 w-3.5 mr-1.5" />Audit log</TabsTrigger>
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
                <div className="font-semibold flex items-center gap-2">
                  {p.display_name}
                  {isUserBanned(p.id) && <Badge variant="destructive" className="text-[10px]">BANNED</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  Joined {format(new Date(p.created_at), "MMM d, yyyy")} · Reputation {p.reputation_score ?? 0}
                </div>
              </div>
              <BanDialog userId={p.id} displayName={p.display_name} onDone={load} />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="queue" className="mt-4 space-y-2">
          {pendingClaims.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">No pending claims to review.</Card>
          ) : pendingClaims.map((c) => (
            <Card key={c.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <Link to={`/reports/${c.report_id}`} className="font-semibold hover:underline truncate block">
                  {c.reports?.title ?? "Report"}
                </Link>
                <div className="text-xs text-muted-foreground">Submitted {format(new Date(c.created_at), "PPp")}</div>
              </div>
              <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400" onClick={() => overrideClaim(c.id, "approved")}>
                Approve
              </Button>
              <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => overrideClaim(c.id, "rejected")}>
                Reject
              </Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="bans" className="mt-4 space-y-2">
          {bans.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">No bans on record.</Card>
          ) : bans.map((b) => {
            const expired = b.expires_at && new Date(b.expires_at) < new Date();
            const profile = profiles.find((p) => p.id === b.user_id);
            return (
              <Card key={b.id} className="p-4 flex items-center gap-4">
                <Badge className={`border-0 ${expired ? "bg-muted text-muted-foreground" : b.ban_type === "warning" ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"}`}>
                  {expired ? "EXPIRED" : b.ban_type.toUpperCase()}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{profile?.display_name ?? b.user_id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {b.reason} · {format(new Date(b.created_at), "MMM d, yyyy")}
                    {b.expires_at && ` · expires ${format(new Date(b.expires_at), "MMM d, yyyy")}`}
                  </div>
                </div>
                {!expired && (
                  <Button size="sm" variant="ghost" onClick={() => unban(b.id, b.user_id)}>
                    <RotateCcw className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Lift</span>
                  </Button>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-2">
          {audit.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">No admin actions logged yet.</Card>
          ) : audit.map((a) => {
            const actor = profiles.find((p) => p.id === a.actor_id);
            return (
              <Card key={a.id} className="p-3 flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    <span className="font-medium">{actor?.display_name ?? "Admin"}</span>
                    <span className="text-muted-foreground"> · {a.action.replace(/_/g, " ")}</span>
                    {a.target_type && <span className="text-muted-foreground"> · {a.target_type}</span>}
                  </div>
                  {a.metadata?.reason && (
                    <div className="text-xs text-muted-foreground truncate">"{a.metadata.reason}"</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(a.created_at), "MMM d, HH:mm")}
                </div>
              </Card>
            );
          })}
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