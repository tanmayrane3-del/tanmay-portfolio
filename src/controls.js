import * as THREE from 'three';

const SPEED = 0.07;
const LOOK_SENSITIVITY = 0.003;
const CAM_HEIGHT = 1.7;

// Walkable bounds — updated after rooms are built
export const bounds = {
  minX: -2.2, maxX: 2.2,
  minZ: 1.5,  maxZ: 3,    // minZ starts blocked until door opens; unlocks to -57 (corridor back wall)
  rooms: []
};

export function addRoomBounds(box) {
  bounds.rooms.push(box);
}

export function unlockMovement() {
  bounds.minZ = -57;  // corridor back wall is at z=-58 (length 60)
}

export class Controls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;

    this.yaw   = 0; // horizontal rotation
    this.pitch = 0; // vertical rotation

    this.keys = {};
    this.isDragging = false;
    this.wasDragging = false;   // set true if mouse moved during drag (suppress click)
    this.lastX = 0;
    this.lastY = 0;
    this._dragMoved = false;

    // Touch — two-finger forward
    this.touches = {};

    this._bindEvents();
  }

  _bindEvents() {
    // Keyboard
    window.addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup',   e => { this.keys[e.key.toLowerCase()] = false; });

    // Mouse drag look
    this.dom.addEventListener('mousedown', e => {
      if (e.button === 0) {
        this.isDragging = true;
        this._dragMoved = false;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => {
      this.wasDragging = this._dragMoved;
      this.isDragging = false;
      this._dragMoved = false;
    });
    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._dragMoved = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this._rotateLook(dx, dy);
    });

    // Touch drag look
    this.dom.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this.touches[t.identifier] = { x: t.clientX, y: t.clientY };
      }
    }, { passive: false });

    this.dom.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const prev = this.touches[t.identifier];
        if (!prev) continue;
        // Only look if single touch
        if (e.touches.length === 1) {
          const dx = t.clientX - prev.x;
          const dy = t.clientY - prev.y;
          this._rotateLook(-dx, -dy);  // invert: finger drag pans world naturally
        }
        this.touches[t.identifier] = { x: t.clientX, y: t.clientY };
      }
    }, { passive: false });

    this.dom.addEventListener('touchend', e => {
      for (const t of e.changedTouches) delete this.touches[t.identifier];
    });

    // D-pad buttons
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      const key = btn.dataset.key;
      btn.addEventListener('pointerdown', () => { this.keys[key] = true; });
      btn.addEventListener('pointerup',   () => { this.keys[key] = false; });
      btn.addEventListener('pointerleave',() => { this.keys[key] = false; });
    });
  }

  _rotateLook(dx, dy) {
    this.yaw   -= dx * LOOK_SENSITIVITY;
    this.pitch -= dy * LOOK_SENSITIVITY;
    this.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.pitch));
  }

  update() {
    const { camera, keys } = this;

    // Apply yaw + pitch
    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.yaw;
    camera.rotation.x = this.pitch;

    // Movement direction (yaw only, no pitch tilt on movement)
    const dir = new THREE.Vector3();
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const fwdKeys  = keys['w'] || keys['arrowup'];
    const backKeys = keys['s'] || keys['arrowdown'];
    const leftKeys = keys['a'] || keys['arrowleft'];
    const rightKeys= keys['d'] || keys['arrowright'];

    if (fwdKeys)   dir.addScaledVector(fwd, 1);
    if (backKeys)  dir.addScaledVector(fwd, -1);
    if (leftKeys)  dir.addScaledVector(right, -1);
    if (rightKeys) dir.addScaledVector(right, 1);

    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(SPEED);
      const nx = camera.position.x + dir.x;
      const nz = camera.position.z + dir.z;

      if (isWalkable(nx, nz)) {
        camera.position.x = nx;
        camera.position.z = nz;
      } else if (isWalkable(nx, camera.position.z)) {
        camera.position.x = nx;
      } else if (isWalkable(camera.position.x, nz)) {
        camera.position.z = nz;
      }
    }

    camera.position.y = CAM_HEIGHT;
  }
}

function isWalkable(x, z) {
  // Corridor bounds
  const inCorridor = (
    x >= bounds.minX && x <= bounds.maxX &&
    z >= bounds.minZ && z <= bounds.maxZ
  );
  if (inCorridor) return true;

  // Check room bounds
  for (const r of bounds.rooms) {
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return true;
  }
  return false;
}
