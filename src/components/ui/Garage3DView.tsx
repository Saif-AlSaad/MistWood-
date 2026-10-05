/* MistWood Interactive 3D Animal Garage Viewport */

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { AnimalDefinition } from "../../game/animals";
import { Animal3DModel } from "../../game/3d/Animal3DModel";
import { RotateCcw, Compass, ZoomIn } from "lucide-react";

interface Garage3DViewProps {
  animal: AnimalDefinition;
  className?: string;
}

export const Garage3DView: React.FC<Garage3DViewProps> = ({ animal, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  // Scene references
  const animRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    currentModel: Animal3DModel | null;
    transitionModel: Animal3DModel | null;
    targetCamDist: number;
    targetCamY: number;
    currCamDist: number;
    currCamY: number;
    rotX: number; // yaw
    rotY: number; // pitch
    targetRotX: number;
    targetRotY: number;
    transitionProgress: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 380;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060911, 0.12);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 40);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 3-Point Studio Lighting Setup
    // 1. Warm Key Light
    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.8);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.camera.left = -2.5;
    keyLight.shadow.camera.right = 2.5;
    keyLight.shadow.camera.top = 2.5;
    keyLight.shadow.camera.bottom = -2.5;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // 2. Cool Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 1.2);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    // 3. Crisp Rim Backlight (accentuates fur silhouettes)
    const rimLight = new THREE.DirectionalLight(0xffeedd, 3.2);
    rimLight.position.set(0, 4, -5);
    scene.add(rimLight);

    // 4. Soft Ambient Floor/Sky Light
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.7);
    scene.add(hemiLight);

    // Ground Sanctuary Pedestal with Glowing Attunement Ring
    const pedestalGroup = new THREE.Group();
    scene.add(pedestalGroup);

    // Ground Shadow Receiver Plane
    const shadowPlaneGeom = new THREE.PlaneGeometry(12, 12);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.01;
    shadowPlane.receiveShadow = true;
    pedestalGroup.add(shadowPlane);

    // Circular Stone Disc Base
    const stoneDiscGeom = new THREE.CylinderGeometry(2.2, 2.4, 0.12, 48);
    const stoneDiscMat = new THREE.MeshStandardMaterial({
      color: 0x0f1422,
      roughness: 0.9,
      metalness: 0.1,
    });
    const stoneDisc = new THREE.Mesh(stoneDiscGeom, stoneDiscMat);
    stoneDisc.position.y = -0.06;
    stoneDisc.receiveShadow = true;
    pedestalGroup.add(stoneDisc);

    // Inner Glowing Rune Ring
    const ringGeom = new THREE.RingGeometry(1.85, 1.95, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.005;
    pedestalGroup.add(ringMesh);

    // Initial Model
    const model = new Animal3DModel(animal);
    scene.add(model.group);

    const initialDist = animal.cameraOffset.distance;
    const initialY = animal.cameraOffset.y;

    animRef.current = {
      scene,
      camera,
      renderer,
      currentModel: model,
      transitionModel: null,
      targetCamDist: initialDist,
      targetCamY: initialY,
      currCamDist: initialDist,
      currCamY: initialY,
      rotX: 0.4,
      rotY: 0.12,
      targetRotX: 0.4,
      targetRotY: 0.12,
      transitionProgress: 1,
    };

    // Animation Loop
    let rafId = 0;
    let lastTime = performance.now();

    const loop = (ts: number) => {
      const dt = Math.min((ts - lastTime) / 1000, 0.033);
      lastTime = ts;

      const state = animRef.current;
      if (!state) return;

      // Auto-turntable rotation when idle
      if (autoRotate && !isInteracting) {
        state.targetRotX += dt * 0.3;
      }

      // Smooth inertia interpolation for rotation
      state.rotX += (state.targetRotX - state.rotX) * Math.min(1, dt * 10);
      state.rotY += (state.targetRotY - state.rotY) * Math.min(1, dt * 10);

      // Smooth camera framing interpolation
      state.currCamDist += (state.targetCamDist - state.currCamDist) * Math.min(1, dt * 4);
      state.currCamY += (state.targetCamY - state.currCamY) * Math.min(1, dt * 4);

      // Calculate spherical camera position
      const cx = Math.sin(state.rotX) * Math.cos(state.rotY) * state.currCamDist;
      const cy = state.currCamY + Math.sin(state.rotY) * state.currCamDist;
      const cz = Math.cos(state.rotX) * Math.cos(state.rotY) * state.currCamDist;

      state.camera.position.set(cx, cy, cz);
      state.camera.lookAt(0, state.currCamY * 0.8, 0);

      // Model transition interpolation
      if (state.transitionModel && state.transitionProgress < 1) {
        state.transitionProgress += dt * 3.5;
        const p = Math.min(1, state.transitionProgress);

        // Outgoing model slides/fades back
        state.transitionModel.group.position.x = -p * 2.5;
        state.transitionModel.group.scale.setScalar(
          (1 - p * 0.5) * state.transitionModel.definition.cameraOffset.scale
        );

        // Incoming model slides in from front-right
        state.currentModel?.group.position.set((1 - p) * 2.0, 0, 0);

        if (p >= 1) {
          state.scene.remove(state.transitionModel.group);
          state.transitionModel.dispose();
          state.transitionModel = null;
          if (state.currentModel) {
            state.currentModel.group.position.set(0, 0, 0);
          }
        }
      }

      // Update idle breathing/micro-motion
      state.currentModel?.updateAnimation(dt, 0, true, 0, false);
      if (state.transitionModel) {
        state.transitionModel.updateAnimation(dt, 0, true, 0, false);
      }

      // Subtle pulse on the rune ring
      ringMesh.rotation.z += dt * 0.05;
      ringMat.opacity = 0.25 + Math.sin(ts * 0.002) * 0.12;

      state.renderer.render(state.scene, state.camera);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    // Resize Handler
    const handleResize = () => {
      if (!container || !animRef.current) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 380;
      animRef.current.camera.aspect = w / h;
      animRef.current.camera.updateProjectionMatrix();
      animRef.current.renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      if (animRef.current) {
        animRef.current.currentModel?.dispose();
        animRef.current.transitionModel?.dispose();
        animRef.current.renderer.dispose();
      }
      container.innerHTML = "";
      animRef.current = null;
    };
  }, []);

  // Update Model & Camera when selected animal changes
  useEffect(() => {
    const state = animRef.current;
    if (!state || !state.currentModel) return;

    if (state.currentModel.definition.id === animal.id) return;

    // Begin smooth model transition
    if (state.transitionModel) {
      state.scene.remove(state.transitionModel.group);
      state.transitionModel.dispose();
    }
    state.transitionModel = state.currentModel;
    state.transitionProgress = 0;

    // Spawn new animal model
    const newModel = new Animal3DModel(animal);
    newModel.group.position.set(2.0, 0, 0);
    state.scene.add(newModel.group);
    state.currentModel = newModel;

    // Automatically adjust target camera framing for species size
    state.targetCamDist = animal.cameraOffset.distance;
    state.targetCamY = animal.cameraOffset.y;
  }, [animal]);

  // Pointer Interaction Handlers for 360° Inspection
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsInteracting(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialRotX = animRef.current?.targetRotX || 0;
    const initialRotY = animRef.current?.targetRotY || 0;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (animRef.current) {
        animRef.current.targetRotX = initialRotX + dx * 0.009;
        animRef.current.targetRotY = THREE.MathUtils.clamp(
          initialRotY - dy * 0.007,
          -0.1,
          0.7
        );
      }
    };

    const handlePointerUp = () => {
      setIsInteracting(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Wheel Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!animRef.current) return;
    const zoomDelta = e.deltaY * 0.003;
    animRef.current.targetCamDist = THREE.MathUtils.clamp(
      animRef.current.targetCamDist + zoomDelta,
      2.0,
      6.5
    );
  };

  // Reset Camera View
  const handleResetCamera = () => {
    if (!animRef.current) return;
    animRef.current.targetRotX = 0.4;
    animRef.current.targetRotY = 0.12;
    animRef.current.targetCamDist = animal.cameraOffset.distance;
    animRef.current.targetCamY = animal.cameraOffset.y;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing ${className}`}
      title="Drag to rotate animal · Scroll to zoom"
    >
      {/* 3D Viewport Controls & Overlays */}
      <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-semibold tracking-wider text-white/70 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
        >
          <Compass className={`h-3 w-3 ${autoRotate ? "text-amber-300 animate-spin" : "text-white/40"}`} />
          <span>{autoRotate ? "ROTATING" : "PAUSED"}</span>
        </button>

        <button
          type="button"
          onClick={handleResetCamera}
          title="Reset Camera Framing"
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>

      {/* Floating Drag & Zoom Hint */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/5 bg-black/30 px-3 py-1 text-[9px] font-medium tracking-widest text-white/40 uppercase backdrop-blur-sm">
        <ZoomIn className="h-2.5 w-2.5" />
        <span>Drag to Orbit · Scroll to Zoom</span>
      </div>
    </div>
  );
};
