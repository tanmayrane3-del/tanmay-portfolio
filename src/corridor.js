import * as THREE from 'three';

// Corridor dimensions (world units)
export const CORRIDOR = {
  width: 5,
  height: 4,
  length: 60,
  // Room openings (Z ranges, negative = forward)
  eduDoorZ:  -12,   // centre Z of education room opening  (-14 × 0.85)
  workDoorZ: -32,   // centre Z of work experience room opening  (-38 × 0.85)
  doorWidth: 3,
  doorHeight: 3.2,
};

export function buildCorridor(scene) {
  const { width, height, length } = CORRIDOR;
  const halfL = length / 2;

  const wallMat  = new THREE.MeshStandardMaterial({ map: makeRoyalWallTex(),   roughness: 0.82 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xece5d4, roughness: 0.88 }); // warm marble
  const ceilMat  = new THREE.MeshStandardMaterial({ color: 0xfff9f0, roughness: 0.7 });
  const trimMat  = new THREE.MeshStandardMaterial({ color: 0xb8922c, roughness: 0.3, metalness: 0.7 }); // gold

  // Floor
  addPlane(scene, floorMat, width, length, [0, 0, -halfL + 2], [-Math.PI/2, 0, 0]);

  // Carpet runner (2 m wide, centred, floating 1 mm above floor)
  const runnerMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, length),
    new THREE.MeshStandardMaterial({ map: makeRoyalCarpetTex(), roughness: 0.92 })
  );
  runnerMesh.rotation.x = -Math.PI / 2;
  runnerMesh.position.set(0, 0.002, -halfL + 2);
  runnerMesh.receiveShadow = true;
  scene.add(runnerMesh);

  // Ceiling
  addPlane(scene, ceilMat, width, length, [0, height, -halfL + 2], [Math.PI/2, 0, 0]);

  // Back wall (far end)
  addPlane(scene, wallMat, width, height, [0, height/2, -length + 2], [0, 0, 0]);

  // Front wall (entrance, behind camera start)
  addPlane(scene, wallMat, width, height, [0, height/2, 4], [0, Math.PI, 0]);

  // Left & right walls (with doorway gaps)
  buildSideWalls(scene, wallMat, trimMat);

  // Floor trim strips + chair rail + crown moulding
  addTrim(scene, trimMat, length);

  // Lighting
  addCorridorLights(scene);

  // Fog — warm ivory
  scene.fog = new THREE.FogExp2(0xf5edd8, 0.016);
}

function addPlane(scene, mat, w, h, pos, rot) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function buildSideWalls(scene, wallMat, trimMat) {
  const { width, height, length, doorWidth, doorHeight, eduDoorZ, workDoorZ } = CORRIDOR;
  const halfW = width / 2;
  const halfL = length / 2;

  // Segment Z ranges (positive is behind, negative is forward)
  const wallStart = 4;
  const wallEnd   = -(length - 2);

  // Door positions as Z min/max
  const doors = [
    { z: eduDoorZ,  side: -1 },  // left
    { z: workDoorZ, side:  1 },  // right
  ];

  // Build each side
  [-1, 1].forEach(side => {
    const x = side * halfW;
    const rotY = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    const door = doors.find(d => d.side === side);

    const doorMinZ = door.z - doorWidth / 2;
    const doorMaxZ = door.z + doorWidth / 2;

    // Wall segment: entrance → door start
    const seg1L = Math.abs(doorMaxZ - wallStart);
    if (seg1L > 0) {
      const seg1Z = (wallStart + doorMaxZ) / 2;
      addPlane(scene, wallMat, seg1L, height, [x, height/2, seg1Z], [0, rotY, 0]);
    }

    // Above door (full width, reduced height)
    const aboveH = height - doorHeight;
    if (aboveH > 0) {
      addPlane(scene, wallMat, doorWidth, aboveH,
        [x, doorHeight + aboveH/2, door.z], [0, rotY, 0]);
    }

    // Wall segment: door end → far end
    const seg2L = Math.abs(wallEnd - doorMinZ);
    if (seg2L > 0) {
      const seg2Z = (doorMinZ + wallEnd) / 2;
      addPlane(scene, wallMat, seg2L, height, [x, height/2, seg2Z], [0, rotY, 0]);
    }

    // Door frame trim
    addDoorFrame(scene, trimMat, { x, z: door.z, side, doorWidth, doorHeight, height });
  });
}

function addDoorFrame(scene, mat, { x, z, side, doorWidth, doorHeight, height }) {
  const depth = 0.06;
  const rotY = side === -1 ? Math.PI / 2 : -Math.PI / 2;
  // Shift x toward the room side so the frame doesn't protrude into the corridor.
  // After rotation the box's local-Z (depth) maps to world-X, so half-depth straddles x.
  const xOff = side === -1 ? -depth / 2 : depth / 2;
  const fx = x + xOff;

  // Top bar
  const topH = 0.12;
  addBox(scene, mat, doorWidth + topH*2, topH, depth,
    [fx, doorHeight + topH/2, z], [0, rotY, 0]);

  // Left upright
  addBox(scene, mat, topH, doorHeight, depth,
    [fx, doorHeight/2, z - doorWidth/2 - topH/2], [0, rotY, 0]);

  // Right upright
  addBox(scene, mat, topH, doorHeight, depth,
    [fx, doorHeight/2, z + doorWidth/2 + topH/2], [0, rotY, 0]);
}

function addBox(scene, mat, w, h, d, pos, rot = [0,0,0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  scene.add(mesh);
}

function addTrim(scene, mat, length) {
  const hw = CORRIDOR.width / 2;
  const { doorWidth, eduDoorZ, workDoorZ } = CORRIDOR;
  const wallStart = 4;
  const wallEnd   = -(length - 2);

  // Each side has its door; trim is split into 2 segments skipping that gap
  const sides = [
    { x: -hw, doorZ: eduDoorZ  },
    { x:  hw, doorZ: workDoorZ },
  ];

  sides.forEach(({ x, doorZ }) => {
    const dMin = doorZ - doorWidth / 2;
    const dMax = doorZ + doorWidth / 2;

    const segs = [
      { len: Math.abs(dMax - wallStart), mid: (wallStart + dMax) / 2 },
      { len: Math.abs(wallEnd - dMin),   mid: (dMin + wallEnd) / 2   },
    ];

    segs.forEach(({ len, mid }) => {
      if (len <= 0) return;
      // Floor skirting
      const sk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, len), mat);
      sk.position.set(x, 0.05, mid); scene.add(sk);
      // Chair rail at 1.15 m
      const cr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, len), mat);
      cr.position.set(x, 1.15, mid); scene.add(cr);
      // Crown moulding at ceiling
      const cm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.10, len), mat);
      cm.position.set(x, CORRIDOR.height - 0.05, mid); scene.add(cm);
    });
  });
}

// ── Royal texture helpers ─────────────────────────────────────────────────────

function makeRoyalWallTex() {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');

  // Warm ivory base
  ctx.fillStyle = '#f2ead6';
  ctx.fillRect(0, 0, S, S);

  // Damask diamond motif
  const c = S / 2;
  [S * 0.44, S * 0.28].forEach((r, i) => {
    ctx.beginPath();
    ctx.moveTo(c, c - r); ctx.lineTo(c + r, c);
    ctx.lineTo(c, c + r); ctx.lineTo(c - r, c);
    ctx.closePath();
    ctx.strokeStyle = `rgba(160,118,28,${i === 0 ? 0.32 : 0.20})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  // Centre dot
  ctx.beginPath(); ctx.arc(c, c, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(160,118,28,0.28)'; ctx.fill();

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 3);
  tex.needsUpdate = true;
  return tex;
}

function makeRoyalCarpetTex() {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');

  // Crimson base
  ctx.fillStyle = '#580e18';
  ctx.fillRect(0, 0, S, S);

  // Woven diagonal lines
  ctx.strokeStyle = 'rgba(140,90,20,0.22)'; ctx.lineWidth = 1.5;
  for (let i = -S; i < S * 2; i += 18) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - S, S); ctx.stroke();
  }

  // Gold medallion
  const c = S / 2;
  [S * 0.32, S * 0.18].forEach((r, i) => {
    ctx.beginPath();
    ctx.moveTo(c, c - r); ctx.lineTo(c + r, c);
    ctx.lineTo(c, c + r); ctx.lineTo(c - r, c);
    ctx.closePath();
    ctx.strokeStyle = `rgba(200,158,40,${i === 0 ? 0.75 : 0.50})`;
    ctx.lineWidth = i === 0 ? 2.5 : 1.5;
    ctx.stroke();
  });
  ctx.beginPath(); ctx.arc(c, c, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200,158,40,0.60)'; ctx.fill();

  // Gold border
  ctx.strokeStyle = 'rgba(200,158,40,0.55)'; ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, S - 6, S - 6);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 15);   // runner 2 m wide → 1 tile; 4 m per repeat along length
  tex.needsUpdate = true;
  return tex;
}

function addCorridorLights(scene) {
  // Ambient base
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  // Panel lights overhead every ~12 units
  const positions = [0, -10, -20, -30, -42, -52]; // spread across length=60 corridor
  positions.forEach(z => {
    const light = new THREE.PointLight(0xfff8f0, 1.2, 18);
    light.position.set(0, CORRIDOR.height - 0.3, z);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    scene.add(light);

    // Ceiling panel rect (emissive)
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 })
    );
    panel.rotation.x = Math.PI / 2;
    panel.position.set(0, CORRIDOR.height - 0.02, z);
    scene.add(panel);
  });
}

