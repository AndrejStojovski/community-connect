import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getBadges, reputationTier, type ReputationStats } from "@/lib/reputation";
import { Star } from "lucide-react";

interface Props {
  stats: Partial<ReputationStats> & { reputation_score: number };
  compact?: boolean;
}

export const ReputationBadge = ({ stats, compact = false }: Props) => {
  const tier = reputationTier(stats.reputation_score ?? 0);
  const badges = getBadges(stats);

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 border-border/60 ${tier.className}`}>
            <Star className="h-3 w-3" />
            <span className="font-semibold">{stats.reputation_score ?? 0}</span>
            {!compact && <span className="text-muted-foreground font-normal">· {tier.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Reputation score · {tier.label}</TooltipContent>
      </Tooltip>
      {badges.map((b) => {
        const Icon = b.icon;
        return (
          <Tooltip key={b.key}>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`gap-1 ${b.className}`}>
                <Icon className="h-3 w-3" />
                {!compact && <span>{b.label}</span>}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{b.label} — {b.description}</TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
};