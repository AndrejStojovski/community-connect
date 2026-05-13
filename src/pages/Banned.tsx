import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export default function Banned() {
  const { banInfo, signOut } = useAuth();
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center bg-gradient-card border-destructive/40">
        <div className="h-16 w-16 mx-auto rounded-full bg-destructive/15 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t("banned.title")}</h1>
        <p className="text-muted-foreground mb-4">
          {banInfo?.ban_type === "temporary" ? t("banned.subtitleTemp") : t("banned.subtitle")}
        </p>
        {banInfo?.reason && (
          <div className="text-left bg-muted/40 rounded-lg p-3 mb-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("banned.reason")}</div>
            <div className="text-sm">{banInfo.reason}</div>
          </div>
        )}
        {banInfo?.expires_at && (
          <p className="text-sm text-muted-foreground mb-4">
            {t("banned.expires")} {format(new Date(banInfo.expires_at), "PPP 'at' p")}
          </p>
        )}
        <Button variant="outline" onClick={signOut} className="w-full">{t("banned.signOut")}</Button>
      </Card>
    </div>
  );
}