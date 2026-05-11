import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Ban } from "lucide-react";

export const BanDialog = ({ userId, displayName, onDone }: { userId: string; displayName: string; onDone?: () => void }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"temporary" | "permanent" | "warning">("permanent");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !reason.trim()) { toast.error("Reason is required"); return; }
    setBusy(true);
    const expires_at = type === "temporary" ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const { error } = await supabase.from("user_bans").insert({
      user_id: userId,
      ban_type: type,
      reason: reason.trim(),
      notes: notes.trim() || null,
      banned_by: user.id,
      expires_at,
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: type === "warning" ? "warn_user" : "ban_user",
      target_type: "user",
      target_id: userId,
      metadata: { reason, ban_type: type, days: type === "temporary" ? days : null },
    });
    toast.success(`${type === "warning" ? "Warning issued to" : "Banned"} ${displayName}`);
    setBusy(false);
    setOpen(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">
          <Ban className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Moderate</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Moderate {displayName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Action type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="warning">Warning (no restrictions)</SelectItem>
                <SelectItem value="temporary">Temporary ban</SelectItem>
                <SelectItem value="permanent">Permanent ban</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "temporary" && (
            <div>
              <Label>Duration (days)</Label>
              <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
          )}
          <div>
            <Label>Reason (visible to user)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Spam, fraud, harassment" />
          </div>
          <div>
            <Label>Internal notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" disabled={busy} onClick={submit}>
            {busy ? "Applying…" : "Apply action"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};