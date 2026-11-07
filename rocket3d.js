import * as THREE from 'three';
import { inst } from './parts.js';
// Malla del cohete (entries de arriba a abajo). Los hijos del grupo van de abajo a arriba; el origen es la base.
export function rocketGroup(entries) {
  const g = new THREE.Group(); let y = 0, rmax = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const p = inst(entries[i]);
    const [rt, rb] = p.kind === 'engine' ? [p.r * 0.35, p.r] : p.id === 'capsule' ? [p.r * 0.2, p.r] : p.id === 'probe' ? [p.r * 0.6, p.r] : [p.r, p.r];
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, p.h, 24), new THREE.MeshStandardMaterial({ color: p.color, metalness: 0.35, roughness: 0.5 }));
    m.position.y = y + p.h / 2; y += p.h; rmax = Math.max(rmax, p.r); g.add(m);
  }
  return { group: g, height: y, rmax };
}
