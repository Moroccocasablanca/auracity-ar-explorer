// A small real-time 3D character that welcomes you in front of a venue: it bobs, looks around, waves and moves its mouth while it speaks.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PlaceStyleKey } from "@/lib/place-style";

const BODY: Record<string, number> = { restaurant: 0xf8fafc, cafe: 0x92400e, streetfood: 0xef4444, icecream: 0xec4899, bar: 0xbe185d, shop: 0x0ea5e9, church: 0x7c3aed, palace: 0xb7791f, museum: 0x0e7490 };

export function Mascot3D({ style, speaking, size = 150 }: { style: PlaceStyleKey; speaking: boolean; size?: number }) {
  const mount = useRef<HTMLDivElement>(null);
  const talk = useRef(speaking);
  talk.current = speaking;

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // no WebGL: the flat avatar stays
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size * 1.15);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1 / 1.15, 0.1, 50);
    camera.position.set(0, 1.35, 6.2);
    camera.lookAt(0, 1.2, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8b7355, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(2.5, 4, 5);
    scene.add(sun);

    const mat = (c: number) => new THREE.MeshToonMaterial({ color: c });
    const g = new THREE.Group();
    scene.add(g);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 0.7, 8, 20), mat(BODY[style] ?? 0xf8fafc));
    body.position.y = 0.75;
    g.add(body);
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.55, 20), mat(0xffffff));
    apron.position.set(0, 0.6, 0.38);
    apron.scale.z = 0.35;
    g.add(apron);

    const head = new THREE.Group();
    head.position.y = 1.85;
    g.add(head);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 24), mat(0xfcd9b6));
    head.add(face);
    for (const x of [-0.22, 0.22]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), mat(0x1f2937));
      eye.position.set(x, 0.1, 0.55);
      eye.scale.z = 0.5;
      head.add(eye);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), mat(0xfca5a5));
      cheek.position.set(x * 1.75, -0.12, 0.48);
      cheek.scale.set(1, 0.7, 0.4);
      head.add(cheek);
    }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), mat(0x7f1d1d));
    mouth.position.set(0, -0.2, 0.54);
    mouth.scale.set(1.2, 0.35, 0.4);
    head.add(mouth);
    // Hat by kind of place: tall chef hat for restaurants, cap for the rest
    const hatColor = style === "restaurant" ? 0xffffff : style === "cafe" ? 0x78350f : style === "bar" ? 0xbe185d : 0xfbbf24;
    const tall = style === "restaurant" || style === "streetfood";
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(tall ? 0.42 : 0.5, 0.46, tall ? 0.55 : 0.25, 22), mat(hatColor));
    hat.position.y = tall ? 0.78 : 0.62;
    head.add(hat);
    if (tall) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16), mat(hatColor));
      puff.position.y = 1.18;
      puff.scale.y = 0.75;
      head.add(puff);
    }

    const armGeo = new THREE.CapsuleGeometry(0.14, 0.55, 6, 12);
    const armL = new THREE.Mesh(armGeo, mat(BODY[style] ?? 0xf8fafc));
    const armR = new THREE.Mesh(armGeo, mat(BODY[style] ?? 0xf8fafc));
    armL.position.set(-0.78, 1.0, 0);
    armR.position.set(0.78, 1.25, 0);
    armL.rotation.z = 0.35;
    g.add(armL, armR);
    for (const a of [armL, armR]) {
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), mat(0xfcd9b6));
      hand.position.y = -0.42;
      a.add(hand);
    }

    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      g.position.y = Math.sin(t * 2.2) * 0.05;
      g.rotation.y = Math.sin(t * 0.9) * 0.35;
      head.rotation.y = Math.sin(t * 1.3) * 0.18;
      head.rotation.z = Math.sin(t * 1.1) * 0.05;
      armR.rotation.z = -2.3 + Math.sin(t * 6) * 0.35; // waving hand
      const open = talk.current ? 0.25 + Math.abs(Math.sin(t * 11)) * 0.9 : 0.35;
      mouth.scale.y = open * 0.6 + 0.1;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [style, size]);

  return <div ref={mount} style={{ width: size, height: size * 1.15 }} aria-hidden="true" />;
}
