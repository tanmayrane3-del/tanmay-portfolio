import * as THREE from 'three';
import { CORRIDOR } from './corridor.js';

export function buildRoomDoors(scene) {
  const { eduDoorZ, workDoorZ, doorWidth, doorHeight, width } = CORRIDOR;
  const hw     = width / 2;
  const halfDW = doorWidth / 2;          // each door panel width
  const DEG80  = Math.PI * 80 / 180;

  // ── Education room ────────────────────────────────────────────────────────
  // Both panels swing toward -X (into room).
  // Left panel: hinge at -Z edge of doorway, door extends +Z when closed.
  buildDoor(scene, {
    hingeX: -hw, hingeZ: eduDoorZ - halfDW,
    childZ:  halfDW / 2,       // box centre is +Z from hinge → covers hinge→centre
    rotY:   -DEG80,            // 80° open into room (-X direction)
    doorW: halfDW, doorH: doorHeight,
    line: 'Education',
    bg: '#2c1a10', textColor: '#f5e6c8', accent: '#c8a96e',
  });
  // Right panel: hinge at +Z edge, door extends -Z when closed.
  buildDoor(scene, {
    hingeX: -hw, hingeZ: eduDoorZ + halfDW,
    childZ: -halfDW / 2,       // box centre is -Z from hinge → covers centre→hinge
    rotY:   +DEG80,
    doorW: halfDW, doorH: doorHeight,
    line: 'Education',
    bg: '#2c1a10', textColor: '#f5e6c8', accent: '#c8a96e',
  });

  // ── Work Experience room ─────────────────────────────────────────────────
  // Both panels swing toward +X (into room).
  // Left panel: hinge at -Z edge.
  buildDoor(scene, {
    hingeX:  hw, hingeZ: workDoorZ - halfDW,
    childZ:  halfDW / 2,
    rotY:   +DEG80,            // 80° open into room (+X direction)
    doorW: halfDW, doorH: doorHeight,
    line: 'Work',
    bg: '#0a0e1e', textColor: '#ddeeff', accent: '#5580ff',
  });
  // Right panel: hinge at +Z edge.
  buildDoor(scene, {
    hingeX:  hw, hingeZ: workDoorZ + halfDW,
    childZ: -halfDW / 2,
    rotY:   -DEG80,
    doorW: halfDW, doorH: doorHeight,
    line: 'Experience',
    bg: '#0a0e1e', textColor: '#ddeeff', accent: '#5580ff',
  });
}

function buildDoor(scene, { hingeX, hingeZ, childZ, rotY, doorW, doorH, line, bg, textColor, accent }) {
  const thickness = 0.07;
  const tex = makeDoorTexture(line, bg, textColor, accent);

  // Texture on both ±X faces so the name reads from corridor AND from inside the room
  const texMat  = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x1a1020, roughness: 0.7 });

  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, doorH, doorW),
    [texMat, texMat, sideMat, sideMat, sideMat, sideMat]
  );
  doorMesh.position.set(0, doorH / 2, childZ);
  doorMesh.castShadow   = true;
  doorMesh.receiveShadow = true;

  const hinge = new THREE.Group();
  hinge.position.set(hingeX, 0, hingeZ);
  hinge.rotation.y = rotY;
  hinge.add(doorMesh);
  scene.add(hinge);

  // Hinge pin
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.8, roughness: 0.3 });
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, doorH + 0.1, 8), pinMat);
  pin.position.set(hingeX, doorH / 2, hingeZ);
  scene.add(pin);
}

function makeDoorTexture(line, bg, textColor, accent) {
  // Canvas proportioned to the door face (doorW × doorH ≈ 1.5 × 3.2 → tall portrait)
  const W = 400, H = 860;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle vertical grain
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 16; x < W; x += 22) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  // Outer accent border
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  // Inner subtle border
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Decorative raised panel zones
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36,      W - 72, H / 3 - 24);
  ctx.strokeRect(36, H / 3 + 4, W - 72, H / 3 - 8);
  ctx.strokeRect(36, H * 2 / 3 + 4, W - 72, H / 3 - 40);

  // Room name — centred in middle panel, written vertically as large letters
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.fillStyle    = textColor;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Fit the word — reduce font until it fits the panel width
  let fontSize = 72;
  ctx.font = `bold ${fontSize}px Georgia, serif`;
  while (ctx.measureText(line).width > W - 60 && fontSize > 28) {
    fontSize -= 4;
    ctx.font = `bold ${fontSize}px Georgia, serif`;
  }
  ctx.fillText(line, 0, 0);
  ctx.restore();

  // Accent rule below text
  ctx.fillStyle = accent;
  ctx.fillRect(W / 2 - 60, H / 2 + fontSize / 2 + 18, 120, 3);

  return new THREE.CanvasTexture(canvas);
}
