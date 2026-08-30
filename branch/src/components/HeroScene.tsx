"use client";

/**
 * HeroScene — WebGL hero graphic for EduPass GH.
 *
 * Purely decorative (aria-hidden). Renders floating 3D objects that map to the
 * product: graduation caps, voucher/PIN cards, coins and a soft particle field,
 * all in the existing brand palette (brand-600 #1746a2 / accent #10b981).
 *
 * Design constraints honoured:
 *  - Light-mode, trust-forward. No dark canvas, no AI purple gradients.
 *  - FOV 55 (product-scale range 45-75).
 *  - prefers-reduced-motion: renders a single static frame, no loop.
 *  - Pauses rendering when tab hidden or hero is scrolled out of view.
 *  - Full dispose() of geometries + materials on unmount (no VRAM leak).
 *  - Graceful no-op if WebGL is unavailable.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

const fov2rad = (deg: number) => (deg * Math.PI) / 180;

const BRAND = 0x1746a2;
const BRAND_LIGHT = 0x598eff;
const ACCENT = 0x10b981;
const GOLD = 0xf5b74f;
const PAPER = 0xffffff;

export function HeroScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return; // no WebGL — the CSS gradient behind us is the fallback
    }

    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 0, 14);

    // ---- tracked resources -------------------------------------------------
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const track = <T extends THREE.BufferGeometry | THREE.Material>(r: T): T => {
      if (r instanceof THREE.BufferGeometry) geometries.push(r);
      else materials.push(r);
      return r;
    };

    // ---- lighting: soft, bright, education-friendly ------------------------
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d8f5, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(4, 6, 8);
    scene.add(key);
    const rimBlue = new THREE.PointLight(BRAND_LIGHT, 60, 40);
    rimBlue.position.set(-9, 2, 3);
    scene.add(rimBlue);
    const rimGreen = new THREE.PointLight(ACCENT, 45, 40);
    rimGreen.position.set(9, -3, 2);
    scene.add(rimGreen);

    const root = new THREE.Group();
    scene.add(root);

    type Floater = {
      obj: THREE.Object3D;
      spin: THREE.Vector3;
      amp: number;
      speed: number;
      phase: number;
      baseY: number;
      depth: number;
    };
    const floaters: Floater[] = [];

    const addFloater = (
      obj: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      scale = 1
    ) => {
      obj.position.set(x, y, z);
      obj.scale.setScalar(scale);
      // tilt toward the camera so flat objects never present edge-on
      obj.rotation.set(
        -0.5 + (Math.random() - 0.5) * 0.35,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.35
      );
      root.add(obj);
      floaters.push({
        obj,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          0.08 + Math.random() * 0.1,
          (Math.random() - 0.5) * 0.035
        ),
        amp: 0.28 + Math.random() * 0.4,
        speed: 0.35 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        baseY: y,
        depth: z,
      });
      return obj;
    };

    // ---- graduation cap ----------------------------------------------------
    const capBoardGeo = track(new THREE.BoxGeometry(1.9, 0.11, 1.9));
    const capCrownGeo = track(new THREE.CylinderGeometry(0.46, 0.58, 0.58, 28));
    const buttonGeo = track(new THREE.SphereGeometry(0.09, 16, 16));
    const tasselGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 1.0, 8));

    const capMat = track(
      new THREE.MeshStandardMaterial({
        color: BRAND,
        roughness: 0.42,
        metalness: 0.12,
      })
    );
    const goldMat = track(
      new THREE.MeshStandardMaterial({
        color: GOLD,
        roughness: 0.28,
        metalness: 0.65,
      })
    );

    const makeCap = () => {
      const g = new THREE.Group();
      const board = new THREE.Mesh(capBoardGeo, capMat);
      board.position.y = 0.33;
      board.rotation.y = Math.PI / 4;
      const crown = new THREE.Mesh(capCrownGeo, capMat);
      const btn = new THREE.Mesh(buttonGeo, goldMat);
      btn.position.y = 0.42;
      const tassel = new THREE.Mesh(tasselGeo, goldMat);
      tassel.position.set(0.62, -0.16, 0.62);
      tassel.rotation.z = 0.22;
      g.add(board, crown, btn, tassel);
      return g;
    };

    // ---- voucher / PIN card ------------------------------------------------
    const cardGeo = track(new THREE.BoxGeometry(2.5, 1.55, 0.075));
    const stripeGeo = track(new THREE.BoxGeometry(2.5, 0.3, 0.02));
    const pinGeo = track(new THREE.BoxGeometry(0.26, 0.12, 0.02));

    const cardMat = track(
      new THREE.MeshStandardMaterial({
        color: PAPER,
        roughness: 0.34,
        metalness: 0.04,
      })
    );
    const stripeMatBlue = track(
      new THREE.MeshStandardMaterial({ color: BRAND, roughness: 0.4 })
    );
    const stripeMatGreen = track(
      new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.4 })
    );
    const pinMat = track(
      new THREE.MeshStandardMaterial({ color: 0xcbd8ef, roughness: 0.6 })
    );

    const makeCard = (green = false) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(cardGeo, cardMat);
      const stripe = new THREE.Mesh(
        stripeGeo,
        green ? stripeMatGreen : stripeMatBlue
      );
      stripe.position.set(0, 0.5, 0.05);
      g.add(body, stripe);
      // dotted "PIN" row — reads as a redacted voucher code
      for (let i = 0; i < 4; i++) {
        const d = new THREE.Mesh(pinGeo, pinMat);
        d.position.set(-0.72 + i * 0.42, -0.18, 0.05);
        g.add(d);
      }
      return g;
    };

    // ---- coin (GHS / value) ------------------------------------------------
    const coinGeo = track(new THREE.CylinderGeometry(0.62, 0.62, 0.14, 40));
    const coinRingGeo = track(new THREE.TorusGeometry(0.46, 0.055, 12, 36));
    const coinMat = track(
      new THREE.MeshStandardMaterial({
        color: ACCENT,
        roughness: 0.3,
        metalness: 0.55,
      })
    );

    const makeCoin = () => {
      const g = new THREE.Group();
      const c = new THREE.Mesh(coinGeo, coinMat);
      c.rotation.x = Math.PI / 2;
      const ring = new THREE.Mesh(coinRingGeo, goldMat);
      ring.position.z = 0.09;
      g.add(c, ring);
      return g;
    };

    // ---- checkmark shield (trust) -----------------------------------------
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 1);
    shieldShape.bezierCurveTo(0.85, 0.78, 0.92, 0.2, 0.9, -0.28);
    shieldShape.bezierCurveTo(0.62, -0.72, 0.3, -0.95, 0, -1.05);
    shieldShape.bezierCurveTo(-0.3, -0.95, -0.62, -0.72, -0.9, -0.28);
    shieldShape.bezierCurveTo(-0.92, 0.2, -0.85, 0.78, 0, 1);
    const shieldGeo = track(
      new THREE.ExtrudeGeometry(shieldShape, {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 3,
      })
    );
    const shieldMat = track(
      new THREE.MeshStandardMaterial({
        color: ACCENT,
        roughness: 0.35,
        metalness: 0.3,
      })
    );

    // ---- layout (responsive) ----------------------------------------------
    // Objects are positioned relative to the live camera frustum so they always
    // hug the outer edges and never cross the centre copy, at any viewport.
    // Each entry: [factory, side, edge inset, y fraction of half-height, z, scale]
    type Spec = {
      make: () => THREE.Object3D;
      side: -1 | 1;
      inset: number; // 0 = at frustum edge, larger = further inward
      yf: number; // -1..1 fraction of half visible height
      z: number;
      scale: number;
      mobile: boolean; // keep on narrow screens?
    };

    const specs: Spec[] = [
      { make: makeCap, side: -1, inset: 1.4, yf: 0.34, z: -1.2, scale: 1.3, mobile: true },
      { make: () => makeCard(true), side: -1, inset: 3.0, yf: -0.24, z: -2.6, scale: 1.05, mobile: false },
      { make: makeCoin, side: -1, inset: 5.2, yf: 0.14, z: -1.0, scale: 1.2, mobile: false },
      { make: makeCap, side: -1, inset: 2.2, yf: -0.52, z: -3.4, scale: 0.9, mobile: true },
      { make: () => new THREE.Mesh(shieldGeo, shieldMat), side: -1, inset: 6.0, yf: 0.6, z: -3.8, scale: 0.75, mobile: false },

      { make: makeCap, side: 1, inset: 1.6, yf: -0.32, z: -1.6, scale: 1.15, mobile: true },
      { make: makeCard, side: 1, inset: 3.6, yf: -0.6, z: -1.1, scale: 1.05, mobile: false },
      { make: makeCoin, side: 1, inset: 2.4, yf: -0.06, z: -2.8, scale: 1.0, mobile: false },
      { make: () => new THREE.Mesh(shieldGeo, shieldMat), side: 1, inset: 5.4, yf: -0.72, z: -2.2, scale: 0.8, mobile: false },
      { make: makeCoin, side: 1, inset: 6.6, yf: -0.36, z: -3.6, scale: 0.78, mobile: true },
    ];

    const built = specs.map((spec) => {
      const obj = spec.make();
      const f = addFloater(obj, 0, 0, spec.z, spec.scale);
      return { spec, obj: f };
    });

    // Position every object from the current frustum. Called on init + resize.
    const layout = () => {
      const narrow = (host.clientWidth || 1) < 768;
      const vh = 2 * camera.position.z * Math.tan(fov2rad(camera.fov) / 2);
      const vw = vh * camera.aspect;

      for (const { spec, obj } of built) {
        // Narrow screens: the copy fills the viewport, so no solid objects at
        // all — the particle field alone carries the depth. Guarantees the
        // headline is never obstructed on phones.
        obj.visible = !narrow;
        if (!obj.visible) continue;

        const edge = vw / 2;
        const x = spec.side * Math.max(edge - spec.inset, edge * 0.62);
        const y = (vh / 2) * spec.yf;

        obj.position.x = x;
        const rec = floaters.find((fl) => fl.obj === obj);
        if (rec) rec.baseY = y;
        obj.position.y = y;
        obj.scale.setScalar(spec.scale);
      }
    };
    layout();

    // ---- particle field ----------------------------------------------------
    const COUNT = 260;
    const pts = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pts[i * 3] = (Math.random() - 0.5) * 30;
      pts[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pts[i * 3 + 2] = -Math.random() * 14;
    }
    const dustGeo = track(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const dustMat = track(
      new THREE.PointsMaterial({
        color: BRAND_LIGHT,
        size: 0.085,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        depthWrite: false,
      })
    );
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ---- interaction -------------------------------------------------------
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const onResize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      layout();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    // pause when off-screen or tab hidden
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 }
    );
    io.observe(host);

    let hidden = document.hidden;
    const onVis = () => {
      hidden = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    // ---- render loop -------------------------------------------------------
    const clock = new THREE.Clock();
    let raf = 0;
    let disposed = false;

    const renderFrame = () => {
      const t = clock.getElapsedTime();

      pointerX += (targetX - pointerX) * 0.045;
      pointerY += (targetY - pointerY) * 0.045;

      for (const f of floaters) {
        f.obj.rotation.x += f.spin.x * 0.01;
        f.obj.rotation.y += f.spin.y * 0.01;
        f.obj.rotation.z += f.spin.z * 0.01;
        f.obj.position.y = f.baseY + Math.sin(t * f.speed + f.phase) * f.amp;
      }

      // subtle parallax — depth-scaled so far objects move less
      root.position.x = -pointerX * 0.45;
      root.position.y = pointerY * 0.3;
      root.rotation.y = pointerX * 0.06;
      root.rotation.x = pointerY * 0.035;

      dust.rotation.y = t * 0.012;
      dust.position.x = -pointerX * 0.3;

      renderer.render(scene, camera);
    };

    const loop = () => {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      if (!visible || hidden) return;
      renderFrame();
    };

    if (reduced) {
      renderer.render(scene, camera); // one static frame
    } else {
      loop();
    }

    // ---- teardown ----------------------------------------------------------
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      io.disconnect();

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={hostRef} aria-hidden="true" className="hero-3d" />;
}

export default HeroScene;
