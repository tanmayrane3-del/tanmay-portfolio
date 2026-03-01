import * as THREE from 'three';
import { makeCertTexture, makeTextTexture } from '../utils/textCanvas.js';
import { education, certifications } from '../data.js';
import { CORRIDOR } from '../corridor.js';
import { addRoomBounds } from '../controls.js';

const ROOM = { width: 10.5, depth: 9, height: 4 };  // 25% smaller

export function buildEducationRoom(scene) {
  const cx = -(CORRIDOR.width / 2) - ROOM.width / 2;
  const cz = CORRIDOR.eduDoorZ;

  const hw = ROOM.width / 2, hd = ROOM.depth / 2;
  const halfDoor = CORRIDOR.doorWidth / 2;
  const entryDepth = 0.6; // strip width (X) from corridor boundary into room

  // Entry strip — only doorway Z range, so player can't walk through the solid wall
  addRoomBounds({
    minX: cx + hw - entryDepth,
    maxX: -CORRIDOR.width / 2 + 0.3,
    minZ: cz - halfDoor + 0.15,
    maxZ: cz + halfDoor - 0.15,
  });
  // Interior — full room, pushed back from the corridor-facing wall
  addRoomBounds({
    minX: cx - hw + 0.3,
    maxX: cx + hw - entryDepth,
    minZ: cz - hd + 0.3,
    maxZ: cz + hd - 0.3,
  });

  buildRoomShell(scene, cx, cz);
  buildCertificates(scene, cx, cz);
  buildCertWall(scene, cx, cz);
  addRoomLights(scene, cx, cz);

  return { cx, cz };
}

function buildRoomShell(scene, cx, cz) {
  const { width, depth, height } = ROOM;
  const hw = width / 2;
  const hd = depth / 2;
  const doorHalfW = CORRIDOR.doorWidth / 2;
  const doorAboveH = height - CORRIDOR.doorHeight;

  const wallMat  = new THREE.MeshStandardMaterial({ color: 0xf7f2ea, roughness: 0.88 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xc8a96e, roughness: 0.9 });
  const ceilMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });

  addPlane(scene, floorMat, width, depth, [cx, 0, cz], [-Math.PI/2, 0, 0]);
  addPlane(scene, ceilMat, width, depth, [cx, height, cz], [Math.PI/2, 0, 0]);
  addPlane(scene, wallMat, depth, height, [cx - hw, height/2, cz], [0, Math.PI/2, 0]);

  // Front wall — 0.01 inward of corridor wall to avoid z-fighting with corridor planes
  const frontX = cx + hw - 0.01;
  addPlane(scene, wallMat, hd - doorHalfW, height,
    [frontX, height/2, cz + doorHalfW + (hd - doorHalfW)/2], [0, -Math.PI/2, 0]);
  addPlane(scene, wallMat, hd - doorHalfW, height,
    [frontX, height/2, cz - doorHalfW - (hd - doorHalfW)/2], [0, -Math.PI/2, 0]);
  if (doorAboveH > 0.01)
    addPlane(scene, wallMat, CORRIDOR.doorWidth, doorAboveH,
      [frontX, CORRIDOR.doorHeight + doorAboveH/2, cz], [0, -Math.PI/2, 0]);

  // Side walls (Z ends) — full room width
  addPlane(scene, wallMat, width, height, [cx, height/2, cz + hd], [0, Math.PI, 0]);
  addPlane(scene, wallMat, width, height, [cx, height/2, cz - hd], [0, 0, 0]);

  // Skirting — back wall only (corridor-side skirting removed: corridor trim already covers junction)
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0xc8a96e, roughness: 0.6 });
  addBox(scene, skirtMat, 0.06, 0.12, depth, [cx - hw, 0.06, cz]);
  // Front skirting split around doorway (avoid poking into corridor)
  const skirtX = cx + hw - 0.04; // fully inside room
  addBox(scene, skirtMat, 0.06, 0.12, hd - doorHalfW, [skirtX, 0.06, cz + doorHalfW + (hd - doorHalfW)/2]);
  addBox(scene, skirtMat, 0.06, 0.12, hd - doorHalfW, [skirtX, 0.06, cz - doorHalfW - (hd - doorHalfW)/2]);
}

function buildCertificates(scene, cx, cz) {
  const count = education.length;
  const spacing = ROOM.depth / (count + 1);
  // Back wall inner face — the wall plane is at cx - ROOM.width/2, facing +X
  const wallX = cx - ROOM.width / 2;
  const FRAME_H = 1.2, FRAME_W = 1.5, FRAME_D = 0.04;
  const wireTop = CORRIDOR.height - 0.1;

  education.forEach((edu, i) => {
    const z = cz - ROOM.depth / 2 + spacing * (i + 1);
    const yHang = 2.3;

    // ── GROUP: frame + cert plane move as one unit (prevents z-fighting AND sync sway)
    const group = new THREE.Group();
    // Offset 0.06 from wall so the frame back sits flush against it
    group.position.set(wallX + 0.06 + FRAME_D / 2, yHang, z);
    group.rotation.y = Math.PI / 2; // face toward room (+X direction)
    group._swayOffset = i * 1.3;
    scene.add(group);

    // Frame box — centred at group origin in local space
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4a853, roughness: 0.4, metalness: 0.3 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(FRAME_W + 0.1, FRAME_H + 0.1, FRAME_D), frameMat);
    frame.castShadow = true;
    group.add(frame);

    // Cert plane — local z = FRAME_D/2 + 0.005 (just in front of frame face, no z-fight)
    const certTex = makeCertTexture(edu);
    const certMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(FRAME_W, FRAME_H),
      new THREE.MeshStandardMaterial({ map: certTex, roughness: 0.8 })
    );
    certMesh.position.z = FRAME_D / 2 + 0.005;
    certMesh.userData = { type: 'cert', data: edu, imageURL: certTex.image.toDataURL('image/jpeg', 0.88) };
    group.add(certMesh);

    // Wire — in world space, from ceiling to group top (stays fixed; sway angle is tiny)
    const wireH = wireTop - (yHang + FRAME_H / 2 + FRAME_D / 2);
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, wireH, 6),
      new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.2 })
    );
    wire.position.set(wallX + 0.06 + FRAME_D / 2, yHang + FRAME_H / 2 + wireH / 2, z);
    scene.add(wire);
  });
}

function buildCertWall(scene, cx, cz) {
  // Side wall (Z+) — certification plaques
  const wallZ = cz + ROOM.depth / 2; // wall plane
  const PLAQUE_D = 0.04;

  certifications.forEach((cert, i) => {
    const tex = makeTextTexture({
      width: 512, height: 256,
      bg: '#f0f4ff', borderColor: cert.color,
      title: cert.title,   titleColor: '#1a1a2e',
      subtitle: cert.issuer, subtitleColor: cert.color,
      lines: [cert.year],  linesColor: '#555',
      accentColor: cert.color
    });

    const x = cx - ROOM.width / 2 + (ROOM.width / (certifications.length + 1)) * (i + 1);

    // Frame box — back face at wallZ, extends forward into room
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.28, 1.18, PLAQUE_D),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.4, roughness: 0.5 })
    );
    frameMesh.position.set(x, 2.0, wallZ - PLAQUE_D / 2); // centre of box is half depth in front of wall
    frameMesh.rotation.y = Math.PI;
    scene.add(frameMesh);

    // Cert plane — on frame front face (wallZ - PLAQUE_D - 0.005)
    const certMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.1),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })
    );
    certMesh.position.set(x, 2.0, wallZ - PLAQUE_D - 0.005);
    certMesh.rotation.y = Math.PI;
    certMesh.userData = {
      type: 'cert',
      data: { ...cert, isCertification: true },
      imageURL: tex.image.toDataURL('image/jpeg', 0.88),
    };
    scene.add(certMesh);
  });
}

function addRoomLights(scene, cx, cz) {
  scene.add(new THREE.AmbientLight(0xfff8e8, 0.5));

  // One spotlight per cert — positions mirror buildCertificates() Z layout
  const count = education.length;
  const spacing = ROOM.depth / (count + 1);
  const wallX = cx - ROOM.width / 2;

  for (let i = 0; i < count; i++) {
    const z = cz - ROOM.depth / 2 + spacing * (i + 1);
    const spot = new THREE.SpotLight(0xfff0d0, 3.5, 8, Math.PI / 8, 0.25);
    spot.position.set(wallX + 0.7, CORRIDOR.height - 0.1, z);
    spot.target.position.set(wallX + 0.1, 2.3, z);
    spot.castShadow = false; // keep perf light
    scene.add(spot);
    scene.add(spot.target);
  }
}

// Sway animation — driven from main.js game loop
export function updateCertSway(scene, t) {
  scene.traverse(obj => {
    if (obj.isGroup && obj._swayOffset !== undefined) {
      obj.rotation.z = Math.sin(t * 0.55 + obj._swayOffset) * 0.022;
    }
  });
}

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
  mesh.castShadow = true;
  scene.add(mesh);
}
