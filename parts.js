// Datos de piezas (masas en kg, empuje en kN, medidas en m). Valores semirrealistas, nombres ficticios.
export const KINDS = { payload: 'Carga y cabina', tank: 'Tanques', engine: 'Motores', decoupler: 'Separación' };
export const PARTS = {
  capsule: { cost: 300, kind: 'payload', name: 'Cápsula tripulada', mass: 10000, r: 2.5, h: 3.3, color: 0xdfe6ee },
  probe:   { cost: 80, kind: 'payload', name: 'Sonda científica', mass: 1500, r: 1.2, h: 1.8, color: 0xe8d9a8 },
  tankS:   { cost: 8, kind: 'tank', name: 'Tanque pequeño', mass: 1200, prop: 12000, r: 1.85, h: 5, color: 0xf2f2f2 },
  tankM:   { cost: 20, kind: 'tank', name: 'Tanque mediano', mass: 3500, prop: 38000, r: 1.85, h: 10, color: 0xf2f2f2 },
  tankL:   { cost: 60, kind: 'tank', name: 'Tanque grande', mass: 11000, prop: 150000, r: 3, h: 20, color: 0xe9a36a },
  engineA: { cost: 15, kind: 'engine', name: 'Motor de vacío', mass: 300, thrust: 110, isp: 455, ispSL: 250, r: 0.8, h: 2.2, color: 0x6b7280 },
  engineV: { cost: 40, kind: 'engine', name: 'Motor de vacío potente', mass: 1400, thrust: 750, isp: 450, ispSL: 280, r: 1.2, h: 3, color: 0x6b7280 },
  engineB: { cost: 30, kind: 'engine', name: 'Motor medio', mass: 1500, thrust: 900, isp: 360, ispSL: 320, r: 1.2, h: 3, color: 0x6b7280 },
  engineC: { cost: 60, kind: 'engine', name: 'Motor pesado', mass: 3500, thrust: 2200, isp: 350, ispSL: 310, r: 1.8, h: 3.5, color: 0x6b7280 },
  engineC3:{ cost: 190, kind: 'engine', name: 'Racimo de 3 motores pesados', mass: 10500, thrust: 6600, isp: 350, ispSL: 310, r: 3, h: 3.5, color: 0x6b7280 },
  decoupler:{ cost: 5, kind: 'decoupler', name: 'Separador de etapa', mass: 300, r: 2.5, h: 0.4, color: 0xd9622b },
};
// Pieza concreta del diseño: {id, k}. k escala la longitud de los tanques (masa y combustible incluidos).
export const inst = e => { const p = PARTS[e.id], k = e.k || 1; return { ...p, id: e.id, k, mass: p.mass * k, cost: p.cost * k, h: p.h * k, ...(p.prop ? { prop: p.prop * k } : {}) }; };
