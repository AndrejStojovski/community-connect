import { Award, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

export interface Badge {
  key: string;
  label: string;
  icon: LucideIcon;
  className: string;
  description: string;
}

export interface ReputationStats {
  reputation_score: number;
  successful_returns: number;
  verified_claims: number;
  rejected_claims: number;
}

export function getBadges(s: Partial<ReputationStats>): Badge[] {
  const badges: Badge[] = [];
  if ((s.successful_returns ?? 0) >= 3) {
    badges.push({
      key: "trusted-finder",
      label: "Trusted Finder",
      icon: Sparkles,
      className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      description: "Returned 3+ items to their owners",
    });
  }
  if ((s.verified_claims ?? 0) >= 1) {
    badges.push({
      key: "verified-owner",
      label: "Verified Owner",
      icon: ShieldCheck,
      className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      description: "Recovered an item with verified ownership",
    });
  }
  if ((s.reputation_score ?? 0) >= 5) {
    badges.push({
      key: "reliable-user",
      label: "Reliable User",
      icon: Award,
      className: "bg-primary/15 text-primary border-primary/30",
      description: "Earned a strong community trust score",
    });
  }
  return badges;
}

export function reputationTier(score: number) {
  if (score >= 10) return { label: "Excellent", className: "text-emerald-400" };
  if (score >= 5) return { label: "Trusted", className: "text-primary" };
  if (score >= 1) return { label: "Active", className: "text-foreground" };
  if (score === 0) return { label: "New", className: "text-muted-foreground" };
  return { label: "Caution", className: "text-destructive" };
}