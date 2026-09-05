"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";

export function SignaturePad({
  onChange,
  disabled,
}: {
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const point = useRef({ x: 60, y: 120 });
  function line(x: number, y: number) {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.strokeStyle = "#172033";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(point.current.x, point.current.y);
    context.lineTo(x, y);
    context.stroke();
    point.current = { x, y };
  }
  function position(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * 720) / rect.width,
      y: ((event.clientY - rect.top) * 240) / rect.height,
    };
  }
  function finish() {
    if (drawing.current && canvas.current)
      onChange(canvas.current.toDataURL("image/png"));
    drawing.current = false;
  }
  function keyboard(event: KeyboardEvent<HTMLCanvasElement>) {
    if (disabled) return;
    if (event.key === " ") {
      event.preventDefault();
      if (drawing.current) finish();
      else drawing.current = true;
      return;
    }
    if (event.key === "Escape") {
      finish();
      return;
    }
    const delta = {
      ArrowLeft: [-6, 0],
      ArrowRight: [6, 0],
      ArrowUp: [0, -6],
      ArrowDown: [0, 6],
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    const x = Math.min(714, Math.max(6, point.current.x + delta[0]));
    const y = Math.min(234, Math.max(6, point.current.y + delta[1]));
    if (drawing.current) line(x, y);
    else point.current = { x, y };
  }
  return (
    <div className="space-y-3">
      <canvas
        ref={canvas}
        width={720}
        height={240}
        tabIndex={disabled ? -1 : 0}
        aria-label="Draw your signature"
        aria-describedby="signature-instructions"
        className="aspect-[3/1] w-full touch-none rounded-2xl border-2 border-dashed border-slate-400 bg-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
        onPointerDown={(event) => {
          if (disabled || (event.pointerType === "mouse" && event.button !== 0))
            return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          drawing.current = true;
          point.current = position(event);
        }}
        onPointerMove={(event) => {
          if (!disabled && drawing.current) {
            const next = position(event);
            line(next.x, next.y);
          }
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onBlur={finish}
        onKeyDown={keyboard}
      />
      <p
        id="signature-instructions"
        className="text-sm text-[var(--muted-foreground)]"
      >
        Draw with a finger, mouse or stylus. Keyboard: focus the pad, press
        Space to start or stop a stroke, and use arrow keys to draw.
      </p>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => {
          canvas.current?.getContext("2d")?.clearRect(0, 0, 720, 240);
          drawing.current = false;
          onChange("");
        }}
      >
        Clear signature
      </Button>
    </div>
  );
}
