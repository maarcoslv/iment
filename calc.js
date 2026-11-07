import { inst } from './parts.js';
export const G0 = 9.80665, DV_LEO = 9400;

// stack: ids de arriba a abajo. Cada separador cierra la etapa que queda debajo de él.
export function analyze(stack) {
  const parts = stack.map(inst), alerts = [], groups = [];
  let cur = [];
  for (let i = parts.length - 1; i >= 0; i--) {
    cur.push(parts[i]);
    if (parts[i].kind === 'decoupler' && i > 0) { groups.push(cur); cur = []; }
  }
  if (cur.length) groups.push(cur);

  const stages = groups.map((ps, i) => {
    const en = ps.filter(p => p.kind === 'engine');
    const dry = ps.reduce((a, p) => a + p.mass, 0), prop = ps.reduce((a, p) => a + (p.prop || 0), 0);
    const F = en.reduce((a, p) => a + p.thrust, 0);
    const FSL = en.reduce((a, p) => a + p.thrust * p.ispSL / p.isp, 0);
    const isp = F ? F / en.reduce((a, p) => a + p.thrust / p.isp, 0) : 0;
    const ispSL = FSL ? FSL / en.reduce((a, p) => a + p.thrust / p.isp, 0) : 0;
    return { n: i + 1, dry, prop, wet: dry + prop, F, FSL, isp, ispSL, engines: en.length, parts: ps };
  });
  let above = 0;
  for (let i = stages.length - 1; i >= 0; i--) {
    const s = stages[i];
    s.m0 = s.wet + above; s.m1 = s.m0 - s.prop;
    s.dv = s.F && s.prop ? s.isp * G0 * Math.log(s.m0 / s.m1) : 0;
    s.twr = s.F * 1000 / (s.m0 * G0);
    above += s.wet;
  }
  const mass = stages.length ? stages[0].m0 : 0;
  const dv = stages.reduce((a, s) => a + s.dv, 0);
  const twr = mass ? stages[0].FSL * 1000 / (mass * G0) : 0;
  const height = parts.reduce((a, p) => a + p.h, 0);

  if (!parts.length) alerts.push(['warn', 'El hangar está vacío. Añade una cabina o una sonda.']);
  else {
    if (!parts.some(p => p.kind === 'payload')) alerts.push(['warn', 'No hay carga útil: añade una cápsula o una sonda.']);
    else if (parts[0].kind !== 'payload') alerts.push(['warn', 'La carga útil debería ir en la parte superior del cohete.']);
    if (!stages.some(s => s.engines)) alerts.push(['err', 'Sin motores: este cohete no puede moverse.']);
    stages.forEach(s => {
      if (s.prop && !s.engines) alerts.push(['warn', `La etapa ${s.n} lleva combustible pero ningún motor: es peso muerto.`]);
      if (s.engines && !s.prop) alerts.push(['warn', `La etapa ${s.n} tiene motor pero no combustible.`]);
    });
    stages.forEach(s => { if (s.n > 1 && s.engines && s.prop && s.twr < 0.4) alerts.push(['warn', `La etapa ${s.n} tiene muy poco empuje (${s.twr.toFixed(2)}): gastará mucho combustible luchando contra la gravedad.`]); });
    if (twr && twr < 1) alerts.push(['err', `Empuje/peso en el despegue ${twr.toFixed(2)}: no despega. Necesitas más empuje o menos masa.`]);
    else if (twr && twr < 1.2) alerts.push(['warn', `Empuje/peso en el despegue ${twr.toFixed(2)}: despegue muy lento.`]);
    if (dv && dv < DV_LEO) alerts.push(['warn', `Δv ${Math.round(dv)} m/s: insuficiente para órbita baja (≈${DV_LEO} m/s).`]);
    if (dv >= DV_LEO && !alerts.some(a => a[0] === 'err')) alerts.push(['ok', 'Diseño válido para llegar a órbita baja.']);
  }
  return { mass, dv, twr, height, stages, alerts };
}
