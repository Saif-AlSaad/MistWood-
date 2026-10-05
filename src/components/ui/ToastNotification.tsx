import React from "react";
import { Compass } from "lucide-react";

interface ToastNotificationProps {
  toast: { id: number; name: string; line: string } | null;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div
      key={toast.id}
      className="animate-toast pointer-events-none absolute left-1/2 top-14 z-30 -translate-x-1/2 text-center md:top-18 select-none"
    >
      <div className="flex items-center justify-center gap-2 text-amber-200/80 mb-1">
        <Compass className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold tracking-[0.3em] uppercase">
          ENTERING BIOME
        </span>
      </div>

      <div className="font-display text-xl font-bold uppercase tracking-[0.4em] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] md:text-2xl">
        {toast.name}
      </div>

      <div className="mt-1 text-[11px] font-medium tracking-[0.25em] text-amber-100/70 uppercase">
        {toast.line}
      </div>
    </div>
  );
};
