import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ReputationBadge } from "@/components/profile/ReputationBadge";
import { Trophy, Medal, Award } from "lucide-react";

interface Row {
  id: string;
  display_name: string;
  avatar_url: string | null;
  reputation_score: number;
  successful_returns: number;
  verified_claims: number;
  rejected_claims: number;
}

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,reputation_score,successful_returns,verified_claims,rejected_claims")
        .order("reputation_score", { ascending: false })
        .limit(50);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const rankIcon = (i: number) => {
    if (i === 0) return <Trophy className="h-5 w-5 text-amber-400" />;
    if (i === 1) return <Medal className="h-5 w-5 text-slate-300" />;
    if (i === 2) return <Award className="h-5 w-5 text-amber-700" />;
    return <span className="text-muted-foreground font-mono text-sm w-5 text-center">{i + 1}</span>;
  };

  return (
    <div className="container max-w-3xl py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Community Leaderboard</h1>
        <p className="text-muted-foreground mt-2">Top contributors by reputation score.</p>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <Card className="divide-y divide-border/40 bg-gradient-card border-white/5">
          {rows.map((r, i) => (
            <Link
              key={r.id}
              to={`/profile/${encodeURIComponent(r.display_name)}`}
              className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="w-8 flex justify-center">{rankIcon(i)}</div>
              <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden shrink-0">
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt={r.display_name} className="w-full h-full object-cover" />
                ) : r.display_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.display_name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.successful_returns} returns · {r.verified_claims} verified
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{r.reputation_score}</div>
                <ReputationBadge stats={r} compact />
              </div>
            </Link>
          ))}
          {rows.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No contributors yet.</div>
          )}
        </Card>
      )}
    </div>
  );
}