import * as THREE from 'three';
import { makeStandeeTexture } from '../utils/textCanvas.js';
import { workExperience } from '../data.js';
import { CORRIDOR } from '../corridor.js';
import { addRoomBounds } from '../controls.js';

const ROOM = { width: 10.5, depth: 14, height: 4 };

// Smaller standies (Future Generali, Mayur Chokshi)
const SC_SMALL = {
  screenW: 1.35, screenH: 2.2, screenD: 0.07,
  poleW:   0.06,  poleH:  0.75, poleD: 0.06,
  baseW:   0.9,   baseH:  0.12, baseD: 0.5,
  screenBottom: 0.87,
};
// Larger standies (Kotak, ICICI)
const SC_LARGE = {
  screenW: 2.2,  screenH: 2.6,  screenD: 0.08,
  poleW:   0.09,  poleH:  0.85,  poleD: 0.09,
  baseW:   1.5,   baseH:  0.14,  baseD: 0.7,
  screenBottom: 0.99,
};

export function buildWorkRoom(scene) {
  const cx = CORRIDOR.width / 2 + ROOM.width / 2;
  const cz = CORRIDOR.workDoorZ;

  const hw = ROOM.width / 2, hd = ROOM.depth / 2;
  const halfDoor = CORRIDOR.doorWidth / 2;
  const entryDepth = 0.6;

  // Entry strip — doorway Z range only, prevents walking through solid wall segments
  addRoomBounds({
    minX: CORRIDOR.width / 2 - 0.3,
    maxX: cx - hw + entryDepth,
    minZ: cz - halfDoor + 0.15,
    maxZ: cz + halfDoor - 0.15,
  });
  // Interior — full room, pushed back from corridor-facing wall
  addRoomBounds({
    minX: cx - hw + entryDepth,
    maxX: cx + hw - 0.3,
    minZ: cz - hd + 0.3,
    maxZ: cz + hd - 0.3,
  });

  buildRoomShell(scene, cx, cz);
  buildStandees(scene, cx, cz);
  buildFloorGrid(scene, cx, cz);
  buildCeilingLEDs(scene, cx, cz);
  addRoomLights(scene, cx, cz);

  return { cx, cz };
}

// ── Room shell ────────────────────────────────────────────────────────────────
function buildRoomShell(scene, cx, cz) {
  const { width, depth, height } = ROOM;
  const hw = width / 2, hd = depth / 2;
  const doorHalfW = CORRIDOR.doorWidth / 2;
  const doorAboveH = height - CORRIDOR.doorHeight;

  // Bright cool-white walls
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0xf4f6ff, roughness: 0.82 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe0e2ee, roughness: 0.9 });
  const ceilMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 });

  addPlane(scene, floorMat, width, depth, [cx, 0, cz], [-Math.PI/2, 0, 0]);
  addPlane(scene, ceilMat, width, depth, [cx, height, cz], [Math.PI/2, 0, 0]);

  // Back wall (far right)
  addPlane(scene, wallMat, depth, height, [cx + hw, height/2, cz], [0, -Math.PI/2, 0]);

  // Front wall — 0.01 inward of corridor wall to avoid z-fighting with corridor planes
  const frontX = cx - hw + 0.01;
  addPlane(scene, wallMat, hd - doorHalfW, height,
    [frontX, height/2, cz + doorHalfW + (hd - doorHalfW)/2], [0, Math.PI/2, 0]);
  addPlane(scene, wallMat, hd - doorHalfW, height,
    [frontX, height/2, cz - doorHalfW - (hd - doorHalfW)/2], [0, Math.PI/2, 0]);
  if (doorAboveH > 0.01)
    addPlane(scene, wallMat, CORRIDOR.doorWidth, doorAboveH,
      [frontX, CORRIDOR.doorHeight + doorAboveH/2, cz], [0, Math.PI/2, 0]);

  // Side walls
  addPlane(scene, wallMat, width, height, [cx, height/2, cz - hd], [0, 0, 0]);
  addPlane(scene, wallMat, width, height, [cx, height/2, cz + hd], [0, Math.PI, 0]);

  // Skirting — back wall + Z-ends only; corridor-side skirting removed
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 0.5 });
  addBox(scene, skirtMat, 0.04, 0.10, depth, [cx + hw, 0.05, cz]); // back wall
  [cz - hd, cz + hd].forEach(z =>
    addBox(scene, skirtMat, width - 0.1, 0.10, 0.04, [cx, 0.05, z]));
  // Front skirting split around doorway, fully inside room
  const skirtX = cx - hw + 0.04;
  addBox(scene, skirtMat, 0.04, 0.10, hd - doorHalfW, [skirtX, 0.05, cz + doorHalfW + (hd - doorHalfW)/2]);
  addBox(scene, skirtMat, 0.04, 0.10, hd - doorHalfW, [skirtX, 0.05, cz - doorHalfW - (hd - doorHalfW)/2]);
}

// ── Glowing grid on floor ─────────────────────────────────────────────────────
function buildFloorGrid(scene, cx, cz) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e0e2ee';
  ctx.fillRect(0, 0, 512, 512);

  // Grid lines
  ctx.strokeStyle = 'rgba(100,120,255,0.18)';
  ctx.lineWidth = 1;
  const step = 512 / 8;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(512, i * step); ctx.stroke();
  }
  // Intersection dots
  ctx.fillStyle = 'rgba(100,140,255,0.35)';
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 8; j++) {
      ctx.beginPath();
      ctx.arc(i * step, j * step, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.001, cz); // 0.001 above base floor to prevent z-fight
  floor.receiveShadow = true;
  scene.add(floor);
}

// ── LED panel strips on ceiling ───────────────────────────────────────────────
function buildCeilingLEDs(scene, cx, cz) {
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xeef4ff,
    emissiveIntensity: 1.4
  });
  // 4 strips across ceiling
  [cz - 4, cz - 1.2, cz + 1.2, cz + 4].forEach(z => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width - 2, 0.04, 0.25), ledMat);
    strip.position.set(cx, ROOM.height - 0.02, z);
    scene.add(strip);
  });
}

// ── Standees (2×2 grid) ────────────────────────────────────────────────────────
function buildStandees(scene, cx, cz) {
  const entryX = cx - ROOM.width / 2;
  const entryZ = cz;
  // Front row (closer to entry): Future Generali, Mayur Chokshi
  // Back row (far from entry, most prominent): Kotak, ICICI
  const placements = [
    { job: workExperience[2], sc: SC_SMALL, pos: [cx - 1, cz - 3.5] },  // Future — mid left
    { job: workExperience[3], sc: SC_SMALL, pos: [cx - 1, cz + 3.5] },  // Mayur  — mid right
    { job: workExperience[0], sc: SC_LARGE, pos: [cx + 3, cz - 3.5] },  // Kotak  — back left
    { job: workExperience[1], sc: SC_LARGE, pos: [cx + 3, cz + 3.5] },  // ICICI  — back right
  ];

  placements.forEach(({ job, sc, pos: [sx, sz] }) => {
    const rotY = Math.atan2(entryX - sx, entryZ - sz);
    buildSingleStandie(scene, job, sx, sz, rotY, sc);
  });
}

function buildSingleStandie(scene, job, sx, sz, rotY, sc) {
  const { screenW, screenH, screenD, poleW, poleH, poleD, baseW, baseH, baseD, screenBottom } = sc;

  const screenCenterY = screenBottom + screenH / 2;

  // ── Pedestal base ──────────────────────────────────────────────────────────
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xdde0ee, roughness: 0.5, metalness: 0.15 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseD), baseMat);
  base.position.set(sx, baseH / 2, sz);
  base.castShadow = true;
  scene.add(base);

  // ── Pole ──────────────────────────────────────────────────────────────────
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.4, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.BoxGeometry(poleW, poleH, poleD), poleMat);
  pole.position.set(sx, baseH + poleH / 2, sz);
  pole.castShadow = true;
  scene.add(pole);

  // ── Screen group — rotate once so local +Z faces world -X (toward entry) ──
  const screenGroup = new THREE.Group();
  screenGroup.position.set(sx, screenCenterY, sz);
  screenGroup.rotation.y = rotY;  // local +Z faces the room entry centre
  scene.add(screenGroup);

  // Bezel frame — dark border box, centred in group
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0d0d1c, roughness: 0.4, metalness: 0.5 });
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(screenW + 0.1, screenH + 0.1, screenD),
    frameMat
  );
  bezel.castShadow = true;
  screenGroup.add(bezel);

  // Screen display — pushed 0.02 forward in local Z so face clears bezel face
  const screenTex = makeStandeeTexture(job);
  const sideMat   = new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: 0.4 });
  const screenMats = [
    sideMat, sideMat, sideMat, sideMat,
    new THREE.MeshStandardMaterial({   // index 4 = local +Z face = faces player
      map: screenTex,
      roughness: 0.7,
      emissive: new THREE.Color(job.color),
      emissiveIntensity: 0.1
    }),
    sideMat
  ];
  const screenPanel = new THREE.Mesh(
    new THREE.BoxGeometry(screenW, screenH, screenD),
    screenMats
  );
  screenPanel.position.z = 0.022;       // 0.022 past bezel face (screenD/2 = 0.035, panel face at 0.057)
  screenPanel.userData = { type: 'job', data: job };
  screenGroup.add(screenPanel);

  // ── Company colour accent strip on base top edge ──────────────────────────
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(job.accentColor),
    emissive: new THREE.Color(job.accentColor),
    emissiveIntensity: 0.6
  });
  const accentStrip = new THREE.Mesh(new THREE.BoxGeometry(baseW, 0.025, baseD), accentMat);
  accentStrip.position.set(sx, baseH + 0.012, sz);
  scene.add(accentStrip);
}

// ── Lights ────────────────────────────────────────────────────────────────────
function addRoomLights(scene, cx, cz) {
  // Bright ambient — science fair feel
  scene.add(new THREE.AmbientLight(0xf0f4ff, 0.88));

  const entryX = cx - ROOM.width / 2;
  // Must match placement order in buildStandees: Future, Mayur, Kotak, ICICI
  const placements = [
    { job: workExperience[2], sc: SC_SMALL, pos: [cx - 1, cz - 3.5] },
    { job: workExperience[3], sc: SC_SMALL, pos: [cx - 1, cz + 3.5] },
    { job: workExperience[0], sc: SC_LARGE, pos: [cx + 3, cz - 3.5] },
    { job: workExperience[1], sc: SC_LARGE, pos: [cx + 3, cz + 3.5] },
  ];

  placements.forEach(({ job, sc, pos: [sx, sz] }) => {
    const screenCY = sc.screenBottom + sc.screenH / 2;
    const spot = new THREE.SpotLight(0xffffff, 2.2, 9, Math.PI / 6, 0.35);
    spot.position.set(sx, ROOM.height - 0.1, sz);
    spot.target.position.set(sx, screenCY, sz);
    spot.castShadow = false;
    scene.add(spot);
    scene.add(spot.target);

    const rotY = Math.atan2(entryX - sx, cz - sz);
    const fill = new THREE.PointLight(new THREE.Color(job.accentColor), 0.5, 6);
    fill.position.set(
      sx + 0.5 * Math.sin(rotY),
      screenCY,
      sz + 0.5 * Math.cos(rotY)
    );
    scene.add(fill);
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────
function addPlane(scene, mat, w, h, pos, rot) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function addBox(scene, mat, w, h, d, pos) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(...pos);
  scene.add(mesh);
}
