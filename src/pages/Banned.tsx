import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { format } from "date-fns";

export default function Banned() {
  const { banInfo, signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center bg-gradient-card border-destructive/40">
        <div className="h-16 w-16 mx-auto rounded-full bg-destructive/15 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Account suspended</h1>
        <p className="text-muted-foreground mb-4">
          Your account has been {banInfo?.ban_type === "temporary" ? "temporarily suspended" : "suspended"} by our moderation team.
        </p>
        {banInfo?.reason && (
          <div className="text-left bg-muted/40 rounded-lg p-3 mb-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reason</div>
            <div className="text-sm">{banInfo.reason}</div>
          </div>
        )}
        {banInfo?.expires_at && (
          <p className="text-sm text-muted-foreground mb-4">
            Suspension expires {format(new Date(banInfo.expires_at), "PPP 'at' p")}
          </p>
        )}
        <Button variant="outline" onClick={signOut} className="w-full">Sign out</Button>
      </Card>
    </div>
  );
}