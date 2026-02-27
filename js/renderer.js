// Rendering Module

function drawBackground(ctx, W, H, cameraY, maxHeight, frameCount, cloudData) {
  const height = Math.max(0, maxHeight);
  
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (height < 1500) {
    grad.addColorStop(0, '#4fa8e8');
    grad.addColorStop(1, '#87CEEB');
  } else if (height < 3000) {
    grad.addColorStop(0, '#e06030');
    grad.addColorStop(1, '#ff9966');
  } else if (height < 5000) {
    grad.addColorStop(0, '#1a0a3a');
    grad.addColorStop(1, '#4a1060');
  } else {
    grad.addColorStop(0, '#000010');
    grad.addColorStop(1, '#0d0d2b');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (height > 2000) {
    const starAlpha = Math.min(Math.max((height - 2000) / 1000, 0), 1);
    ctx.save();
    ctx.globalAlpha = starAlpha;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 137.5 + 50) % W);
      const sy = ((i * 97.3 + 20) % H);
      const twinkle = Math.sin(frameCount * 0.05 + i) * 0.3 + 0.7;
      ctx.globalAlpha = starAlpha * twinkle;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3 === 0 ? 1.5 : 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (height < 3000) {
    const cloudAlpha = Math.min(Math.max(1 - height / 3000, 0.1), 0.6);
    drawClouds(ctx, W, H, cameraY, cloudAlpha, cloudData, frameCount);
  }
}

function drawClouds(ctx, W, H, cameraY, alpha, cloudData, frameCount) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  for (const c of cloudData) {
    c.x += c.speed;
    if (c.x > W + 100) c.x = -100;
    if (c.x < -100) c.x = W + 100;
    const cloudY = ((c.y - cameraY * 0.3) % H + H) % H;
    drawCloudShape(ctx, c.x, cloudY, c.w);
  }
  ctx.restore();
}

function drawCloudShape(ctx, x, y, w) {
  ctx.beginPath();
  ctx.arc(x, y, w * 0.3, 0, Math.PI * 2);
  ctx.arc(x + w * 0.25, y - w * 0.1, w * 0.25, 0, Math.PI * 2);
  ctx.arc(x + w * 0.5, y, w * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatform(ctx, p, camY, PLAT_COLORS, H) {
  const drawY = p.y - camY;
  if (drawY < -20 || drawY > H + 20) return;

  const c = PLAT_COLORS[p.type];
  const shake = p.breakTimer > 0 ? (p.breakTimer % 4 < 2 ? 2 : -2) : 0;

  ctx.save();
  ctx.translate(shake, 0);

  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.roundRect(p.x, drawY + 4, p.w, p.h, [0, 0, 4, 4]);
  ctx.fill();

  ctx.fillStyle = c.top;
  ctx.beginPath();
  ctx.roundRect(p.x, drawY, p.w, 8, [4, 4, 0, 0]);
  ctx.fill();

  if (p.type === 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↔', p.x + p.w / 2, drawY + 10);
  }
  if (p.type === 3) {
    ctx.strokeStyle = '#2277cc';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x + p.w * 0.25, drawY + 2 + i * 2.5);
      ctx.lineTo(p.x + p.w * 0.75, drawY + 2 + i * 2.5);
      ctx.stroke();
    }
  }
  if (p.type === 2) {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x + p.w * 0.3, drawY);
    ctx.lineTo(p.x + p.w * 0.5, drawY + 6);
    ctx.moveTo(p.x + p.w * 0.7, drawY);
    ctx.lineTo(p.x + p.w * 0.55, drawY + 8);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCoin(ctx, c, camY, H) {
  const y = c.y - camY + Math.sin(c.bob) * 4;
  if (y < -20 || y > H + 20) return;

  ctx.save();
  ctx.fillStyle = c.type === 'gem' ? '#a78fff' : c.type === 'gold' ? '#ffd700' : '#ffe066';
  ctx.strokeStyle = c.type === 'gem' ? '#7755dd' : c.type === 'gold' ? '#cc9900' : '#ccaa00';
  ctx.lineWidth = 1.5;
  if (c.type === 'gem') {
    ctx.beginPath();
    ctx.moveTo(c.x, y - 8);
    ctx.lineTo(c.x + 6, y - 2);
    ctx.lineTo(c.x, y + 8);
    ctx.lineTo(c.x - 6, y - 2);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.arc(c.x, y, c.type === 'gold' ? 7 : 5, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(c.x - 2, y - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPowerupItem(ctx, p, camY, getPowerupColor, getPowerupEmoji, H) {
  const y = p.y - camY + Math.sin(p.bob) * 5;
  if (y < -20 || y > H + 20) return;

  ctx.save();
  ctx.globalAlpha = 0.9;
  const color = getPowerupColor(p.type);
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getPowerupEmoji(p.type), p.x, y);
  ctx.restore();
}

function drawPlayer(ctx, player, frameCount, activePowerups) {
  if (player.dead) return;
  const sx = player.squash;
  const sy = 2 - player.squash;

  player.trail.push({ x: player.x, y: player.y, t: 1 });
  if (player.trail.length > 8) player.trail.shift();
  for (const tr of player.trail) {
    tr.t -= 0.15;
    if (tr.t < 0) continue;
    ctx.save();
    ctx.globalAlpha = tr.t * 0.2;
    ctx.fillStyle = player.bodyColor;
    ctx.beginPath();
    ctx.ellipse(tr.x, tr.y - player.h / 2, player.w / 2 * 0.8, player.h / 2 * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(player.x, player.y - player.h / 2);
  ctx.scale(player.facing * sx, sy);

  if (activePowerups.shield) {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(frameCount * 0.15) * 0.15;
    ctx.fillStyle = '#80ff80';
    ctx.beginPath();
    ctx.ellipse(0, player.h / 2, player.w * 0.8, player.h * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const bodyColor = activePowerups.feather ? '#7df0ff' : activePowerups.speed ? '#ff7d3a' : player.bodyColor;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-player.w / 2, 0, player.w, player.h, [8, 8, 6, 6]);
  ctx.fill();

  ctx.strokeStyle = player.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-player.w / 2, 0, player.w, player.h, [8, 8, 6, 6]);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(2, player.h * 0.55, player.w * 0.28, player.h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(player.w * 0.18, player.h * 0.28, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(player.w * 0.22, player.h * 0.28, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(player.w * 0.26, player.h * 0.24, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.roundRect(-player.w * 0.35, player.h * 0.82, player.w * 0.35, 6, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(player.w * 0.04, player.h * 0.82, player.w * 0.35, 6, 3);
  ctx.fill();

  ctx.restore();

  if (player.onWall && player.vy > 0) {
    spawnParticles(player.x + (player.onWall > 0 ? 14 : -14), player.y - rand(0, player.h),
      '#ffd700', 1, { minSpeed: 0.5, maxSpeed: 1.5, gravity: 0.05, upBias: 0 });
  }
}

function drawRockets(ctx, rockets, camY, W, H, frameCount) {
  for (const r of rockets) {
    const dy = r.y - camY;
    if (dy < -60 || dy > H + 60) continue;

    if (r.exploding) {
      const prog = 1 - r.explodeTimer / 20;
      ctx.save();
      ctx.globalAlpha = 1 - prog;
      for (let ring = 0; ring < 3; ring++) {
        ctx.strokeStyle = ring === 0 ? '#ff4400' : ring === 1 ? '#ffaa00' : '#ffffff';
        ctx.lineWidth = 3 - ring;
        ctx.beginPath();
        ctx.arc(r.x, dy, (prog * 30) + ring * 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    for (let i = 0; i < r.trail.length; i++) {
      const t = r.trail[i];
      const tdy = t.y - camY;
      ctx.save();
      ctx.globalAlpha = t.life * 0.6;
      ctx.fillStyle = i % 2 === 0 ? '#ff6600' : '#ffcc00';
      ctx.beginPath();
      ctx.arc(t.x + (r.fromLeft ? -16 : 16), tdy, (i / r.trail.length) * 5 + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(r.x, dy);
    ctx.scale(r.fromLeft ? 1 : -1, 1);

    ctx.fillStyle = '#ccccdd';
    ctx.beginPath();
    ctx.roundRect(-r.w / 2, -r.h / 2, r.w * 0.75, r.h, 3);
    ctx.fill();

    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.moveTo(r.w * 0.25, -r.h / 2);
    ctx.lineTo(r.w * 0.5 + 2, 0);
    ctx.lineTo(r.w * 0.25, r.h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#9999bb';
    ctx.beginPath();
    ctx.moveTo(-r.w / 2, -r.h / 2);
    ctx.lineTo(-r.w / 2 - 8, -r.h);
    ctx.lineTo(-r.w / 2 + 4, -r.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r.w / 2, r.h / 2);
    ctx.lineTo(-r.w / 2 - 8, r.h);
    ctx.lineTo(-r.w / 2 + 4, r.h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#88ddff';
    ctx.beginPath();
    ctx.arc(r.w * 0.05, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.moveTo(-r.w / 2, -4);
    ctx.lineTo(-r.w / 2 - rand(6, 14), 0);
    ctx.lineTo(-r.w / 2, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

function drawParticles(ctx, particles, camY) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y - camY, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFloatTexts(ctx, floatTexts, camY) {
  for (const f of floatTexts) {
    ctx.save();
    ctx.globalAlpha = f.life;
    ctx.fillStyle = f.color;
    ctx.font = "bold 16px 'Fredoka One', cursive";
    ctx.textAlign = 'center';
    ctx.fillText(f.txt, f.x, f.y - camY);
    ctx.restore();
  }
}

function render(ctx, W, H, cameraY, maxHeight, frameCount, gameState) {
  const { platforms, coins, powerupItems, rockets, particles, floatTexts, players, cloudData, activePowerups } = gameState;
  
  ctx.clearRect(0, 0, W, H);
  ctx.save();

  drawBackground(ctx, W, H, cameraY, maxHeight, frameCount, cloudData);

  ctx.save();
  for (const p of platforms) {
    const dy = p.y - cameraY;
    if (dy < -20 || dy > H + 20) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, dy + p.h + 4, p.w * 0.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const p of platforms) drawPlatform(ctx, p, cameraY, CONFIG.PLAT_COLORS, H);
  for (const c of coins) drawCoin(ctx, c, cameraY, H);
  for (const p of powerupItems) drawPowerupItem(ctx, p, cameraY, getPowerupColor, getPowerupEmoji, H);


  drawRockets(ctx, rockets, cameraY, W, H, frameCount);

  ctx.save();
  ctx.translate(0, -cameraY);
  drawParticles(ctx, particles, 0);
  for (const pl of players) drawPlayer(ctx, pl, frameCount, activePowerups);
  ctx.restore();

  drawFloatTexts(ctx, floatTexts, cameraY);

  for (const r of rockets) {
    if (r.exploding) continue;
    const dy = r.y - cameraY;
    if (dy < 20) {
      ctx.save();
      ctx.fillStyle = '#ff4400';
      ctx.globalAlpha = 0.8 + Math.sin(frameCount * 0.3) * 0.2;
      const ax = Math.min(Math.max(r.x, 20), W - 20);
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚀', ax, 24);
      ctx.restore();
    }
    if (dy > H - 20) {
      ctx.save();
      ctx.fillStyle = '#ff4400';
      ctx.globalAlpha = 0.8 + Math.sin(frameCount * 0.3) * 0.2;
      const ax = Math.min(Math.max(r.x, 20), W - 20);
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚀', ax, H - 10);
      ctx.restore();
    }
  }

  for (const pl of players) {
    if (!pl.dead) continue;
    ctx.save();
    ctx.fillStyle = pl.color;
    ctx.globalAlpha = 0.7;
    ctx.font = "bold 14px 'Fredoka One', cursive";
    ctx.textAlign = 'center';
    ctx.fillText(`P${pl.id} 💀`, pl.id === 1 ? W * 0.25 : W * 0.75, H - 30);
    ctx.restore();
  }

  if (maxHeight > 0 && maxHeight % 500 < 3) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.font = "bold 26px 'Fredoka One', cursive";
    ctx.textAlign = 'center';
    ctx.fillText('🌟 ' + maxHeight + 'm!', W / 2, H / 3);
    ctx.restore();
  }

  ctx.restore();
}

function getPowerupColor(type) {
  return { feather: '#7df0ff', speed: '#ff7d3a', shield: '#80ff80', slowtime: '#d0a0ff', magnet: '#ffaa00' }[type] || '#fff';
}

function getPowerupEmoji(type) {
  return { feather: '🪶', speed: '⚡', shield: '🛡️', slowtime: '⏱', magnet: '🧲' }[type] || '✨';
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render, drawBackground, drawClouds, drawPlatform, drawCoin, drawPowerupItem, drawPlayer, drawRockets, drawParticles, drawFloatTexts, getPowerupColor, getPowerupEmoji };
}
