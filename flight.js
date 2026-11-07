import { analyze, G0 } from './calc.js';
import { inst } from './parts.js';
// Vuelo en 2D (plano orbital) alrededor de una Tierra esférica. Posición inercial desde el centro de la Tierra.
export const R = 6371000, MU = 3.986004418e14, TARGET = 200000, HS = 7500;
const CD = 0.35, RATE = 6 * Math.PI / 180, DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export class Flight {
  constructor(stack) {
    this.a = analyze(stack); this.stages = this.a.stages; this.si = 0; this.prop = this.stages[0].prop;
    this.area = Math.PI * Math.max(...stack.map(e => inst(e).r)) ** 2;
    Object.assign(this, { t: -5, x: 0, y: R, vx: 0, vy: 0, phi: Math.PI / 2, phase: 'countdown', thr: 0, wait: 0, F: 0, p: 1, q: 0, th: 1,
      events: [], debris: [], done: false, result: null, maxAlt: 0, maxV: 0, maxQ: 0, exhausted: false, fault: false, faultT: 25 + Math.random() * 90 });
    this.log('Cuenta atrás iniciada');
  }
  log(msg) { this.events.push({ t: this.t, msg }); }
  mass() { let m = this.prop + this.stages[this.si].dry; for (let i = this.si + 1; i < this.stages.length; i++) m += this.stages[i].wet; return m; }
  fuelLeft() { let f = this.stages[this.si].F > 0 ? this.prop : 0; for (let i = this.si + 1; i < this.stages.length; i++) if (this.stages[i].F > 0) f += this.stages[i].prop; return f; }
  orbit() {
    const r = Math.hypot(this.x, this.y), v2 = this.vx ** 2 + this.vy ** 2, en = v2 / 2 - MU / r, hh = this.x * this.vy - this.y * this.vx;
    if (en >= 0) return { a: Infinity, ecc: 9, pe: -R, ap: Infinity };
    const a = -MU / (2 * en), ecc = Math.sqrt(Math.max(0, 1 + 2 * en * hh * hh / (MU * MU)));
    return { a, ecc, pe: a * (1 - ecc) - R, ap: a * (1 + ecc) - R };
  }
  finish(ok, title, text) { this.done = true; this.thr = 0; this.F = 0; this.result = { ok, title, text }; this.log(title); }
  success(o) { this.finish(true, 'Órbita alcanzada', `Órbita de ${Math.round(o.pe / 1000)} × ${Math.round(o.ap / 1000)} km (perigeo × apogeo).`); this.phase = 'orbit'; }

  step(dt) {
    if (this.done) return;
    this.t += dt;
    if (this.t < 0) return;
    if (this.fault && this.t > this.faultT) { this.finish(false, 'Fallo a bordo', this.fault); return; }
    if (this.phase === 'countdown') { this.phase = 'ascent'; this.thr = 1; this.log('Ignición de motores'); }
    const r = Math.hypot(this.x, this.y), h = r - R, ux = this.x / r, uy = this.y / r;
    const vr = this.vx * ux + this.vy * uy, vt = this.vx * uy - this.vy * ux, v = Math.hypot(this.vx, this.vy);
    const o = this.orbit(), m = this.mass(), s = this.stages[this.si];
    const tilt = th => Math.atan2(uy * Math.cos(th) - ux * Math.sin(th), ux * Math.cos(th) + uy * Math.sin(th));
    let tgt = Math.atan2(this.vy, this.vx);
    if (v < 20) tgt = this.phi;

    if (this.phase === 'ascent') {
      if (h < 60000) tgt = tilt(h < 1000 ? 0 : Math.PI / 2 * Math.sqrt(clamp((h - 1000) / 69000, 0, 1)));
      else tgt = tilt(Math.PI / 2 + clamp(0.5 * (vr - clamp((TARGET - h) * 0.015, -20, 80)), -40, 40) * DEG);
      if (o.ap >= TARGET && h > 70000) { this.thr = 0; this.phase = 'coast'; this.log(`Corte de motor, apoapsis ${Math.round(o.ap / 1000)} km`); }
    } else if (this.phase === 'coast') {
      if (o.pe >= 140000) this.success(o);
      else if (!this.fuelLeft()) this.phase = 'drift';
      else if (o.a > 0 && isFinite(o.a)) {
        const rap = o.a * (1 + o.ecc), vap = Math.sqrt(MU * (2 / rap - 1 / o.a)), dvc = Math.sqrt(MU / rap) - vap;
        const bs = this.stages.slice(this.si).find((q, i) => q.F > 0 && (i || this.prop > 0)) || s;
        const tb = dvc * m / (bs.F * 1000), tApo = vr > 0 ? vr / Math.max(0.5, MU / (r * r) - vt * vt / r) : 0;
        if (tApo <= tb / 2) { this.phase = 'circ'; this.thr = 1; this.log('Encendido de circularización'); }
      }
    } else if (this.phase === 'circ') {
      tgt = tilt(Math.PI / 2 + clamp(0.4 * vr, -25, 25) * DEG);
      if (o.pe >= TARGET - 10000) { this.thr = 0; this.success(o); return; }
    } else if (this.phase === 'drift' && o.pe >= 120000) { this.success(o); return; }

    // cambio de etapa
    if (this.thr && this.wait <= 0 && (this.prop <= 0 || s.F <= 0)) {
      if (this.si < this.stages.length - 1) {
        this.debris.push({ parts: s.parts, x: this.x, y: this.y, vx: this.vx - 2 * Math.cos(this.phi), vy: this.vy - 2 * Math.sin(this.phi), phi: this.phi });
        this.log(`Separación de la etapa ${s.n}`); this.si++; this.prop = this.stages[this.si].prop; this.wait = 1.5;
        return;
      }
      this.thr = 0; this.exhausted = true; this.log('Combustible agotado');
      if (this.phase === 'ascent' || this.phase === 'circ') this.phase = 'drift';
    }
    // empuje y consumo
    let F = 0; this.p = Math.exp(-Math.max(h, 0) / HS);
    if (this.thr && this.wait <= 0 && this.prop > 0 && s.F > 0) {
      const Fn0 = (s.FSL + (s.F - s.FSL) * (1 - this.p)) * 1000, qn = 0.5 * 1.225 * this.p * v * v;
      // aceleración máxima 4 g y reducción de empuje en Max-Q
      this.th = clamp(Math.min((45000 - qn) / 15000, 4 * G0 * m / Fn0), 0.2, 1);
      const Fn = Fn0 * this.th, isp = s.ispSL + (s.isp - s.ispSL) * (1 - this.p), mdot = Fn / (isp * G0);
      const dm = Math.min(mdot * dt, this.prop); F = Fn * dm / (mdot * dt); this.prop -= dm;
    }
    if (this.wait > 0) this.wait -= dt;
    this.F = F;
    this.phi += clamp(wrap(tgt - this.phi), -RATE * dt, RATE * dt);

    let ax = -MU * ux / (r * r) + F / m * Math.cos(this.phi), ay = -MU * uy / (r * r) + F / m * Math.sin(this.phi);
    const q = 0.5 * 1.225 * Math.exp(-Math.max(h, 0) / HS) * v * v; this.q = q;
    if (v > 0) { const D = q * CD * this.area; ax -= D / m * this.vx / v; ay -= D / m * this.vy / v; }
    if (h <= 0.01 && vr <= 0.01 && ax * ux + ay * uy <= 0) { ax = ay = 0; this.vx = this.vy = 0; }
    this.vx += ax * dt; this.vy += ay * dt; this.x += this.vx * dt; this.y += this.vy * dt;

    for (const d of this.debris) if (!d.dead) {
      const dr = Math.hypot(d.x, d.y), g = MU / (dr * dr);
      d.vx -= g * d.x / dr * dt; d.vy -= g * d.y / dr * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (Math.hypot(d.x, d.y) < R) d.dead = true;
    }
    const nh = Math.hypot(this.x, this.y) - R, nv = Math.hypot(this.vx, this.vy);
    this.maxAlt = Math.max(this.maxAlt, nh); this.maxV = Math.max(this.maxV, nv); if (this.phase === 'ascent') this.maxQ = Math.max(this.maxQ, q);
    if (this.maxAlt < 1 && this.t > 10) this.finish(false, 'No despega', 'El empuje no supera al peso del cohete. Revisa la relación empuje/peso en el Hangar.');
    else if (this.maxAlt > 50 && nh <= 0) this.finish(false, this.exhausted ? 'Trayectoria suborbital' : 'Impacto', this.exhausted ? `Sin combustible: el cohete cayó tras alcanzar ${Math.round(this.maxAlt / 1000)} km. Faltó Δv.` : 'El cohete ha impactado contra la superficie.');
    else if (this.t > 7200) this.finish(false, 'Misión perdida', 'Se agotó el tiempo de la misión.');
  }
}
