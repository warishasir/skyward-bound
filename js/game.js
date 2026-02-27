// Game Engine Module

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 480, H = 640;

// Game state
let players = [];
let p1, p2;
let platforms = [];
let coins = [];
let powerupItems = [];
let particles = [];
let floatTexts = [];
let rockets = [];
let activePowerups = {};
let highestPlatformY = 0;

let score = 0;
let highScore = parseInt(localStorage.getItem('skyward_best') || '0');
let maxHeight = 0;
let cameraY = 0;
let gameSpeed = 1;
let gameRunning = false;
let combo = 0;
let frameCount = 0;
let lastTime = 0;
let shakeIntensity = 0, shakeDuration = 0;

const cloudData = Array.from({ length: 8 }, (_, i) => ({
  x: rand(0, W),
  y: rand(50, H - 50),
  w: rand(60, 130),
  speed: rand(0.1, 0.3) * (Math.random() < 0.5 ? 1 : -1)
}));

let rocketSpawnTimer = 0;

// Input state
const keys = {};
const justPressed = {};
const justReleased = {};
let touchLeft = false, touchRight = false, touchJump = false, touchJustJump = false;

// Setup input listeners
function setupInput() {
  document.addEventListener('keydown', e => {
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      initAudio();
    }
  });
  
  document.addEventListener('keyup', e => {
    keys[e.code] = false;
    justReleased[e.code] = true;
  });

  // Touch controls
  const touchLeftBtn = document.getElementById('touchLeft');
  const touchRightBtn = document.getElementById('touchRight');
  const touchJumpBtn = document.getElementById('touchJump');

  if (touchLeftBtn) {
    touchLeftBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchLeft = true;
    });
    touchLeftBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      touchLeft = false;
    });
  }

  if (touchRightBtn) {
    touchRightBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchRight = true;
    });
    touchRightBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      touchRight = false;
    });
  }

  if (touchJumpBtn) {
    touchJumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchJump = true;
      touchJustJump = true;
    });
    touchJumpBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      touchJump = false;
    });
  }

  // Canvas touch for jump
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      const x = (t.clientX - rect.left) * (W / rect.width);
      const y = (t.clientY - rect.top) * (H / rect.height);
      if (y > H * 0.5) {
        if (x < W / 3) touchLeft = true;
        else if (x < W * 2 / 3) touchRight = true;
        else {
          touchJump = true;
          touchJustJump = true;
        }
      } else {
        touchJump = true;
        touchJustJump = true;
      }
    }
    initAudio();
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    touchLeft = false;
    touchRight = false;
    touchJump = false;
  });
}

function makePlayer(x, y, color, bodyColor, id) {
  return {
    id, x, y, vx: 0, vy: 0, w: 26, h: 34,
    onGround: false, onWall: null,
    coyoteTimer: 0, jumpBufferTimer: 0,
    chargeTimer: 0, isCharging: false,
    dead: false, invincible: 0,
    squash: 1, facing: 1, trail: [],
    wallJumpLock: 0, _usedDouble: false,
    color, bodyColor,
    maxHeight: 0, coinsCollected: 0
  };
}

function createPlatform(x, y, w, type = 0) {
  const p = {
    x, y, w, h: 14, type,
    moveDir: 1, moveRange: 80, moveSpeed: rand(0.8, 2), moveOriginX: x,
    breakTimer: -1, broken: false, bobPhase: rand(0, Math.PI * 2),
    used: false
  };
  if (type === 1) {
    p.moveRange = rand(50, 130);
    p.moveSpeed = rand(0.8, 2.2);
  }
  return p;
}

function generatePlatforms(upToY) {
  while (highestPlatformY > upToY - 1200) {
    const difficulty = Math.min(10, Math.max(0, -highestPlatformY / 400));
    const minGap = 80 + difficulty * 12;
    const maxGap = 140 + difficulty * 18;
    const y = highestPlatformY - rand(minGap, maxGap);
    const w = Math.max(40, rand(90 - difficulty * 4, 115 - difficulty * 5));
    const x = rand(20, W - w - 20);

    let type = 0;
    const r = Math.random() * 100;
    const movW = difficulty * 4;
    const brW = difficulty * 3;
    const bnW = 8;
    const osW = 6;
    if (r < movW) type = 1;
    else if (r < movW + brW) type = 2;
    else if (r < movW + brW + bnW) type = 3;
    else if (r < movW + brW + bnW + osW) type = 4;

    platforms.push(createPlatform(x, y, w, type));

    if (Math.random() < 0.3) {
      const coinType = Math.random() < 0.05 ? 'gem' : Math.random() < 0.15 ? 'gold' : 'normal';
      spawnCoin(x + w / 2 + rand(-25, 25), y - 25, coinType);
    }
    if (Math.random() < 0.04) spawnPowerup(x + w / 2, y - 35);

    highestPlatformY = y;
  }
}

function initGame() {
  platforms.length = 0;
  coins.length = 0;
  powerupItems.length = 0;
  particles.length = 0;
  floatTexts.length = 0;
  rockets.length = 0;
  Object.keys(activePowerups).forEach(k => delete activePowerups[k]);

  p1 = makePlayer(W / 2 - 30, 380, '#7df0ff', '#4d88ff', 1);
  p2 = makePlayer(W / 2 + 30, 380, '#ff7070', '#cc3333', 2);
  players = [p1, p2];

  score = 0;
  maxHeight = 0;
  combo = 0;
  cameraY = 0;
  gameSpeed = 1;
  frameCount = 0;
  rocketSpawnTimer = 200;

  platforms.push(createPlatform(W / 2 - 70, 400, 140, 0));
  platforms.push(createPlatform(W / 2 - 40, 300, 80, 0));
  platforms.push(createPlatform(50, 200, 80, 0));
  platforms.push(createPlatform(W - 150, 150, 80, 0));
  highestPlatformY = 150;

  generatePlatforms(cameraY);
  gameRunning = true;
}

function spawnCoin(x, y, type = 'normal') {
  coins.push({ x, y, type, collected: false, bob: rand(0, Math.PI * 2) });
}

function spawnPowerup(x, y) {
  const types = ['feather', 'speed', 'shield', 'slowtime', 'magnet'];
  const type = types[Math.floor(Math.random() * types.length)];
  powerupItems.push({ x, y, type, collected: false, bob: rand(0, Math.PI * 2) });
}

function spawnParticles(x, y, color, count = 8, opts = {}) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(opts.minSpeed || 1, opts.maxSpeed || 5);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + (opts.upBias || 0),
      life: 1, decay: rand(0.03, 0.07),
      size: rand(opts.minSize || 2, opts.maxSize || 5),
      color, gravity: opts.gravity !== undefined ? opts.gravity : 0.15
    });
  }
}

function spawnFloatText(txt, x, y, color = '#ffd700') {
  floatTexts.push({ txt, x, y, life: 1, vy: -1.5, color });
}

function screenShake(intensity, duration) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeDuration = Math.max(shakeDuration, duration);
}

function spawnRocket(camY, leadHeight) {
  if (leadHeight < 500) return;
  const fromLeft = Math.random() < 0.5;
  const targetY = camY + rand(H * 0.1, H * 0.85);
  const speed = 3.5 + Math.min(leadHeight / 800, 5);
  rockets.push({
    x: fromLeft ? -20 : W + 20,
    y: targetY,
    vx: fromLeft ? speed : -speed,
    vy: rand(-0.5, 0.5),
    w: 36, h: 14,
    fromLeft,
    trail: [],
    exploding: false, explodeTimer: 0
  });
}

function activatePowerup(type) {
  const durations = { feather: 25000, speed: 12000, shield: 30000, slowtime: 8000, magnet: 20000 };
  activePowerups[type] = { expiry: Date.now() + durations[type] };
  if (type === 'slowtime') gameSpeed = 0.4;
}

function getPowerupColor(type) {
  return { feather: '#7df0ff', speed: '#ff7d3a', shield: '#80ff80', slowtime: '#d0a0ff', magnet: '#ffaa00' }[type] || '#fff';
}

function getPowerupEmoji(type) {
  return { feather: '🪶', speed: '⚡', shield: '🛡️', slowtime: '⏱', magnet: '🧲' }[type] || '✨';
}

function updatePowerupHUD() {
  const hud = document.getElementById('powerupHud');
  hud.innerHTML = '';
  const now = Date.now();
  for (const [k, v] of Object.entries(activePowerups)) {
    const secs = Math.ceil((v.expiry - now) / 1000);
    const el = document.createElement('div');
    el.className = 'powerup-pill';
    el.style.borderColor = getPowerupColor(k);
    el.innerHTML = `${getPowerupEmoji(k)} ${secs}s`;
    hud.appendChild(el);
  }
}

function updatePlatforms() {
  for (const p of platforms) {
    if (p.type === 1) {
      p.x += p.moveDir * p.moveSpeed;
      if (Math.abs(p.x - p.moveOriginX) > p.moveRange) p.moveDir *= -1;
    }
    if (p.breakTimer > 0) {
      p.breakTimer--;
      if (p.breakTimer <= 0) p.broken = true;
    }
  }
  for (let i = platforms.length - 1; i >= 0; i--) {
    const refY = players && players.length ? Math.min(...players.map(pl => pl.y)) : 0;
    if (platforms[i].broken || platforms[i].y > refY + 700) platforms.splice(i, 1);
  }
}

function updateCoins(leadPlayer) {
  for (const c of coins) {
    if (c.collected) continue;
    c.bob += 0.08;
    for (const pl of players) {
      if (pl.dead) continue;
      const dx = pl.x - c.x, dy = pl.y - c.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        c.collected = true;
        const pts = c.type === 'gold' ? 50 : c.type === 'gem' ? 100 : 10;
        score += pts;
        pl.coinsCollected++;
        spawnParticles(c.x, c.y, c.type === 'gem' ? '#a78fff' : c.type === 'gold' ? '#ffd700' : '#ffe066', 6, { upBias: -2, gravity: 0.1 });
        spawnFloatText(c.type === 'gem' ? '+100💎' : c.type === 'gold' ? '+50⭐' : '+10', c.x, c.y - cameraY);
        playSound('coin');
        break;
      }
    }
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    if (coins[i].collected || coins[i].y > leadPlayer.y + 700) coins.splice(i, 1);
  }
}

function updatePowerups(leadPlayer) {
  for (const p of powerupItems) {
    if (p.collected) continue;
    p.bob += 0.06;
    for (const pl of players) {
      if (pl.dead) continue;
      const dx = pl.x - p.x, dy = pl.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < 22) {
        p.collected = true;
        activatePowerup(p.type);
        spawnParticles(p.x, p.y, getPowerupColor(p.type), 12, { upBias: -2, minSpeed: 2, maxSpeed: 6 });
        playSound('powerup');
        break;
      }
    }
  }
  for (let i = powerupItems.length - 1; i >= 0; i--) {
    if (powerupItems[i].collected || powerupItems[i].y > leadPlayer.y + 700) powerupItems.splice(i, 1);
  }
  const now = Date.now();
  for (const k of Object.keys(activePowerups)) {
    if (now > activePowerups[k].expiry) delete activePowerups[k];
  }
  updatePowerupHUD();
}

function updateRockets(camY, leadHeight) {
  rocketSpawnTimer--;
  const spawnRate = Math.max(60, 220 - Math.floor(leadHeight / 30));
  if (rocketSpawnTimer <= 0) {
    spawnRocket(camY, leadHeight);
    rocketSpawnTimer = spawnRate + Math.floor(rand(0, 60));
  }

  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    if (r.exploding) {
      r.explodeTimer--;
      if (r.explodeTimer <= 0) rockets.splice(i, 1);
      continue;
    }
    r.x += r.vx;
    r.y += r.vy;
    r.trail.push({ x: r.x, y: r.y, life: 1 });
    if (r.trail.length > 12) r.trail.shift();
    for (const t of r.trail) t.life -= 0.1;

    for (const pl of players) {
      if (pl.dead) continue;
      const pl_l = pl.x - pl.w / 2, pl_r = pl.x + pl.w / 2;
      const pl_t = pl.y - pl.h, pl_b = pl.y;
      const r_l = r.x - r.w / 2, r_r = r.x + r.w / 2;
      const r_t = r.y - r.h / 2, r_b = r.y + r.h / 2;
      if (pl_r > r_l && pl_l < r_r && pl_b > r_t && pl_t < r_b) {
        r.exploding = true;
        r.explodeTimer = 20;
        spawnParticles(r.x, r.y, '#ff6600', 16, { upBias: -2, minSpeed: 2, maxSpeed: 7, gravity: 0.2 });
        spawnParticles(r.x, r.y, '#ffcc00', 10, { upBias: -1, minSpeed: 1, maxSpeed: 4, gravity: 0.15 });
        killPlayer(pl);
        break;
      }
    }

    if (r.x < -60 || r.x > W + 60 || r.y < camY - 100 || r.y > camY + H + 100) {
      rockets.splice(i, 1);
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateFloatTexts() {
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const f = floatTexts[i];
    f.y += f.vy;
    f.life -= 0.025;
    if (f.life <= 0) floatTexts.splice(i, 1);
  }
}

function collidePlayerPlatforms(player) {
  const pl = player.x - player.w / 2;
  const pr = player.x + player.w / 2;
  const pt = player.y - player.h;
  const pb = player.y;

  player.onGround = false;
  player.onWall = null;

  for (const p of platforms) {
    if (p.broken) continue;
    const rl = p.x, rr = p.x + p.w;
    const rt = p.y, rb = p.y + p.h;

    if (pr <= rl || pl >= rr || pb <= rt || pt >= rb) continue;

    const overlapLeft = pr - rl;
    const overlapRight = rr - pl;
    const overlapTop = pb - rt;
    const overlapBottom = rb - pt;

    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapTop && player.vy >= 0) {
      player.y = rt;
      const wasMovingFast = player.vy > 6;
      player.vy = 0;
      player.onGround = true;
      if (p.type === 2 && p.breakTimer < 0) {
        p.breakTimer = 30;
        spawnParticles(p.x + p.w / 2, p.y, '#e06060', 4, { minSpeed: 1, maxSpeed: 3 });
      }
      if (p.type === 3) {
        player.vy = -11.5 * 1.6;
        spawnParticles(p.x + p.w / 2, p.y, '#55bbff', 10, { upBias: -3, gravity: 0.1 });
        playSound('bounce');
      }
      if (p.type === 4 && !p.used) {
        p.used = true;
        p.breakTimer = 1;
      }
      if (wasMovingFast) {
        spawnParticles(player.x, player.y, '#fff', 5, { minSpeed: 1, maxSpeed: 3, gravity: 0.1 });
        playSound('land');
        player.squash = 0.6;
      }
    } else if (minOverlap === overlapBottom && player.vy < 0) {
      player.y = rb + player.h;
      player.vy = 0;
    } else if (minOverlap === overlapLeft && player.vx > 0) {
      player.x = rl - player.w / 2;
      player.vx = 0;
      player.onWall = 1;
    } else if (minOverlap === overlapRight && player.vx < 0) {
      player.x = rr + player.w / 2;
      player.vx = 0;
      player.onWall = -1;
    }
  }
}

function updateOnePlayer(pl, input, gs) {
  if (pl.dead) return;

  const { moveLeft, moveRight, jumpHeld, jumpJust } = input;
  const targetDir = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
  if (Math.abs(targetDir) > 0) pl.facing = targetDir > 0 ? 1 : -1;

  let hSpeed = 52;
  if (activePowerups.speed) hSpeed *= 1.6;

  if (pl.wallJumpLock > 0) {
    pl.wallJumpLock--;
    pl.vx += targetDir * hSpeed * 0.04;
  } else {
    const accel = pl.onGround ? 0.08 : 0.05;
    pl.vx += (targetDir * hSpeed - pl.vx) * accel;
  }
  pl.vx *= pl.onGround ? 0.58 : 0.65;

  if (jumpJust) pl.jumpBufferTimer = 10;

  if (jumpHeld && pl.onGround) {
    pl.isCharging = true;
    pl.chargeTimer = Math.min(pl.chargeTimer + 1, 45);
    pl.squash = lerp(pl.squash, 0.75, 0.1);
  } else {
    if (pl.isCharging && !jumpHeld) {
      const chargeRatio = pl.chargeTimer / 45;
      const force = -11.5 + (-17 - -11.5) * chargeRatio;
      if (pl.onGround || pl.coyoteTimer > 0) {
        pl.vy = force;
        pl.onGround = false;
        pl.coyoteTimer = 0;
        pl.jumpBufferTimer = 0;
        pl.squash = 1.4;
        spawnParticles(pl.x, pl.y, pl.bodyColor, 8, { upBias: -2, gravity: 0.12 });
        playSound('jump');
      }
      pl.chargeTimer = 0;
    }
    pl.isCharging = false;
    if (pl.chargeTimer > 0 && !jumpHeld) pl.chargeTimer = 0;
  }

  if (pl.jumpBufferTimer > 0 && !pl.isCharging) {
    if (pl.onGround || pl.coyoteTimer > 0) {
      pl.vy = -11.5;
      pl.onGround = false;
      pl.coyoteTimer = 0;
      pl.jumpBufferTimer = 0;
      pl.squash = 1.35;
      spawnParticles(pl.x, pl.y, '#fff', 5, { upBias: -1.5, gravity: 0.12 });
      playSound('jump');
    } else if (pl.onWall) {
      pl.vx = -pl.onWall * 3.5;
      pl.vy = -10.5;
      pl.wallJumpLock = 18;
      pl.jumpBufferTimer = 0;
      pl.squash = 1.3;
      spawnParticles(pl.x, pl.y, '#ffe066', 6, { upBias: -2, gravity: 0.1 });
      playSound('walljump');
    }
  }

  if (jumpJust && !pl.onGround && !pl.onWall && activePowerups.feather && !pl._usedDouble) {
    pl.vy = -11.5 * 0.9;
    pl._usedDouble = true;
    spawnParticles(pl.x, pl.y, '#7df0ff', 8, { upBias: -2, gravity: 0.08 });
    playSound('jump');
  }
  if (pl.onGround) pl._usedDouble = false;

  if (pl.onWall && pl.vy > 0) pl.vy = Math.min(pl.vy, 1.2);

  if (!pl.isCharging) {
    pl.vy += 0.32 * gs;
    pl.vy = Math.min(pl.vy, 11);
  }

  pl.x += pl.vx * gs;
  pl.y += pl.vy * gs;

  if (pl.x > W + 20) pl.x = -20;
  if (pl.x < -20) pl.x = W + 20;

  const wasOnGround = pl.onGround;
  collidePlayerPlatforms(pl);
  if (wasOnGround && !pl.onGround) pl.coyoteTimer = 8;
  if (pl.coyoteTimer > 0) pl.coyoteTimer--;
  if (pl.jumpBufferTimer > 0) pl.jumpBufferTimer--;

  pl.squash = lerp(pl.squash, 1, 0.15);

  const h = Math.max(0, Math.floor(-pl.y + 400));
  if (h > pl.maxHeight) pl.maxHeight = h;

  if (pl.y > cameraY + H + 150) killPlayer(pl);
}

function killPlayer(pl) {
  if (pl.dead) return;
  pl.dead = true;
  spawnParticles(pl.x, pl.y, pl.bodyColor, 16, { upBias: -4, minSpeed: 2, maxSpeed: 7, gravity: 0.3 });
  playSound('die');
  if (pl.maxHeight > highScore) {
    highScore = pl.maxHeight;
    localStorage.setItem('skyward_best', highScore);
  }

  if (typeof sendNetDie === 'function') {
    const myPlayer = (typeof myNetRole !== 'undefined' && myNetRole === 'p1') ? p1 : p2;
    if (pl === myPlayer) sendNetDie();
  }

  if (gameRunning) {
    gameRunning = false;
    setTimeout(() => showOverlay(true), 800);
  }
}

function update(dt) {
  if (!gameRunning) return;

  if (activePowerups.slowtime) gameSpeed = lerp(gameSpeed, 0.4, 0.05);
  else gameSpeed = lerp(gameSpeed, 1, 0.08);
  const gs = gameSpeed;
  frameCount++;

  const p1input = {
    moveLeft: keys['ArrowLeft'] || touchLeft,
    moveRight: keys['ArrowRight'] || touchRight,
    jumpHeld: keys['Space'] || keys['ArrowUp'] || touchJump,
    jumpJust: justPressed['Space'] || justPressed['ArrowUp'] || touchJustJump
  };

  const p2input = (typeof isOnline !== 'undefined' && isOnline) ?
    { moveLeft: false, moveRight: false, jumpHeld: false, jumpJust: false } : {
      moveLeft: keys['KeyA'],
      moveRight: keys['KeyD'],
      jumpHeld: keys['KeyW'],
      jumpJust: justPressed['KeyW']
    };

  if (typeof isOnline !== 'undefined' && isOnline && typeof myNetRole !== 'undefined' && myNetRole === 'p2') {
    p2input.moveLeft = keys['ArrowLeft'] || touchLeft;
    p2input.moveRight = keys['ArrowRight'] || touchRight;
    p2input.jumpHeld = keys['Space'] || keys['ArrowUp'] || touchJump;
    p2input.jumpJust = justPressed['Space'] || justPressed['ArrowUp'] || touchJustJump;
    p1input.moveLeft = false;
    p1input.moveRight = false;
    p1input.jumpHeld = false;
    p1input.jumpJust = false;
  }

  if (!p1.dead) updateOnePlayer(p1, p1input, gs);
  if (!p2.dead) updateOnePlayer(p2, p2input, gs);

  if (typeof isOnline !== 'undefined' && isOnline) {
    if (typeof netSendTimer !== 'undefined') {
      netSendTimer++;
      if (netSendTimer >= 2) {
        netSendTimer = 0;
        if (typeof sendNetState === 'function') {
          const me = (typeof myNetRole !== 'undefined' && myNetRole === 'p1') ? p1 : p2;
          sendNetState(me);
        }
      }
    }
  }

  const livePlayers = players.filter(p => !p.dead);
  let leadPlayer = livePlayers.length > 0
    ? livePlayers.reduce((a, b) => a.y < b.y ? a : b)
    : players.reduce((a, b) => a.maxHeight > b.maxHeight ? a : b);

  const targetCamY = leadPlayer.y - H * 0.55;
  cameraY = Math.min(cameraY, targetCamY);

  maxHeight = Math.max(p1.maxHeight, p2.maxHeight);
  score = maxHeight;

  document.getElementById('heightVal').textContent = p1.maxHeight + 'm';
  document.getElementById('height2Val').textContent = p2.maxHeight + 'm';
  document.getElementById('bestVal').textContent = Math.max(highScore, maxHeight) + 'm';

  generatePlatforms(cameraY);
  updatePlatforms();
  updateCoins(leadPlayer);
  updatePowerups(leadPlayer);
  updateRockets(cameraY, maxHeight);
  updateParticles();
  updateFloatTexts();

  const bar = document.getElementById('chargeBar');
  const fill = document.getElementById('chargeBarFill');
  const chargingPlayer = players.find(pl => pl && pl.isCharging && pl.chargeTimer > 0);
  if (chargingPlayer) {
    bar.style.opacity = '1';
    const pct = Math.min(chargingPlayer.chargeTimer / 45 * 100, 100);
    fill.style.width = pct + '%';
    fill.style.background = `linear-gradient(90deg, ${chargingPlayer.bodyColor}, #ff7d3a)`;
  } else {
    bar.style.opacity = '0';
  }

  const comboEl = document.getElementById('comboDisplay');
  if (combo > 1) {
    comboEl.style.opacity = '1';
    comboEl.textContent = `×${combo} COMBO!`;
  } else {
    comboEl.style.opacity = '0';
  }

  Object.keys(justPressed).forEach(k => delete justPressed[k]);
  Object.keys(justReleased).forEach(k => delete justReleased[k]);
  if (touchJustJump) touchJustJump = false;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setupInput,
    initGame,
    update,
    get p1() { return p1; },
    get p2() { return p2; },
    get players() { return players; },
    get cameraY() { return cameraY; },
    get maxHeight() { return maxHeight; },
    get highScore() { return highScore; },
    get gameRunning() { return gameRunning; },
    set gameRunning(val) { gameRunning = val; },
    get isOnline() { return isOnline; },
    set isOnline(val) { isOnline = val; },
    get activePowerups() { return activePowerups; },
    killPlayer,
    spawnParticles,
    screenShake
  };
}

// Global exports for browser
window.setupInput = setupInput;
window.initGame = initGame;
window.update = update;
window.killPlayer = killPlayer;
window.spawnParticles = spawnParticles;
window.screenShake = screenShake;
