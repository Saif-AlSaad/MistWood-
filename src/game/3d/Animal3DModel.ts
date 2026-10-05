/* MistWood 3D Realistic Animal Models & Quadruped Animation Engine */

import * as THREE from "three";
import type { AnimalDefinition } from "../animals";

export class Animal3DModel {
  group: THREE.Group;
  definition: AnimalDefinition;

  // Rig nodes for skeletal animation
  private bodyRoot!: THREE.Group;
  private spineThorax!: THREE.Group;
  private spineLumbar!: THREE.Group;
  private neck!: THREE.Group;
  private head!: THREE.Group;
  private tailSegments: THREE.Group[] = [];
  
  // Limbs: [FrontLeft, FrontRight, RearLeft, RearRight]
  private limbUpper: THREE.Group[] = [];
  private limbLower: THREE.Group[] = [];
  private limbFoot: THREE.Group[] = [];

  // Species-specific nodes
  private antlersGroup: THREE.Group | null = null;
  private maneGroup: THREE.Group | null = null;
  private particlesGroup: THREE.Group | null = null;

  // Animation state
  private cycleTime = 0;
  private breatheTime = 0;
  private squashFactor = 0;
  private materials: THREE.Material[] = [];

  constructor(def: AnimalDefinition) {
    this.definition = def;
    this.group = new THREE.Group();
    this.buildModel();
  }

  private buildModel(): void {
    const id = this.definition.id;
    const colors = this.definition.colors;

    // Materials with realistic fur-like micro-roughness & specular properties
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors.body),
      roughness: 0.85,
      metalness: id === "moon_fox" ? 0.2 : 0.05,
      flatShading: false,
    });
    this.materials.push(bodyMat);

    const underbellyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors.underbelly),
      roughness: 0.9,
      metalness: 0.0,
    });
    this.materials.push(underbellyMat);

    const secondaryMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors.secondary || colors.body),
      roughness: 0.8,
      metalness: 0.05,
    });
    this.materials.push(secondaryMat);

    const eyeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors.eyes),
      roughness: 0.1,
      metalness: 0.8,
      emissive: id === "moon_fox" ? new THREE.Color(colors.accent).multiplyScalar(0.4) : new THREE.Color(0x000000),
    });
    this.materials.push(eyeMat);

    const darkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x111111),
      roughness: 0.6,
      metalness: 0.1,
    });
    this.materials.push(darkMat);

    // Root Anchor
    this.bodyRoot = new THREE.Group();
    this.group.add(this.bodyRoot);

    // Scale and heights based on animal species
    const scale = this.definition.cameraOffset.scale;
    this.bodyRoot.scale.set(scale, scale, scale);

    // Species dimension coefficients
    let bodyLength = 1.3;
    let bodyRadius = 0.32;
    let chestRadius = 0.38;
    let neckLength = 0.45;
    let legHeight = 0.85;

    if (id === "deer") {
      bodyLength = 1.45;
      bodyRadius = 0.34;
      chestRadius = 0.42;
      neckLength = 0.75;
      legHeight = 1.15;
    } else if (id === "panda") {
      bodyLength = 1.35;
      bodyRadius = 0.48;
      chestRadius = 0.52;
      neckLength = 0.35;
      legHeight = 0.7;
    } else if (id === "lion") {
      bodyLength = 1.6;
      bodyRadius = 0.42;
      chestRadius = 0.54;
      neckLength = 0.5;
      legHeight = 0.95;
    }

    // Set body root elevation above ground
    this.bodyRoot.position.y = legHeight;

    // Haunches / Pelvis
    this.spineLumbar = new THREE.Group();
    this.spineLumbar.position.set(-bodyLength * 0.25, 0, 0);
    this.bodyRoot.add(this.spineLumbar);

    const haunchGeom = new THREE.CylinderGeometry(bodyRadius * 0.95, bodyRadius * 1.05, bodyLength * 0.5, 14);
    haunchGeom.rotateZ(Math.PI / 2);
    const haunches = new THREE.Mesh(haunchGeom, bodyMat);
    haunches.castShadow = true;
    haunches.receiveShadow = true;
    this.spineLumbar.add(haunches);

    // Thorax / Chest
    this.spineThorax = new THREE.Group();
    this.spineThorax.position.set(bodyLength * 0.28, 0.05, 0);
    this.bodyRoot.add(this.spineThorax);

    const chestGeom = new THREE.CylinderGeometry(chestRadius, bodyRadius, bodyLength * 0.55, 14);
    chestGeom.rotateZ(Math.PI / 2);
    // For panda, chest band is black
    const chestMesh = new THREE.Mesh(chestGeom, id === "panda" ? secondaryMat : bodyMat);
    chestMesh.castShadow = true;
    chestMesh.receiveShadow = true;
    this.spineThorax.add(chestMesh);

    // Chest bib / underbelly fur patch
    const bibGeom = new THREE.SphereGeometry(chestRadius * 0.88, 12, 10);
    bibGeom.scale(0.8, 0.9, 0.65);
    const bib = new THREE.Mesh(bibGeom, underbellyMat);
    bib.position.set(0.12, -0.06, 0);
    bib.castShadow = true;
    this.spineThorax.add(bib);

    // Neck
    this.neck = new THREE.Group();
    this.neck.position.set(bodyLength * 0.28, chestRadius * 0.4, 0);
    this.neck.rotation.z = Math.PI * 0.28;
    this.spineThorax.add(this.neck);

    const neckGeom = new THREE.CylinderGeometry(chestRadius * 0.55, chestRadius * 0.75, neckLength, 12);
    const neckMesh = new THREE.Mesh(neckGeom, id === "panda" ? secondaryMat : bodyMat);
    neckMesh.position.y = neckLength * 0.5;
    neckMesh.castShadow = true;
    this.neck.add(neckMesh);

    // Head
    this.head = new THREE.Group();
    this.head.position.set(0, neckLength, 0);
    this.head.rotation.z = -Math.PI * 0.24;
    this.neck.add(this.head);

    // Cranium
    const headScale = id === "lion" ? 1.3 : id === "panda" ? 1.25 : id === "deer" ? 1.05 : 0.9;
    const craniumGeom = new THREE.SphereGeometry(0.24 * headScale, 14, 12);
    craniumGeom.scale(1.2, 0.95, 0.9);
    const cranium = new THREE.Mesh(craniumGeom, bodyMat);
    cranium.castShadow = true;
    this.head.add(cranium);

    // Snout / Muzzle
    const snoutLength = id === "fox" || id === "moon_fox" ? 0.35 : id === "deer" ? 0.38 : id === "lion" ? 0.32 : 0.2;
    const snoutWidth = id === "panda" ? 0.22 : id === "lion" ? 0.24 : 0.14;
    const snoutGeom = new THREE.ConeGeometry(snoutWidth * headScale, snoutLength * headScale, 12);
    snoutGeom.rotateZ(-Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeom, (id === "fox" || id === "moon_fox") ? underbellyMat : secondaryMat);
    snout.position.set(0.25 * headScale, -0.05 * headScale, 0);
    snout.castShadow = true;
    this.head.add(snout);

    // Nose Tip
    const noseGeom = new THREE.SphereGeometry(0.045 * headScale, 8, 8);
    const nose = new THREE.Mesh(noseGeom, darkMat);
    nose.position.set((0.25 + snoutLength * 0.9) * headScale, -0.05 * headScale, 0);
    this.head.add(nose);

    // Eyes (Left & Right)
    for (const side of [-1, 1]) {
      const eyeZ = 0.15 * headScale * side;
      // Panda dark eye patch
      if (id === "panda") {
        const patchGeom = new THREE.SphereGeometry(0.09, 8, 8);
        patchGeom.scale(1.1, 0.8, 0.5);
        const patch = new THREE.Mesh(patchGeom, secondaryMat);
        patch.position.set(0.12 * headScale, 0.05 * headScale, eyeZ * 1.05);
        this.head.add(patch);
      }

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038 * headScale, 10, 10), eyeMat);
      eye.position.set(0.14 * headScale, 0.06 * headScale, eyeZ);
      this.head.add(eye);

      // Pupil reflection
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016 * headScale, 6, 6), darkMat);
      pupil.position.set(0.165 * headScale, 0.06 * headScale, eyeZ + 0.01 * side);
      this.head.add(pupil);
    }

    // Ears
    for (const side of [-1, 1]) {
      const earZ = 0.16 * headScale * side;
      if (id === "fox" || id === "moon_fox") {
        // Pointed tall ears
        const earGeom = new THREE.ConeGeometry(0.1, 0.28, 8);
        earGeom.scale(0.8, 1, 0.4);
        const ear = new THREE.Mesh(earGeom, secondaryMat);
        ear.position.set(-0.02 * headScale, 0.28 * headScale, earZ);
        ear.rotation.set(0.1 * side, 0, -0.2);
        this.head.add(ear);

        // Inner ear pinkish tuft
        const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.22, 6), underbellyMat);
        innerEar.position.set(0.01 * headScale, 0.26 * headScale, earZ * 0.95);
        innerEar.rotation.set(0.1 * side, 0, -0.2);
        this.head.add(innerEar);
      } else if (id === "panda") {
        // Round furry bear ears
        const earGeom = new THREE.SphereGeometry(0.1, 10, 10);
        earGeom.scale(0.8, 1.0, 0.4);
        const ear = new THREE.Mesh(earGeom, secondaryMat);
        ear.position.set(-0.06 * headScale, 0.22 * headScale, earZ * 1.2);
        this.head.add(ear);
      } else if (id === "deer") {
        // Graceful leaf-shaped ears
        const earGeom = new THREE.ConeGeometry(0.08, 0.25, 8);
        earGeom.scale(0.7, 1.1, 0.35);
        const ear = new THREE.Mesh(earGeom, bodyMat);
        ear.position.set(-0.06 * headScale, 0.22 * headScale, earZ * 1.3);
        ear.rotation.set(0.6 * side, 0.2 * side, -0.4);
        this.head.add(ear);
      } else if (id === "lion") {
        // Rounded muscular feline ears
        const earGeom = new THREE.SphereGeometry(0.09, 8, 8);
        earGeom.scale(0.6, 1.0, 0.7);
        const ear = new THREE.Mesh(earGeom, secondaryMat);
        ear.position.set(-0.08 * headScale, 0.22 * headScale, earZ * 1.1);
        this.head.add(ear);
      }
    }

    // Species Specific: Antlers for Deer
    if (id === "deer") {
      this.antlersGroup = new THREE.Group();
      this.head.add(this.antlersGroup);
      const antlerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colors.antlers || "#d4be9b"),
        roughness: 0.65,
        metalness: 0.1,
      });
      this.materials.push(antlerMat);

      for (const side of [-1, 1]) {
        const antler = new THREE.Group();
        antler.position.set(-0.02, 0.18, 0.08 * side);
        antler.rotation.set(0.35 * side, 0.1 * side, -0.2);

        // Main Beam
        const beamGeom = new THREE.CylinderGeometry(0.022, 0.038, 0.7, 8);
        beamGeom.translate(0, 0.35, 0);
        const beam = new THREE.Mesh(beamGeom, antlerMat);
        beam.rotation.z = -0.35;
        beam.rotation.x = 0.25 * side;
        antler.add(beam);

        // Brow tine
        const browGeom = new THREE.CylinderGeometry(0.016, 0.026, 0.25, 6);
        browGeom.translate(0, 0.12, 0);
        const brow = new THREE.Mesh(browGeom, antlerMat);
        brow.position.set(0.05, 0.18, 0);
        brow.rotation.z = 0.6;
        antler.add(brow);

        // Crown points
        const crown1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.28, 6), antlerMat);
        crown1.position.set(0.12, 0.52, 0.05 * side);
        crown1.rotation.z = 0.4;
        antler.add(crown1);

        const crown2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.018, 0.22, 6), antlerMat);
        crown2.position.set(0.02, 0.65, -0.04 * side);
        crown2.rotation.z = -0.3;
        antler.add(crown2);

        this.antlersGroup.add(antler);
      }
    }

    // Species Specific: Mane for Lion
    if (id === "lion") {
      this.maneGroup = new THREE.Group();
      this.neck.add(this.maneGroup);
      const maneMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colors.mane || "#502008"),
        roughness: 0.95,
        metalness: 0.05,
      });
      this.materials.push(maneMat);

      // Layered mane tufts surrounding head and neck
      const numTufts = 16;
      for (let i = 0; i < numTufts; i++) {
        const theta = (i / numTufts) * Math.PI * 2;
        const radius = 0.38 + Math.sin(i * 3.5) * 0.08;
        const tuftGeom = new THREE.ConeGeometry(0.14, 0.45, 6);
        tuftGeom.rotateX(Math.PI / 2);
        const tuft = new THREE.Mesh(tuftGeom, maneMat);
        tuft.position.set(Math.cos(theta) * radius * 0.5, neckLength * 0.7 + Math.sin(theta) * radius, Math.cos(theta) * radius * 0.85);
        tuft.lookAt(0, neckLength * 0.7, 0);
        tuft.rotateY(Math.PI);
        this.maneGroup.add(tuft);
      }
    }

    // Species Specific: Moon Fox Celestial Forehead Crest & Aura Motes
    if (id === "moon_fox") {
      const crestMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colors.accent),
        emissive: new THREE.Color(colors.accent),
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      this.materials.push(crestMat);

      // Luminous crescent forehead symbol
      const crestGeom = new THREE.TorusGeometry(0.045, 0.012, 8, 16, Math.PI * 1.4);
      const crest = new THREE.Mesh(crestGeom, crestMat);
      crest.position.set(0.18, 0.16, 0);
      crest.rotation.y = Math.PI / 2;
      crest.rotation.z = Math.PI * 0.3;
      this.head.add(crest);

      // Celestial Aura Particles Container
      this.particlesGroup = new THREE.Group();
      this.group.add(this.particlesGroup);

      const pGeom = new THREE.BufferGeometry();
      const pCount = 28;
      const pos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 1.6;
        pos[i * 3 + 1] = Math.random() * 1.2;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      }
      pGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pMat = new THREE.PointsMaterial({
        color: new THREE.Color(colors.accent),
        size: 0.07,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      this.materials.push(pMat);
      const pSystem = new THREE.Points(pGeom, pMat);
      this.particlesGroup.add(pSystem);
    }

    // Articulated Tail
    const tailSegCount = id === "fox" || id === "moon_fox" ? 5 : id === "lion" ? 6 : id === "deer" ? 2 : 2;
    let prevSeg: THREE.Group = this.spineLumbar;
    const tailLength = id === "fox" || id === "moon_fox" ? 0.95 : id === "lion" ? 1.1 : 0.22;
    const segLen = tailLength / tailSegCount;

    for (let i = 0; i < tailSegCount; i++) {
      const segGroup = new THREE.Group();
      if (i === 0) {
        segGroup.position.set(-bodyLength * 0.25, 0.1, 0);
        segGroup.rotation.z = -Math.PI * 0.35;
      } else {
        segGroup.position.set(-segLen, 0, 0);
      }
      prevSeg.add(segGroup);
      this.tailSegments.push(segGroup);
      prevSeg = segGroup;

      // Fox tail brush is thick and tapered
      let tRadius = 0.05;
      if (id === "fox" || id === "moon_fox") {
        tRadius = (i >= 1 && i <= 3) ? 0.14 : 0.08;
      } else if (id === "lion") {
        tRadius = (i === tailSegCount - 1) ? 0.1 : 0.038;
      }

      const isTip = i === tailSegCount - 1;
      const tMat = isTip && (id === "fox" || id === "moon_fox") ? underbellyMat : (isTip && id === "lion") ? secondaryMat : bodyMat;
      const tGeom = new THREE.CylinderGeometry(tRadius * 0.8, tRadius, segLen, 8);
      tGeom.rotateZ(Math.PI / 2);
      const tMesh = new THREE.Mesh(tGeom, tMat);
      tMesh.position.x = -segLen * 0.5;
      segGroup.add(tMesh);
    }

    // 4 Articulated Limbs
    // Indices: 0: FrontLeft, 1: FrontRight, 2: RearLeft, 3: RearRight
    const limbOffsets: [number, number, number][] = [
      [bodyLength * 0.24, -0.05, bodyRadius * 0.85],
      [bodyLength * 0.24, -0.05, -bodyRadius * 0.85],
      [-bodyLength * 0.25, -0.05, bodyRadius * 0.85],
      [-bodyLength * 0.25, -0.05, -bodyRadius * 0.85],
    ];

    for (let i = 0; i < 4; i++) {
      const isFront = i < 2;
      const [ox, oy, oz] = limbOffsets[i];
      const upperLen = legHeight * 0.52;
      const lowerLen = legHeight * 0.48;

      const upperGroup = new THREE.Group();
      upperGroup.position.set(ox, oy, oz);
      this.bodyRoot.add(upperGroup);
      this.limbUpper.push(upperGroup);

      // Thigh / Shoulder
      const upperR = isFront ? chestRadius * 0.32 : bodyRadius * 0.42;
      const upperGeom = new THREE.CylinderGeometry(upperR * 0.75, upperR, upperLen, 10);
      upperGeom.translate(0, -upperLen * 0.5, 0);
      const upperMesh = new THREE.Mesh(upperGeom, (id === "panda" ? secondaryMat : bodyMat));
      upperMesh.castShadow = true;
      upperGroup.add(upperMesh);

      // Knee / Hock Joint
      const lowerGroup = new THREE.Group();
      lowerGroup.position.set(0, -upperLen, 0);
      upperGroup.add(lowerGroup);
      this.limbLower.push(lowerGroup);

      // Shank / Foreleg
      const lowerGeom = new THREE.CylinderGeometry(upperR * 0.5, upperR * 0.7, lowerLen, 8);
      lowerGeom.translate(0, -lowerLen * 0.5, 0);
      const lowerMesh = new THREE.Mesh(lowerGeom, (id === "panda" || id === "fox" || id === "moon_fox") ? secondaryMat : bodyMat);
      lowerMesh.castShadow = true;
      lowerGroup.add(lowerMesh);

      // Paw / Hoof
      const footGroup = new THREE.Group();
      footGroup.position.set(0, -lowerLen, 0);
      lowerGroup.add(footGroup);
      this.limbFoot.push(footGroup);

      const footGeom = id === "deer"
        ? new THREE.BoxGeometry(0.08, 0.08, 0.08)
        : new THREE.SphereGeometry(upperR * 0.55, 8, 8);
      footGeom.scale(1.2, 0.7, 1.0);
      const footMesh = new THREE.Mesh(footGeom, secondaryMat);
      footMesh.position.set(0.03, -0.02, 0);
      footMesh.castShadow = true;
      footGroup.add(footMesh);
    }
  }

  /** Updates quadruped skeletal motion */
  updateAnimation(
    dt: number,
    speed: number,
    isGrounded: boolean,
    vy: number,
    isSliding: boolean,
    squashAmount = 0
  ): void {
    this.breatheTime += dt * 2.4;
    this.squashFactor += (squashAmount - this.squashFactor) * Math.min(1, dt * 10);

    // Celestial aura mote swirl for Moon Fox
    if (this.particlesGroup) {
      this.particlesGroup.rotation.y += dt * 0.8;
      const positions = (this.particlesGroup.children[0] as THREE.Points).geometry.attributes.position;
      const arr = positions.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += dt * 0.4;
        if (arr[i + 1] > 1.4) arr[i + 1] = 0.1;
      }
      positions.needsUpdate = true;
    }

    if (isGrounded && !isSliding) {
      if (speed > 10) {
        // Active Running / Trotting
        const stride = this.definition.physics.strideLength;
        this.cycleTime += (dt * speed) / stride * Math.PI * 2;

        const cy = this.cycleTime;
        // Quadruped diagonal trot / gallop phase offsets
        const phases = [
          cy,              // Front Left
          cy + Math.PI,    // Front Right
          cy + Math.PI,    // Rear Left
          cy,              // Rear Right
        ];

        for (let i = 0; i < 4; i++) {
          const ph = phases[i];
          const swing = Math.sin(ph);
          const lift = Math.max(0, Math.cos(ph));

          // Shoulder/Hip forward-backward swing
          this.limbUpper[i].rotation.z = swing * 0.55;
          // Knee bend during backswing/lift
          this.limbLower[i].rotation.z = -lift * 0.65;
          // Ankle/Paw compensation
          this.limbFoot[i].rotation.z = -swing * 0.2;
        }

        // Spine flexion during running
        const spineFlex = Math.sin(cy) * 0.08;
        this.spineThorax.rotation.z = spineFlex;
        this.spineLumbar.rotation.z = -spineFlex * 0.7;
        this.head.rotation.z = -Math.PI * 0.24 - spineFlex * 0.5;

        // Vertical body bounce
        this.bodyRoot.position.y = (this.definition.physics.bodyHeight * 0.016) + Math.abs(Math.sin(cy * 2)) * 0.08;

        // Tail wave
        this.tailSegments.forEach((seg, idx) => {
          seg.rotation.y = Math.sin(cy + idx * 0.5) * 0.15;
          seg.rotation.z = -0.15 + Math.sin(cy * 2 + idx * 0.4) * 0.08;
        });

      } else {
        // Idle Stance: gentle breathing and micro-sways
        const br = Math.sin(this.breatheTime);
        this.bodyRoot.position.y = (this.definition.physics.bodyHeight * 0.016) + br * 0.015;
        this.spineThorax.scale.set(1 + br * 0.02, 1 + br * 0.03, 1 + br * 0.02);

        // Relaxed limbs
        for (let i = 0; i < 4; i++) {
          this.limbUpper[i].rotation.z = (i % 2 === 0 ? 0.04 : -0.04);
          this.limbLower[i].rotation.z = 0.02;
          this.limbFoot[i].rotation.z = 0;
        }

        // Idle tail swish
        this.tailSegments.forEach((seg, idx) => {
          seg.rotation.y = Math.sin(this.breatheTime * 0.8 + idx * 0.4) * 0.22;
          seg.rotation.z = -0.3 + Math.sin(this.breatheTime * 0.4 + idx * 0.2) * 0.08;
        });

        // Head gentle survey
        this.head.rotation.y = Math.sin(this.breatheTime * 0.4) * 0.15;
        this.head.rotation.z = -Math.PI * 0.24 + Math.sin(this.breatheTime * 0.7) * 0.04;
      }
    } else if (!isGrounded) {
      // In-Air: Jump Rise / Apex / Fall
      const flightRatio = THREE.MathUtils.clamp(vy / 800, -1, 1); // 1 = rising fast, -1 = falling fast
      
      // Aerodynamic pitch: nose up on ascent, nose down on descent
      this.bodyRoot.rotation.z = flightRatio * 0.35;

      // Paws tucked during rise, reaching out on fall
      const tuck = flightRatio > 0 ? 0.4 : -0.2;
      this.limbUpper[0].rotation.z = 0.6 + tuck;
      this.limbUpper[1].rotation.z = 0.4 + tuck;
      this.limbUpper[2].rotation.z = -0.7 + tuck;
      this.limbUpper[3].rotation.z = -0.5 + tuck;

      this.limbLower[0].rotation.z = -0.8;
      this.limbLower[1].rotation.z = -0.7;
      this.limbLower[2].rotation.z = 0.6;
      this.limbLower[3].rotation.z = 0.5;

      // Tail trails behind in flight
      this.tailSegments.forEach((seg) => {
        seg.rotation.z = 0.15 - flightRatio * 0.25;
      });
    } else if (isSliding) {
      // Sliding low crouch posture
      this.bodyRoot.position.y = (this.definition.physics.bodyHeight * 0.016) * 0.45;
      this.bodyRoot.rotation.z = -0.15;

      // Limbs swept back / forwards
      this.limbUpper[0].rotation.z = 0.9;
      this.limbUpper[1].rotation.z = 0.9;
      this.limbUpper[2].rotation.z = -0.85;
      this.limbUpper[3].rotation.z = -0.85;

      this.tailSegments.forEach((seg) => {
        seg.rotation.z = 0.4;
      });
    }

    // Apply Landing Squash impact deformation
    if (this.squashFactor > 0.01) {
      const sq = this.squashFactor * this.definition.physics.landingSquash;
      this.bodyRoot.scale.set(
        this.definition.cameraOffset.scale * (1 + sq * 0.6),
        this.definition.cameraOffset.scale * (1 - sq * 0.8),
        this.definition.cameraOffset.scale * (1 + sq * 0.4)
      );
    } else {
      const sc = this.definition.cameraOffset.scale;
      this.bodyRoot.scale.set(sc, sc, sc);
    }
  }

  dispose(): void {
    this.materials.forEach((m) => m.dispose());
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  }
}
