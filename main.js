import { PARTS, KINDS } from './parts.js';
import { analyze } from './calc.js';
import { Hangar } from './hangar.js';
import { drawBlueprint } from './blueprint.js';

const $ = s => document.querySelector(s), KEY = 'dn.designs';
const fmt = n => Math.round(n).toLocaleString('es-ES');
const state = { name: 'Lanzador inicial', stack: ['capsule', 'tankM', 'engineA', 'decoupler', 'tankL', 'engineC3'] };
const hangar = new Hangar($('#view3d')), bp = $('#bp');
let view = '3d';

const lib = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const putLib = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { alert('No se pudo guardar en este navegador.'); } };

function buildCatalog() {
  const box = $('#catalog');
  for (const [k, label] of Object.entries(KINDS)) {
    const h = document.createElement('h2'); h.textContent = label; box.append(h);
    for (const [id, p] of Object.entries(PARTS)) if (p.kind === k) {
      const b = document.createElement('button'); b.className = 'part'; b.textContent = p.name;
      const sm = document.createElement('small');
      sm.textContent = `${fmt(p.mass)} kg` + (p.prop ? ` + ${fmt(p.prop)} kg comb.` : '') + (p.thrust ? ` · ${fmt(p.thrust)} kN · Isp ${p.isp} s` : '');
      b.append(sm); b.onclick = () => { state.stack.push(id); refresh(); }; box.append(b);
    }
  }
}

function refresh() {
  const a = analyze(state.stack);
  $('#name').value = state.name;
  $('#stats').innerHTML = `<div class="big"><div><b>${fmt(a.mass)} kg</b><span>Masa total</span></div>
    <div><b>${a.twr.toFixed(2)}</b><span>Empuje/peso al despegar</span></div>
    <div><b>${fmt(a.dv)} m/s</b><span>Δv disponible</span></div>
    <div><b>${a.height.toFixed(1)} m</b><span>Altura</span></div></div>
    <table><tr><th>Etapa</th><th>Δv m/s</th><th>Empuje kN</th><th>Masa kg</th></tr>
    ${a.stages.map(s => `<tr><td>${s.n}</td><td>${fmt(s.dv)}</td><td>${fmt(s.F)}</td><td>${fmt(s.m0)}</td></tr>`).join('')}</table>`;
  const ul = $('#stack'); ul.replaceChildren();
  state.stack.forEach((id, i) => {
    const li = document.createElement('li'), sp = document.createElement('span'); sp.textContent = PARTS[id].name; li.append(sp);
    [['↑', -1, 'Subir'], ['↓', 1, 'Bajar'], ['×', 0, 'Quitar']].forEach(([t, d, lab]) => {
      const b = document.createElement('button'); b.textContent = t; b.title = b.ariaLabel = `${lab} ${PARTS[id].name}`;
      b.onclick = () => {
        if (!d) state.stack.splice(i, 1);
        else if (i + d >= 0 && i + d < state.stack.length) [state.stack[i], state.stack[i + d]] = [state.stack[i + d], state.stack[i]];
        refresh();
      }; li.append(b);
    });
    ul.append(li);
  });
  $('#alerts').replaceChildren(...a.alerts.map(([k, t]) => { const li = document.createElement('li'); li.className = k; li.textContent = t; return li; }));
  hangar.set(state.stack, a.height);
  if (view === 'bp') paintBlueprint(a);
  const d = lib(), sel = $('#lib'); sel.replaceChildren();
  Object.keys(d).forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = `${n} (v${d[n].v})`; sel.append(o); });
  if (!sel.options.length) { const o = document.createElement('option'); o.textContent = 'Aún no hay diseños guardados'; o.disabled = true; sel.append(o); }
}

function paintBlueprint(a) {
  const r = bp.getBoundingClientRect(), k = Math.min(devicePixelRatio, 2);
  bp.width = Math.max(300, r.width * k); bp.height = Math.max(300, r.height * k);
  drawBlueprint(bp, state.stack, a || analyze(state.stack), state.name);
}

document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  view = b.dataset.v;
  document.querySelectorAll('nav button').forEach(o => o.classList.toggle('on', o === b));
  $('#view3d').hidden = view !== '3d'; bp.hidden = view !== 'bp';
  if (view === 'bp') paintBlueprint(); else hangar.resize();
});
addEventListener('resize', () => view === 'bp' && paintBlueprint());
$('#name').oninput = e => { state.name = e.target.value.trim() || 'Sin nombre'; };
$('#save').onclick = () => {
  const d = lib(); d[state.name] = { stack: [...state.stack], v: (d[state.name]?.v || 0) + 1 };
  putLib(d); refresh(); $('#lib').value = state.name;
};
$('#load').onclick = () => { const e = lib()[$('#lib').value]; if (e) { state.name = $('#lib').value; state.stack = [...e.stack]; refresh(); } };
$('#del').onclick = () => { const d = lib(); delete d[$('#lib').value]; putLib(d); refresh(); };
$('#new').onclick = () => { state.name = 'Cohete sin nombre'; state.stack = []; refresh(); };
$('#png').onclick = () => {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1000;
  drawBlueprint(c, state.stack, analyze(state.stack), state.name);
  const l = document.createElement('a'); l.download = `plano-${state.name}.png`; l.href = c.toDataURL('image/png'); l.click();
};

buildCatalog(); refresh();
