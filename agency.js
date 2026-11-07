import { G } from './game.js';
const $ = s => document.querySelector(s);
const el = (t, txt, cls) => { const e = document.createElement(t); if (txt) e.textContent = txt; if (cls) e.className = cls; return e; };
const N = n => Math.round(n).toLocaleString('es-ES');
const REQ = { probe: 'Requiere una sonda como carga', capsule: 'Requiere una cápsula (con tripulación)', any: 'Sirve cualquier carga útil' };
const BARS = [['support', 'Apoyo político'], ['opinion', 'Opinión pública'], ['rep', 'Reputación internacional'], ['staff', 'Moral del personal']];
const RW = { money: 'M$', opinion: 'opinión', support: 'apoyo', rep: 'reputación' };

export class Agency {
  constructor(onClose) {
    this.onClose = onClose;
    $('#ag-close').onclick = () => this.close();
    $('#ag-next').onclick = () => { G.next(); this.render(); };
    $('#ag-new').onclick = () => { if (confirm('¿Empezar una partida nueva? Se perderá el progreso actual.')) { G.reset(); this.render(); } };
  }
  open() { $('#agency').hidden = false; this.render(); }
  close() { $('#agency').hidden = true; this.onClose(); }
  render() {
    const s = G.s;
    $('#ag-title').textContent = `Dirección de la NASA · ${G.label()}`;
    $('#ag-next').disabled = !!(s.pending || s.over);
    const st = $('#ag-stats'); st.replaceChildren(el('div', `${N(s.money)} M$`, 'money'), el('small', `Presupuesto anual: ${N(s.budget)} M$`, 'tip'));
    BARS.forEach(([k, l]) => { const b = el('div', '', 'bar'), i = el('i'); i.style.width = `${s[k]}%`; if (s[k] < 25) i.className = 'low'; b.append(i); st.append(el('div', `${l}: ${Math.round(s[k])}`, 'bl'), b); });
    const ms = $('#ag-missions'); ms.replaceChildren();
    const card = (m, active) => {
      const c = el('div', '', 'card' + (active ? ' active' : '')), left = m.due - s.q;
      const rw = Object.entries(RW).filter(([k]) => m.reward[k]).map(([k, u]) => `+${m.reward[k]} ${u}`).join(' · ');
      c.append(el('b', (active ? 'Contrato activo: ' : '') + m.name), el('p', m.text), el('small', `${REQ[m.req]} · Recompensa: ${rw} · Plazo: ${left} trimestre${left === 1 ? '' : 's'}`));
      const b = el('button', active ? 'Ir al Hangar y lanzar' : 'Aceptar contrato', active ? 'primary' : ''); b.disabled = !active && !!s.active;
      b.onclick = () => { if (active) this.close(); else { G.accept(m.id); this.render(); } }; c.append(b); return c;
    };
    if (s.active) ms.append(card(s.active, true));
    s.offers.forEach(m => ms.append(card(m, false)));
    if (!s.active) ms.prepend(el('p', 'Elige un contrato, diseña un cohete que sirva para él y lánzalo. Un cohete más barato ahorra dinero, pero cada fallo cuesta apoyo político.', 'tip'));
    $('#ag-news').replaceChildren(...s.log.slice(0, 14).map(t => el('li', t)));
    const lg = $('#ag-legacy'); lg.replaceChildren(...G.legacy().map(([a, b]) => { const d = el('div'); d.append(el('b', a + ': '), document.createTextNode(b)); return d; }));
    const dlg = $('#ag-dialog'), d = s.over ? { title: 'Fin del mandato', text: s.over, choices: [{ label: 'Nueva partida', desc: 'Empezar de cero.', over: true }] } : G.dialog();
    dlg.hidden = !d; if (!d) return;
    dlg.replaceChildren(el('h2', d.title), el('p', d.text), ...(s.over ? G.legacy().map(([a, b]) => el('p', `${a}: ${b}`, 'tip')) : []),
      ...d.choices.map((c, i) => { const b = el('button', '', 'choice'); b.append(el('b', c.label), el('small', c.desc)); b.onclick = () => { if (c.over) G.reset(); else G.resolve(i); this.render(); }; return b; }));
  }
}
