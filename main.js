import { PARTS, KINDS, inst } from './parts.js';
import { analyze, DV_LEO } from './calc.js';
import { Hangar } from './hangar.js';
import { drawBlueprint } from './blueprint.js';
import { ControlRoom } from './control.js';
import { G } from './game.js';
import { Agency } from './agency.js';

const $ = s => document.querySelector(s), KEY = 'dn.designs';
const fmt = n => Math.round(n).toLocaleString('es-ES');
const norm = a => a.map(e => typeof e === 'string' ? { id: e, k: 1 } : { id: e.id, k: e.k || 1 });
const state = { name: 'Lanzador inicial', sel: -1, stack: norm(['capsule', 'tankS', 'tankM', 'engineV', 'decoupler', 'tankL', 'engineC3']) };
const hangar = new Hangar($('#view3d')), bp = $('#bp');
let view = '3d', hist = [], fut = [];

const lib = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const putLib = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { alert('No se pudo guardar en este navegador.'); } };
const snap = () => JSON.stringify(state.stack);
const record = () => { hist.push(snap()); fut = []; };
const edit = fn => { record(); fn(); refresh(); };
const travel = (from, to) => { if (!from.length) return; to.push(snap()); state.stack = JSON.parse(from.pop()); state.sel = Math.min(state.sel, state.stack.length - 1); refresh(); };
const el = (t, txt, cls) => { const e = document.createElement(t); if (txt) e.textContent = txt; if (cls) e.className = cls; return e; };
const info = e => { const p = inst(e); return `${p.h.toFixed(1)} m · ${fmt(p.mass)} kg · ${fmt(p.cost)} M$` + (p.prop ? ` · ${fmt(p.prop)} kg de combustible` : '') + (p.thrust ? ` · ${fmt(p.thrust)} kN · Isp ${p.isp} s` : ''); };

function buildCatalog() {
  const box = $('#catalog');
  for (const [k, label] of Object.entries(KINDS)) {
    box.append(el('h2', label));
    for (const [id, p] of Object.entries(PARTS)) if (p.kind === k) {
      const b = el('button', p.name, 'part'); b.append(el('small', info({ id })));
      b.onclick = () => edit(() => { const at = state.sel < 0 ? state.stack.length : state.sel + 1; state.stack.splice(at, 0, { id, k: 1 }); state.sel = at; });
      box.append(b);
    }
  }
}

function renderProps() {
  const box = $('#props'); box.replaceChildren();
  const e = state.stack[state.sel];
  if (!e) { box.append(el('p', 'Haz clic en una pieza del cohete (en el 3D o en la lista) para seleccionarla y modificarla.', 'tip')); return; }
  const p = inst(e), inf = el('p', info(e));
  box.append(el('h2', p.name), inf);
  const same = Object.entries(PARTS).filter(([, q]) => q.kind === p.kind);
  if (same.length > 1) {
    const sel = el('select'); sel.ariaLabel = 'Cambiar por otra pieza';
    same.forEach(([id, q]) => { const o = el('option', q.name); o.value = id; o.selected = id === e.id; sel.append(o); });
    sel.onchange = () => edit(() => { state.stack[state.sel] = { id: sel.value, k: 1 }; });
    box.append(el('label', 'Cambiar por'), sel);
  }
  if (p.kind === 'tank') {
    const lab = el('label', `Longitud ×${e.k.toFixed(1)}`), rg = el('input');
    Object.assign(rg, { type: 'range', min: .5, max: 2, step: .1, value: e.k });
    rg.addEventListener('pointerdown', record); rg.addEventListener('keydown', record);
    rg.oninput = () => { e.k = +rg.value; lab.textContent = `Longitud ×${e.k.toFixed(1)}`; inf.textContent = info(e); refresh(true); };
    box.append(lab, rg);
  }
  const mv = d => edit(() => { const j = state.sel + d; if (j < 0 || j >= state.stack.length) return; [state.stack[state.sel], state.stack[j]] = [state.stack[j], state.stack[state.sel]]; state.sel = j; });
  const row = el('div', '', 'row'), act = (t, f, c) => { const b = el('button', t, c); b.onclick = f; row.append(b); };
  act('Subir', () => mv(-1)); act('Bajar', () => mv(1));
  act('Duplicar', () => edit(() => { state.stack.splice(state.sel + 1, 0, { ...e }); state.sel++; }));
  act('Quitar', del, 'danger');
  box.append(row);
}
function del() { if (state.sel >= 0) edit(() => { state.stack.splice(state.sel, 1); state.sel = Math.min(state.sel, state.stack.length - 1); }); }

function refresh(keepProps) {
  const a = analyze(state.stack), cls = (v, lo, hi) => v < lo ? 'bad' : v < hi ? 'warn' : 'good';
  $('#name').value = state.name;
  $('#hud').textContent = `${G.label()} · ${fmt(G.s.money)} M$`;
  $('#undo').disabled = !hist.length; $('#redo').disabled = !fut.length;
  $('#addtip').textContent = state.sel < 0 ? 'Las piezas nuevas se añaden al final. Selecciona una pieza y se añadirán justo debajo.' : `Las piezas nuevas se añaden debajo de «${inst(state.stack[state.sel]).name}».`;
  $('#stats').innerHTML = `<div class="big">
    <div title="Peso del cohete completo con combustible"><b>${fmt(a.mass)} kg</b><span>Masa total</span></div>
    <div class="${cls(a.twr, 1, 1.2)}" title="Por encima de 1,2 despega con soltura"><b>${a.twr.toFixed(2)}</b><span>Empuje/peso al despegar</span></div>
    <div class="${cls(a.dv, DV_LEO, DV_LEO)}" title="Cambio de velocidad total. Órbita baja ≈ ${DV_LEO} m/s"><b>${fmt(a.dv)} m/s</b><span>Δv disponible</span></div>
    <div title="Altura total"><b>${a.height.toFixed(1)} m</b><span>Altura</span></div></div>
    <table><tr><th>Etapa</th><th>Δv m/s</th><th>Empuje kN</th><th>Masa kg</th></tr>
    ${a.stages.map(s => `<tr><td>${s.n}</td><td>${fmt(s.dv)}</td><td>${fmt(s.F)}</td><td>${fmt(s.m0)}</td></tr>`).join('')}</table>
    <p class="tip">Coste del lanzamiento: <b>${fmt(G.cost(state.stack))} M$</b> · Fondos: ${fmt(G.s.money)} M$${G.s.active ? ` · Contrato: ${G.s.active.name}` : ''}</p>`;
  const ul = $('#stack'); ul.replaceChildren();
  state.stack.forEach((e, i) => {
    const li = el('li', '', i === state.sel ? 'sel' : ''), b = el('button', inst(e).name, 'item');
    b.onclick = () => { state.sel = i === state.sel ? -1 : i; refresh(); }; li.append(b); ul.append(li);
  });
  $('#alerts').replaceChildren(...a.alerts.map(([k, t]) => el('li', t, k)));
  if (!keepProps) renderProps();
  hangar.set(state.stack, a.height, state.sel);
  if (view === 'bp') paintBlueprint(a);
  const d = lib(), sl = $('#lib'); sl.replaceChildren();
  Object.keys(d).forEach(n => { const o = el('option', `${n} (v${d[n].v})`); o.value = n; sl.append(o); });
  if (!sl.options.length) { const o = el('option', 'Aún no hay diseños guardados'); o.disabled = true; sl.append(o); }
}

function paintBlueprint(a) {
  const r = bp.getBoundingClientRect(), k = Math.min(devicePixelRatio, 2);
  bp.width = Math.max(300, r.width * k); bp.height = Math.max(300, r.height * k);
  drawBlueprint(bp, state.stack, a || analyze(state.stack), state.name, state.sel);
}

hangar.onPick = i => { state.sel = i; refresh(); };
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  view = b.dataset.v;
  document.querySelectorAll('nav button').forEach(o => o.classList.toggle('on', o === b));
  $('#view3d').hidden = $('#hint').hidden = view !== '3d'; bp.hidden = view !== 'bp';
  if (view === 'bp') paintBlueprint(); else hangar.resize();
});
addEventListener('resize', () => view === 'bp' && paintBlueprint());
addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? travel(fut, hist) : travel(hist, fut); }
  else if (mod && k === 'y') { e.preventDefault(); travel(fut, hist); }
  else if (k === 'delete' || k === 'backspace') del();
  else if (k === 'escape') { state.sel = -1; refresh(); }
});
$('#undo').onclick = () => travel(hist, fut); $('#redo').onclick = () => travel(fut, hist);
$('#name').oninput = e => { state.name = e.target.value.trim() || 'Sin nombre'; };
$('#save').onclick = () => { const d = lib(); d[state.name] = { stack: state.stack.map(e => ({ ...e })), v: (d[state.name]?.v || 0) + 1 }; putLib(d); refresh(); $('#lib').value = state.name; };
$('#load').onclick = () => { const n = $('#lib').value, s = lib()[n]; if (s) edit(() => { state.name = n; state.stack = norm(s.stack); state.sel = -1; }); };
$('#del').onclick = () => { const d = lib(); delete d[$('#lib').value]; putLib(d); refresh(); };
$('#new').onclick = () => edit(() => { state.name = 'Cohete sin nombre'; state.stack = []; state.sel = -1; });
$('#png').onclick = () => {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1000;
  drawBlueprint(c, state.stack, analyze(state.stack), state.name);
  const l = document.createElement('a'); l.download = `plano-${state.name}.png`; l.href = c.toDataURL('image/png'); l.click();
};

const back = () => { hangar.paused = false; hangar.resize(); refresh(); };
const room = new ControlRoom({ onClose: back, check: s => G.check(s), onGo: s => G.onGo(s), onResult: (s, ok) => G.onResult(s, ok) });
const agency = new Agency(back);
$('#agency-btn').onclick = () => { hangar.paused = true; agency.open(); };
$('#launch').onclick = () => {
  if (!state.stack.length) return alert('Construye un cohete antes de lanzar.');
  if (G.s.over) return alert('Tu mandato ha terminado. Abre la Agencia para empezar una partida nueva.');
  hangar.paused = true; room.open(state.stack, state.name);
};

buildCatalog(); refresh();
