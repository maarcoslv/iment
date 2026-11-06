import { PARTS } from './parts.js';
const fmt = n => Math.round(n).toLocaleString('es-ES');

// Vista lateral en estilo plano: líneas blancas sobre azul, con cotas.
export function drawBlueprint(c, stack, a, name) {
  const W = c.width, H = c.height, x = c.getContext('2d'), fs = Math.max(11, W / 85);
  x.fillStyle = '#0b3a75'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(255,255,255,.09)'; x.lineWidth = 1;
  for (let i = 0; i < W; i += 25) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  for (let i = 0; i < H; i += 25) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
  x.font = `${fs}px ui-monospace, Consolas, monospace`; x.fillStyle = x.strokeStyle = '#fff'; x.lineWidth = 1.6;
  if (!stack.length) { x.fillText('Sin piezas. Añade piezas desde el catálogo.', 30, 40); return; }

  const top = 50, bot = H - 60, maxR = Math.max(...stack.map(id => PARTS[id].r));
  const s = Math.min((bot - top) / a.height, (W * 0.28) / maxR), cx = W * 0.3;
  let y = bot;
  x.setLineDash([10, 5, 2, 5]); x.beginPath(); x.moveTo(cx, top - 20); x.lineTo(cx, bot + 20); x.stroke(); x.setLineDash([]);
  const xr = cx + maxR * s + 45;
  for (let i = stack.length - 1; i >= 0; i--) {
    const id = stack[i], p = PARTS[id], h = p.h * s;
    const [rt, rb] = p.kind === 'engine' ? [p.r * .35, p.r] : id === 'capsule' ? [p.r * .2, p.r] : id === 'probe' ? [p.r * .6, p.r] : [p.r, p.r];
    x.fillStyle = '#0b3a75'; x.beginPath();
    x.moveTo(cx - rt * s, y - h); x.lineTo(cx + rt * s, y - h); x.lineTo(cx + rb * s, y); x.lineTo(cx - rb * s, y); x.closePath();
    x.fill(); x.stroke();
    // cota: línea vertical con marcas y texto
    x.beginPath(); x.moveTo(xr, y); x.lineTo(xr, y - h);
    x.moveTo(xr - 5, y); x.lineTo(xr + 5, y); x.moveTo(xr - 5, y - h); x.lineTo(xr + 5, y - h); x.stroke();
    x.beginPath(); x.setLineDash([3, 4]); x.moveTo(cx + rb * s, y - h / 2); x.lineTo(xr, y - h / 2); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#fff'; x.fillText(`${p.name}`, xr + 12, y - h / 2 - 2);
    x.fillStyle = '#b9d6ff';
    const extra = p.prop ? ` · comb. ${fmt(p.prop)} kg` : p.thrust ? ` · ${fmt(p.thrust)} kN` : '';
    x.fillText(`${p.h} m · ${fmt(p.mass)} kg${extra}`, xr + 12, y - h / 2 + fs);
    x.fillStyle = '#fff'; y -= h;
  }
  // cota de altura total a la izquierda
  const xl = cx - maxR * s - 40;
  x.beginPath(); x.moveTo(xl, bot); x.lineTo(xl, bot - a.height * s); x.moveTo(xl - 6, bot); x.lineTo(xl + 6, bot);
  x.moveTo(xl - 6, bot - a.height * s); x.lineTo(xl + 6, bot - a.height * s); x.stroke();
  x.save(); x.translate(xl - 8, (bot + bot - a.height * s) / 2); x.rotate(-Math.PI / 2); x.textAlign = 'center';
  x.fillText(`${a.height.toFixed(1)} m`, 0, 0); x.restore();

  // cuadro de datos
  const bw = Math.min(W * 0.34, 380), bx = W - bw - 20, lines = [
    `Plano: ${name}`, 'Vista lateral', `Masa total ${fmt(a.mass)} kg`, `Empuje/peso ${a.twr.toFixed(2)}  ·  Δv ${fmt(a.dv)} m/s`,
    ...a.stages.map(t => `Etapa ${t.n}: Δv ${fmt(t.dv)} m/s, ${fmt(t.wet)} kg`)];
  const bh = lines.length * fs * 1.5 + 14, by = H - bh - 20;
  x.strokeRect(bx, by, bw, bh);
  lines.forEach((t, i) => x.fillText(t, bx + 10, by + 8 + fs * 1.5 * (i + 1) - fs * .3, bw - 20));
}
