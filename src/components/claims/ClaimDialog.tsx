import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Upload, Loader2 } from "lucide-react";

interface Props {
  reportId: string;
  ownerId: string;
  proofQuestions: string[];
  trigger?: React.ReactNode;
}

export const ClaimDialog = ({ reportId, ownerId, proofQuestions, trigger }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<string[]>(() => proofQuestions.map(() => ""));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (f: File | null) => {
    setImageFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (proofQuestions.length > 0 && answers.some((a) => !a.trim())) {
      toast.error("Please answer all proof questions");
      return;
    }
    setSubmitting(true);
    try {
      let proof_image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("claim-images")
          .upload(path, imageFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        proof_image_url = supabase.storage.from("claim-images").getPublicUrl(path).data.publicUrl;
      }
      const payload = proofQuestions.map((q, i) => ({ question: q, answer: answers[i].trim().slice(0, 1000) }));
      const { error } = await supabase.from("claims").insert({
        report_id: reportId,
        claimant_id: user.id,
        owner_id: ownerId,
        answers: payload,
        proof_image_url,
      });
      if (error) throw error;
      toast.success("Claim submitted — the owner will review it.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit claim");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <ShieldCheck className="h-4 w-4 mr-2" /> Claim this item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit a claim</DialogTitle>
          <DialogDescription>
            Provide proof of ownership. The owner will review and approve or reject your claim.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {proofQuestions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              The owner didn't set proof questions. Upload a photo or any evidence that helps confirm ownership.
            </p>
          )}
          {proofQuestions.map((q, i) => (
            <div key={i} className="space-y-2">
              <Label>{q}</Label>
              <Textarea
                rows={2}
                maxLength={1000}
                value={answers[i] ?? ""}
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
                placeholder="Your answer"
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label>Verification photo (optional)</Label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-smooth">
              {preview ? (
                <img src={preview} alt="proof" className="max-h-40 rounded" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Upload a photo proving ownership</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};