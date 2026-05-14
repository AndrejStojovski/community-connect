import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ReputationBadge } from "@/components/profile/ReputationBadge";
import { ReportCard, ReportCardData } from "@/components/reports/ReportCard";
import { getBadges } from "@/lib/reputation";
import { Badge as UIBadge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, Save, X, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Profile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  reputation_score: number;
  successful_returns: number;
  verified_claims: number;
  rejected_claims: number;
}

export default function ProfilePage() {
  const { name } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<ReportCardData[]>([]);
  const [counts, setCounts] = useState({ lost: 0, found: 0 });
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const decoded = name ? decodeURIComponent(name) : null;
    let query = supabase.from("profiles").select("*");
    if (decoded) query = query.eq("display_name", decoded);
    else if (user) query = query.eq("id", user.id);
    else return;
    const { data: p } = await query.maybeSingle();
    if (!p) return;
    setProfile(p as Profile);
    setBio(p.bio ?? "");
    setDisplayName(p.display_name);

    const { data: r } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", p.id)
      .order("created_at", { ascending: false })
      .limit(24);
    const rows = (r ?? []) as ReportCardData[];
    setReports(rows);
    setCounts({
      lost: rows.filter((x) => x.type === "lost").length,
      found: rows.filter((x) => x.type === "found").length,
    });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [name, user?.id]);

  const isOwn = !!user && !!profile && user.id === profile.id;

  const save = async () => {
    if (!profile || !user) return;
    setSaving(true);
    try {
      let avatar_url = profile.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("report-images")
          .upload(path, avatarFile, { upsert: false });
        if (upErr) throw upErr;
        avatar_url = supabase.storage.from("report-images").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          bio: bio.trim().slice(0, 500),
          display_name: displayName.trim().slice(0, 50),
          avatar_url,
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success(t("profile.updated"));
      setEditing(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="container py-12">
        <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-8 animate-fade-in">
      <Card className="overflow-hidden bg-gradient-card border-white/5">
        <div className="h-28 md:h-36 bg-gradient-hero opacity-80" aria-hidden />
        <div className="p-6 -mt-12 flex items-start gap-5 flex-wrap">
          <div className="h-20 w-20 rounded-full bg-gradient-hero flex items-center justify-center text-2xl font-bold text-primary-foreground overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              profile.display_name[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0 pt-12">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">{t("profile.displayName")}</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
                </div>
                <div>
                  <Label className="text-xs">{t("profile.bio")}</Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} placeholder={t("profile.bioPlaceholder")} />
                </div>
                <div>
                  <Label className="text-xs">{t("profile.avatar")}</Label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>{avatarFile ? avatarFile.name : t("profile.chooseImage")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight">{profile.display_name}</h1>
                <div className="text-xs text-muted-foreground mt-1">
                  {t("common.joined")} {format(new Date(profile.created_at), "MMMM yyyy")}
                </div>
                {profile.bio && <p className="text-sm mt-3 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ReputationBadge stats={profile} />
                  {getBadges(profile).map((b) => {
                    const Icon = b.icon;
                    return (
                      <UIBadge key={b.key} variant="outline" className={`gap-1 border ${b.className}`} title={b.description}>
                        <Icon className="h-3 w-3" /> {b.label}
                      </UIBadge>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          {isOwn && (
            <div>
              <div className="pt-12" />
              {editing ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={save} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" /> {t("common.save")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setBio(profile.bio ?? ""); setDisplayName(profile.display_name); setAvatarFile(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> {t("common.edit")}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatBox label={t("profile.stats.reputation")} value={profile.reputation_score} highlight />
        <StatBox label={t("profile.stats.lost")} value={counts.lost} />
        <StatBox label={t("profile.stats.found")} value={counts.found} />
        <StatBox label={t("profile.stats.returns")} value={profile.successful_returns} />
        <StatBox label={t("profile.stats.rejected")} value={profile.rejected_claims} />
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4">{t("profile.recent")}</h2>
        {reports.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">{t("profile.noReports")}</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {reports.map((r) => <ReportCard key={r.id} r={r} />)}
          </div>
        )}
      </section>

      {isOwn && (
        <div className="text-sm text-muted-foreground text-center">
          <Link to="/my-reports" className="text-primary hover:underline">{t("profile.manage")}</Link>
        </div>
      )}
    </div>
  );
}

const StatBox = ({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) => (
  <Card className={`p-4 ${highlight ? "bg-gradient-card border-primary/30" : "bg-card/60 border-border/60"}`}>
    <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </Card>
);