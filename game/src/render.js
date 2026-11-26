// EMBER WING — all canvas drawing.
// One job: turn the world into a chase view over the valley — sky,
// ridges, scrolling ground, lake, airstrip, fires, the airtanker and
// the HUD — plus the title, paused and game-over screens.

import { VIEW, WORLD, COLORS, TEXT } from './config.js';
import { forwardDz, targetFire, wrapZ } from './world.js';

// Project a world point into screen space. t=0 is at the plane,
// t=1 is at the far edge of sight. Returns null when out of sight.
function project(x, z, cam) {
  const dz = forwardDz(z, cam.z);
  if (dz <= 0 || dz > VIEW.VIEW_DIST) return null;
  const t = dz / VIEW.VIEW_DIST;
  const near = 1 - t;
  const y = VIEW.HORIZON + (VIEW.H - VIEW.HORIZON) * Math.pow(near, 2.2);
  const sx = VIEW.W / 2 + (x - cam.x) * Math.pow(near, 1.3) * 2.0;
  return { x: sx, y, s: Math.pow(near, 1.5), t };
}

function sky(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.HORIZON + 40);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(0.55, COLORS.skyMid);
  g.addColorStop(1, COLORS.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.W, VIEW.HORIZON + 40);
  // Sun.
  ctx.fillStyle = 'rgba(255, 244, 200, 0.95)';
  ctx.beginPath();
  ctx.arc(1050, 78, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 200, 0.25)';
  ctx.beginPath();
  ctx.arc(1050, 78, 52, 0, Math.PI * 2);
  ctx.fill();
  // Drifting clouds, parallaxed by distance flown; kept below the HUD.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const drift = (world.plane.z * 0.15) % 1400;
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 320 + 140 - drift) % 1400 + 1400) % 1400 - 60;
    const cy = 104 + (i % 3) * 38;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 74, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 44, cy + 6, 52, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ridge(ctx, world, amp, baseY, color, par) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, baseY + 30);
  const off = world.plane.z * par;
  for (let x = 0; x <= VIEW.W; x += 16) {
    const y =
      baseY -
      (Math.sin((x + off) * 0.006) * 0.5 + 0.5) * amp -
      (Math.sin((x + off) * 0.017 + 2) * 0.5 + 0.5) * amp * 0.45;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VIEW.W, baseY + 30);
  ctx.closePath();
  ctx.fill();
}

function ground(ctx, world) {
  const cam = world.plane;
  const step = 40;
  // Far to near so near rows paint over far rows.
  for (let dz = VIEW.VIEW_DIST; dz >= step; dz -= step) {
    const zFar = wrapZ(cam.z + dz);
    const zNear = wrapZ(cam.z + dz - step);
    const top = project(0, zFar, cam);
    const bot = project(0, zNear, cam);
    if (top === null || bot === null) continue;
    const yTop = top.y;
    const yBot = bot.y;
    if (yBot - yTop < 0.5) continue;
    const inLake = zFar >= WORLD.LAKE.z0 && zFar <= WORLD.LAKE.z1;
    const row = Math.floor(dz / step);
    let fill;
    if (inLake) {
      fill = row % 2 === 0 ? COLORS.lake : COLORS.lakeDeep;
    } else if (zFar >= 2500 && zFar <= 3500) {
      fill = row % 2 === 0 ? COLORS.meadowDry : '#7d7a42';
    } else {
      fill = row % 2 === 0 ? COLORS.meadowA : COLORS.meadowB;
    }
    ctx.fillStyle = fill;
    ctx.fillRect(0, yTop, VIEW.W, yBot - yTop + 1);
  }
  // Lake shore: a sand rim along the near edge of the lake.
  const shore = project(0, WORLD.LAKE.z1, cam);
  if (shore !== null) {
    ctx.fillStyle = '#c9b078';
    ctx.fillRect(0, shore.y - 3, VIEW.W, 4);
  }
}

function airstrip(ctx, world) {
  const cam = world.plane;
  const S = WORLD.STRIP;
  const c1 = project(S.x0, S.z0, cam);
  const c2 = project(S.x1, S.z0, cam);
  const c3 = project(S.x1, S.z1, cam);
  const c4 = project(S.x0, S.z1, cam);
  if (c1 === null || c2 === null || c3 === null || c4 === null) return;
  ctx.fillStyle = COLORS.strip;
  ctx.beginPath();
  ctx.moveTo(c1.x, c1.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(c3.x, c3.y);
  ctx.lineTo(c4.x, c4.y);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes.
  ctx.strokeStyle = COLORS.stripLine;
  ctx.lineWidth = Math.max(1, 3 * c1.s);
  ctx.setLineDash([10 * c1.s + 4, 10 * c1.s + 4]);
  ctx.beginPath();
  ctx.moveTo((c1.x + c2.x) / 2, c1.y);
  ctx.lineTo((c3.x + c4.x) / 2, c3.y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Runway number near the threshold.
  ctx.fillStyle = COLORS.stripLine;
  ctx.font = 'bold ' + Math.max(10, Math.round(26 * c1.s)) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('27', (c1.x + c2.x) / 2, c1.y - 6);
  // Windsock beside the strip.
  const ws = project(S.x1 + 42, (S.z0 + S.z1) / 2, cam);
  if (ws !== null) {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ws.x, ws.y);
    ctx.lineTo(ws.x, ws.y - 26 * ws.s - 8);
    ctx.stroke();
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(ws.x, ws.y - 26 * ws.s - 8);
    ctx.lineTo(ws.x + 16 * ws.s + 6, ws.y - 22 * ws.s - 6);
    ctx.lineTo(ws.x, ws.y - 18 * ws.s - 4);
    ctx.closePath();
    ctx.fill();
  }
}

function trees(ctx, world) {
  const cam = world.plane;
  const list = world.trees
    .map((t) => ({ t, p: project(t.x, t.z, cam) }))
    .filter((e) => e.p !== null)
    .sort((a, b) => b.p.t - a.p.t);
  for (const { t, p } of list) {
    const h = t.h * p.s + 4;
    ctx.fillStyle = '#2c5226';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - h);
    ctx.lineTo(p.x - h * 0.42, p.y);
    ctx.lineTo(p.x + h * 0.42, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a6b31';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - h * 1.25);
    ctx.lineTo(p.x - h * 0.3, p.y - h * 0.45);
    ctx.lineTo(p.x + h * 0.3, p.y - h * 0.45);
    ctx.closePath();
    ctx.fill();
  }
}

function fires(ctx, world) {
  const cam = world.plane;
  const list = world.fires
    .map((f) => ({ f, p: project(f.x, f.z, cam) }))
    .filter((e) => e.p !== null && e.f.alive)
    .sort((a, b) => b.p.t - a.p.t);
  for (const { f, p } of list) {
    const w = (f.r * 2.4 + 26) * p.s + 8;
    const h = (f.r * 0.9 + 10) * p.s + 4;
    // Scorch + glow on the ground.
    ctx.fillStyle = 'rgba(40, 20, 8, 0.55)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, w * 0.8, h * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, w);
    glow.addColorStop(0, 'rgba(255, 122, 26, 0.75)');
    glow.addColorStop(1, 'rgba(255, 122, 26, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    // Flames, flickering with world time.
    const flick = Math.sin(world.time * 13 + f.x) * 0.25 + 1;
    for (let i = -1; i <= 1; i++) {
      const fx = p.x + i * w * 0.28;
      const fh = h * (2.1 + i * 0.3) * flick * f.intensity;
      ctx.fillStyle = i === 0 ? COLORS.fireCore : COLORS.fireMid;
      ctx.beginPath();
      ctx.moveTo(fx - w * 0.16, p.y);
      ctx.lineTo(fx, p.y - fh);
      ctx.lineTo(fx + w * 0.16, p.y);
      ctx.closePath();
      ctx.fill();
    }
    // Smoke column rising and drifting.
    for (let i = 0; i < 4; i++) {
      const rise = ((world.time * 22 + i * 34) % 130) * p.s + 8;
      const sx = p.x + i * 7 * p.s + rise * 0.12;
      ctx.fillStyle = 'rgba(111, 111, 111, ' + (0.5 - i * 0.09) + ')';
      ctx.beginPath();
      ctx.arc(sx, p.y - rise - h, (10 + i * 5) * p.s + 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function dropZone(ctx, world) {
  const f = targetFire(world);
  if (f === null || world.screen !== 'play') return;
  const p = project(f.x, f.z, world.plane);
  if (p === null) return;
  const pulse = 1 + Math.sin(world.time * 5) * 0.12;
  const rw = (f.r * 2.6 + 30) * p.s * pulse + 10;
  const rh = rw * 0.32;
  ctx.strokeStyle = '#ffb020';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rw, rh, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, p.y - 150 * p.s - 30);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffb020';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  const dz = forwardDz(f.z, world.plane.z);
  ctx.fillText('DROP ZONE — ' + Math.round(dz * 3) + ' m ahead', p.x, p.y - 150 * p.s - 40);
  // Steering arrow: which way to turn for the target.
  const dx = f.x - world.plane.x;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = Math.abs(dx) < 40 ? COLORS.hudGood : '#ffffff';
  ctx.fillText(dx < -40 ? '◀ TURN LEFT' : dx > 40 ? 'TURN RIGHT ▶' : 'ON TARGET — DROP!', VIEW.W / 2, 132);
}

function particles(ctx, world) {
  const cam = world.plane;
  for (const pt of world.particles) {
    const p = project(pt.x, pt.z, cam);
    if (p === null) continue;
    if (pt.kind === 'water') {
      ctx.fillStyle = 'rgba(120, 200, 255, ' + Math.min(1, pt.ttl * 1.4) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 8 * p.s, 7 * p.s + 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.min(1, pt.ttl * 1.6) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 6, 5 * p.s + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The falling drop stream while the tank is open.
  if (world.dropping > 0) {
    const g = ctx.createLinearGradient(0, 540, 0, 700);
    g.addColorStop(0, 'rgba(140, 210, 255, 0.9)');
    g.addColorStop(1, 'rgba(140, 210, 255, 0.05)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(628, 545);
    ctx.lineTo(652, 545);
    ctx.lineTo(676, 700);
    ctx.lineTo(604, 700);
    ctx.closePath();
    ctx.fill();
  }
}

function plane(ctx, world) {
  const p = world.plane;
  const bob = Math.sin(world.time * 2.2) * 3;
  const px = VIEW.W / 2;
  const py = 498 + bob + (650 - p.alt) * 0.012;
  const sh = project(p.x, wrapZ(p.z + 60), p);
  if (sh !== null) {
    ctx.fillStyle = 'rgba(10, 20, 10, 0.25)';
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, 46 * sh.s + 8, 10 * sh.s + 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(p.roll * 0.55);
  // High wing, red with white tips.
  ctx.fillStyle = COLORS.planeRed;
  roundRect(ctx, -235, -14, 470, 26, 12);
  ctx.fill();
  ctx.fillStyle = COLORS.planeWhite;
  roundRect(ctx, -235, -14, 34, 26, 12);
  ctx.fill();
  roundRect(ctx, 201, -14, 34, 26, 12);
  ctx.fill();
  // Engine nacelles + spinning props.
  for (const ex of [-118, 118]) {
    ctx.fillStyle = COLORS.planeBelly;
    roundRect(ctx, ex - 16, -8, 32, 22, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(220, 230, 240, 0.35)';
    ctx.beginPath();
    ctx.ellipse(ex, 2, 10, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40, 50, 60, 0.55)';
    ctx.lineWidth = 3;
    const a = world.time * 22 + (ex > 0 ? 1 : 0);
    ctx.beginPath();
    ctx.moveTo(ex - Math.cos(a) * 30, 2 - Math.sin(a) * 30);
    ctx.lineTo(ex + Math.cos(a) * 30, 2 + Math.sin(a) * 30);
    ctx.stroke();
  }
  // Fuselage seen from behind-above: wide tail, tapering nose away.
  ctx.fillStyle = COLORS.planeWhite;
  ctx.beginPath();
  ctx.moveTo(-58, -58);
  ctx.lineTo(58, -58);
  ctx.lineTo(40, 44);
  ctx.lineTo(-40, 44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.planeRed;
  ctx.beginPath();
  ctx.moveTo(-58, -58);
  ctx.lineTo(58, -58);
  ctx.lineTo(52, -26);
  ctx.lineTo(-52, -26);
  ctx.closePath();
  ctx.fill();
  // Tailplane and fin.
  ctx.fillStyle = COLORS.planeRed;
  roundRect(ctx, -96, -72, 192, 18, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-14, -58);
  ctx.lineTo(14, -58);
  ctx.lineTo(8, -104);
  ctx.lineTo(-8, -104);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EW', 0, -66);
  // Belly tank with a visible water level.
  ctx.fillStyle = COLORS.planeBelly;
  roundRect(ctx, -30, 30, 60, 34, 10);
  ctx.fill();
  const level = p.tank / 100;
  ctx.fillStyle = '#4db2ff';
  const lh = 28 * level;
  if (lh > 2) {
    roundRect(ctx, -27, 61 - lh, 54, lh, 6);
    ctx.fill();
  }
  // Nav lights, blinking.
  const blink = Math.sin(world.time * 6) > 0;
  ctx.fillStyle = blink ? '#ff4040' : '#881111';
  ctx.beginPath();
  ctx.arc(-232, -1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = blink ? '#40ff70' : '#118833';
  ctx.beginPath();
  ctx.arc(232, -1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Scoop spray under the plane when skimming the lake.
  if (world.scooping) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const r = 46 + Math.sin(world.time * 9 + i) * 8;
      ctx.beginPath();
      ctx.arc(px + Math.cos(a) * r, py + 52 + Math.sin(a) * 18, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCOOPING…', px, py + 104);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 5);
}

function hud(ctx, world) {
  const p = world.plane;
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW.W, 86);
  ctx.fillStyle = COLORS.hudText;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#9fc6e8';
  ctx.fillText('ALT', 18, 20);
  ctx.fillText('SPD', 148, 20);
  ctx.fillText('HDG', 268, 20);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(Math.round(p.alt) + ' ft', 18, 50);
  ctx.fillText(Math.round(p.speed) + ' kt', 148, 50);
  ctx.fillText(String(Math.round(((p.hdg % 360) + 360) % 360)).padStart(3, '0') + '°', 268, 50);
  // Compass strip, centred on the current heading.
  ctx.fillStyle = '#9fc6e8';
  ctx.font = 'bold 12px sans-serif';
  const hdg = ((p.hdg % 360) + 360) % 360;
  for (let d = -45; d <= 45; d += 15) {
    const a = ((hdg + d) % 360 + 360) % 360;
    const x = 500 + d * 2.4;
    ctx.fillStyle = '#eaf6ff';
    ctx.fillRect(x, 30, 1, d % 45 === 0 ? 14 : 8);
    ctx.fillText(String(Math.round(a)).padStart(3, '0'), x - 10, 58);
  }
  ctx.fillStyle = '#ffb020';
  ctx.beginPath();
  ctx.moveTo(500, 24);
  ctx.lineTo(508, 24);
  ctx.lineTo(504, 34);
  ctx.closePath();
  ctx.fill();
  // Tank, fuel, score, fire, time.
  const tankColor = p.tank > 60 ? '#4db2ff' : p.tank > 25 ? COLORS.hudWarn : COLORS.hudBad;
  bar(ctx, 640, 34, 120, 12, p.tank / 100, tankColor, 'WATER TANK ' + Math.round(p.tank) + '%');
  const fuelColor = p.fuel > 50 ? COLORS.hudGood : p.fuel > 22 ? COLORS.hudWarn : COLORS.hudBad;
  bar(ctx, 790, 34, 120, 12, p.fuel / 100, fuelColor, 'FUEL ' + Math.round(p.fuel) + '%');
  ctx.fillStyle = '#9fc6e8';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SCORE', 940, 20);
  ctx.fillText('FIRE LEFT', 1040, 20);
  ctx.fillText('TIME', 1160, 20);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(String(world.score), 940, 50);
  ctx.fillText(Math.round(world.totalBurning) + ' ha', 1040, 50);
  const t = Math.max(0, Math.ceil(world.timeLeft));
  ctx.fillStyle = t < 30 ? COLORS.hudBad : COLORS.hudText;
  ctx.fillText(Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'), 1160, 50);
  // Attitude mini-gauge: artificial horizon, lit.
  const gx = 600;
  const gy = 640;
  ctx.save();
  ctx.beginPath();
  ctx.arc(gx, gy, 34, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#2f6fb2';
  ctx.fillRect(gx - 34, gy - 34, 68, 34);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(gx - 34, gy, 68, 34);
  ctx.rotate(p.roll * 0.55);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gx - 34, gy);
  ctx.lineTo(gx + 34, gy);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#eaf6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(gx, gy, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#9fc6e8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', gx, gy + 50);
  // Warnings and messages.
  ctx.textAlign = 'center';
  if (p.fuel < 22 && world.screen === 'play') {
    ctx.fillStyle = Math.sin(world.time * 8) > 0 ? COLORS.hudBad : '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('⚠ LOW FUEL — land low over the airstrip to refuel', VIEW.W / 2, 116);
  }
  if (world.refuelling) {
    ctx.fillStyle = COLORS.hudGood;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('REFUELLING…', VIEW.W / 2, 116);
  }
  // Messages stay off the game-over screen: the final stats own it.
  if (world.screen !== 'over') {
    ctx.font = 'bold 19px sans-serif';
    world.messages.forEach((m, i) => {
      ctx.fillStyle =
        m.kind === 'good' ? COLORS.hudGood : m.kind === 'warn' ? COLORS.hudWarn : '#ffffff';
      ctx.globalAlpha = Math.min(1, m.ttl);
      ctx.fillText(m.text, VIEW.W / 2, 168 + i * 26);
      ctx.globalAlpha = 1;
    });
  }
  // Controls hint.
  ctx.fillStyle = 'rgba(234, 246, 255, 0.75)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('↑↓ pitch · ←→ / AD bank · W/S throttle · SPACE drop · P pause', 14, 706);
  ctx.textAlign = 'right';
  ctx.fillText('Scoop low over the lake · Drop below 1,000 ft on the fires', VIEW.W - 14, 706);
}

function overlay(ctx, world) {
  ctx.fillStyle = 'rgba(6, 14, 22, 0.62)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
}

function titleScreen(ctx, world) {
  overlay(ctx, world);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb020';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('WILDFIRE SEASON — THE RIDGE IS BURNING', VIEW.W / 2, 128);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText(TEXT.title, VIEW.W / 2, 218);
  ctx.fillStyle = '#9fc6e8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(TEXT.subtitle, VIEW.W / 2, 256);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '19px sans-serif';
  ctx.fillText(TEXT.mission, VIEW.W / 2, 300);
  ctx.font = '17px sans-serif';
  TEXT.controls.forEach((line, i) => {
    ctx.fillText(line, VIEW.W / 2, 348 + i * 28);
  });
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('SCORE = hectares saved + fires out  ·  BEST ' + world.best, VIEW.W / 2, 516);
  ctx.fillStyle = Math.sin(world.time * 4) > -0.4 ? '#ffffff' : '#9fc6e8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO FLY', VIEW.W / 2, 574);
}

function pausedScreen(ctx) {
  overlay(ctx, null);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('PAUSED', VIEW.W / 2, 330);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#9fc6e8';
  ctx.fillText('Press P or click to keep flying', VIEW.W / 2, 376);
}

function overScreen(ctx, world) {
  overlay(ctx, world);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb020';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(world.reason, VIEW.W / 2, 168);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('SCORE  ' + world.score, VIEW.W / 2, 240);
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#eaf6ff';
  const rows = [
    'Hectares saved: ' + world.savedHa.toFixed(1) + ' ha',
    'Water drops: ' + world.drops + '   ·   Fires out: ' + world.firesOut + ' / ' + world.fires.length,
    'Fire still burning: ' + Math.round(world.totalBurning) + ' ha',
    'Best score: ' + world.best,
  ];
  rows.forEach((line, i) => {
    ctx.fillText(line, VIEW.W / 2, 300 + i * 34);
  });
  ctx.fillStyle = Math.sin(world.time * 4) > -0.4 ? '#ffffff' : '#9fc6e8';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('PRESS R TO FLY AGAIN', VIEW.W / 2, 486);
}

export function render(ctx, world) {
  ctx.clearRect(0, 0, VIEW.W, VIEW.H);
  sky(ctx, world);
  ridge(ctx, world, 46, VIEW.HORIZON + 6, COLORS.ridgeFar, 0.02);
  ridge(ctx, world, 34, VIEW.HORIZON + 16, COLORS.ridgeNear, 0.05);
  ground(ctx, world);
  airstrip(ctx, world);
  trees(ctx, world);
  fires(ctx, world);
  dropZone(ctx, world);
  particles(ctx, world);
  plane(ctx, world);
  if (world.screen === 'title') {
    titleScreen(ctx, world);
  } else if (world.screen === 'paused') {
    hud(ctx, world);
    pausedScreen(ctx);
  } else if (world.screen === 'over') {
    hud(ctx, world);
    overScreen(ctx, world);
  } else {
    hud(ctx, world);
  }
}
