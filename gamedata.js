// Datos del juego. dl = plazo del contrato en días. Efectos: money (M$), support, opinion, rep, staff (moral), staffN (plantilla).
export const MISSIONS = [
  { id: 'obs', name: 'Satélite de observación terrestre', text: 'Un satélite para vigilar el clima y los océanos.', req: 'probe', reward: { money: 300, opinion: 3, support: 3, rep: 1 }, dl: 120 },
  { id: 'com', name: 'Carga comercial a órbita', text: 'Un cliente privado paga por llevar su carga a órbita baja.', req: 'any', reward: { money: 500, rep: 3, support: 1 }, dl: 90 },
  { id: 'crew', name: 'Prueba tripulada en órbita baja', text: 'El primer vuelo tripulado de la nueva era. Si sale bien lo celebra el mundo; si no, lo pagas tú.', req: 'capsule', reward: { opinion: 12, support: 6, rep: 3 }, dl: 180 },
  { id: 'tel', name: 'Telescopio espacial pequeño', text: 'La comunidad científica lleva años pidiéndolo.', req: 'probe', reward: { support: 4, opinion: 4, rep: 4 }, dl: 180 },
  { id: 'iss', name: 'Suministros para una estación', text: 'Entrega de carga a la estación de un socio internacional.', req: 'any', reward: { money: 350, rep: 5 }, dl: 120 },
];
export const EVENTS = [
  { id: 'offer', kind: 'decision', title: 'Oferta privada', text: 'Una empresa privada ofrece lanzar tu carga por la mitad de precio, con el control en sus manos.', choices: [
    { label: 'Aceptar la oferta', desc: 'Ahorras dinero, pero pierdes control y a parte de tu personal.', fx: { money: 400, rep: -2, staff: -4, support: -2 } },
    { label: 'Rechazar', desc: 'Mantienes el control y la moral del equipo.', fx: { support: 2, staff: 2 } }] },
  { id: 'cut', kind: 'decision', title: 'Recorte presupuestario', text: 'El Congreso exige un recorte inmediato. Hay que cancelar o ajustar algo.', choices: [
    { label: 'Cancelar el programa de ciencia', desc: 'Ahorras 700 M$, pero la comunidad científica se enfada.', fx: { money: 700, support: -3, rep: -3 } },
    { label: 'Recortar personal', desc: 'Ahorras 700 M$ a costa de 900 empleos, la moral y la opinión.', fx: { money: 700, staff: -12, opinion: -2, staffN: -900 } }] },
  { id: 'bug', kind: 'urgent', title: 'Aviso de un ingeniero', text: 'Un ingeniero advierte de un posible defecto de software a dos semanas del próximo lanzamiento.', choices: [
    { label: 'Retrasar y revisar', desc: 'Cuesta 150 M$ y algo de paciencia pública.', fx: { money: -150, opinion: -1 } },
    { label: 'Ignorar el aviso', desc: 'No pierdes tiempo ni dinero... si el aviso no era real.', fx: {}, flag: 'swRisk' }] },
  { id: 'partner', kind: 'decision', title: 'Socio internacional', text: 'Un socio exige participación en tu próxima misión a cambio de financiación.', choices: [
    { label: 'Aceptar', desc: 'Entran 800 M$ y ganas prestigio, con algo de crítica interna.', fx: { money: 800, rep: 3, support: -2 } },
    { label: 'Rechazar', desc: 'Conservas la autonomía, pero el socio se enfría.', fx: { rep: -3, support: 1 } }] },
  { id: 'rival', kind: 'decision', title: 'Un rival se adelanta', text: 'Un rival estatal anuncia una misión tripulada antes que tú.', choices: [
    { label: 'Responder con un anuncio público', desc: 'La opinión sube y aparece un contrato tripulado con plazo corto.', fx: { opinion: 6, support: -1 }, mission: 'crew' },
    { label: 'Mantener la calma', desc: 'Evitas promesas, pero el público lo nota.', fx: { opinion: -5, support: 1 } }] },
  { id: 'ast', kind: 'decision', title: 'Asteroide con trayectoria incierta', text: 'Se descubre un asteroide cuya órbita no está clara.', choices: [
    { label: 'Financiar un estudio de seguimiento', desc: 'Cuesta 200 M$, pero muestra liderazgo.', fx: { money: -200, support: 3, opinion: 2, rep: 1 } },
    { label: 'Esperar más datos', desc: 'No gastas, pero algunos te acusan de pasividad.', fx: { opinion: -1 } }] },
  { id: 'viral', kind: 'news', title: 'Vídeo viral', text: 'Las imágenes de tu último lanzamiento circulan por todo el mundo.', fx: { opinion: 4 } },
  { id: 'rivalnews', kind: 'news', title: 'Rival en órbita', text: 'Un rival estatal lanza con éxito su nuevo cohete pesado.', fx: { opinion: -2, support: -1 } },
  { id: 'images', kind: 'news', title: 'Primeras imágenes', text: 'Un socio internacional publica las primeras imágenes de su telescopio.', fx: { rep: 2 } },
];
