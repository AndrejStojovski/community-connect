import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReportCard, ReportCardData } from "@/components/reports/ReportCard";
import { toast } from "sonner";
import { format } from "date-fns";
import { MapPin, Calendar, ArrowLeft, Send, MessageSquare, ShieldCheck } from "lucide-react";
import { ClaimDialog } from "@/components/claims/ClaimDialog";
import { ClaimsPanel } from "@/components/claims/ClaimsPanel";
import { ReputationBadge } from "@/components/profile/ReputationBadge";

interface Report extends ReportCardData {
  user_id: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  proof_questions: string[];
}

function tokenize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
}
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [author, setAuthor] = useState<{ display_name: string; reputation_score: number; successful_returns: number; verified_claims: number; rejected_claims: number } | null>(null);
  const [matches, setMatches] = useState<Array<ReportCardData & { score: number }>>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
      if (!data) return;
      setReport(data as Report);
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name,reputation_score,successful_returns,verified_claims,rejected_claims")
        .eq("id", data.user_id)
        .maybeSingle();
      setAuthor(prof);
      // Find potential matches: opposite type, same category, recent
      const oppositeType = data.type === "lost" ? "found" : "lost";
      const { data: candidates } = await supabase
        .from("reports")
        .select("*")
        .eq("type", oppositeType)
        .eq("category", data.category)
        .neq("status", "archived")
        .limit(50);
      const tokens = new Set([...tokenize(data.title), ...tokenize(data.description)]);
      const scored = (candidates ?? [])
        .map((c) => {
          let score = 50; // same category baseline
          const cTokens = new Set([...tokenize(c.title), ...tokenize(c.description)]);
          const overlap = [...tokens].filter((t) => cTokens.has(t)).length;
          score += Math.min(overlap, 6) * 8;
          if (data.latitude && data.longitude && c.latitude && c.longitude) {
            const d = distanceKm(
              { lat: data.latitude, lng: data.longitude },
              { lat: c.latitude, lng: c.longitude }
            );
            if (d < 1) score += 20;
            else if (d < 5) score += 12;
            else if (d < 20) score += 5;
          }
          return { ...c, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
      setMatches(scored as Array<ReportCardData & { score: number }>);
    })();
  }, [id]);

  const sendMessage = async () => {
    if (!user || !report || !message.trim()) return;
    if (user.id === report.user_id) {
      toast.error("You can't message yourself");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      report_id: report.id,
      sender_id: user.id,
      recipient_id: report.user_id,
      content: message.trim().slice(0, 2000),
    });
    setSending(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Message sent");
      setMessage("");
      navigate(`/messages?report=${report.id}`);
    }
  };

  if (!report) {
    return (
      <div className="container py-12">
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  const isOwner = user?.id === report.user_id;
  const isLost = report.type === "lost";
  const canClaim = !isOwner && user && report.type === "found" && report.status === "active";

  return (
    <div className="container max-w-4xl py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <Card className="overflow-hidden shadow-card">
        {report.image_url && (
          <div className="aspect-video bg-muted">
            <img src={report.image_url} alt={report.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`border-0 ${isLost ? "bg-[hsl(var(--lost))] text-white" : "bg-[hsl(var(--found))] text-white"}`}>
              {isLost ? "LOST" : "FOUND"}
            </Badge>
            <Badge variant="outline">{report.category}</Badge>
            <Badge variant="secondary" className="capitalize">{report.status}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{report.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {report.location_text}</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {format(new Date(report.event_date), "MMMM d, yyyy")}</span>
            {author && (
              <span className="flex items-center gap-2">
                Posted by <span className="font-medium text-foreground">{author.display_name}</span>
                <ReputationBadge stats={author} compact />
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{report.description}</p>

          {canClaim && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-2 font-semibold">
                <ShieldCheck className="h-4 w-4" /> Is this yours?
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Submit a claim with proof of ownership. The owner reviews every claim before approving.
              </p>
              <ClaimDialog
                reportId={report.id}
                ownerId={report.user_id}
                proofQuestions={report.proof_questions ?? []}
              />
            </div>
          )}

          {!isOwner && user && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-2 font-semibold">
                <MessageSquare className="h-4 w-4" /> Contact poster
              </div>
              <Textarea
                placeholder="Hi, I think I might have your item…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
              />
              <Button onClick={sendMessage} disabled={sending || !message.trim()} className="mt-2">
                <Send className="h-4 w-4 mr-2" /> Send message
              </Button>
            </div>
          )}
          {!user && (
            <div className="border-t pt-4 mt-4 text-sm">
              <Link to="/auth" className="text-primary underline">Sign in</Link> to contact the poster.
            </div>
          )}
          {isOwner && (
            <div className="border-t pt-4 mt-4 text-sm text-muted-foreground">
              This is your report. <Link to={`/edit/${report.id}`} className="text-primary underline">Edit it</Link> from My Reports.
            </div>
          )}
        </div>
      </Card>

      {(isOwner || (user && report.type === "found")) && (
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-3">
            {isOwner ? "Claims on this item" : "Your claim status"}
          </h2>
          <ClaimsPanel reportId={report.id} isOwner={isOwner} />
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4">
          Potential matches{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({isLost ? "found items" : "lost items"} that might be related)
          </span>
        </h2>
        {matches.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No potential matches yet. We'll keep looking as more reports come in.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {matches.map((m) => <ReportCard key={m.id} r={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}