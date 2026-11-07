import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Flight, R } from './flight.js';
import { analyze, DV_LEO } from './calc.js';
import { rocketGroup } from './rocket3d.js';

const $ = s => document.querySelector(s), V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const el = (t, txt, cls) => { const e = document.createElement(t); if (txt) e.textContent = txt; if (cls) e.className = cls; return e; };
const clock = t => { const s = Math.floor(Math.abs(t)); return `T${t < 0 ? '−' : '+'}${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const PHASES = { countdown: 'Cuenta atrás', ascent: 'Ascenso', coast: 'Inercia', circ: 'Circularización', drift: 'Sin propulsión', orbit: 'En órbita' };
const FIELDS = [['t', 'Reloj'], ['ph', 'Fase'], ['alt', 'Altitud'], ['v', 'Velocidad'], ['vr', 'Velocidad vertical'], ['ap', 'Apoapsis'], ['pe', 'Periapsis'],
  ['thr', 'Empuje'], ['st', 'Etapa'], ['fuel', 'Combustible de la etapa'], ['mass', 'Masa'], ['q', 'Presión dinámica']];

export class ControlRoom {
  constructor(hooks) {
    Object.assign(this, { hooks, cam: 'pad', warp: 1, opened: false, running: false, ready: false, acc: 0, t0: 0, dgl: [], tl: {} });
    $('#tele').replaceChildren(...FIELDS.flatMap(([k, l]) => { const dd = el('dd', '—'); this.tl[k] = dd; return [el('dt', l), dd]; }));
    document.querySelectorAll('#cams button').forEach(b => b.onclick = () => this.setCam(b.dataset.cam));
    document.querySelectorAll('#warp button').forEach(b => b.onclick = () => { this.warp = +b.dataset.w; this.markWarp(); });
    $('#ctl-exit').onclick = () => this.close();
    this.loop = t => {
      if (!this.opened) return; requestAnimationFrame(this.loop);
      const dt = Math.min(0.1, (t - (this.t0 || t)) / 1000); this.t0 = t;
      if (this.running && !this.f.done) {
        this.acc += dt * this.warp; let n = 0;
        while (this.acc >= 0.05 && n++ < 400) { this.f.step(0.05); this.acc -= 0.05; }
        if (n >= 400) this.acc = 0;
      }
      this.sync(); this.r.render(this.scene, this.camera);
    };
  }

  init() {
    const box = $('#ctl-view'), r = this.r = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2)); box.prepend(r.domElement);
    r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    const s = this.scene = new THREE.Scene();
    this.day = new THREE.Color(0x78b4ee); this.space = new THREE.Color(0x01030b); s.background = this.day.clone();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 3e7);
    s.add(new THREE.HemisphereLight(0xdbe9ff, 0x2a3a2a, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.position.set(2e5, 1.2e5, 1.5e5); s.add(sun);
    // La Tierra: océano (esfera) y una isla de lanzamiento (casquete fino) con el polo superior como rampa.
    const sea = new THREE.Mesh(new THREE.SphereGeometry(R - 150, 384, 192), new THREE.MeshStandardMaterial({ color: 0x1d5c9b, roughness: 0.9 }));
    const land = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40, 0, Math.PI * 2, 0, 0.05), new THREE.MeshStandardMaterial({ color: 0x5b8a4f, roughness: 1 }));
    const air = new THREE.Mesh(new THREE.SphereGeometry(R + 80000, 128, 64), new THREE.MeshBasicMaterial({ color: 0x8cc4ff, transparent: true, opacity: 0.14, depthWrite: false }));
    sea.position.y = land.position.y = air.position.y = -R; s.add(sea, land, air);
    const pts = new Float32Array(7500);
    for (let i = 0; i < 2500; i++) { const a = Math.random() * 6.2832, b = Math.acos(2 * Math.random() - 1); pts.set([1.2e7 * Math.sin(b) * Math.cos(a), 1.2e7 * Math.cos(b), 1.2e7 * Math.sin(b) * Math.sin(a)], i * 3); }
    this.stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pts, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0 }));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 1, 40), new THREE.MeshStandardMaterial({ color: 0x8b919a })); pad.position.y = -0.2;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(5, 95, 5), new THREE.MeshStandardMaterial({ color: 0xc84b32 })); tower.position.set(-26, 47.5, 0);
    s.add(this.stars, pad, tower);
    this.trailPts = new Float32Array(12000);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(this.trailPts, 3)); tg.setDrawRange(0, 0);
    this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); this.trail.frustumCulled = false; s.add(this.trail);
    const fg = new THREE.ConeGeometry(1, 1, 16, 1, true); fg.translate(0, 0.5, 0); fg.rotateX(Math.PI);
    this.flame = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xffa640, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ctl = new OrbitControls(this.camera, r.domElement); this.ctl.enabled = false;
    new ResizeObserver(() => this.resize()).observe(box);
    this.ready = true;
  }
  resize() {
    if (!this.ready) return; const b = $('#ctl-view'), w = b.clientWidth, h = b.clientHeight; if (!w || !h) return;
    this.r.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  fov(v) { if (Math.abs(this.camera.fov - v) > 1e-3) { this.camera.fov = v; this.camera.updateProjectionMatrix(); } }
  markWarp() { document.querySelectorAll('#warp button').forEach(b => b.classList.toggle('on', +b.dataset.w === this.warp)); }
  setCam(n) {
    this.cam = n; this.pc = null; this.ctl.enabled = n === 'free';
    document.querySelectorAll('#cams button').forEach(b => b.classList.toggle('on', b.dataset.cam === n));
    if (n === 'free' && this.f) { this.camera.position.set(this.f.x + 60, this.f.y - R + 30, 90); this.fov(50); }
  }

  open(stack, name) {
    $('#control').hidden = false; if (!this.ready) this.init();
    this.stack = stack.map(e => ({ ...e })); this.name = name; $('#ctl-name').textContent = name;
    this.reset(); this.setCam('pad'); this.warp = 1; this.markWarp(); this.gonogo(); this.resize();
    this.opened = true; this.t0 = 0; requestAnimationFrame(this.loop);
  }
  close() { this.opened = false; this.running = false; $('#control').hidden = true; this.hooks.onClose(); }

  reset() {
    const s = this.scene;
    if (this.rk) s.remove(this.rk);
    this.dgl.forEach(g => s.remove(g)); this.dgl = [];
    const f = this.f = new Flight(this.stack), { group, height, rmax } = rocketGroup(this.stack);
    this.inner = group; this.H0 = height; this.rm = rmax;
    this.rk = new THREE.Group(); this.rk.add(group, this.flame); s.add(this.rk);
    this.sh = f.stages.map(st => st.parts.reduce((a, p) => a + p.h, 0));
    Object.assign(this, { shown: 0, acc: 0, logN: 0, trailN: 0, lastTrail: -99, rep: false, running: false });
    this.trail.geometry.setDrawRange(0, 0); $('#log').replaceChildren(); $('#result').hidden = true;
  }

  gonogo() {
    const a = analyze(this.stack), box = $('#gonogo'); box.hidden = false;
    const st = (v, ok, warn) => v >= ok ? ['GO', 'ok'] : v >= warn ? ['PRECAUCIÓN', 'warn'] : ['NO-GO', 'bad'];
    const obs = a.alerts.filter(x => x[0] !== 'ok');
    const rows = [['Propulsión', ...st(a.twr, 1.3, 1), `Empuje/peso ${a.twr.toFixed(2)}`],
      ['Trayectoria', ...st(a.dv, DV_LEO, 8500), `Δv ${Math.round(a.dv)} m/s de ≈${DV_LEO}`],
      ['Diseño', ...(obs.some(x => x[0] === 'err') ? ['NO-GO', 'bad'] : obs.length ? ['PRECAUCIÓN', 'warn'] : ['GO', 'ok']), obs[0] ? obs[0][1] : 'Sin observaciones']];
    const chk = this.hooks.check && this.hooks.check(this.stack); if (chk) rows.push([chk.name, chk.label, chk.cls, chk.detail]);
    const row = el('div', '', 'row'), go = el('button', 'GO: iniciar cuenta atrás', 'primary'), no = el('button', 'NO-GO: volver al hangar');
    go.disabled = !!chk && !chk.ok;
    go.onclick = () => { box.hidden = true; this.running = true; const g = this.hooks.onGo && this.hooks.onGo(this.stack); if (g && g.fault) this.f.fault = true; }; no.onclick = () => this.close(); row.append(go, no);
    box.replaceChildren(el('h2', 'Votación Go / No-Go'), el('p', 'Los equipos te dan su informe. Tú decides si se lanza.', 'tip'),
      ...rows.map(([n, l, c, d]) => { const r = el('div', '', 'gn'); r.append(el('b', n), el('span', l, c), el('small', d)); return r; }), row);
  }

  sync() {
    const f = this.f, st = f.stages[f.si];
    if (this.shown !== f.si) {
      this.shown = f.si; let i = 0;
      f.stages.forEach((q, k) => { for (let j = 0; j < q.parts.length; j++, i++) this.inner.children[i].visible = k >= f.si; });
      this.inner.position.y = -this.sh.slice(0, f.si).reduce((a, b) => a + b, 0);
    }
    const H = this.H0 - this.sh.slice(0, f.si).reduce((a, b) => a + b, 0);
    const px = f.x, py = f.y - R, cx = Math.cos(f.phi), cy = Math.sin(f.phi), h = Math.hypot(f.x, f.y) - R, rb = st.parts[0].r;
    this.rk.position.set(px, py, 0); this.rk.rotation.z = f.phi - Math.PI / 2;
    this.flame.visible = f.F > 0;
    if (f.F > 0) this.flame.scale.set(rb * 0.9, rb * (4 + 8 * (1 - f.p)) * (0.4 + 0.6 * f.th) * (0.9 + 0.2 * Math.random()), rb * 0.9);
    f.debris.forEach(d => {
      if (d.dead) { if (d.g) { this.scene.remove(d.g); d.g = null; } return; }
      if (!d.g) { d.g = rocketGroup([...d.parts].reverse()).group; this.scene.add(d.g); this.dgl.push(d.g); }
      d.g.position.set(d.x, d.y - R, 0); d.g.rotation.z = d.phi - Math.PI / 2;
    });
    if (f.t > 0 && f.t - this.lastTrail >= 1 && this.trailN < 3990) {
      this.lastTrail = f.t; this.trailPts.set([px, py, 0], this.trailN++ * 3);
      this.trail.geometry.setDrawRange(0, this.trailN); this.trail.geometry.attributes.position.needsUpdate = true;
    }
    this.scene.background.copy(this.day).lerp(this.space, clamp(h / 90000, 0, 1) ** 0.6);
    this.stars.material.opacity = clamp((h - 25000) / 50000, 0, 1);

    const cam = this.camera, c = V(px + cx * H / 2, py + cy * H / 2, 0);
    if (this.cam === 'free') {
      if (this.pc) cam.position.add(c.clone().sub(this.pc));
      this.pc = c.clone(); this.ctl.target.copy(c); this.ctl.update();
    } else {
      cam.up.set(0, 1, 0);
      if (this.cam === 'pad') { cam.position.set(95, 5, 125); cam.lookAt(c); this.fov(clamp(2 * Math.atan(H * 0.9 / cam.position.distanceTo(c)) * 57.3, 0.25, 55)); }
      else if (this.cam === 'follow') { const d = H * 1.6 + 25; cam.position.set(c.x - d * 0.3, c.y + d * 0.1, d); cam.lookAt(c); this.fov(50); }
      else { this.rk.updateMatrixWorld(); cam.position.copy(this.rk.localToWorld(V(0, H * 0.9, this.rm + 1))); cam.lookAt(this.rk.localToWorld(V(0, H * 0.05, this.rm + 10))); this.fov(70); }
    }

    const o = f.orbit(), v = Math.hypot(f.vx, f.vy), vr = (f.vx * f.x + f.vy * f.y) / Math.hypot(f.x, f.y), T = this.tl;
    T.t.textContent = clock(f.t); T.ph.textContent = PHASES[f.phase]; T.alt.textContent = `${(h / 1000).toFixed(1)} km`;
    T.v.textContent = `${Math.round(v)} m/s`; T.vr.textContent = `${Math.round(vr)} m/s`;
    T.ap.textContent = o.ap > 0 && isFinite(o.ap) ? `${Math.round(o.ap / 1000)} km` : '—';
    T.pe.textContent = o.pe >= 0 ? `${Math.round(o.pe / 1000)} km` : 'suborbital';
    T.thr.textContent = f.F > 0 ? `${Math.round(f.th * 100)} %` : '0 %'; T.st.textContent = `${st.n} de ${f.stages.length}`;
    T.fuel.textContent = st.prop ? `${Math.round(f.prop / st.prop * 100)} %` : '—'; T.mass.textContent = `${(f.mass() / 1000).toFixed(1)} t`; T.q.textContent = `${(f.q / 1000).toFixed(1)} kPa`;
    if (this.running || f.done) {
      const log = $('#log');
      while (this.logN < f.events.length) { const e = f.events[this.logN++]; log.append(el('li', `${clock(e.t)}  ${e.msg}`)); log.scrollTop = log.scrollHeight; }
    }
    if (f.done && !this.rep) { this.rep = true; this.running = false; this.result(); }
  }

  result() {
    const f = this.f, r = f.result, box = $('#result'); box.hidden = false;
    box.replaceChildren(el('h2', r.title, r.ok ? 'ok' : 'bad'), el('p', r.text),
      el('p', `Altitud máxima ${Math.round(f.maxAlt / 1000)} km · velocidad máxima ${Math.round(f.maxV)} m/s · Max-Q ${Math.round(f.maxQ / 1000)} kPa · duración ${clock(f.t)}`, 'tip'));
    try {
      const L = JSON.parse(localStorage.getItem('dn.flights')) || []; L.push({ name: this.name, ok: r.ok, d: Date.now() });
      localStorage.setItem('dn.flights', JSON.stringify(L.slice(-200)));
      const mine = L.filter(x => x.name === this.name); box.append(el('p', `Historial de «${this.name}»: ${mine.length} vuelos, ${mine.filter(x => x.ok).length} con éxito.`, 'tip'));
    } catch { /* sin almacenamiento */ }
    const extra = this.hooks.onResult && this.hooks.onResult(this.stack, r.ok); if (extra) box.append(el('p', extra));
    const row = el('div', '', 'row'), back = el('button', 'Volver al hangar', 'primary'), again = el('button', 'Repetir lanzamiento');
    back.onclick = () => this.close(); again.onclick = () => { this.reset(); this.setCam(this.cam); this.gonogo(); }; row.append(back, again); box.append(row);
  }
}
