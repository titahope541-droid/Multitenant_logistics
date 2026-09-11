"use client";

/**
 * Animated logistics network: hub points connected by great-route arcs,
 * with shipment particles travelling along them. Pure canvas — no deps,
 * respects prefers-reduced-motion (renders one static frame instead).
 */

import { useEffect, useRef } from "react";

interface Hub {
  x: number; // 0..1 relative
  y: number;
}
interface Arc {
  from: Hub;
  to: Hub;
  ctrl: { x: number; y: number };
  progress: number;
  speed: number;
}

const HUBS: Hub[] = [
  { x: 0.08, y: 0.62 },
  { x: 0.22, y: 0.3 },
  { x: 0.38, y: 0.72 },
  { x: 0.5, y: 0.22 },
  { x: 0.63, y: 0.58 },
  { x: 0.78, y: 0.34 },
  { x: 0.92, y: 0.66 },
];

const LINKS: Array<[number, number]> = [
  [0, 1],
  [1, 3],
  [3, 5],
  [5, 6],
  [0, 2],
  [2, 4],
  [4, 6],
  [1, 4],
];

function qPoint(a: Arc, t: number, w: number, h: number) {
  const x0 = a.from.x * w;
  const y0 = a.from.y * h;
  const cx = a.ctrl.x * w;
  const cy = a.ctrl.y * h;
  const x1 = a.to.x * w;
  const y1 = a.to.y * h;
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * cx + t * t * x1,
    y: u * u * y0 + 2 * u * t * cy + t * t * y1,
  };
}

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const arcs: Arc[] = LINKS.map(([a, b], i) => {
      const from = HUBS[a];
      const to = HUBS[b];
      return {
        from,
        to,
        ctrl: { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 0.18 - (i % 3) * 0.045 },
        progress: Math.random(),
        speed: 0.0016 + Math.random() * 0.0016,
      };
    });

    let width = 0;
    let height = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawArcs() {
      for (const arc of arcs) {
        ctx!.beginPath();
        ctx!.moveTo(arc.from.x * width, arc.from.y * height);
        ctx!.quadraticCurveTo(arc.ctrl.x * width, arc.ctrl.y * height, arc.to.x * width, arc.to.y * height);
        ctx!.strokeStyle = "rgba(120, 135, 160, 0.14)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }
    }

    function drawHubs() {
      for (const hub of HUBS) {
        const x = hub.x * width;
        const y = hub.y * height;
        ctx!.beginPath();
        ctx!.arc(x, y, 2, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(142, 154, 172, 0.55)";
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx!.strokeStyle = "rgba(142, 154, 172, 0.18)";
        ctx!.stroke();
      }
    }

    function drawParticles() {
      for (const arc of arcs) {
        arc.progress += arc.speed;
        if (arc.progress > 1) arc.progress = 0;
        // trailing glow
        for (let i = 0; i < 8; i++) {
          const t = arc.progress - i * 0.012;
          if (t <= 0) continue;
          const p = qPoint(arc, t, width, height);
          const alpha = 0.5 * (1 - i / 8);
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 1.6 - i * 0.15, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255, 92, 26, ${alpha})`;
          ctx!.fill();
        }
      }
    }

    function frame() {
      ctx!.clearRect(0, 0, width, height);
      drawArcs();
      drawHubs();
      drawParticles();
      raf = window.requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      ctx.clearRect(0, 0, width, height);
      drawArcs();
      drawHubs();
    } else {
      frame();
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_78%,transparent)]"
    />
  );
}
