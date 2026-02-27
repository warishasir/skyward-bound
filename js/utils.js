// Utility Functions

function rand(a, b) { 
  return a + Math.random() * (b - a); 
}

function clamp(v, a, b) { 
  return Math.max(a, Math.min(b, v)); 
}

function lerp(a, b, t) { 
  return a + (b - a) * t; 
}

function lerpColor(a, b, t) {
  const ah = a.replace('#', ''), bh = b.replace('#', '');
  const ar = parseInt(ah.substr(0, 2), 16), ag = parseInt(ah.substr(2, 2), 16), ab = parseInt(ah.substr(4, 2), 16);
  const br = parseInt(bh.substr(0, 2), 16), bg = parseInt(bh.substr(2, 2), 16), bb = parseInt(bh.substr(4, 2), 16);
  const rr = Math.round(lerp(ar, br, t)), rg = Math.round(lerp(ag, bg, t)), rb = Math.round(lerp(ab, bb, t));
  return `rgb(${rr},${rg},${rb})`;
}

function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

// Seeded random number generator
function createSeededRand(seed) {
  let rngState = seed;
  return function(a, b) {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff;
    return a + ((rngState >>> 0) / 0xffffffff) * (b - a);
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { rand, clamp, lerp, lerpColor, genCode, createSeededRand };
}

// Global exports for browser
window.rand = rand;
window.clamp = clamp;
window.lerp = lerp;
window.lerpColor = lerpColor;
window.genCode = genCode;
window.createSeededRand = createSeededRand;
