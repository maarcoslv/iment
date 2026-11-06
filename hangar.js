import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PARTS } from './parts.js';

export class Hangar {
  constructor(el) {
    this.el = el; this.first = true;
    const r = this.r = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2)); el.appendChild(r.domElement);
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color(0x0d1d33); s.fog = new THREE.Fog(0x0d1d33, 90, 260);
    this.cam = new THREE.PerspectiveCamera(40, 1, 0.5, 600);
    this.ctl = new OrbitControls(this.cam, r.domElement);
    this.ctl.enableDamping = true; this.ctl.maxPolarAngle = Math.PI * 0.495;
    s.add(new THREE.HemisphereLight(0xbcd4ff, 0x1a2a44, 1.2));
    const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(30, 60, 25); s.add(d);
    s.add(new THREE.GridHelper(160, 80, 0x3d7fc0, 0x1c3556));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.4, 48), new THREE.MeshStandardMaterial({ color: 0x33415a }));
    pad.position.y = -0.2; s.add(pad);
    this.group = new THREE.Group(); s.add(this.group);
    new ResizeObserver(() => this.resize()).observe(el); this.resize();
    const loop = () => { requestAnimationFrame(loop); if (el.hidden) return; this.ctl.update(); r.render(s, this.cam); };
    loop();
  }
  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.r.setSize(w, h); this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
  }
  set(stack, height) {
    this.group.children.slice().forEach(m => { m.geometry.dispose(); m.material.dispose(); this.group.remove(m); });
    let y = 0;
    for (let i = stack.length - 1; i >= 0; i--) {
      const p = PARTS[stack[i]];
      // tope y base: cabina cónica, sonda troncocónica, motor con tobera ancha abajo
      const [rt, rb] = p.kind === 'engine' ? [p.r * 0.35, p.r] : stack[i] === 'capsule' ? [p.r * 0.2, p.r] :
        stack[i] === 'probe' ? [p.r * 0.6, p.r] : [p.r, p.r];
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, p.h, 32),
        new THREE.MeshStandardMaterial({ color: p.color, metalness: 0.35, roughness: 0.5 }));
      m.position.y = y + p.h / 2; y += p.h; this.group.add(m);
    }
    this.ctl.target.set(0, Math.max(height, 8) / 2, 0);
    if (this.first && stack.length) {
      const h = Math.max(height, 12);
      this.cam.position.set(h * 0.9, h * 0.7, h * 1.3); this.first = false;
    }
  }
}
