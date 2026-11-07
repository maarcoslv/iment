import { G, DAY, START, END } from './game.js';
import { PHASES, clock } from './control.js';

const $ = s => document.querySelector(s), N = n => Math.round(n).toLocaleString('es-ES');
const h = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; kids.flat().filter(k => k !== null && k !== undefined && k !== false).forEach(k => e.append(k)); return e; };
const btn = (txt, cls, fn) => { const b = h('button', cls, txt); b.onclick = fn; return b; };
const AREAS = [['finance', 'Finanzas y política'], ['hangar', 'Hangar 3D y planos'], ['software', 'Software de a bordo'], ['science', 'Ciencia e instrumentos'], ['flight', 'Operaciones de vuelo'],
  ['staff', 'Personal y astronautas'], ['infra', 'Infraestructura'], ['ext', 'Relaciones externas'], ['comm', 'Comunicación pública'], ['safety', 'Seguridad y riesgo']];
const SPEEDS = [['Pausa', 0], ['1×', 1], ['60×', 60], ['1 día/s', 86400], ['1 sem/s', 604800]];
const ALLOC = [['rd', 'I+D', '#4fc3e8', 'Sube el nivel tecnológico, que abarata los lanzamientos.'], ['launches', 'Lanzamientos', '#f4a43a', 'Lo que queda libre para pagar lanzamientos. No se gasta solo.'],
  ['ops', 'Operaciones', '#8fa3ee', 'Mantiene y mejora la fiabilidad con el tiempo.'], ['infra', 'Infraestructura', '#6fd39a', 'Abarata los lanzamientos y acorta el reacondicionamiento de la rampa.'],
  ['staff', 'Personal', '#c58be8', 'Mantiene la moral del personal.']];
const STATS = [['Dinero', s => `${N(s.money)} M$`, 'Fondos disponibles. Cada lanzamiento se paga al pulsar GO.'], ['Apoyo político', s => `${Math.round(s.support)} %`, 'Respaldo del Congreso y la Casa Blanca. Si cae por debajo de 11, te destituyen.'],
  ['Opinión pública', s => `${Math.round(s.opinion)} %`, 'Entusiasmo ciudadano: volátil. Con el tiempo arrastra al apoyo político.'], ['Nivel tecnológico', s => `Nv. ${s.tech}`, 'Sube con la inversión en I+D y abarata los lanzamientos.'],
  ['Fiabilidad', s => `${Math.round(s.fiab)} %`, 'Experiencia acumulada. Cuanto más alta, menos riesgo de fallo a bordo.'], ['Personal', s => N(s.staffN), 'Plantilla de la agencia.'],
  ['Rep. internacional', s => `${Math.round(s.rep)} %`, 'Confianza de socios y competidores.']];
const REQ = { probe: 'Requiere una sonda como carga', capsule: 'Requiere una cápsula (con tripulación)', any: 'Sirve cualquier carga útil' };
const RW = { money: 'M$', opinion: 'opinión', support: 'apoyo', rep: 'reputación' };
const SOON = { software: ['Fase 4', 'Aquí elegirás quién programa el software de a bordo y con qué controles de calidad. Cada equipo tiene rasgos propios y de tu decisión depende que la nave actúe bien cuando nadie puede intervenir.'],
  science: ['Fase 5', 'Elegirás los instrumentos de cada sonda, fijarás prioridades científicas y verás cómo los datos generan descubrimientos, publicaciones y apoyo público.'],
  flight: ['Fase 5', 'Planificarás ventanas de lanzamiento, trayectorias y fases de la misión. Por ahora, la supervisión se hace desde la sala de control.'],
  infra: ['Fase 5', 'Centros, rampas, bancos de pruebas, salas limpias y antenas de espacio profundo. Invertir abarata y acelera el futuro, pero cuesta hoy. De momento, el porcentaje de infraestructura del presupuesto ya reduce costes y el tiempo de reacondicionamiento de la rampa.'],
  ext: ['Fase 5', 'Empresas privadas, agencias internacionales y competidores estatales: comprar servicios, competir o colaborar.'],
  comm: ['Fase 5', 'Anuncios, ruedas de prensa, metas públicas y transparencia tras un fallo.'],
  safety: ['Fase 5', 'Definirás el nivel de riesgo aceptable (más tolerancia acelera todo, pero puede costar vidas) y gestionarás las investigaciones tras los accidentes.'] };

export class Shell {
  constructor(room, hangar, refreshHangar) {
    Object.assign(this, { room, hangar, refreshHangar, view: 'dash', speed: 1, modal: false, last: 0, rev: -1, lastDash: 0, endShown: false });
    this.cards = STATS.map(([l, fn, tip]) => { const b = h('b', '', '—'), c = h('div', 'sc', h('small', '', l), b); c.title = tip; $('#stats-top').append(c); return [fn, b]; });
    this.clk = h('b'); $('#clock').replaceChildren(h('small', '', 'Fecha'), this.clk);
    const nav = $('#nav'), nb = (k, l) => { const b = h('button', 'n', l); b.dataset.v = k; b.onclick = () => this.go(k); return b; };
    this.cr = h('button'); this.cr.id = 'cr';
    this.cr.onclick = () => { if (this.room.live) { this.hangar.paused = true; this.room.show(); } else this.go('hangar'); };
    nav.append(h('h3', '', 'DIRECCIÓN'), nb('dash', 'Panel de dirección'), h('h3', '', 'ÁREAS'), ...AREAS.map(([k, l]) => nb(k, l)), h('div', 'grow'), this.cr);
    $('#speeds').replaceChildren(...SPEEDS.map(([l, v]) => { const b = h('button', 'sp', l); b.dataset.s = v; b.onclick = () => this.setSpeed(v); return b; }));
    this.setSpeed(1);
    this.frame = t => {
      requestAnimationFrame(this.frame);
      const dt = Math.min(0.25, (t - (this.last || t)) / 1000); this.last = t; const s = G.s;
      if (this.speed && !this.room.live && !this.modal && !s.over) { G.advance(dt * this.speed * 1000); if (G.pauseReq) this.setSpeed(0); }
      if (!s.over) this.endShown = false; else if (!this.endShown) { this.endShown = true; this.showEnd(); }
      const typing = this.view === 'finance' && document.activeElement && document.activeElement.type === 'range';
      if (G.rev !== this.rev) { this.rev = G.rev; this.renderInbox(); if (!typing) this.render(); }
      else if (this.view === 'dash' && t - this.lastDash > 2000 && !this.modal) this.render();
      this.upd();
    };
  }
  start() { this.go('dash'); requestAnimationFrame(this.frame); }
  setSpeed(v) { this.speed = v; document.querySelectorAll('#speeds .sp').forEach(b => b.classList.toggle('on', +b.dataset.s === v)); }

  go(v) {
    this.view = v; const hg = v === 'hangar';
    $('#v-hangar').hidden = !hg; $('#v-main').hidden = hg; $('#shell').classList.toggle('wide', hg); $('#inbox').hidden = hg;
    this.hangar.paused = !hg; if (hg) setTimeout(() => this.hangar.resize(), 0);
    document.querySelectorAll('#nav .n').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    this.renderInbox(); this.render();
  }
  render() {
    if (this.view === 'hangar') { this.refreshHangar(); return; }
    const f = this['v_' + this.view]; $('#v-main').replaceChildren(...(f ? f.call(this) : this.soon(this.view))); this.lastDash = performance.now();
  }

  upd() {
    const s = G.s; this.cards.forEach(([fn, b]) => { b.textContent = fn(s); }); this.cards[0][1].classList.toggle('neg', s.money < 0);
    this.clk.textContent = `${G.date()} · ${G.time()}`;
    const f = Math.min(1, Math.max(0, (s.now - START) / (END - START))); $('#tb-fill').style.width = `${f * 100}%`; $('#tb-knob').style.left = `${f * 100}%`;
    $('#tb-next').textContent = this.next();
    this.cr.textContent = this.room.live ? 'Sala de control · 1 misión en curso' : 'Sala de control · sin misiones'; this.cr.className = this.room.live ? '' : 'idle';
  }
  next() {
    const s = G.s; if (this.room.live) return 'Misión en vuelo: el tiempo del juego está en pausa.';
    const y = new Date(s.now).getUTCFullYear(); let b = Date.UTC(y, 11, 31); if (b <= s.now) b = Date.UTC(y + 1, 11, 31);
    const p = []; if (s.active) p.push(`plazo del contrato «${s.active.name}» en ${Math.ceil((s.active.due - s.now) / DAY)} días`);
    p.push(`presupuesto anual en ${Math.ceil((b - s.now) / DAY)} días`); return `Próximo hito: ${p.join(' · ')}`;
  }

  renderInbox() {
    const items = G.s.inbox, K = { decision: ['DECISIÓN', 'd'], budget: ['DECISIÓN', 'd'], urgent: ['URGENTE', 'u'], news: ['NOTICIA', 'n'] };
    $('#inbox').replaceChildren(h('h2', '', `Bandeja de eventos · ${items.length}`), ...items.map(it => {
      const k = K[it.kind], left = it.exp ? Math.max(0, Math.ceil((it.exp - G.s.now) / DAY)) : 0;
      return h('div', 'ev', h('div', 'k ' + k[1], k[0]), h('p', '', it.text), it.kind !== 'news' && h('small', '', `Plazo: ${left} días`), it.kind !== 'news' && btn('Responder', '', () => this.openItem(it)));
    }), !items.length && h('p', 'tip', 'Sin eventos pendientes.'));
  }
  openItem(it) {
    const d = G.dialog(it), left = Math.max(0, Math.ceil((it.exp - G.s.now) / DAY)); this.modal = true; const m = $('#modal'); m.hidden = false;
    m.replaceChildren(h('div', 'box', h('h2', '', d.title), h('p', '', d.text), h('p', 'tip', `Si no respondes en ${left} días se aplicará la última opción${it.kind === 'budget' ? ' (equilibrada)' : ''}.`),
      ...d.choices.map((c, i) => { const b = h('button', 'choice', h('b', '', c.label), h('small', '', c.desc)); b.onclick = () => { G.respond(it.id, i); this.closeModal(); }; return b; }),
      btn('Decidir más tarde', 'choice', () => this.closeModal())));
  }
  closeModal() { $('#modal').hidden = true; this.modal = false; this.rev = -1; }
  showEnd() {
    this.modal = true; const m = $('#modal'); m.hidden = false;
    m.replaceChildren(h('div', 'box', h('h2', '', 'Fin del mandato'), h('p', '', G.s.over), ...G.legacy().map(([a, b]) => h('p', 'tip', `${a}: ${b}`)), btn('Nueva partida', 'choice primary', () => { G.reset(); this.closeModal(); })));
  }

  budgetCard() {
    const s = G.s, seg = h('div', 'seg'), leg = h('div', 'leg');
    ALLOC.forEach(([k, l, c]) => { const i = h('i'); i.style.flexGrow = G.share(k); i.style.background = c; seg.append(i); leg.append(h('span', '', `${l} ${Math.round(G.share(k))} %`)); });
    return h('div', 'card', h('div', 'chead', h('h2', '', 'Reparto del presupuesto anual'), h('span', 'dim', `Concedido: ${N(s.budget)} M$ de ${N(s.proposed)} M$ propuestos`)), seg, leg);
  }
  v_dash() {
    const s = G.s, a = s.active, r = this.room, prog = h('div', 'card', h('h2', '', 'Programas activos'));
    if (a) {
      const f = Math.min(1, Math.max(0, (a.due - s.now) / (a.due - a.since))), risk = f > 0.5 ? ['Riesgo bajo', 'ok'] : f > 0.25 ? ['Riesgo medio', 'warn'] : ['Riesgo alto', 'hot'], bar = h('div', 'pbar', h('i'));
      bar.firstChild.style.width = `${(1 - f) * 100}%`;
      prog.append(h('div', 'prog', h('div', 'phead', h('b', '', a.name), h('span', 'r ' + risk[1], risk[0])), h('div', 'dim', `Fase: ${r.live ? 'lanzamiento en curso' : 'diseño y preparación del lanzador'} · quedan ${Math.ceil((a.due - s.now) / DAY)} días`), bar, btn('Ir al Hangar', 'outline', () => this.go('hangar'))));
    } else prog.append(h('p', 'tip', 'No tienes ningún contrato activo. Acepta uno de los disponibles, diseña un cohete que sirva para él y lánzalo.'));
    prog.append(h('h2', '', 'Contratos disponibles'), ...s.offers.map(o => h('div', 'offer', h('b', '', o.name), h('p', '', o.text),
      h('small', '', `${REQ[o.req]} · Recompensa: ${Object.entries(RW).filter(([k]) => o.reward[k]).map(([k, u]) => `+${o.reward[k]} ${u}`).join(' · ')} · Plazo: ${o.dl} días`),
      (() => { const b = btn('Aceptar contrato', '', () => { G.accept(o.id); }); b.disabled = !!s.active; return b; })())), !s.offers.length && h('p', 'tip', 'Ahora mismo no hay contratos nuevos.'));
    const live = h('div', 'card', h('h2', '', 'Misión en directo'));
    if (r.live && r.f) live.append(h('b', '', `${r.name} · ${r.f.done ? 'finalizada' : 'en vuelo'}`), h('p', 'dim', `Fase: ${PHASES[r.f.phase]} · ${clock(r.f.t)} · altitud ${Math.round((Math.hypot(r.f.x, r.f.y) - 6371000) / 1000)} km`), btn('Abrir sala de control', 'outline', () => { this.hangar.paused = true; r.show(); }));
    else live.append(h('p', 'tip', 'No hay ninguna misión en vuelo. Diseña un cohete en el Hangar y lánzalo desde allí.'), btn('Preparar un lanzamiento', 'outline', () => this.go('hangar')));
    const goals = h('div', 'card', h('h2', '', 'Metas públicas'), h('p', 'tip', 'Aún no has anunciado ninguna. Fijar objetivos públicos (por ejemplo, «pisar Marte antes de 2040») dará apoyo político y prestigio, pero arriesga tu reputación si fallas. Llegará en la Fase 5.'));
    return [h('h1', '', 'Panel de dirección'), h('p', 'sub', 'Resumen en tiempo real: el tiempo avanza solo mientras diriges.'), this.budgetCard(), h('div', 'cols', prog, h('div', 'stackc', live, goals))];
  }
  v_finance() {
    const s = G.s, fin = this.fin = { bar: h('div', 'seg'), info: h('p', 'tip') };
    ALLOC.forEach(([, , c]) => { const i = h('i'); i.style.background = c; fin.bar.append(i); });
    const rows = ALLOC.map(([k, l, c, e]) => {
      const r = h('input'); Object.assign(r, { type: 'range', min: 0, max: 60, step: 1, value: s.alloc[k] }); r.ariaLabel = l; fin[k] = h('b'); const dot = h('i', 'dot'); dot.style.background = c;
      r.oninput = () => { s.alloc[k] = +r.value; G.save(); this.updFin(); }; return h('div', 'arow', h('span', '', dot, l), r, fin[k], h('small', 'tip', e));
    });
    const card = h('div', 'card', h('div', 'chead', h('h2', '', 'Presupuesto anual'), h('span', 'dim', `Concedido: ${N(s.budget)} M$ de ${N(s.proposed)} M$ propuestos`)), fin.bar,
      h('p', 'tip', 'Mueve los controles: el reparto se normaliza a 100 %. Lo que no gastas en áreas queda libre para lanzamientos.'), ...rows, fin.info);
    this.updFin();
    return [h('h1', '', 'Finanzas y política'), h('p', 'sub', 'El presupuesto se negocia con el Congreso cada 31 de diciembre.'), card,
      h('div', 'card', h('h2', '', 'Registro'), h('ol', 'loglist', ...s.log.slice(0, 20).map(t => h('li', '', t)))), btn('Nueva partida', '', () => { if (confirm('¿Empezar una partida nueva? Se perderá el progreso actual.')) { G.reset(); this.render(); } })];
  }
  updFin() {
    const f = this.fin; ALLOC.forEach(([k], i) => { f[k].textContent = `${Math.round(G.share(k))} %`; f.bar.children[i].style.flexGrow = G.share(k); });
    f.info.textContent = `Gasto diario: ${N(G.overhead())} M$ · Reservado para lanzamientos al año: ${N(G.s.budget * G.share('launches') / 100)} M$ · Coste de los lanzamientos: ×${G.costMult().toFixed(2)} (infraestructura y tecnología)`;
  }
  v_staff() {
    const s = G.s, bar = h('div', 'pbar', h('i')); bar.firstChild.style.width = `${s.morale}%`;
    return [h('h1', '', 'Personal y astronautas'), h('p', 'sub', 'Plantilla, moral y carga de trabajo.'), h('div', 'card', h('div', 'kv', h('span', '', 'Plantilla'), h('b', '', N(s.staffN))), h('div', 'kv', h('span', '', 'Moral'), h('b', '', `${Math.round(s.morale)} %`)), bar,
      h('p', 'tip', 'La moral depende del porcentaje de presupuesto dedicado a personal y de tus decisiones. Contratación, formación y selección de tripulaciones llegarán en la Fase 5.'))];
  }
  soon(v) {
    const [ph, text] = SOON[v] || ['Fase 5', 'Esta área llegará más adelante.'], title = AREAS.find(a => a[0] === v)[1];
    return [h('h1', '', title), h('p', 'sub', `Disponible en la ${ph} de la hoja de ruta.`), h('div', 'card', h('p', '', text), v === 'flight' && btn('Abrir sala de control', 'outline', () => this.cr.click()))];
  }
}
