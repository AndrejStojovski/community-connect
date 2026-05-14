import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";
import { Loader2, Plus, X, ImagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";

const schema = z.object({
  type: z.enum(["lost", "found"]),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(2000),
  category: z.string().min(1),
  location_text: z.string().trim().min(2).max(200),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  event_date: z.string().min(1),
});

export default function CreateReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const { t } = useTranslation();

  const [type, setType] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [locationText, setLocationText] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [proofQuestions, setProofQuestions] = useState<string[]>([]);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const { data } = await supabase.from("reports").select("*").eq("id", id!).maybeSingle();
      if (data) {
        setType(data.type);
        setTitle(data.title);
        setDescription(data.description);
        setCategory(data.category);
        setLocationText(data.location_text);
        setLatitude(data.latitude?.toString() ?? "");
        setLongitude(data.longitude?.toString() ?? "");
        setEventDate(data.event_date);
        const imgs: string[] = (data as { images?: string[] }).images ?? [];
        setExistingImages(imgs.length ? imgs : (data.image_url ? [data.image_url] : []));
        setProofQuestions(((data as { proof_questions?: string[] }).proof_questions) ?? []);
      }
    })();
  }, [editing, id]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("report.geoUnsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.success(t("report.locationCaptured"));
      },
      () => toast.error(t("report.locationError"))
    );
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const slots = 5 - existingImages.length - newFiles.length;
    const arr = Array.from(files).slice(0, Math.max(0, slots));
    setNewFiles((prev) => [...prev, ...arr]);
    setNewPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
  };
  const removeExisting = (url: string) => setExistingImages((prev) => prev.filter((u) => u !== url));
  const removeNew = (i: number) => {
    setNewFiles((prev) => prev.filter((_, j) => j !== i));
    setNewPreviews((prev) => prev.filter((_, j) => j !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = {
      type, title, description, category,
      location_text: locationText,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      event_date: eventDate,
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const f of newFiles) {
        const ext = f.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("report-images")
          .upload(path, f, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("report-images").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }
      const allImages = [...existingImages, ...uploadedUrls].slice(0, 5);
      const image_url = allImages[0] ?? null;

      const dbRow = {
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        location_text: parsed.data.location_text,
        event_date: parsed.data.event_date,
        latitude: parsed.data.latitude ?? undefined,
        longitude: parsed.data.longitude ?? undefined,
        image_url: image_url ?? undefined,
        images: allImages,
        proof_questions: proofQuestions.map((q) => q.trim()).filter(Boolean).slice(0, 3),
      };

      if (editing) {
        const { error } = await supabase.from("reports").update(dbRow).eq("id", id!);
        if (error) throw error;
        toast.success(t("report.updated"));
      } else {
        const { data, error } = await supabase
          .from("reports")
          .insert({ ...dbRow, user_id: user.id })
          .select("id")
          .single();
        if (error) throw error;
        toast.success(t("report.posted"));
        navigate(`/reports/${data.id}`);
        return;
      }
      navigate("/my-reports");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
        {editing ? t("report.edit") : t("report.create")}
      </h1>
      <p className="text-muted-foreground mb-6">{t("report.createSubtitle")}</p>
      <Card className="p-4 md:p-6 shadow-card">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label className="mb-2 block">{t("report.type")}</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as "lost" | "found")} className="grid grid-cols-2 gap-3">
              <label className={`cursor-pointer rounded-lg border-2 p-4 transition-smooth ${type === "lost" ? "border-[hsl(var(--lost))] bg-[hsl(var(--lost))]/5" : "border-border"}`}>
                <RadioGroupItem value="lost" className="sr-only" />
                <div className="font-semibold">{t("report.iLost")}</div>
                <div className="text-xs text-muted-foreground">{t("report.iLostHint")}</div>
              </label>
              <label className={`cursor-pointer rounded-lg border-2 p-4 transition-smooth ${type === "found" ? "border-[hsl(var(--found))] bg-[hsl(var(--found))]/5" : "border-border"}`}>
                <RadioGroupItem value="found" className="sr-only" />
                <div className="font-semibold">{t("report.iFound")}</div>
                <div className="text-xs text-muted-foreground">{t("report.iFoundHint")}</div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t("report.title")}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder={t("report.titlePlaceholder")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">{t("report.description")}</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} placeholder={t("report.descPlaceholder")} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("report.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder={t("report.selectCategory")} /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{type === "lost" ? t("report.dateLost") : t("report.dateFound")}</Label>
              <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc">{t("report.location")}</Label>
            <Input id="loc" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder={t("report.locationPlaceholder")} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
                {t("report.useMyLocation")}
              </Button>
              {(latitude && longitude) && (
                <span className="text-xs text-muted-foreground">
                  📍 {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("report.images")}</Label>
            <p className="text-xs text-muted-foreground">{t("report.imagesHint")}</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {existingImages.map((url) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExisting(url)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {newPreviews.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-primary/40 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNew(i)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {existingImages.length + newPreviews.length < 5 && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/40 hover:border-primary/40 transition-smooth text-muted-foreground">
                  <ImagePlus className="h-6 w-6 mb-1" />
                  <span className="text-[11px]">{t("report.addImage")}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          {type === "found" && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t("report.proofQuestions")}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{t("report.proofHint")}</p>
                </div>
                {proofQuestions.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProofQuestions([...proofQuestions, ""])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> {t("report.addQuestion")}
                  </Button>
                )}
              </div>
              {proofQuestions.map((q, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={q}
                    maxLength={200}
                    placeholder={t("report.questionPlaceholder", { n: i + 1 })}
                    onChange={(e) => {
                      const next = [...proofQuestions];
                      next[i] = e.target.value;
                      setProofQuestions(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setProofQuestions(proofQuestions.filter((_, j) => j !== i))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? t("report.saveChanges") : t("report.post")}
          </Button>
        </form>
      </Card>
    </div>
  );
}