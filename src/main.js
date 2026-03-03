import * as THREE from 'three';
import { buildCorridor, animateCorridor, CORRIDOR } from './corridor.js';
import { buildEducationRoom, updateCertSway } from './rooms/educationRoom.js';
import { buildWorkRoom } from './rooms/workRoom.js';
import { Controls, unlockMovement } from './controls.js';
import { buildEntryDoor } from './door.js';
import { buildRoomDoors } from './roomDoors.js';

// ── Scene setup ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8f8f8);

// Camera faces -Z (into corridor). Start close to the door.
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 1.7, 1.9);

// ── Build world ───────────────────────────────────────────────────────────────
buildCorridor(scene);
buildEducationRoom(scene);
buildWorkRoom(scene);
buildRoomDoors(scene);

// ── Entry door ────────────────────────────────────────────────────────────────
const { doorMesh, open: openDoor } = buildEntryDoor(scene);

// ── Controls ──────────────────────────────────────────────────────────────────
const controls = new Controls(camera, canvas);

// ── Raycaster ─────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();

// Interaction hint
const interactHint = document.getElementById('interact-hint');
let hoveredObj = null;

function handleInteraction(nx, ny) {
  raycaster.setFromCamera({ x: nx, y: ny }, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const hit of hits) {
    const obj = hit.object;
    if (obj.userData.isDoor) {
      openDoor(() => { unlockMovement(); hintEl.style.display = 'none'; });
      return;
    }
    if (obj.userData?.type) {
      openModal({ type: obj.userData.type, data: obj.userData.data, imageURL: obj.userData.imageURL });
      return;
    }
  }
}

// Mouse click
canvas.addEventListener('click', e => {
  if (controls.wasDragging) { controls.wasDragging = false; return; }
  handleInteraction(
    (e.clientX / window.innerWidth)  * 2 - 1,
   -(e.clientY / window.innerHeight) * 2 + 1
  );
});

// Touch tap (touchstart preventDefault blocks synthetic click on mobile)
let _tapStartX = 0, _tapStartY = 0;
canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 1) { _tapStartX = e.touches[0].clientX; _tapStartY = e.touches[0].clientY; }
}, { passive: true });
canvas.addEventListener('touchend', e => {
  if (e.changedTouches.length !== 1) return;
  const t = e.changedTouches[0];
  if (Math.abs(t.clientX - _tapStartX) < 12 && Math.abs(t.clientY - _tapStartY) < 12) {
    handleInteraction(
      (t.clientX / window.innerWidth)  * 2 - 1,
     -(t.clientY / window.innerHeight) * 2 + 1
    );
  }
});

// ── Door push hint ────────────────────────────────────────────────────────────
const hintEl = document.getElementById('door-hint');

// ── Room label HUD ────────────────────────────────────────────────────────────
const roomLabel = document.getElementById('room-label');
function updateRoomLabel(pos) {
  const inEdu  = pos.x < -CORRIDOR.width / 2;
  const inWork = pos.x >  CORRIDOR.width / 2;
  if (inEdu) {
    roomLabel.textContent = 'Education';
    roomLabel.classList.remove('hidden');
  } else if (inWork) {
    roomLabel.textContent = 'Work Experience';
    roomLabel.classList.remove('hidden');
  } else {
    roomLabel.classList.add('hidden');
  }
}

// ── Info modal ────────────────────────────────────────────────────────────────
const modal   = document.getElementById('info-modal');
const modalContent = document.getElementById('modal-content');
document.getElementById('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function openModal({ type, data, imageURL }) {
  if (type === 'cert') {
    const img = imageURL
      ? `<img src="${imageURL}" style="width:100%;border-radius:3px;margin-bottom:1.2rem;display:block;" />`
      : '';
    if (data.isCertification) {
      modalContent.innerHTML = `
        ${img}
        <h2>${data.title}</h2>
        <p class="meta">${data.issuer} · ${data.year}</p>
      `;
    } else {
      modalContent.innerHTML = `
        ${img}
        <h2>${data.degree}</h2>
        <p class="meta">${data.institution}, ${data.location}</p>
        <span class="grade-badge">${data.grade}</span>
        <p style="color:#666;font-size:0.9rem;margin-bottom:0.8rem;">${data.period}</p>
        <p style="color:#444;line-height:1.7;font-size:0.92rem;">${data.detail}</p>
      `;
    }
  } else if (type === 'job') {
    const bullets = data.bullets.map(b => `<li>${b}</li>`).join('');
    modalContent.innerHTML = `
      <h2>${data.company}</h2>
      <p class="meta">${data.role} · ${data.location}</p>
      <p style="color:#888;font-size:0.85rem;margin-bottom:1rem;">${data.period}</p>
      <ul>${bullets}</ul>
    `;
  }
  modal.classList.remove('hidden');
}

function closeModal() { modal.classList.add('hidden'); }

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Hover (screen-centre crosshair raycasting) ────────────────────────────────
function checkHover() {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  let found = null;
  for (const h of hits) {
    if (h.distance < 6 && (h.object.userData?.type || h.object.userData?.isDoor)) {
      found = h.object;
      break;
    }
  }
  if (found !== hoveredObj) {
    hoveredObj = found;
    interactHint.classList.toggle('visible', !!found);
    if (found?.userData?.isDoor) {
      interactHint.textContent = 'Click to push open';
    } else {
      interactHint.textContent = 'Click to view details';
    }
  }
}

// ── Animation loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  controls.update();
  animateCorridor(t);
  updateCertSway(scene, t);
  updateRoomLabel(camera.position);
  checkHover();
  renderer.render(scene, camera);
}

animate();
