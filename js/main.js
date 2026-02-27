// Main Entry Point - Ties everything together

let lastTime = 0;

// UI Functions
function showOverlay(died = false) {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  if (died) {
    let winnerText = '🤝 DRAW!';
    if (p1.dead && !p2.dead) winnerText = '🔴 P2 WINS!';
    else if (p2.dead && !p1.dead) winnerText = '🔵 P1 WINS!';
    else if (p1.maxHeight > p2.maxHeight) winnerText = '🔵 P1 WINS!';
    else if (p2.maxHeight > p1.maxHeight) winnerText = '🔴 P2 WINS!';
    document.querySelector('.overlay-title').textContent = 'GAME OVER';
    document.getElementById('statRow').style.display = 'flex';
    document.getElementById('endWinner').textContent = winnerText;
    document.getElementById('endHeight').textContent = p1.maxHeight + 'm';
    document.getElementById('endHeight2').textContent = p2.maxHeight + 'm';
    const nb = document.getElementById('newBest');
    nb.style.display = maxHeight >= highScore ? 'block' : 'none';
    document.getElementById('playBtn').textContent = isOnline ? 'PLAY AGAIN (LOCAL)' : 'PLAY AGAIN';
    isOnline = false;
  } else {
    document.querySelector('.overlay-title').textContent = 'SKYWARD';
    document.getElementById('statRow').style.display = 'none';
    document.getElementById('newBest').style.display = 'none';
    document.getElementById('playBtn').textContent = 'PLAY LOCAL';
    highScore = parseInt(localStorage.getItem('skyward_best') || '0');
    document.getElementById('bestVal').textContent = highScore + 'm';
    document.getElementById('networkIndicator').style.display = 'none';
  }
}

function setHostStatus(msg, cls) {
  const el = document.getElementById('hostStatus');
  el.textContent = msg;
  el.className = 'lobby-status' + (cls ? ' status-' + cls : '');
}

function setJoinStatus(msg, cls) {
  const el = document.getElementById('joinStatus');
  el.textContent = msg;
  el.className = 'lobby-status' + (cls ? ' status-' + cls : '');
}

function copyCode() {
  const code = document.getElementById('myCode').textContent;
  navigator.clipboard.writeText(code).catch(() => { }).then(() => {
    const btn = document.querySelector('.copy-btn');
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 1500); }
  });
}

function openLobby() {
  document.getElementById('onlineLobby').classList.remove('hidden');
  document.getElementById('overlay').classList.add('hidden');
  setHostStatus('Click to generate your room code', '');
  setJoinStatus('', '');
  document.getElementById('codeWrap').style.display = 'none';
  document.getElementById('hostBtn').disabled = false;
  document.getElementById('joinBtn').disabled = false;
  cleanupNetwork();
}

function closeLobby() {
  document.getElementById('onlineLobby').classList.add('hidden');
}

function startOnlineGame(seed, hosting) {
  console.log('Starting online game, hosting:', hosting, 'seed:', seed);
  isHost = hosting;
  myNetRole = hosting ? 'p1' : 'p2';

  let rngState = seed;
  const seededRand = (a, b) => {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff;
    return a + ((rngState >>> 0) / 0xffffffff) * (b - a);
  };
  const origRand = rand;
  window.rand = seededRand;

  isOnline = true;
  closeLobby();
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('networkIndicator').style.display = 'block';
  document.getElementById('networkIndicator').textContent =
    (hosting ? '🔵 YOU = P1' : '🔴 YOU = P2') + '  🌐 Online';

  initAudio();
  initGame();
  window.rand = origRand;

  document.getElementById('controls-hint').textContent =
    '← → move  •  SPACE / ↑ jump  •  hold to charge';
  netSendTimer = 0;
}

function handleNetMsg(msg) {
  if (msg.type === 'start' && !isHost) {
    console.log('Joiner received start signal with seed:', msg.seed);
    startOnlineGame(msg.seed, false);
    return;
  }
  if (msg.type === 'state') {
    const remote = isHost ? p2 : p1;
    if (!remote || remote.dead) return;
    remote.x = lerp(remote.x, msg.x, 0.3);
    remote.y = lerp(remote.y, msg.y, 0.3);
    remote.vx = msg.vx;
    remote.vy = msg.vy;
    remote.facing = msg.f;
    remote.onGround = msg.g;
    remote.squash = msg.s || 1;
    remote.maxHeight = msg.mh;
  }
  if (msg.type === 'die') {
    const remote = isHost ? p2 : p1;
    if (remote && !remote.dead) {
      console.log('Remote player died');
      killPlayer(remote);
    }
  }
}

// Setup event listeners - wrap in DOMContentLoaded to ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
  setupEventListeners();
}

function setupEventListeners() {
  const playBtn = document.getElementById('playBtn');
  const onlineBtn = document.getElementById('onlineBtn');
  
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      console.log('Play Local clicked');
      isOnline = false;
      initAudio();
      initGame();
      document.getElementById('overlay').classList.add('hidden');
      document.getElementById('controls-hint').textContent = 'P1: ← → + SPACE  |  P2: A D + W';
    });
  }
  
  if (onlineBtn) {
    onlineBtn.addEventListener('click', () => {
      console.log('Play Online clicked');
      openLobby();
    });
  }
}


// Network callbacks
setNetCallbacks({
  onConnect: (hosting, role) => {
    if (hosting) {
      setHostStatus('🎮 Connected! Starting game...', 'ok');
      const seed = Math.floor(Math.random() * 999999);
      netSend({ type: 'start', seed });
      startOnlineGame(seed, true);
    } else {
      setJoinStatus('🎮 Connected! Waiting for start...', 'ok');
    }
  },
  onMessage: handleNetMsg,
  onDisconnect: () => {
    if (gameRunning) {
      gameRunning = false;
      document.getElementById('networkIndicator').style.display = 'none';
      showOverlay(false);
      setTimeout(() => alert('Opponent disconnected or connection failed.'), 100);
    }
  },
  onError: (err) => {
    console.error('Network error:', err);
  }
});

// Main game loop
function loop(ts) {
  const dt = Math.min((ts - lastTime) / 16.67, 3);
  lastTime = ts;
  update(dt);
  
  // Render
  const gameState = {
    platforms, coins, powerupItems, rockets, particles, floatTexts, players,
    cloudData, activePowerups
  };
  render(ctx, W, H, cameraY, maxHeight, frameCount, gameState);
  
  requestAnimationFrame(loop);
}

// Initialize
setupInput();
showOverlay(false);
requestAnimationFrame(loop);

// Global exports for HTML onclick handlers
window.setHostStatus = setHostStatus;
window.setJoinStatus = setJoinStatus;
window.copyCode = copyCode;
window.openLobby = openLobby;
window.closeLobby = closeLobby;
window.startOnlineGame = startOnlineGame;
