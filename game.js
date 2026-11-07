import { PARTS } from './parts.js';
import { MISSIONS, EVENTS } from './gamedata.js';
const KEY = 'dn.game', OPS = 5000, TERM = 32, BUDGETS = [22000, 26000, 32000];
const clamp = v => Math.min(100, Math.max(0, v)), N = n => Math.round(n).toLocaleString('es-ES');
const fresh = () => ({ q: 0, money: 1500, budget: 25000, support: 60, opinion: 65, rep: 55, staff: 70, offers: [], active: null, used: [], flags: {}, crewed: false, pending: null, over: null,
  stats: { launches: 0, ok: 0, fail: 0, done: 0, spent: 0, lost: 0 }, log: ['Asumes la dirección de la NASA tras Artemis II.'] });
const load = () => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return fresh(); } };

export const G = {
  s: load(),
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* sin almacenamiento */ } },
  reset() { this.s = fresh(); this.offer(); this.save(); },
  label() { const i = 3 + this.s.q; return `T${i % 4 + 1} ${2026 + Math.floor(i / 4)}`; },
  cost(stack) { return Math.round(stack.reduce((a, e) => a + PARTS[e.id].cost * (e.k || 1), 0)); },
  note(t) { this.s.log.unshift(`${this.label()}: ${t}`); this.s.log.length = Math.min(this.s.log.length, 40); },
  fx(f = {}) {
    const s = this.s; s.money += f.money || 0;
    for (const k of ['support', 'opinion', 'rep', 'staff']) s[k] = clamp(s[k] + (f[k] || 0));
    if (s.support <= 10 && !s.over) s.over = 'Has perdido la confianza del Congreso y de la Casa Blanca: te destituyen.';
  },
  offer() {
    const s = this.s, ids = new Set([...s.offers.map(o => o.id), s.active && s.active.id]), pool = MISSIONS.filter(m => !ids.has(m.id));
    while (s.offers.length < 3 && pool.length) { const m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; s.offers.push({ ...m, due: s.q + m.dl }); }
  },
  accept(id) {
    const s = this.s, i = s.offers.findIndex(o => o.id === id); if (i < 0 || s.active) return;
    s.active = s.offers.splice(i, 1)[0]; this.note(`Aceptas el contrato «${s.active.name}».`); this.save();
  },
  next() {
    const s = this.s; if (s.pending || s.over) return;
    s.q++; const inc = Math.round(s.budget / 4 - OPS); s.money += inc;
    this.note(`Ingresos del trimestre: ${inc >= 0 ? '+' : ''}${N(inc)} M$ (presupuesto ${N(s.budget)} M$ al año, operaciones ${N(OPS)} M$ al trimestre).`);
    s.opinion += Math.sign(50 - s.opinion) * Math.min(2, Math.abs(50 - s.opinion)); s.staff = clamp(s.staff + (s.staff < 70 ? 1 : 0));
    if (s.active && s.q > s.active.due) { this.note(`Contrato «${s.active.name}» incumplido.`); this.fx({ support: -3, rep: -3, opinion: -2 }); s.active = null; }
    s.offers = s.offers.filter(o => s.q <= o.due); this.offer();
    if (s.money < 0) { this.note('Déficit: el Congreso critica tu gestión.'); this.fx({ support: -4, opinion: -2 }); }
    if ((3 + s.q) % 4 === 0) s.pending = { type: 'budget' };
    else if (Math.random() < 0.7) {
      let pool = EVENTS.filter(e => !s.used.includes(e.id)); if (!pool.length) { s.used = []; pool = EVENTS; }
      const ev = pool[Math.floor(Math.random() * pool.length)]; s.used.push(ev.id); s.pending = { type: 'event', id: ev.id };
    }
    if (s.q >= TERM && !s.over) s.over = 'Tu mandato ha terminado: ocho años al frente de la agencia.';
    this.save();
  },
  dialog() {
    const p = this.s.pending; if (!p) return null;
    if (p.type === 'budget') return { title: 'Presupuesto anual', text: `Propones el presupuesto al Congreso. Con tu apoyo político actual (${Math.round(this.s.support)}) no te concederán todo lo que pidas.`,
      choices: BUDGETS.map((b, i) => ({ label: `Pedir ${N(b)} M$`, desc: ['Prudente: probable que te lo concedan casi entero.', 'Equilibrado.', 'Ambicioso: más dinero posible, pero el Congreso puede recortarlo.'][i] })) };
    return EVENTS.find(e => e.id === p.id);
  },
  resolve(i) {
    const s = this.s, p = s.pending; if (!p) return;
    if (p.type === 'budget') {
      const prop = BUDGETS[i], g = Math.round(prop * (0.7 + 0.3 * s.support / 100) * (0.95 + Math.random() * 0.1) / 100) * 100;
      s.budget = g; this.note(`Pides ${N(prop)} M$ y el Congreso concede ${N(g)} M$ al año.`); this.fx({ opinion: i === 2 ? 2 : 0, support: g < prop * 0.9 ? -2 : 0 });
    } else {
      const ev = EVENTS.find(e => e.id === p.id), c = ev.choices[i]; this.note(`${ev.title}: ${c.label}.`); this.fx(c.fx);
      if (c.flag) s.flags[c.flag] = true;
      if (c.mission && !s.active && !s.offers.some(o => o.id === c.mission)) s.offers.unshift({ ...MISSIONS.find(m => m.id === c.mission), due: s.q + 4 });
    }
    s.pending = null; this.save();
  },
  check(stack) {
    const s = this.s, c = this.cost(stack), crew = s.active && s.active.req === 'capsule' && stack.some(e => e.id === 'capsule');
    const [label, cls] = c > s.money ? ['NO-GO', 'bad'] : c > s.money * 0.6 ? ['PRECAUCIÓN', 'warn'] : ['GO', 'ok'];
    return { name: 'Presupuesto', label, cls, ok: c <= s.money, detail: `Coste ${N(c)} M$ de ${N(s.money)} M$` + (crew ? ' · Tripulación a bordo' : '') };
  },
  onGo(stack) {
    const s = this.s, c = this.cost(stack); s.money -= c; s.stats.launches++; s.stats.spent += c;
    s.crewed = !!(s.active && s.active.req === 'capsule' && stack.some(e => e.id === 'capsule'));
    const fault = !!s.flags.swRisk && Math.random() < 0.5; delete s.flags.swRisk;
    this.note(`Lanzamiento de «${s.crewed ? 'misión tripulada' : 'cohete'}» (${N(c)} M$).`); this.save(); return { fault };
  },
  onResult(stack, ok) {
    const s = this.s; let txt;
    if (ok) {
      s.stats.ok++; const a = s.active, has = id => stack.some(e => e.id === id);
      if (a && (a.req === 'any' ? has('probe') || has('capsule') : has(a.req))) {
        this.fx(a.reward); s.stats.done++; s.active = null; const r = a.reward;
        txt = `Contrato «${a.name}» cumplido.` + Object.entries({ money: 'M$', opinion: 'opinión', support: 'apoyo', rep: 'reputación' }).filter(([k]) => r[k]).map(([k, u]) => ` +${r[k]} ${u}`).join(',');
      } else { this.fx({ opinion: 1 }); txt = 'Lanzamiento exitoso, pero sin un contrato activo que cumplir (la carga o el contrato no coinciden).'; }
    } else {
      s.stats.fail++; this.fx({ support: -4, opinion: -6, rep: -3 }); txt = 'El fracaso pasa factura: menos apoyo político, opinión y reputación.';
      if (s.crewed) { s.stats.lost += 3; this.fx({ support: -12, opinion: -18, rep: -8 }); txt = 'Se ha perdido la tripulación (3 astronautas). Habrá una investigación y el golpe político es enorme.'; }
    }
    s.crewed = false; this.note(txt); this.save(); return txt;
  },
  legacy() {
    const s = this.s, st = s.stats;
    return [['Exploración', `${st.done} contratos cumplidos`], ['Seguridad', `${st.lost} vidas perdidas`],
      ['Sostenibilidad', st.launches ? `${N(st.spent / st.launches)} M$ por lanzamiento` : 'sin lanzamientos'], ['Influencia', `reputación ${Math.round(s.rep)}`], ['Vuelos', `${st.ok} éxitos, ${st.fail} fallos`]];
  },
};
G.offer();
