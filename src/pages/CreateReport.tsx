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
import { Upload, Loader2 } from "lucide-react";

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

  const [type, setType] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [locationText, setLocationText] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        setImagePreview(data.image_url);
      }
    })();
  }, [editing, id]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.success("Location captured");
      },
      () => toast.error("Could not get location")
    );
  };

  const handleFile = (f: File | null) => {
    setImageFile(f);
    if (f) setImagePreview(URL.createObjectURL(f));
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
      let image_url: string | null = imagePreview ?? null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("report-images")
          .upload(path, imageFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("report-images").getPublicUrl(path);
        image_url = data.publicUrl;
      }

      if (editing) {
        const { error } = await supabase
          .from("reports")
          .update({ ...parsed.data, image_url: image_url ?? undefined })
          .eq("id", id!);
        if (error) throw error;
        toast.success("Report updated");
      } else {
        const { data, error } = await supabase
          .from("reports")
          .insert({ ...parsed.data, image_url: image_url ?? undefined, user_id: user.id })
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Report posted");
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
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        {editing ? "Edit report" : "Create a report"}
      </h1>
      <p className="text-muted-foreground mb-6">
        Provide as much detail as possible — it helps the community find a match.
      </p>
      <Card className="p-6 shadow-card">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label className="mb-2 block">Type</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as "lost" | "found")} className="grid grid-cols-2 gap-3">
              <label className={`cursor-pointer rounded-lg border-2 p-4 transition-smooth ${type === "lost" ? "border-[hsl(var(--lost))] bg-[hsl(var(--lost))]/5" : "border-border"}`}>
                <RadioGroupItem value="lost" className="sr-only" />
                <div className="font-semibold">I lost something</div>
                <div className="text-xs text-muted-foreground">Help others recognize it</div>
              </label>
              <label className={`cursor-pointer rounded-lg border-2 p-4 transition-smooth ${type === "found" ? "border-[hsl(var(--found))] bg-[hsl(var(--found))]/5" : "border-border"}`}>
                <RadioGroupItem value="found" className="sr-only" />
                <div className="font-semibold">I found something</div>
                <div className="text-xs text-muted-foreground">Help reunite it with its owner</div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="e.g. Black leather wallet" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} placeholder="Distinguishing marks, contents, color, brand…" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date {type === "lost" ? "lost" : "found"}</Label>
              <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc">Location</Label>
            <Input id="loc" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="e.g. Central Park, near the fountain" />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
                Use my current location
              </Button>
              {(latitude && longitude) && (
                <span className="text-xs text-muted-foreground">
                  📍 {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-smooth">
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="max-h-48 rounded" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload an image</span>
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

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Save changes" : "Post report"}
          </Button>
        </form>
      </Card>
    </div>
  );
}