import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Clock, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

interface ClaimRow {
  id: string;
  claimant_id: string;
  status: "pending" | "approved" | "rejected" | "disputed";
  answers: Array<{ question: string; answer: string }>;
  proof_image_url: string | null;
  created_at: string;
}

interface ProfileLite { id: string; display_name: string; reputation_score: number }

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  disputed: "bg-orange-500/15 text-orange-300 border-orange-500/30",
};

export const ClaimsPanel = ({ reportId, isOwner }: { reportId: string; isOwner: boolean }) => {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("claims")
      .select("id,claimant_id,status,answers,proof_image_url,created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as ClaimRow[];
    setClaims(rows);
    const ids = Array.from(new Set(rows.map((r) => r.claimant_id)));
    if (ids.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name,reputation_score")
        .in("id", ids);
      const map: Record<string, ProfileLite> = {};
      (p ?? []).forEach((x) => { map[x.id] = x as ProfileLite; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [reportId]);

  const update = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    const { error } = await supabase.from("claims").update({ status }).eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success(`Claim ${status}`); load(); }
  };

  if (loading) return null;
  if (claims.length === 0) {
    return isOwner ? (
      <Card className="p-4 text-sm text-muted-foreground">No claims yet.</Card>
    ) : null;
  }

  return (
    <div className="space-y-3">
      {claims.map((c) => {
        const p = profiles[c.claimant_id];
        return (
          <Card key={c.id} className="p-4 space-y-3 bg-card/60 border-border/60">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{p?.display_name ?? "User"}</span>
                {p && (
                  <span className="text-xs text-muted-foreground">
                    · trust {p.reputation_score}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  · {format(new Date(c.created_at), "MMM d, HH:mm")}
                </span>
              </div>
              <Badge className={`border ${STATUS_STYLES[c.status]} capitalize`}>
                {c.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                {c.status === "approved" && <Check className="h-3 w-3 mr-1" />}
                {c.status === "rejected" && <X className="h-3 w-3 mr-1" />}
                {c.status === "disputed" && <ShieldAlert className="h-3 w-3 mr-1" />}
                {c.status}
              </Badge>
            </div>

            {c.answers?.length > 0 && (
              <div className="space-y-2">
                {c.answers.map((a, i) => (
                  <div key={i} className="text-sm">
                    <div className="text-xs text-muted-foreground">{a.question}</div>
                    <div className="font-medium whitespace-pre-wrap">{a.answer}</div>
                  </div>
                ))}
              </div>
            )}

            {c.proof_image_url && (
              <a href={c.proof_image_url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={c.proof_image_url} alt="proof" className="max-h-48 rounded border border-border/60" />
              </a>
            )}

            {isOwner && c.status === "pending" && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => update(c.id, "approved")} disabled={busy === c.id}>
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => update(c.id, "rejected")} disabled={busy === c.id}>
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Link to={`/messages?report=${reportId}`} className="ml-auto text-xs text-muted-foreground self-center hover:underline">
                  Ask in chat
                </Link>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};