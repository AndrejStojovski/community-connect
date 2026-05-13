import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  images: string[];
  alt: string;
}

export const ImageGallery = ({ images, alt }: Props) => {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = { active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 };

  const has = images && images.length > 0;
  if (!has) return null;

  const go = (delta: number) => {
    setActive((a) => (a + delta + images.length) % images.length);
    setZoom(1); setPan({ x: 0, y: 0 });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(1, z + (e.deltaY < 0 ? 0.25 : -0.25))));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    dragging.active = true;
    dragging.startX = e.clientX; dragging.startY = e.clientY;
    dragging.baseX = pan.x; dragging.baseY = pan.y;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.active) return;
    setPan({ x: dragging.baseX + (e.clientX - dragging.startX), y: dragging.baseY + (e.clientY - dragging.startY) });
  };
  const stopDrag = () => { dragging.active = false; };

  return (
    <>
      <div className="space-y-2">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
          <img
            src={images[active]}
            alt={alt}
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={() => { setOpen(true); setZoom(1); setPan({ x: 0, y: 0 }); }}
          />
          <button
            onClick={() => setOpen(true)}
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-card/70 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card/70 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Previous">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card/70 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Next">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-card/70 backdrop-blur-md text-xs">
                {active + 1} / {images.length}
              </div>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={cn(
                  "aspect-square rounded-md overflow-hidden border-2 transition-all",
                  i === active ? "border-primary shadow-glow" : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <img src={src} alt={`${alt} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 bg-black/95 border-none [&>button]:hidden">
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center" onWheel={onWheel}>
            <img
              src={images[active]}
              alt={alt}
              className="max-h-full max-w-full select-none transition-transform"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, cursor: zoom > 1 ? "grab" : "zoom-in" }}
              onClick={() => zoom === 1 && setZoom(2)}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              draggable={false}
            />

            {images.length > 1 && (
              <>
                <button onClick={() => go(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button onClick={() => go(1)} className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white"><ZoomOut className="h-5 w-5" /></button>
              <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs tabular-nums">{Math.round(zoom * 100)}%</div>
              <button onClick={() => setZoom((z) => Math.min(5, z + 0.5))} className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white"><ZoomIn className="h-5 w-5" /></button>
              <button onClick={() => setOpen(false)} className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white"><X className="h-5 w-5" /></button>
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button key={i} onClick={() => { setActive(i); setZoom(1); setPan({ x: 0, y: 0 }); }} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-8 bg-white" : "w-1.5 bg-white/40")} />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};