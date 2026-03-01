import * as THREE from 'three';

/**
 * Creates a CanvasTexture with styled text for use on 3D planes.
 * @param {Object} cfg
 * @param {number} cfg.width  - canvas pixel width
 * @param {number} cfg.height - canvas pixel height
 * @param {string} cfg.bg     - background fill color
 * @param {string} cfg.borderColor - border color (optional)
 * @param {string} cfg.title  - large heading text
 * @param {string} cfg.titleColor
 * @param {string} cfg.subtitle - secondary line
 * @param {string} cfg.subtitleColor
 * @param {string[]} cfg.lines  - body text lines
 * @param {string} cfg.linesColor
 * @param {string} cfg.accentColor - accent for decorative elements
 * @param {boolean} cfg.stamp - draw a circular seal/stamp
 * @param {string} cfg.stampText
 */
export function makeTextTexture(cfg) {
  const {
    width = 512, height = 512,
    bg = '#ffffff', borderColor = null,
    title = '', titleColor = '#1a1a1a',
    subtitle = '', subtitleColor = '#555',
    lines = [], linesColor = '#333',
    accentColor = '#888',
    stamp = false, stampText = ''
  } = cfg;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Border
  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, width - 24, height - 24);
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);
  }

  let y = 60;
  const pad = 48;

  // Title
  if (title) {
    ctx.fillStyle = titleColor;
    ctx.font = `bold ${Math.round(width * 0.07)}px Georgia, serif`;
    ctx.textAlign = 'center';
    wrapText(ctx, title, width / 2, y, width - pad * 2, Math.round(width * 0.085));
    y += countLines(ctx, title, width - pad * 2) * Math.round(width * 0.085) + 12;
  }

  // Accent divider
  ctx.fillStyle = accentColor;
  ctx.fillRect(width / 2 - 40, y, 80, 3);
  y += 20;

  // Subtitle
  if (subtitle) {
    ctx.fillStyle = subtitleColor;
    ctx.font = `italic ${Math.round(width * 0.055)}px Georgia, serif`;
    ctx.textAlign = 'center';
    wrapText(ctx, subtitle, width / 2, y, width - pad * 2, Math.round(width * 0.065));
    y += countLines(ctx, subtitle, width - pad * 2) * Math.round(width * 0.065) + 16;
  }

  // Body lines
  if (lines.length) {
    ctx.fillStyle = linesColor;
    ctx.font = `${Math.round(width * 0.044)}px Georgia, serif`;
    ctx.textAlign = 'left';
    const lineH = Math.round(width * 0.054);
    for (const line of lines) {
      if (y > height - 40) break;
      ctx.fillText(line, pad, y);
      y += lineH;
    }
  }

  // Stamp / seal
  if (stamp && stampText) {
    const sx = width - 80, sy = height - 80, sr = 52;
    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, sr - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = accentColor;
    ctx.font = `bold ${Math.round(width * 0.038)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stampText, sx, sy);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Digital standie screen texture — dark futuristic display with glowing text.
 * Used on work experience standees in the museum room.
 */
export function makeStandeeTexture(job) {
  const W = 512, H = 896;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Deep dark background
  ctx.fillStyle = '#020c18';
  ctx.fillRect(0, 0, W, H);

  // Subtle dot-grid overlay (futuristic)
  ctx.fillStyle = 'rgba(100,160,255,0.07)';
  for (let gx = 16; gx < W; gx += 28) {
    for (let gy = 16; gy < H; gy += 28) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Top accent bar (full width, company color)
  ctx.fillStyle = job.accentColor;
  ctx.fillRect(0, 0, W, 8);

  // Company name — large, colored, with glow shadow
  ctx.save();
  ctx.shadowColor = job.accentColor;
  ctx.shadowBlur = 18;
  ctx.fillStyle = job.accentColor;
  ctx.font = 'bold 68px Georgia, serif';
  ctx.textAlign = 'center';
  // Wrap long company names
  const nameLines = splitWords(ctx, job.company, W - 48, 68);
  nameLines.forEach((line, li) => ctx.fillText(line, W / 2, 88 + li * 78));
  ctx.restore();

  const nameBottom = 88 + nameLines.length * 78;

  // Coloured rule
  const grad = ctx.createLinearGradient(40, 0, W - 40, 0);
  grad.addColorStop(0,   'transparent');
  grad.addColorStop(0.2, job.accentColor);
  grad.addColorStop(0.8, job.accentColor);
  grad.addColorStop(1,   'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(40, nameBottom + 8, W - 80, 3);

  // Role
  ctx.fillStyle = '#ffffff';
  ctx.font = `italic 34px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(job.role, W / 2, nameBottom + 52);

  // Period
  ctx.fillStyle = 'rgba(180,210,255,0.55)';
  ctx.font = '26px Georgia, serif';
  ctx.fillText(job.period, W / 2, nameBottom + 90);

  // Thin divider
  ctx.fillStyle = 'rgba(100,160,255,0.18)';
  ctx.fillRect(40, nameBottom + 108, W - 80, 1);

  // Highlights
  ctx.textAlign = 'left';
  ctx.font = '22px Georgia, serif';
  let y = nameBottom + 144;
  for (const hl of job.highlights.slice(0, 6)) {
    // Bullet dot
    ctx.fillStyle = job.accentColor;
    ctx.beginPath(); ctx.arc(52, y - 7, 4, 0, Math.PI * 2); ctx.fill();
    // Text
    ctx.fillStyle = 'rgba(220,235,255,0.9)';
    const hlLines = splitWords(ctx, hl, W - 100, 22);
    hlLines.forEach((l, li) => ctx.fillText(l, 68, y + li * 28));
    y += hlLines.length * 28 + 12;
  }

  // Bottom tag bar
  ctx.fillStyle = job.color;
  ctx.fillRect(0, H - 44, W, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(job.company.toUpperCase(), W / 2, H - 16);

  // Corner brackets (tech aesthetic)
  ctx.strokeStyle = job.accentColor;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  drawCornerBrackets(ctx, 10, 10, W - 10, H - 50, 24);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function splitWords(ctx, text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? current + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCornerBrackets(ctx, x1, y1, x2, y2, len) {
  // top-left
  ctx.beginPath(); ctx.moveTo(x1, y1 + len); ctx.lineTo(x1, y1); ctx.lineTo(x1 + len, y1); ctx.stroke();
  // top-right
  ctx.beginPath(); ctx.moveTo(x2 - len, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + len); ctx.stroke();
  // bottom-left
  ctx.beginPath(); ctx.moveTo(x1, y2 - len); ctx.lineTo(x1, y2); ctx.lineTo(x1 + len, y2); ctx.stroke();
  // bottom-right
  ctx.beginPath(); ctx.moveTo(x2 - len, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2 - len, y2); ctx.stroke();
}

/** Certificate frame texture — cream parchment with decorative border */
export function makeCertTexture(edu) {
  return makeTextTexture({
    width: 768, height: 512,
    bg: '#fdf8f0',
    borderColor: '#c8a96e',
    title: edu.degree,
    titleColor: '#2c1810',
    subtitle: edu.institution,
    subtitleColor: '#5c4030',
    lines: [edu.location, edu.period, `Grade: ${edu.grade}`],
    linesColor: '#5c4030',
    accentColor: '#c8a96e',
    stamp: true,
    stampText: edu.grade
  });
}

/** Work band texture — dark background, large company name */
export function makeWorkBandTexture(job) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Gradient background
  const grd = ctx.createLinearGradient(0, 0, 1024, 512);
  grd.addColorStop(0, job.color);
  grd.addColorStop(1, shiftColor(job.color, 30));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 1024, 512);

  // Left accent bar
  ctx.fillStyle = job.accentColor;
  ctx.fillRect(0, 0, 6, 512);

  // Company name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 68px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(job.company, 36, 90);

  // Role
  ctx.fillStyle = job.accentColor;
  ctx.font = 'italic 36px Georgia, serif';
  ctx.fillText(job.role, 36, 140);

  // Period
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '28px Georgia, serif';
  ctx.fillText(job.period, 36, 185);

  // Divider
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(36, 205, 500, 2);

  // Highlights
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = '22px Georgia, serif';
  let y = 240;
  for (let i = 0; i < Math.min(job.highlights.length, 4); i++) {
    ctx.fillText(`• ${job.highlights[i]}`, 36, y);
    y += 34;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Room sign texture */
export function makeSignTexture(text, bg = '#1a1a1a', fg = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = 'bold 48px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '8px';
  ctx.fillText(text.toUpperCase(), 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── helpers ──

function wrapText(ctx, text, x, y, maxWidth, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

function countLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  let line = '';
  let count = 1;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      line = word;
      count++;
    } else {
      line = test;
    }
  }
  return count;
}

function shiftColor(hex, amount) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  const clamp = v => Math.max(0, Math.min(255, v));
  return `rgb(${clamp(r+amount)},${clamp(g+amount)},${clamp(b+amount)})`;
}
