import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Star, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

export interface ReportCardData {
  id: string;
  type: "lost" | "found";
  title: string;
  description: string;
  category: string;
  location_text: string;
  event_date: string;
  image_url: string | null;
  status: string;
  poster?: { display_name: string; reputation_score: number; verified_claims: number } | null;
}

export const ReportCard = ({ r }: { r: ReportCardData }) => {
  const isLost = r.type === "lost";
  return (
    <Link to={`/reports/${r.id}`} className="block h-full">
      <Card className="overflow-hidden h-full bg-gradient-card border-white/5 shadow-card hover:shadow-elevated hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group">
        <div className="aspect-[4/3] bg-muted/40 relative overflow-hidden">
          {r.image_url ? (
            <img
              src={r.image_url}
              alt={r.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-card flex items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}
          <Badge
            className={`absolute top-3 left-3 border-0 backdrop-blur-md font-semibold tracking-wide ${
              isLost ? "bg-[hsl(var(--lost))]/90 text-white" : "bg-[hsl(var(--found))]/90 text-white"
            }`}
          >
            {isLost ? "LOST" : "FOUND"}
          </Badge>
          {r.status !== "active" && (
            <Badge variant="secondary" className="absolute top-3 right-3 capitalize backdrop-blur-md bg-card/70">
              {r.status}
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight line-clamp-1">{r.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{r.location_text}</span>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(r.event_date), "MMM d")}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">{r.category}</Badge>
          {r.poster && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40 mt-2">
              <Link
                to={`/profile/${encodeURIComponent(r.poster.display_name)}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate hover:text-foreground transition-colors"
              >
                {r.poster.display_name}
              </Link>
              <span className="flex items-center gap-1.5 shrink-0">
                {r.poster.verified_claims > 0 && <ShieldCheck className="h-3 w-3 text-emerald-400" />}
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3" />
                  {r.poster.reputation_score}
                </span>
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
};