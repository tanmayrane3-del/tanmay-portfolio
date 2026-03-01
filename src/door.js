import * as THREE from 'three';

const DOOR_W = 2.2;
const DOOR_H = 3.4;
const DOOR_Z = 0.6;   // z position (in front of camera at z=2)
const HINGE_X = -DOOR_W / 2; // hinge on left edge

export function buildEntryDoor(scene) {
  const hingeGroup = new THREE.Group();
  hingeGroup.position.set(HINGE_X, 0, DOOR_Z);

  // ── Door panel (multi-material box) ─────────────────────────────────────────
  const frontTex  = makeDoorTexture();
  const woodColor = new THREE.Color(0x2c1a0e);

  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x3d2612, roughness: 0.9 }), // +X side
    new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: 0.9 }), // -X side
    new THREE.MeshStandardMaterial({ color: 0x2c1a0e, roughness: 0.9 }), // top
    new THREE.MeshStandardMaterial({ color: 0x2c1a0e, roughness: 0.9 }), // bottom
    new THREE.MeshStandardMaterial({ map: frontTex,  roughness: 0.85 }), // front face (+Z)
    new THREE.MeshStandardMaterial({ color: 0x1a0e06, roughness: 0.95 }), // back face
  ];

  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.07), materials);
  doorMesh.position.set(DOOR_W / 2, DOOR_H / 2, 0);
  doorMesh.castShadow = true;
  doorMesh.userData.isDoor = true;

  hingeGroup.add(doorMesh);
  scene.add(hingeGroup);

  // ── Door frame ───────────────────────────────────────────────────────────────
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e0f06, roughness: 0.85 });

  // Left upright
  addBox(scene, frameMat, 0.14, DOOR_H + 0.14, 0.12,
    [HINGE_X - 0.07, DOOR_H / 2, DOOR_Z]);
  // Right upright
  addBox(scene, frameMat, 0.14, DOOR_H + 0.14, 0.12,
    [HINGE_X + DOOR_W + 0.07, DOOR_H / 2, DOOR_Z]);
  // Top bar
  addBox(scene, frameMat, DOOR_W + 0.28, 0.14, 0.12,
    [HINGE_X + DOOR_W / 2, DOOR_H + 0.07, DOOR_Z]);

  // ── Floor threshold ──────────────────────────────────────────────────────────
  addBox(scene, frameMat, DOOR_W + 0.28, 0.04, 0.14,
    [HINGE_X + DOOR_W / 2, 0.02, DOOR_Z]);

  // ── Animation ────────────────────────────────────────────────────────────────
  let opened = false;

  function open(onComplete) {
    if (opened) return;
    opened = true;
    let start = null;
    const targetY = -Math.PI * 0.88;

    function tick(ts) {
      if (!start) start = ts;
      const t = Math.min((ts - start) / 900, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      hingeGroup.rotation.y = ease * targetY;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        if (onComplete) onComplete();
      }
    }
    requestAnimationFrame(tick);
  }

  return { hingeGroup, doorMesh, open };
}

// ── Canvas texture for the door face ─────────────────────────────────────────
function makeDoorTexture() {
  const W = 512, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Wood base
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0,   '#2c1a0e');
  grad.addColorStop(0.3, '#3d2410');
  grad.addColorStop(0.7, '#2e1b0c');
  grad.addColorStop(1,   '#1e0f06');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Wood grain lines
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (H / 18) * i + Math.sin(i) * 8);
    ctx.lineTo(W, (H / 18) * i + Math.cos(i) * 6);
    ctx.stroke();
  }

  // ── Upper raised panel ─────────────────────────────────────────────────────
  drawPanel(ctx, 24, 24, W - 48, H * 0.42);

  // ── Lower raised panel ─────────────────────────────────────────────────────
  drawPanel(ctx, 24, H * 0.44 + 12, W - 48, H * 0.42);

  // ── Name — upper panel content ─────────────────────────────────────────────
  ctx.textAlign = 'center';

  // TANMAY RANE
  ctx.fillStyle = '#e8d4b0';
  ctx.font = `bold ${Math.round(W * 0.13)}px Georgia, serif`;
  ctx.fillText('TANMAY', W / 2, 120);
  ctx.fillText('RANE',   W / 2, 210);

  // Gold divider
  ctx.fillStyle = '#c8a96e';
  ctx.fillRect(W / 2 - 60, 230, 120, 3);

  // Subtitle
  ctx.fillStyle = '#c8a96e';
  ctx.font = `italic ${Math.round(W * 0.052)}px Georgia, serif`;
  ctx.fillText('Product Manager', W / 2, 270);
  ctx.fillText('Digital Banking',  W / 2, 308);

  // Mumbai · 2016–Present
  ctx.fillStyle = 'rgba(200,169,110,0.55)';
  ctx.font = `${Math.round(W * 0.038)}px Georgia, serif`;
  ctx.fillText('Mumbai  ·  2016 – Present', W / 2, 345);

  // ── Instructions — lower panel content ────────────────────────────────────
  const lPanelTop = H * 0.44 + 12 + 30;

  ctx.fillStyle = '#c8a96e';
  ctx.font = `bold ${Math.round(W * 0.044)}px Georgia, serif`;
  ctx.letterSpacing = '3px';
  ctx.fillText('HOW TO EXPLORE', W / 2, lPanelTop + 28);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = 'rgba(200,169,110,0.5)';
  ctx.fillRect(W / 2 - 80, lPanelTop + 44, 160, 2);

  const instrY = lPanelTop + 80;
  const instrLineH = 54;
  const instrs = [
    { icon: '⟳', label: 'Drag to look around' },
    { icon: '⌨', label: 'WASD · Arrow keys' },
    { icon: '✦', label: 'Click items for details' },
    { icon: '⬡', label: 'Touch & drag on mobile' },
  ];

  ctx.textAlign = 'left';
  instrs.forEach((ins, i) => {
    const y = instrY + i * instrLineH;
    ctx.fillStyle = '#c8a96e';
    ctx.font = `${Math.round(W * 0.052)}px Georgia, serif`;
    ctx.fillText(ins.icon, 56, y);
    ctx.fillStyle = '#e0c898';
    ctx.font = `${Math.round(W * 0.044)}px Georgia, serif`;
    ctx.fillText(ins.label, 104, y);
  });

  // ── Door handle (knob) ─────────────────────────────────────────────────────
  const kx = W * 0.78, ky = H * 0.5;
  // Outer ring
  ctx.strokeStyle = '#c8a96e';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(kx, ky, 22, 0, Math.PI * 2); ctx.stroke();
  // Inner fill
  const kGrad = ctx.createRadialGradient(kx - 5, ky - 5, 2, kx, ky, 18);
  kGrad.addColorStop(0, '#e8d4a0');
  kGrad.addColorStop(1, '#8a6420');
  ctx.fillStyle = kGrad;
  ctx.beginPath(); ctx.arc(kx, ky, 18, 0, Math.PI * 2); ctx.fill();
  // Keyhole
  ctx.fillStyle = '#1a0d06';
  ctx.beginPath(); ctx.arc(kx, ky - 3, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(kx - 3, ky - 2, 6, 10);

  // PUSH label
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(200,169,110,0.55)';
  ctx.font = `${Math.round(W * 0.036)}px Georgia, serif`;
  ctx.fillText('PUSH', kx, ky + 38);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function drawPanel(ctx, x, y, w, h) {
  const r = 4;
  // Shadow (inset illusion — darker inner)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  roundRect(ctx, x + 6, y + 6, w - 4, h - 4, r);
  ctx.fill();
  // Highlight (lighter top-left)
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  roundRect(ctx, x, y, w - 6, h - 6, r);
  ctx.fill();
  // Panel face
  ctx.fillStyle = 'rgba(60,35,15,0.55)';
  ctx.beginPath();
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, r);
  ctx.fill();
  // Border line
  ctx.strokeStyle = 'rgba(200,150,80,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, r);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function addBox(scene, mat, w, h, d, pos) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(...pos);
  mesh.castShadow = true;
  scene.add(mesh);
}
