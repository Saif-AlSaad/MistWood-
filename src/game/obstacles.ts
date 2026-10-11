/* Photorealistic Obstacle Renderer — geological faceted boulders, organic fallen timber with shelf fungi, entwined hanging lianas, ancient mossy stumps, and dense briar thickets */

import type { Obstacle, Palette, RGB } from "./types";
import { TAU, clamp, hash, mix, rgb } from "./types";

export class ObstacleRenderer {
  /**
   * Master renderer for all obstacle kinds
   */
  static render(
    ctx: CanvasRenderingContext2D,
    ob: Obstacle,
    gy: number,
    time: number,
    pal: Palette,
  ): void {
    const x = ob.x; // typically 0 in engine coordinate space

    // 1. Photorealistic multi-layered ground contact ambient occlusion shadow
    if (ob.kind !== "vine") {
      this.renderGroundShadow(ctx, x, gy, ob.w, ob.kind);
    }

    // 2. Dispatch to dedicated photorealistic renderer
    switch (ob.kind) {
      case "rock":
      case "boulder":
        this.renderRockOrBoulder(ctx, ob, x, gy, pal);
        break;
      case "log":
        this.renderFallenLog(ctx, ob, x, gy, pal);
        break;
      case "stump":
        this.renderAncientStump(ctx, ob, x, gy, pal);
        break;
      case "bramble":
        this.renderBriarBramble(ctx, ob, x, gy, pal);
        break;
      case "vine":
        this.renderHangingLiana(ctx, ob, x, gy, time, pal);
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Contact Ground Shadow                                              */
  /* ------------------------------------------------------------------ */

  private static renderGroundShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    gy: number,
    w: number,
    kind: string,
  ): void {
    const shadowW = kind === "log" ? w * 1.08 : w * 0.88;
    const shadowH = kind === "log" ? 11 : 9;

    // Soft outer ambient occlusion halo
    ctx.fillStyle = "rgba(2, 4, 8, 0.28)";
    ctx.beginPath();
    ctx.ellipse(x, gy + 3.5, shadowW * 0.58, shadowH, 0, 0, TAU);
    ctx.fill();

    // Tight dark direct soil contact crevice
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.beginPath();
    ctx.ellipse(x, gy + 1.2, shadowW * 0.42, shadowH * 0.42, 0, 0, TAU);
    ctx.fill();
  }

  /* ------------------------------------------------------------------ */
  /* 1. Photorealistic Geological Rock & Boulder                        */
  /* ------------------------------------------------------------------ */

  private static renderRockOrBoulder(
    ctx: CanvasRenderingContext2D,
    ob: Obstacle,
    x: number,
    gy: number,
    pal: Palette,
  ): void {
    const hw = ob.w / 2;
    const h = ob.h;
    const seed = ob.seed;

    // Generate natural angular geological facets (not a smooth radial balloon!)
    const facetCount = ob.kind === "boulder" ? 9 : 7;
    const pts: { x: number; y: number }[] = [];
    pts.push({ x: -hw * 1.04, y: 1 }); // bottom-left ground anchor

    for (let i = 1; i < facetCount; i++) {
      const fr = i / facetCount;
      const angle = Math.PI - fr * Math.PI; // PI to 0
      // Introduce sharp geological fracture offsets
      const roughness = 0.82 + hash(seed + i * 13, 401) * 0.36;
      const asymmetry = (hash(seed + i * 17, 402) - 0.5) * hw * 0.18;
      const px = Math.cos(angle) * hw * roughness + asymmetry;
      const py = -Math.sin(angle) * h * roughness;
      pts.push({ x: px, y: py });
    }
    pts.push({ x: hw * 1.04, y: 1 }); // bottom-right ground anchor

    // 1. Base Geological Volume Shading (stratified granite / slate)
    const baseGrad = ctx.createLinearGradient(x - hw * 0.4, gy - h, x + hw * 0.5, gy);
    const sunlitStone = mix(pal.ground, pal.rim, 0.35);
    const midStone = mix(pal.ground, [68, 76, 84], 0.4);
    const shadowStone = mix(pal.ground, [6, 8, 12], 0.7);

    baseGrad.addColorStop(0, rgb(sunlitStone));
    baseGrad.addColorStop(0.35, rgb(midStone));
    baseGrad.addColorStop(0.85, rgb(shadowStone));
    baseGrad.addColorStop(1, rgb([4, 6, 8]));

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.moveTo(x + pts[0].x, gy + pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(x + pts[i].x, gy + pts[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // 2. Geological Fracture Planes & Internal Facet Shadows
    ctx.save();
    ctx.clip(); // clip internal cracks and moss to the rock silhouette

    // Internal chiseled ridge dividing lit facet and shadow facet
    const midRidgeX = x - hw * 0.08 + (hash(seed, 403) - 0.5) * hw * 0.2;
    ctx.fillStyle = "rgba(4, 6, 10, 0.45)";
    ctx.beginPath();
    ctx.moveTo(midRidgeX, gy - h * 0.95);
    ctx.lineTo(x + hw * 0.7, gy - h * 0.45);
    ctx.lineTo(x + pts[pts.length - 1].x, gy + 1);
    ctx.lineTo(midRidgeX + hw * 0.3, gy + 1);
    ctx.closePath();
    ctx.fill();

    // Deep jagged fracture fissures
    ctx.strokeStyle = "rgba(0, 0, 0, 0.75)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const crackStartX = x - hw * 0.22;
    const crackStartY = gy - h * 0.78;
    ctx.moveTo(crackStartX, crackStartY);
    ctx.lineTo(crackStartX + hw * 0.28, crackStartY + h * 0.32);
    ctx.lineTo(crackStartX + hw * 0.15, crackStartY + h * 0.58);
    ctx.stroke();

    // Highlighted chiseled edge along the crack
    ctx.strokeStyle = rgb(pal.rim, 0.32);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(crackStartX + 1, crackStartY);
    ctx.lineTo(crackStartX + hw * 0.28 + 1, crackStartY + h * 0.32);
    ctx.stroke();

    // Secondary diagonal mineral strata vein
    ctx.strokeStyle = rgb(mix(pal.rim, [230, 240, 255], 0.5), 0.22);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.7, gy - h * 0.25);
    ctx.lineTo(x + hw * 0.45, gy - h * 0.85);
    ctx.stroke();

    // 3. Thick Sprawling Velvet Moss Carpet along upper crest
    const mossDeep: RGB = [39, 58, 23];
    const mossVibrant: RGB = [77, 124, 15];
    const mossHighlight: RGB = [132, 204, 22];

    // Base deep moss layer
    ctx.fillStyle = rgb(mossDeep, 0.92);
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.85, gy - h * 0.4);
    // Undulating organic scalloped fringe
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.lineTo(x + pts[i].x, gy + pts[i].y);
    }
    ctx.lineTo(x + hw * 0.65, gy - h * 0.45);
    // Scalloped bottom boundary of moss
    for (let px = x + hw * 0.65; px >= x - hw * 0.85; px -= 12) {
      const scall = gy - h * 0.42 + Math.sin(px * 0.25 + seed) * h * 0.14;
      ctx.lineTo(px, scall);
    }
    ctx.closePath();
    ctx.fill();

    // Velvet moss highlight fringe
    ctx.fillStyle = rgb(mossVibrant, 0.85);
    ctx.beginPath();
    for (let i = 2; i < pts.length - 2; i++) {
      const pt = pts[i];
      const mossY = gy + pt.y;
      ctx.arc(x + pt.x, mossY + 3, 4.5 + hash(seed + i, 404) * 4, 0, TAU);
    }
    ctx.fill();

    // Microscopic moss frill spires along upper edge
    ctx.fillStyle = rgb(mossHighlight, 0.65);
    for (let s = 0; s < 7; s++) {
      const frX = x - hw * 0.5 + (s / 6) * hw;
      const frY = gy - h * (0.8 + hash(seed + s, 405) * 0.18);
      ctx.beginPath();
      ctx.arc(frX, frY, 1.8, 0, TAU);
      ctx.fill();
    }

    // 4. Crustose Lichen Rosettes (pale celadon & gold colonies)
    for (let m = 0; m < 5; m++) {
      const lx = x + (hash(seed + m * 7, 406) - 0.5) * hw * 1.2;
      const ly = gy - h * (0.25 + hash(seed + m * 9, 407) * 0.45);
      const lr = 2.2 + hash(seed + m, 408) * 3.5;
      const isGold = hash(seed + m, 409) > 0.6;
      ctx.fillStyle = isGold ? "rgba(245, 158, 11, 0.45)" : "rgba(190, 242, 100, 0.38)";
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, TAU);
      ctx.fill();
    }

    ctx.restore(); // end clip

    // 5. Chiseled Rim Highlights on Topmost Sunlit Facets
    ctx.strokeStyle = rgb(pal.rim, 0.42);
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + pts[1].x, gy + pts[1].y);
    for (let i = 2; i < Math.floor(pts.length * 0.65); i++) {
      ctx.lineTo(x + pts[i].x, gy + pts[i].y);
    }
    ctx.stroke();

    // 6. Base contact fern sprout nestled in stone crevice
    const fernX = x + hw * 0.6;
    const fernY = gy;
    ctx.fillStyle = rgb([34, 197, 94], 0.75);
    ctx.beginPath();
    ctx.ellipse(fernX + 4, fernY - 6, 6, 2.5, -0.65, 0, TAU);
    ctx.ellipse(fernX - 3, fernY - 5, 5, 2.2, 0.55, 0, TAU);
    ctx.fill();
  }

  /* ------------------------------------------------------------------ */
  /* 2. Photorealistic Fallen Log (Gnarled Timber, Bracket Fungi, Bark) */
  /* ------------------------------------------------------------------ */

  private static renderFallenLog(
    ctx: CanvasRenderingContext2D,
    ob: Obstacle,
    x: number,
    gy: number,
    pal: Palette,
  ): void {
    const hw = ob.w / 2;
    const h = ob.h;
    const seed = ob.seed;

    // Organic asymmetrical trunk profile:
    // Left side: slightly thicker root buttress with knobby flare
    // Right side: shattered fractured timber end with splintered fibers
    const leftH = h * 1.08;
    const rightH = h * 0.88;

    // 1. 3D Cylindrical Bark Volume Gradient
    const barkGrad = ctx.createLinearGradient(x, gy - h, x, gy);
    const sunBark = mix(pal.ground, pal.rim, 0.28);
    const midBark = mix(pal.ground, [78, 52, 34], 0.35);
    const shadowBark = mix(pal.ground, [6, 6, 8], 0.72);

    barkGrad.addColorStop(0, rgb(sunBark));
    barkGrad.addColorStop(0.28, rgb(midBark));
    barkGrad.addColorStop(0.75, rgb(shadowBark));
    barkGrad.addColorStop(1, rgb([2, 4, 6]));

    ctx.fillStyle = barkGrad;
    ctx.beginPath();
    // Bottom baseline
    ctx.moveTo(x - hw, gy);
    // Left end-cut contour (flared root collar)
    ctx.quadraticCurveTo(x - hw - 4, gy - leftH * 0.5, x - hw, gy - leftH);
    // Top contoured bark crest with knobby gnarled bumps
    ctx.bezierCurveTo(
      x - hw * 0.4, gy - leftH * 1.05,
      x + hw * 0.3, gy - rightH * 0.95,
      x + hw, gy - rightH,
    );
    // Right jagged broken fracture end
    ctx.lineTo(x + hw + 6, gy - rightH * 0.6);
    ctx.lineTo(x + hw - 2, gy - rightH * 0.35);
    ctx.lineTo(x + hw + 4, gy);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip(); // clip bark textures and moss to log body

    // 2. Deep Longitudinal Bark Furrows & Striations
    ctx.strokeStyle = "rgba(4, 3, 2, 0.65)";
    ctx.lineWidth = 1.3;
    const furrowCount = 5;
    for (let f = 0; f < furrowCount; f++) {
      const frY = (f + 1) / (furrowCount + 1);
      const ly = gy - h * frY;
      ctx.beginPath();
      ctx.moveTo(x - hw + 8, ly + (hash(seed + f, 410) - 0.5) * 4);
      ctx.quadraticCurveTo(
        x + (hash(seed + f * 3, 411) - 0.5) * 20,
        ly + (hash(seed + f * 5, 412) - 0.5) * 6,
        x + hw - 10,
        ly - 2 + (hash(seed + f * 7, 413) - 0.5) * 4,
      );
      ctx.stroke();

      // Highlight on upper lip of bark furrow
      ctx.strokeStyle = rgb(pal.rim, 0.22);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x - hw + 12, ly - 1);
      ctx.lineTo(x + hw - 14, ly - 3);
      ctx.stroke();
      ctx.strokeStyle = "rgba(4, 3, 2, 0.65)";
      ctx.lineWidth = 1.3;
    }

    // 3. Spongy Velvet Moss Blanket on Moist Top Surface
    ctx.fillStyle = "rgba(77, 124, 15, 0.85)";
    ctx.beginPath();
    ctx.moveTo(x - hw + 4, gy - leftH + 2);
    ctx.quadraticCurveTo(x, gy - h - 2, x + hw - 18, gy - rightH + 2);
    ctx.quadraticCurveTo(x + hw * 0.2, gy - h * 0.65, x - hw + 10, gy - leftH * 0.7);
    ctx.closePath();
    ctx.fill();

    // Moss highlight tufts
    ctx.fillStyle = "rgba(132, 204, 22, 0.65)";
    for (let m = 0; m < 5; m++) {
      const mx = x - hw * 0.6 + m * (hw * 0.32);
      const my = gy - h * (0.85 + hash(seed + m, 414) * 0.15);
      ctx.beginPath();
      ctx.arc(mx, my, 2.5 + hash(seed + m, 415) * 2, 0, TAU);
      ctx.fill();
    }

    ctx.restore(); // end clip

    // 4. Exposed Left End-Grain Heartwood with Growth Rings
    const endX = x - hw + 2.5;
    const endY = gy - leftH * 0.52;
    const endRadiusX = 4.2;
    const endRadiusY = leftH * 0.44;

    // Weathered sapwood face
    ctx.fillStyle = rgb(mix(pal.ground, pal.rim, 0.22));
    ctx.beginPath();
    ctx.ellipse(endX, endY, endRadiusX, endRadiusY, 0, 0, TAU);
    ctx.fill();

    // Concentric growth rings
    ctx.strokeStyle = rgb(pal.rim, 0.38);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(endX, endY, endRadiusX * 0.75, endRadiusY * 0.75, 0, 0, TAU);
    ctx.ellipse(endX, endY, endRadiusX * 0.42, endRadiusY * 0.42, 0, 0, TAU);
    ctx.stroke();

    // Dark pith center & radial shrinkage check crack
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.beginPath();
    ctx.arc(endX, endY, 1.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX + 2, endY - endRadiusY * 0.8);
    ctx.stroke();

    // 5. Shattered Splintered Wood Shards protruding from Right Break
    ctx.fillStyle = rgb(mix(pal.ground, pal.rim, 0.3));
    ctx.beginPath();
    ctx.moveTo(x + hw, gy - rightH * 0.75);
    ctx.lineTo(x + hw + 11, gy - rightH * 0.65);
    ctx.lineTo(x + hw + 1, gy - rightH * 0.55);
    ctx.lineTo(x + hw + 8, gy - rightH * 0.4);
    ctx.lineTo(x + hw, gy - rightH * 0.25);
    ctx.closePath();
    ctx.fill();

    // 6. Bracket Shelf Fungi (Poly-pore mushrooms tiered along the side)
    const fungusCount = 2;
    for (let f = 0; f < fungusCount; f++) {
      const fx = x - hw * 0.3 + f * hw * 0.55;
      const fy = gy - h * (0.35 + f * 0.18);
      const fw = 11 + hash(seed + f, 416) * 5;
      const fh = 3.6 + hash(seed + f, 417) * 1.5;

      // Soft underside shadow
      ctx.fillStyle = "rgba(4, 4, 6, 0.6)";
      ctx.beginPath();
      ctx.ellipse(fx, fy + 2, fw * 0.5, fh * 0.6, 0, 0, TAU);
      ctx.fill();

      // Deep umber mushroom cap
      ctx.fillStyle = "rgba(120, 53, 15, 0.95)";
      ctx.beginPath();
      ctx.ellipse(fx, fy, fw * 0.5, fh, 0, 0, TAU);
      ctx.fill();

      // Creamy pale growing outer edge
      ctx.strokeStyle = "rgba(254, 243, 199, 0.85)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(fx, fy, fw * 0.5, fh, 0, 0, Math.PI);
      ctx.stroke();
    }

    // 7. Top Specular Ridge Rim Highlight
    ctx.strokeStyle = rgb(pal.rim, 0.32);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x - hw + 8, gy - leftH + 1.2);
    ctx.quadraticCurveTo(x, gy - h - 1, x + hw - 10, gy - rightH + 1.2);
    ctx.stroke();
  }

  /* ------------------------------------------------------------------ */
  /* 3. Photorealistic Ancient Tree Stump (Buttress Roots, Rot Hollow)  */
  /* ------------------------------------------------------------------ */

  private static renderAncientStump(
    ctx: CanvasRenderingContext2D,
    ob: Obstacle,
    x: number,
    gy: number,
    pal: Palette,
  ): void {
    const hw = ob.w / 2;
    const h = ob.h;
    const seed = ob.seed;

    // 1. Gnarled Flared Trunk with Sprawling Buttress Roots
    const stumpGrad = ctx.createLinearGradient(x - hw, gy - h, x + hw, gy);
    stumpGrad.addColorStop(0, rgb(mix(pal.ground, pal.rim, 0.24)));
    stumpGrad.addColorStop(0.4, rgb(mix(pal.ground, [72, 54, 38], 0.35)));
    stumpGrad.addColorStop(1, rgb(mix(pal.ground, [6, 6, 8], 0.68)));

    ctx.fillStyle = stumpGrad;
    ctx.beginPath();
    // Left massive clawing root flare
    ctx.moveTo(x - hw * 1.35, gy);
    ctx.quadraticCurveTo(x - hw * 1.05, gy - h * 0.28, x - hw * 0.88, gy - h * 0.92);
    // Cut top rim with jagged break notches
    ctx.lineTo(x + hw * 0.88, gy - h * 0.92);
    // Right massive root flare
    ctx.quadraticCurveTo(x + hw * 1.05, gy - h * 0.28, x + hw * 1.35, gy);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip(); // clip bark ridges to stump body

    // Vertical deep bark fissures
    ctx.strokeStyle = "rgba(4, 3, 2, 0.65)";
    ctx.lineWidth = 1.4;
    for (let r = 0; r < 4; r++) {
      const rx = x - hw * 0.6 + r * (hw * 0.4);
      ctx.beginPath();
      ctx.moveTo(rx, gy - h * 0.88);
      ctx.quadraticCurveTo(
        rx + (hash(seed + r, 420) - 0.5) * 8,
        gy - h * 0.45,
        rx + (r < 2 ? -6 : 6),
        gy - 1,
      );
      ctx.stroke();
    }

    // Moss climbing up buttress roots
    ctx.fillStyle = "rgba(77, 124, 15, 0.75)";
    ctx.beginPath();
    ctx.ellipse(x - hw * 0.7, gy - 2, hw * 0.4, h * 0.25, 0.3, 0, TAU);
    ctx.ellipse(x + hw * 0.7, gy - 2, hw * 0.4, h * 0.22, -0.3, 0, TAU);
    ctx.fill();

    ctx.restore(); // end clip

    // 2. Weathered Cut Top Shelf with Deep Hollow Rot Cavity
    const topY = gy - h * 0.92;
    const topW = hw * 0.86;
    const topH = 4.8;

    // Wood shelf disc
    ctx.fillStyle = rgb(mix(pal.ground, pal.rim, 0.2));
    ctx.beginPath();
    ctx.ellipse(x, topY, topW, topH, 0, 0, TAU);
    ctx.fill();

    // Concentric growth rings
    ctx.strokeStyle = rgb(pal.rim, 0.35);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(x, topY, topW, topH, 0, 0, TAU);
    ctx.ellipse(x, topY, topW * 0.6, topH * 0.6, 0, 0, TAU);
    ctx.stroke();

    // Deep Rot Heartwood Hollow (decayed cavity in the center)
    ctx.fillStyle = "rgba(4, 2, 2, 0.88)";
    ctx.beginPath();
    ctx.ellipse(x - 1, topY + 0.5, topW * 0.35, topH * 0.45, 0, 0, TAU);
    ctx.fill();

    // Splintered wood spears on rear rim
    ctx.fillStyle = rgb(mix(pal.ground, pal.rim, 0.32));
    ctx.beginPath();
    ctx.moveTo(x - topW * 0.6, topY);
    ctx.lineTo(x - topW * 0.5, topY - 7);
    ctx.lineTo(x - topW * 0.35, topY);
    ctx.lineTo(x + topW * 0.1, topY - 5);
    ctx.lineTo(x + topW * 0.3, topY);
    ctx.closePath();
    ctx.fill();

    // Bracket fungi on root flare
    ctx.fillStyle = "rgba(146, 64, 14, 0.9)";
    ctx.beginPath();
    ctx.ellipse(x + hw * 0.85, gy - h * 0.28, 6.5, 2.4, -0.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(254, 243, 199, 0.8)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ------------------------------------------------------------------ */
  /* 4. Photorealistic Briar Bramble (Interlocking Canes, Thorns, Fruit) */
  /* ------------------------------------------------------------------ */

  private static renderBriarBramble(
    ctx: CanvasRenderingContext2D,
    ob: Obstacle,
    x: number,
    gy: number,
    pal: Palette,
  ): void {
    const hw = ob.w / 2;
    const h = ob.h;
    const seed = ob.seed;

    // 1. Deep Shadow Background Canes (dense tangled thicket silhouette)
    ctx.strokeStyle = rgb(mix(pal.ground, [0, 0, 0], 0.65));
    ctx.lineWidth = 3.8;
    ctx.lineCap = "round";
    for (let c = 0; c < 4; c++) {
      const cx0 = x - hw + c * (ob.w / 3);
      const cx1 = x + (hash(seed + c * 3, 430) - 0.5) * ob.w * 0.8;
      const cy = gy - h * (0.85 + hash(seed + c * 5, 431) * 0.35);
      ctx.beginPath();
      ctx.moveTo(cx0, gy);
      ctx.quadraticCurveTo((cx0 + cx1) / 2, cy - 8, cx1, gy);
      ctx.stroke();
    }

    // 2. Midground Intertwined Briar Canes
    const caneColor = mix(pal.ground, [78, 38, 28], 0.35);
    ctx.strokeStyle = rgb(caneColor);
    ctx.lineWidth = 3.0;

    const canes = [
      { x0: x - hw * 0.9, x1: x + hw * 0.4, archY: gy - h * 1.08 },
      { x0: x - hw * 0.3, x1: x + hw * 0.95, archY: gy - h * 0.98 },
      { x0: x - hw * 0.6, x1: x + hw * 0.7, archY: gy - h * 1.15 },
    ];

    for (const cane of canes) {
      ctx.beginPath();
      ctx.moveTo(cane.x0, gy);
      ctx.quadraticCurveTo(
        (cane.x0 + cane.x1) / 2,
        cane.archY,
        cane.x1,
        gy - 2,
      );
      ctx.stroke();
    }

    // 3. Wicked Recurved Cat's-Claw Thorns along canes
    ctx.fillStyle = rgb(mix(pal.ground, pal.rim, 0.4));
    for (let t = 0; t < 9; t++) {
      const fr = (t + 1) / 10;
      const tx = x - hw * 0.8 + fr * ob.w * 0.85;
      const ty = gy - Math.sin(fr * Math.PI) * h * 0.95 + (hash(seed + t, 432) - 0.5) * 6;
      const thornDir = hash(seed + t, 433) > 0.5 ? 1 : -1;
      const thornLen = 5.5 + hash(seed + t, 434) * 3;

      ctx.beginPath();
      ctx.moveTo(tx - 2, ty);
      ctx.quadraticCurveTo(tx, ty - 2, tx + thornDir * thornLen, ty - thornLen * 0.8);
      ctx.quadraticCurveTo(tx + 1, ty + 1, tx + 2, ty + 2);
      ctx.closePath();
      ctx.fill();

      // Sharp specular tip glint
      ctx.fillStyle = rgb(pal.rim, 0.7);
      ctx.beginPath();
      ctx.arc(tx + thornDir * thornLen, ty - thornLen * 0.8, 0.9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgb(mix(pal.ground, pal.rim, 0.4));
    }

    // 4. Wild Briar Foliage Clusters (serrated 3-leaflet sprays)
    ctx.fillStyle = "rgba(22, 101, 52, 0.88)";
    for (let l = 0; l < 5; l++) {
      const lx = x - hw * 0.7 + l * (ob.w * 0.35);
      const ly = gy - h * (0.4 + hash(seed + l * 7, 435) * 0.45);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(hash(seed + l, 436) * TAU);
      // 3 palmate leaflets
      ctx.beginPath();
      ctx.ellipse(0, -5, 2.4, 5.5, 0, 0, TAU);
      ctx.ellipse(-4, -2, 2.2, 4.8, -0.65, 0, TAU);
      ctx.ellipse(4, -2, 2.2, 4.8, 0.65, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 5. Glossy Wild Forest Berries (nightshade / blackberries with specular spark)
    for (let b = 0; b < 6; b++) {
      const bx = x - hw * 0.6 + hash(seed + b * 11, 437) * ob.w * 0.65;
      const by = gy - h * (0.35 + hash(seed + b * 13, 438) * 0.4);
      // Dark indigo/crimson drupelet
      ctx.fillStyle = "rgba(88, 28, 135, 0.95)";
      ctx.beginPath();
      ctx.arc(bx, by, 3.2, 0, TAU);
      ctx.fill();
      // Bright glint
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(bx - 1, by - 1, 0.9, 0, TAU);
      ctx.fill();
    }
  }

  /* ------------------------------------------------------------------ */
  /* 5. Photorealistic Hanging Liana / Vine (Canopy Bough, Twisted Cord)*/
  /* ------------------------------------------------------------------ */

  private static renderHangingLiana(
    ctx: CanvasRenderingContext2D,
    ob: Obstacle,
    x: number,
    gy: number,
    time: number,
    pal: Palette,
  ): void {
    const seed = ob.seed;
    const top = gy - 360 - hash(seed, 440) * 120;
    const botY = gy - ob.h; // Clearance boundary (player slides below this!)
    const totalLength = botY - top;

    // Organic pendular catenary sway
    const sway = Math.sin(time * 0.95 + seed) * 8.5;

    // 1. Massive Overhanging Canopy Bough crossing overhead (grounds the vine into the trees!)
    ctx.save();
    ctx.fillStyle = rgb(mix(pal.ground, [8, 12, 18], 0.75));
    ctx.beginPath();
    ctx.moveTo(x - 140, top - 32);
    ctx.quadraticCurveTo(x, top - 18, x + 140, top - 28);
    ctx.lineTo(x + 140, top + 18);
    ctx.quadraticCurveTo(x, top + 26, x - 140, top + 12);
    ctx.closePath();
    ctx.fill();

    // Hanging Spanish moss curtains trailing from overhead bough
    ctx.fillStyle = "rgba(68, 88, 55, 0.55)";
    for (let m = 0; m < 5; m++) {
      const mx = x - 90 + m * 42;
      const my = top + 16;
      ctx.beginPath();
      ctx.moveTo(mx - 8, my);
      ctx.quadraticCurveTo(mx + sway * 0.4, my + 35 + hash(seed + m, 441) * 30, mx + 6, my);
      ctx.fill();
    }
    ctx.restore();

    // 2. Double-Entwined Twisted Liana Woody Cable
    // Sinuous bezier curve path with tension wave
    const p1x = x + sway * 0.35;
    const p1y = top + totalLength * 0.35;
    const p2x = x + sway * 0.85;
    const p2y = top + totalLength * 0.72;
    const endX = x + sway;
    const endY = botY;

    // Deep shadow vine cord (core)
    ctx.strokeStyle = rgb(mix(pal.ground, [0, 0, 0], 0.7));
    ctx.lineWidth = 7.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.bezierCurveTo(p1x, p1y, p2x, p2y, endX, endY);
    ctx.stroke();

    // Lit fibrous woody spine
    ctx.strokeStyle = rgb(mix(pal.ground, pal.rim, 0.22));
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.bezierCurveTo(p1x, p1y, p2x, p2y, endX, endY);
    ctx.stroke();

    // Secondary Spiral Tendril wound tightly around the main cord in a 3D helix
    ctx.strokeStyle = rgb(mix(pal.ground, [68, 48, 32], 0.45));
    ctx.lineWidth = 2.2;
    const helixTurns = 8;
    for (let hx = 0; hx < helixTurns; hx++) {
      const fr0 = hx / helixTurns;
      const fr1 = (hx + 0.6) / helixTurns;
      const h0y = top + totalLength * fr0;
      const h1y = top + totalLength * fr1;
      const h0x = x + sway * fr0 + (hx % 2 === 0 ? -4.5 : 4.5);
      const h1x = x + sway * fr1 + (hx % 2 === 0 ? 4.5 : -4.5);
      ctx.beginPath();
      ctx.moveTo(h0x, h0y);
      ctx.quadraticCurveTo(x + sway * ((fr0 + fr1) / 2) + 5, (h0y + h1y) / 2, h1x, h1y);
      ctx.stroke();
    }

    // 3. Realistic Drooping Multi-Lobed Wild Ivy Leaves
    for (let l = 0; l < 7; l++) {
      const fr = (l + 1) / 8;
      const ly = top + totalLength * fr;
      const lx = x + sway * fr + (hash(seed + l, 442) - 0.5) * 12;
      const leafDir = hash(seed + l, 443) > 0.5 ? 1 : -1;
      const leafScale = 0.85 + hash(seed + l, 444) * 0.4;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.scale(leafDir * leafScale, leafScale);
      // Natural gravitational droop + wind flutter
      ctx.rotate(0.45 + Math.sin(time * 1.4 + l) * 0.14);

      // Petiole (leaf stalk)
      ctx.strokeStyle = "rgba(77, 124, 15, 0.8)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(6, 4);
      ctx.stroke();

      // Realistic 3-lobed Ivy Lamina
      ctx.fillStyle = "rgba(22, 101, 52, 0.92)";
      ctx.beginPath();
      ctx.moveTo(5, 4);
      ctx.lineTo(11, -3);
      ctx.lineTo(18, 5);
      ctx.lineTo(24, 6);
      ctx.lineTo(17, 11);
      ctx.lineTo(12, 18);
      ctx.lineTo(7, 10);
      ctx.closePath();
      ctx.fill();

      // Pale central vein rib
      ctx.strokeStyle = "rgba(134, 239, 172, 0.4)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(5, 4);
      ctx.lineTo(18, 5);
      ctx.stroke();

      ctx.restore();
    }

    // 4. Curly Tendril Ringlets reaching outward
    ctx.strokeStyle = "rgba(101, 163, 13, 0.75)";
    ctx.lineWidth = 1.1;
    for (let c = 0; c < 3; c++) {
      const cy = top + totalLength * (0.35 + c * 0.25);
      const cx = x + sway * (0.35 + c * 0.25);
      const cDir = c % 2 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.arc(cx + cDir * 11, cy, 5.5, 0, Math.PI * 1.6);
      ctx.stroke();
    }

    // 5. Dangerous Menacing Thorn Cluster at Clearance Tip (botY)
    // Clear visual telegraph for sliding height!
    ctx.fillStyle = rgb(mix(pal.ground, pal.rim, 0.38));
    const thornCount = 4;
    for (let tth = 0; tth < thornCount; tth++) {
      const dir = (hash(seed + tth * 5, 445) - 0.5) * 2;
      const tipX = endX + dir * 12;
      const tipY = botY + 3 + hash(seed + tth * 7, 446) * 11;

      ctx.beginPath();
      ctx.moveTo(endX - 2, botY - 2);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(endX + 2, botY + 2);
      ctx.closePath();
      ctx.fill();

      // Specular tip glint
      ctx.fillStyle = rgb(pal.rim, 0.85);
      ctx.beginPath();
      ctx.arc(tipX, tipY, 1.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgb(mix(pal.ground, pal.rim, 0.38));
    }

    // Dangling trailing Spanish moss beard from bottom tip
    ctx.fillStyle = "rgba(74, 98, 62, 0.65)";
    ctx.beginPath();
    ctx.moveTo(endX - 5, botY);
    ctx.quadraticCurveTo(endX + sway * 0.3, botY + 18, endX, botY + 28);
    ctx.quadraticCurveTo(endX + sway * 0.2, botY + 16, endX + 5, botY);
    ctx.closePath();
    ctx.fill();
  }
}
