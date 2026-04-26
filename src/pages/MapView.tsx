import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const lostIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(12,80%,55%);width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});
const foundIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(152,60%,40%);width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

interface Pin {
  id: string;
  type: "lost" | "found";
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  location_text: string;
}

export default function MapView() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [filter, setFilter] = useState<"all" | "lost" | "found">("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reports")
        .select("id,type,title,category,latitude,longitude,location_text")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .neq("status", "archived")
        .limit(500);
      setPins((data ?? []) as Pin[]);
    })();
  }, []);

  const visible = filter === "all" ? pins : pins.filter((p) => p.type === filter);
  const center: [number, number] = visible.length
    ? [visible[0].latitude, visible[0].longitude]
    : [40.7128, -74.006];

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Map view</h1>
          <p className="text-muted-foreground">Browse reports by location</p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
            <TabsTrigger value="found">Found</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="overflow-hidden shadow-card">
        <div className="h-[70vh]">
          <MapContainer center={center} zoom={visible.length ? 12 : 3} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {visible.map((p) => (
              <Marker key={p.id} position={[p.latitude, p.longitude]} icon={p.type === "lost" ? lostIcon : foundIcon}>
                <Popup>
                  <div className="space-y-1">
                    <Badge className={`border-0 ${p.type === "lost" ? "bg-[hsl(var(--lost))]" : "bg-[hsl(var(--found))]"} text-white`}>
                      {p.type.toUpperCase()}
                    </Badge>
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.category} · {p.location_text}</div>
                    <Link to={`/reports/${p.id}`} className="text-xs text-primary underline">View report →</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </Card>
      {visible.length === 0 && (
        <p className="text-center text-muted-foreground mt-4 text-sm">
          No reports with location data yet. Add coordinates when creating a report to see them here.
        </p>
      )}
    </div>
  );
}