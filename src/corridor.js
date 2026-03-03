import * as THREE from 'three';
import wallTexUrl from './assets/wall-texture.jpg';

// ─── CORRIDOR CONSTANTS ──────────────────────────────────────────────────────
// These are used by rooms, doors, and controls — do not change values.
export const CORRIDOR = {
  width: 5,
  height: 4,
  length: 60,
  eduDoorZ:  -12,
  workDoorZ: -32,
  doorWidth:   3,
  doorHeight:  3.2,
};

// ─── INTERNAL CONSTANTS ──────────────────────────────────────────────────────
const { width: CW, height: CH, length: CL,
        eduDoorZ, workDoorZ, doorWidth, doorHeight } = CORRIDOR;

const ARCH_GAP   = 4;
const NUM_ARCHES = 14;          // z = 0, −4, −8, … −52
const PILLAR_H   = 2.5;
const RX_O = 2.1, RY_O = 1.1;  // outer arch ellipse radii
const RX_I = 1.7, RY_I = 0.75; // inner arch ellipse (cusp points)
const SEGS = 18;                // outer ring brick count

const WALL_START =  4;
const WALL_END   = -(CL - 2);  // −58

// ─── MATERIALS ───────────────────────────────────────────────────────────────
function mat(color, rough = 0.85, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

// NOTE: Three.js 0.170 treats hex colors as sRGB→linear (gamma^2.2 down).
// The palace-corridor.html (r128) treated them as raw linear, making dark
// values appear brighter. The hex values below are gamma-compensated so they
// produce the same visual result as the r128 originals.
const mWall     = mat(0x269298);   // r128: 0x044e59 → compensated for 0.170
const mCeiling  = mat(0x1e6068);   // r128: 0x021e24 → compensated
const mGold     = new THREE.MeshStandardMaterial({
  color: 0xFFCC44, roughness: 0.22, metalness: 0.82,
  emissive: 0xFFAA00, emissiveIntensity: 0.30,
});
const mSaffron  = mat(0xefcda8, 0.70);
const mOrange   = mat(0xefcda8, 0.75);
const mTerra    = mat(0xe3c09a, 0.80);
const mJewel    = mat(0xefcda8, 0.75);
const mTurmeric = mat(0xe3c09a, 0.65);
const mPillar   = mat(0x928054, 0.88);  // warm gold-brown

// ─── WALL TEXTURE ────────────────────────────────────────────────────────────
// Loaded once; each wall segment gets a clone with its own repeat value.
const _wallTexBase = new THREE.TextureLoader().load(wallTexUrl);
_wallTexBase.wrapS = _wallTexBase.wrapT = THREE.RepeatWrapping;

// Returns a MeshStandardMaterial with the wall texture tiled at 4 m per repeat.
function wallSegMat(segLen) {
  const t = _wallTexBase.clone();
  t.needsUpdate = true;
  t.repeat.set(segLen / 4, 1);   // 1 tile per 4 m along corridor length
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function addPlane(scene, mat, w, h, pos, rot) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addBox(scene, mat, w, h, d, pos, rot = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  scene.add(mesh);
}

// Circumscribed circle through 3 points — used for cusped arch lobes
function circleThrough(x1,y1, x2,y2, x3,y3) {
  const ax=x2-x1, ay=y2-y1, bx=x3-x1, by=y3-y1;
  const D = 2*(ax*by - ay*bx);
  if (Math.abs(D) < 1e-9) return null;
  const ux = (by*(ax*ax+ay*ay) - ay*(bx*bx+by*by)) / D;
  const uy = (ax*(bx*bx+by*by) - bx*(ax*ax+ay*ay)) / D;
  return { cx: x1+ux, cy: y1+uy, r: Math.hypot(ux, uy) };
}

// Returns segment [{len, mid}] pairs for a side wall, skipping its door opening
function wallSegs(doorZ) {
  const dNear = doorZ + doorWidth / 2;  // closer to camera (larger Z value)
  const dFar  = doorZ - doorWidth / 2;  // further from camera
  return [
    { len: Math.abs(dNear - WALL_START), mid: (WALL_START + dNear) / 2 },
    { len: Math.abs(WALL_END - dFar),    mid: (dFar + WALL_END) / 2   },
  ].filter(s => s.len > 0);
}

// ─── FLOOR ───────────────────────────────────────────────────────────────────
function buildFloor(scene) {
  // 2×2 alternating dark-wood tile canvas
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  const h = 64;
  ctx.fillStyle = '#3D2B1A'; ctx.fillRect(0, 0, h, h);
  ctx.fillStyle = '#5C3D28'; ctx.fillRect(h, 0, h, h);
  ctx.fillStyle = '#5C3D28'; ctx.fillRect(0, h, h, h);
  ctx.fillStyle = '#3D2B1A'; ctx.fillRect(h, h, h, h);
  ctx.strokeStyle = '#FFCC44'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);
  ctx.beginPath();
  ctx.moveTo(h, 0); ctx.lineTo(h, 128);
  ctx.moveTo(0, h); ctx.lineTo(128, h);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(CW / 2, CL / 2);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CW, CL),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -(CL / 2 - 2.5));
  floor.receiveShadow = true;
  scene.add(floor);

  // Gold edge runners
  [-1, 1].forEach(side => {
    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, CL), mGold);
    runner.position.set(side * (CW / 2 - 0.04), 0.011, -(CL / 2 - 2.5));
    scene.add(runner);
  });
}

// ─── CEILING ─────────────────────────────────────────────────────────────────
function buildCeiling(scene) {
  const mVault = new THREE.MeshStandardMaterial({
    color: 0xf6e9c7, roughness: 0.85, side: THREE.BackSide,
  });
  // CylinderGeometry(radiusTop, radiusBottom, height, radialSegs, heightSegs, openEnded, phiStart, phiLength)
  // Rotated 90° on X so the cylinder runs along Z (the corridor length).
  // phiLength = Math.PI gives a half-cylinder (barrel vault) — open bottom.
  const vault = new THREE.Mesh(
    new THREE.CylinderGeometry(CW / 2, CW / 2, CL, 32, 1, true, Math.PI / 2, Math.PI),
    mVault
  );
  vault.rotation.x = Math.PI / 2;
  vault.position.set(0, CH, -(CL / 2 - 2.5));
  scene.add(vault);
}

// ─── WALLS ───────────────────────────────────────────────────────────────────
function buildWalls(scene) {
  const sideData = [
    { side: -1, x: -CW/2, rotY:  Math.PI/2, doorZ: eduDoorZ  },
    { side:  1, x:  CW/2, rotY: -Math.PI/2, doorZ: workDoorZ },
  ];

  sideData.forEach(({ side, x, rotY, doorZ }) => {
    const segs = wallSegs(doorZ);

    // Wall plane segments (skip door opening) — textured
    segs.forEach(({ len, mid }) => {
      addPlane(scene, wallSegMat(len), len, CH, [x, CH / 2, mid], [0, rotY, 0]);
    });

    // Header above door — textured
    const aboveH = CH - doorHeight;
    if (aboveH > 0) {
      addPlane(scene, wallSegMat(doorWidth), doorWidth, aboveH,
        [x, doorHeight + aboveH / 2, doorZ], [0, rotY, 0]);
    }

    // Gold door frame trim
    addDoorFrame(scene, { x, z: doorZ, side, rotY });
  });

  // Back wall + front wall — textured (CW wide = 5 m, so ~1.25 repeats)
  addPlane(scene, wallSegMat(CW), CW, CH, [0, CH / 2, WALL_END], [0, 0, 0]);
  addPlane(scene, wallSegMat(CW), CW, CH, [0, CH / 2, WALL_START], [0, Math.PI, 0]);
}

function addDoorFrame(scene, { x, z, side, rotY }) {
  const depth = 0.06, topH = 0.12;
  const xOff = side === -1 ? -depth / 2 : depth / 2;
  const fx = x + xOff;
  // Top bar
  addBox(scene, mGold, doorWidth + topH * 2, topH, depth,
    [fx, doorHeight + topH / 2, z], [0, rotY, 0]);
  // Left upright
  addBox(scene, mGold, topH, doorHeight, depth,
    [fx, doorHeight / 2, z - doorWidth / 2 - topH / 2], [0, rotY, 0]);
  // Right upright
  addBox(scene, mGold, topH, doorHeight, depth,
    [fx, doorHeight / 2, z + doorWidth / 2 + topH / 2], [0, rotY, 0]);
}

// ─── ARCH ────────────────────────────────────────────────────────────────────
function buildArch(scene, z) {
  [-1, 1].forEach(side => {
    // Main pillar
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.38, PILLAR_H, 0.48), mPillar);
    pillar.position.set(side * 2.2, PILLAR_H / 2, z);
    pillar.castShadow = pillar.receiveShadow = true;
    scene.add(pillar);

    // Teal accent band on pillar
    addBox(scene, mSaffron, 0.42, 0.07, 0.50, [side * 2.2, PILLAR_H * 0.58, z]);

    // Gold base plate
    addBox(scene, mGold, 0.52, 0.07, 0.58, [side * 2.2, 0.035, z]);

    // Gold capital
    addBox(scene, mGold, 0.52, 0.13, 0.58, [side * 2.2, PILLAR_H + 0.065, z]);

    // Spandrel panel
    addBox(scene, mWall, 0.68, 1.15, 0.08, [side * 1.62, PILLAR_H + 0.62, z]);

    // Gold spandrel border
    addBox(scene, mGold, 0.72, 0.07, 0.11, [side * 1.62, PILLAR_H + 1.16, z]);
  });

  // Outer arch ring — 18 alternating teal bricks (elliptical frame)
  for (let i = 0; i < SEGS; i++) {
    const θ    = (i + 0.5) * Math.PI / SEGS;
    const x    = Math.cos(θ) * RX_O;
    const y    = PILLAR_H + Math.sin(θ) * RY_O;
    const rotZ = Math.atan2(RY_O * Math.cos(θ), -RX_O * Math.sin(θ));
    const m    = i % 2 === 0 ? mOrange : mTerra;
    const brick = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.17, 0.48), m);
    brick.position.set(x, y, z);
    brick.rotation.z = rotZ;
    scene.add(brick);
  }

  // Cusped inner arch — 5-lobe quinquefoil
  // Cusp points sit on the inner ellipse; each lobe arc bulges toward the outer arch.
  const N_LOBES = 5, BRICKS_PER_LOBE = 6;
  const RX_L = 1.90, RY_L = 0.92; // lobe-peak ellipse (between inner & outer)

  for (let lobe = 0; lobe < N_LOBES; lobe++) {
    const θ0 = lobe       * Math.PI / N_LOBES;
    const θ1 = (lobe + 1) * Math.PI / N_LOBES;
    const θm = (θ0 + θ1) / 2;

    const p0x = RX_I * Math.cos(θ0), p0y = PILLAR_H + RY_I * Math.sin(θ0);
    const p1x = RX_I * Math.cos(θ1), p1y = PILLAR_H + RY_I * Math.sin(θ1);
    const pmx = RX_L * Math.cos(θm), pmy = PILLAR_H + RY_L * Math.sin(θm);

    const circle = circleThrough(p0x, p0y, pmx, pmy, p1x, p1y);
    if (!circle) continue;
    const { cx, cy, r } = circle;

    const a0 = Math.atan2(p0y - cy, p0x - cx);
    const am = Math.atan2(pmy - cy, pmx - cx);
    const a1 = Math.atan2(p1y - cy, p1x - cx);

    let a1c = a1; while (a1c < a0) a1c += 2 * Math.PI;
    let amc = am; while (amc < a0) amc += 2 * Math.PI;
    const ccw = amc <= a1c;
    const a1f = ccw ? a1c : (a1 > a0 ? a1 - 2 * Math.PI : a1);

    for (let k = 0; k < BRICKS_PER_LOBE; k++) {
      const t    = (k + 0.5) / BRICKS_PER_LOBE;
      const a    = a0 + t * (a1f - a0);
      const bx   = cx + r * Math.cos(a);
      const by   = cy + r * Math.sin(a);
      const rotZ = ccw ? a + Math.PI / 2 : a - Math.PI / 2;
      const m    = (lobe * BRICKS_PER_LOBE + k) % 2 === 0 ? mJewel : mTurmeric;
      const brick = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.48), m);
      brick.position.set(bx, by, z);
      brick.rotation.z = rotZ;
      scene.add(brick);
    }
  }

  // Gold keystone at crown
  addBox(scene, mGold, 0.36, 0.26, 0.50, [0, PILLAR_H + RY_O + 0.11, z]);

  // Gold connecting beam at ceiling
  addBox(scene, mGold, CW + 0.04, 0.07, 0.13, [0, CH - 0.04, z]);
}

function buildArches(scene) {
  for (let i = 0; i < NUM_ARCHES; i++) {
    const z = -(i * ARCH_GAP);
    if (z === eduDoorZ || z === workDoorZ) continue; // don't block door openings
    buildArch(scene, z);
  }
}

// ─── LIGHTS ──────────────────────────────────────────────────────────────────
const _flickerLights = [];

function buildLights(scene) {
  scene.add(new THREE.AmbientLight(0x011a20, 0.40));

  // ── Ceiling flicker lights between arch pairs (7 lights, matching palace-corridor.html) ──
  const pairZ = [-2, -10, -18, -26, -34, -42, -50];
  pairZ.forEach(z => {
    const pl = new THREE.PointLight(0x44DDCC, 1.8, 8);
    pl.position.set(0, 2.9, z);
    pl.castShadow = true;
    pl.shadow.mapSize.width = pl.shadow.mapSize.height = 512;
    pl.shadow.camera.near = 0.2;
    pl.shadow.camera.far  = 10;
    scene.add(pl);
    _flickerLights.push(pl);
  });

  // ── Gold glow at each arch base (centre, no shadow) ──
  for (let i = 0; i < NUM_ARCHES; i++) {
    const glow = new THREE.PointLight(0xFFBB33, 0.75, 4.0);
    glow.position.set(0, 0.40, -(i * ARCH_GAP));
    scene.add(glow);
  }

  // ── Gold beckoning light at far end ──
  const far = new THREE.PointLight(0xFFDD66, 3.5, 24);
  far.position.set(0, 2.2, -(CL - 4));
  scene.add(far);

  // ── Warm gold fill near entrance ──
  const fill = new THREE.PointLight(0xFFCC44, 1.2, 7);
  fill.position.set(0, 2.6, 1.5);
  scene.add(fill);
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

export function buildCorridor(scene) {
  scene.background = new THREE.Color(0x010f12);
  scene.fog        = new THREE.FogExp2(0x010f12, 0.045);

  buildFloor(scene);
  buildCeiling(scene);
  buildWalls(scene);
  buildArches(scene);
  buildLights(scene);
}

// Call this every frame with elapsed time to animate flickering lights.
export function animateCorridor(t) {
  _flickerLights.forEach((light, i) => {
    light.intensity = 1.8
      + Math.sin(t * 3.7 + i * 1.47) * 0.28
      + Math.sin(t * 7.1 + i * 0.83) * 0.10;
  });
}
