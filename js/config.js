// Game Configuration and Constants

const CONFIG = {
  // Canvas dimensions
  WIDTH: 480,
  HEIGHT: 640,
  
  // Physics constants
  PHYS: {
    GRAVITY: 0.32,
    MAX_FALL: 11,
    MOVE_SPEED: 52,
    JUMP: -11.5,
    CHARGE_MAX: -17,
    CHARGE_FRAMES: 45,
    COYOTE: 8,
    JUMP_BUFFER: 10,
    WALL_JUMP_X: 3.5,
    WALL_JUMP_Y: -10.5,
    WALL_SLIDE: 1.2,
    FRICTION: 0.58,
    AIR_FRICTION: 0.65
  },
  
  // Platform types
  PLAT_TYPES: {
    NORMAL: 0,
    MOVING: 1,
    BREAKING: 2,
    BOUNCY: 3,
    ONESHOT: 4
  },
  
  // Platform colors
  PLAT_COLORS: {
    0: { top: '#4dcc6b', body: '#2d9e48' },
    1: { top: '#f5c542', body: '#c99a1a' },
    2: { top: '#e06060', body: '#a03030' },
    3: { top: '#55bbff', body: '#2277cc' },
    4: { top: '#bb77ff', body: '#7733bb' }
  },
  
  // Powerup types
  POWERUP_TYPES: ['feather', 'speed', 'shield', 'slowtime', 'magnet'],
  
  // Powerup durations (ms)
  POWERUP_DURATIONS: {
    feather: 25000,
    speed: 12000,
    shield: 30000,
    slowtime: 8000,
    magnet: 20000
  },
  
  // Powerup colors
  POWERUP_COLORS: {
    feather: '#7df0ff',
    speed: '#ff7d3a',
    shield: '#80ff80',
    slowtime: '#d0a0ff',
    magnet: '#ffaa00'
  },
  
  // Powerup emojis
  POWERUP_EMOJIS: {
    feather: '🪶',
    speed: '⚡',
    shield: '🛡️',
    slowtime: '⏱',
    magnet: '🧲'
  },
  
  // ICE servers for WebRTC
  ICE_SERVERS: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' }
    ]
  },
  
  // Signaling servers
  SIGNAL_SERVERS: [
    'wss://socketsbay.com/wss/v2/1/{room}/',
    'wss://ws.ifelse.io',
    'wss://echo.websocket.org/'
  ]
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
