import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { format } from "date-fns";

interface Row {
  id: string;
  type: "lost" | "found";
  title: string;
  category: string;
  location_text: string;
  event_date: string;
  status: "active" | "matched" | "resolved" | "archived";
  image_url: string | null;
  created_at: string;
}

const STATUSES = ["active", "matched", "resolved", "archived"] as const;

export default function MyReports() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const updateStatus = async (id: string, status: Row["status"]) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status updated"); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Report deleted"); load(); }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Reports</h1>
          <p className="text-muted-foreground mt-1">Manage your lost and found posts</p>
        </div>
        <Button asChild>
          <Link to="/create"><PlusCircle className="h-4 w-4 mr-2" /> New report</Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">You haven't posted any reports yet.</p>
          <Button asChild><Link to="/create">Create your first report</Link></Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 shadow-card">
              <div className="flex gap-4">
                <Link to={`/reports/${r.id}`} className="shrink-0">
                  <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-soft" />
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <Badge className={`border-0 ${r.type === "lost" ? "bg-[hsl(var(--lost))] text-white" : "bg-[hsl(var(--found))] text-white"}`}>
                      {r.type.toUpperCase()}
                    </Badge>
                    <Link to={`/reports/${r.id}`} className="font-semibold hover:underline truncate">
                      {r.title}
                    </Link>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {r.category} · {r.location_text} · {format(new Date(r.event_date), "MMM d, yyyy")}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Row["status"])}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/edit/${r.id}`}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(r.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}