import { PARTS } from './parts.js';
import { MISSIONS, EVENTS } from './gamedata.js';
// Tiempo continuo: la fecha del juego avanza en milisegundos y la economía se procesa día a día.
export const DAY = 86400000, START = Date.UTC(2026, 10, 7, 14, 32), END = Date.UTC(2034, 10, 7, 14, 32);
const KEY = 'dn.game2', BUDGETS = [22000, 26000, 32000];
const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v)), N = n => Math.round(n).toLocaleString('es-ES'), R = (a, b) => a + Math.random() * (b - a);
const fresh = () => ({ now: START, money: 6000, budget: 25000, proposed: 25000, alloc: { rd: 30, launches: 28, ops: 20, infra: 12, staff: 10 },
  support: 62, opinion: 70, rep: 66, fiab: 71, morale: 70, staffN: 17900, tech: 3, techP: 0, offers: [], active: null, used: [], flags: {}, crewed: false,
  padUntil: 0, nextOffer: START + 3 * DAY, nextEvent: START + 5 * DAY, budgetYear: 2026, seq: 2, over: null,
  inbox: [{ id: 1, kind: 'news', title: 'Artemis II', text: 'La tripulación de Artemis II ha regresado con éxito. La opinión pública está en máximos.', exp: START + 15 * DAY }],
  stats: { launches: 0, ok: 0, fail: 0, done: 0, spent: 0, lost: 0 }, log: ['Asumes la dirección de la NASA tras Artemis II.'] });
const load = () => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return fresh(); } };

export const G = {
  s: load(), rev: 0, pauseReq: false,
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* sin almacenamiento */ } },
  reset() { this.s = fresh(); this.offer(); this.rev++; this.save(); },
  share(k) { const a = this.s.alloc, t = Object.values(a).reduce((x, y) => x + y, 0) || 1; return a[k] / t * 100; },
  costMult() { return clamp(1.1 - this.share('infra') / 100, 0.8, 1.2) * (1 - 0.02 * (this.s.tech - 1)); },
  cost(stack) { return Math.round(stack.reduce((a, e) => a + PARTS[e.id].cost * (e.k || 1), 0) * this.costMult()); },
  overhead() { return this.s.budget / 365 * (100 - this.share('launches')) / 100; },
  date() { return new Date(this.s.now).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', ''); },
  time() { return new Date(this.s.now).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); },
  note(t) { this.s.log.unshift(`${this.date()}: ${t}`); this.s.log.length = Math.min(this.s.log.length, 60); },
  fx(f = {}) {
    const s = this.s; s.money += f.money || 0; s.staffN += f.staffN || 0;
    for (const k of ['support', 'opinion', 'rep']) s[k] = clamp(s[k] + (f[k] || 0));
    s.morale = clamp(s.morale + (f.staff || 0));
    if (s.support <= 10 && !s.over) s.over = 'Has perdido la confianza del Congreso y de la Casa Blanca: te destituyen.';
  },
  offer() {
    const s = this.s, ids = new Set([...s.offers.map(o => o.id), s.active && s.active.id]), pool = MISSIONS.filter(m => !ids.has(m.id));
    while (s.offers.length < 3 && pool.length) { const m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; s.offers.push({ ...m, exp: s.now + 45 * DAY }); }
  },
  accept(id) {
    const s = this.s, i = s.offers.findIndex(o => o.id === id); if (i < 0 || s.active) return;
    const o = s.offers.splice(i, 1)[0]; s.active = { ...o, since: s.now, due: s.now + o.dl * DAY }; this.note(`Aceptas el contrato «${o.name}».`); this.rev++; this.save();
  },
  push(it) { const s = this.s; it.id = s.seq++; s.inbox.unshift(it); this.rev++; if (it.kind !== 'news') this.pauseReq = true; },
  spawn() {
    const s = this.s; let pool = EVENTS.filter(e => !s.used.includes(e.id)); if (!pool.length) { s.used = []; pool = EVENTS; }
    const ev = pool[Math.floor(Math.random() * pool.length)]; s.used.push(ev.id);
    if (ev.kind === 'news') { this.fx(ev.fx); this.push({ kind: 'news', title: ev.title, text: ev.text, exp: s.now + 20 * DAY }); }
    else this.push({ kind: ev.kind, evId: ev.id, title: ev.title, text: ev.text, exp: s.now + (ev.kind === 'urgent' ? 14 : 30) * DAY });
  },
  day() {
    const s = this.s, d = new Date(s.now), sh = k => this.share(k);
    s.money -= this.overhead();
    s.techP += 0.137 * sh('rd') / 30;
    if (s.techP >= 100 && s.tech < 10) { s.tech++; s.techP -= 100; this.note(`Avance tecnológico: Nv. ${s.tech}.`); this.push({ kind: 'news', title: 'Avance tecnológico', text: `Tus equipos de I+D alcanzan el nivel tecnológico ${s.tech}.`, exp: s.now + 20 * DAY }); }
    s.morale += (clamp(40 + sh('staff') * 3) - s.morale) * 0.01;
    s.fiab = clamp(s.fiab + (clamp(40 + sh('ops') * 1.5) - s.fiab) * 0.002);
    s.opinion += Math.sign(50 - s.opinion) * Math.min(0.03, Math.abs(50 - s.opinion));
    if (s.money < 0) { s.support = clamp(s.support - 0.05); if (d.getUTCDate() === 1) this.note('Déficit: el Congreso critica tu gestión.'); }
    if (s.support <= 10 && !s.over) s.over = 'Has perdido la confianza del Congreso y de la Casa Blanca: te destituyen.';
    if (s.active && s.now > s.active.due) { this.note(`Contrato «${s.active.name}» incumplido.`); this.fx({ support: -3, rep: -3, opinion: -2 }); s.active = null; this.rev++; }
    const n = s.offers.length; s.offers = s.offers.filter(o => o.exp > s.now); if (s.offers.length !== n) this.rev++;
    if (s.now >= s.nextOffer) { this.offer(); s.nextOffer = s.now + R(10, 25) * DAY; this.rev++; }
    if (s.now >= s.nextEvent) { this.spawn(); s.nextEvent = s.now + R(12, 35) * DAY; }
    if (d.getUTCMonth() === 11 && d.getUTCDate() === 31 && s.budgetYear <= d.getUTCFullYear()) {
      s.budgetYear = d.getUTCFullYear() + 1; this.push({ kind: 'budget', title: 'Presupuesto anual', text: 'Es hora de proponer al Congreso el presupuesto del próximo año.', exp: s.now + 20 * DAY });
    }
    for (const it of [...s.inbox]) if (it.exp && s.now >= it.exp) {
      this.rev++;
      if (it.kind === 'news') { s.inbox = s.inbox.filter(x => x !== it); continue; }
      const dl = this.dialog(it); this.note(`Sin respuesta a «${dl.title}»: se aplica la opción por defecto.`);
      this.respond(it.id, it.kind === 'budget' ? 1 : dl.choices.length - 1);
    }
  },
  advance(ms) {
    const s = this.s; this.pauseReq = false;
    while (ms > 0 && !s.over && !this.pauseReq) {
      const next = (Math.floor(s.now / DAY) + 1) * DAY, step = Math.min(ms, next - s.now);
      s.now += step; ms -= step; if (s.now >= next) this.day();
    }
    if (s.now >= END && !s.over) s.over = 'Tu mandato ha terminado: ocho años al frente de la agencia.';
    if (this.rev % 7 === 0 || this.pauseReq) this.save();
  },
  dialog(it) {
    if (it.kind === 'budget') return { title: 'Presupuesto anual', text: `Propones el presupuesto al Congreso. Con tu apoyo político actual (${Math.round(this.s.support)} %) no te concederán todo lo que pidas.`,
      choices: BUDGETS.map((b, i) => ({ label: `Pedir ${N(b)} M$`, desc: ['Prudente: probable que te lo concedan casi entero.', 'Equilibrado.', 'Ambicioso: más dinero posible, pero el Congreso puede recortarlo.'][i] })) };
    return EVENTS.find(e => e.id === it.evId);
  },
  respond(id, i) {
    const s = this.s, k = s.inbox.findIndex(x => x.id === id); if (k < 0) return; const it = s.inbox.splice(k, 1)[0]; this.rev++;
    if (it.kind === 'budget') {
      const prop = BUDGETS[i], g = Math.round(prop * (0.7 + 0.3 * s.support / 100) * (0.95 + Math.random() * 0.1) / 100) * 100;
      s.budget = g; s.proposed = prop; s.money += g; this.note(`Pides ${N(prop)} M$ y el Congreso concede ${N(g)} M$ para el año.`); this.fx({ opinion: i === 2 ? 2 : 0, support: g < prop * 0.9 ? -2 : 0 });
    } else {
      const ev = this.dialog(it), c = ev.choices[i]; this.note(`${ev.title}: ${c.label}.`); this.fx(c.fx);
      if (c.flag) s.flags[c.flag] = true;
      if (c.mission && !s.active && !s.offers.some(o => o.id === c.mission)) s.offers.unshift({ ...MISSIONS.find(m => m.id === c.mission), dl: 90, exp: s.now + 45 * DAY });
    }
    this.save();
  },
  check(stack) {
    const s = this.s, c = this.cost(stack), crew = s.active && s.active.req === 'capsule' && stack.some(e => e.id === 'capsule');
    if (s.now < s.padUntil) return { name: 'Rampa', label: 'NO-GO', cls: 'bad', ok: false, detail: `En reacondicionamiento: faltan ${Math.ceil((s.padUntil - s.now) / DAY)} días` };
    const [label, cls] = c > s.money ? ['NO-GO', 'bad'] : c > s.money * 0.6 ? ['PRECAUCIÓN', 'warn'] : ['GO', 'ok'];
    return { name: 'Presupuesto', label, cls, ok: c <= s.money, detail: `Coste ${N(c)} M$ de ${N(s.money)} M$` + (crew ? ' · Tripulación a bordo' : '') };
  },
  onGo(stack) {
    const s = this.s, c = this.cost(stack); s.money -= c; s.stats.launches++; s.stats.spent += c;
    s.crewed = !!(s.active && s.active.req === 'capsule' && stack.some(e => e.id === 'capsule'));
    let fault = null;
    if (s.flags.swRisk && Math.random() < 0.5) fault = 'El software de a bordo perdió el control del cohete. Era el defecto que se había advertido.';
    else if (Math.random() < 0.2 * (1 - s.fiab / 100)) fault = 'Un componente falló en pleno vuelo. Es el riesgo de operar con poca experiencia acumulada.';
    delete s.flags.swRisk; this.note(`Lanzamiento ${s.crewed ? 'tripulado' : 'de un cohete'} (${N(c)} M$).`); this.rev++; this.save(); return { fault };
  },
  onResult(stack, ok) {
    const s = this.s; let txt; s.padUntil = s.now + clamp(21 - this.share('infra') * 0.7, 7, 21) * DAY;
    if (ok) {
      s.stats.ok++; s.fiab = clamp(s.fiab + 1.5); const a = s.active, has = id => stack.some(e => e.id === id);
      if (a && (a.req === 'any' ? has('probe') || has('capsule') : has(a.req))) {
        this.fx(a.reward); s.stats.done++; s.active = null; const r = a.reward;
        txt = `Contrato «${a.name}» cumplido.` + Object.entries({ money: 'M$', opinion: 'opinión', support: 'apoyo', rep: 'reputación' }).filter(([k]) => r[k]).map(([k, u]) => ` +${r[k]} ${u}`).join(',');
      } else { this.fx({ opinion: 1 }); txt = 'Lanzamiento exitoso, pero sin un contrato activo que cumplir (la carga o el contrato no coinciden).'; }
    } else {
      s.stats.fail++; s.fiab = clamp(s.fiab - 4); this.fx({ support: -4, opinion: -6, rep: -3 }); txt = 'El fracaso pasa factura: menos apoyo político, opinión y reputación.';
      if (s.crewed) { s.stats.lost += 3; this.fx({ support: -12, opinion: -18, rep: -8 }); txt = 'Se ha perdido la tripulación (3 astronautas). Habrá una investigación y el golpe político es enorme.'; }
    }
    s.crewed = false; this.note(txt); this.rev++; this.save(); return txt;
  },
  legacy() {
    const s = this.s, st = s.stats;
    return [['Exploración', `${st.done} contratos cumplidos`], ['Seguridad', `${st.lost} vidas perdidas`],
      ['Sostenibilidad', st.launches ? `${N(st.spent / st.launches)} M$ por lanzamiento` : 'sin lanzamientos'], ['Influencia', `reputación ${Math.round(s.rep)} %`], ['Vuelos', `${st.ok} éxitos, ${st.fail} fallos`]];
  },
};
G.offer();
