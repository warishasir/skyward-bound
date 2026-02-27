// Network Module - WebRTC Multiplayer

let sigWS = null;
let rtcPeer = null;
let rtcChan = null;
let netConnected = false;
let isOnline = false;
let isHost = false;
let myNetRole = null;
let myRoomCode = null;
let pendingCandidates = [];
let netSendTimer = 0;

// Callbacks
let onNetMessage = null;
let onNetConnect = null;
let onNetDisconnect = null;
let onNetError = null;

function setNetCallbacks(callbacks) {
  onNetMessage = callbacks.onMessage || (() => {});
  onNetConnect = callbacks.onConnect || (() => {});
  onNetDisconnect = callbacks.onDisconnect || (() => {});
  onNetError = callbacks.onError || (() => {});
}

function connectSignal(room, onReady, onMsg, onErr) {
  const servers = [
    `wss://socketsbay.com/wss/v2/1/${room}/`,
    `wss://ws.ifelse.io`,
    `wss://echo.websocket.org/`
  ];

  let tried = 0;
  
  function tryNext() {
    if (tried >= servers.length) {
      onErr('No signaling server reachable. Please check your internet connection and try again.');
      return;
    }
    const url = servers[tried++];
    console.log('Trying signaling server:', url);
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('Connected to signaling server:', url);
      sigWS = ws;
      onReady(ws);
    };
    
    ws.onmessage = e => {
      try {
        const d = JSON.parse(e.data);
        if (d.room === room || !d.room) onMsg(d);
      } catch (err) {
        console.log('Signaling message parse error:', err);
      }
    };
    
    ws.onerror = (err) => {
      console.log('WebSocket error with', url, err);
      ws.close();
    };
    
    ws.onclose = (e) => {
      console.log('WebSocket closed:', url, 'code:', e.code, 'reason:', e.reason);
      if (!sigWS || sigWS.readyState !== WebSocket.OPEN) {
        tryNext();
      } else if (isOnline) {
        netDisconnect();
      }
    };
  }
  tryNext();
}

async function hostGame(code, onStatus) {
  myRoomCode = code;
  pendingCandidates = [];

  rtcPeer = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' }
    ]
  });
  
  rtcChan = rtcPeer.createDataChannel('game', { ordered: false, maxRetransmits: 2 });
  setupDataChannel(rtcChan);

  rtcPeer.onicecandidate = e => {
    if (e.candidate && sigWS && sigWS.readyState === WebSocket.OPEN) {
      console.log('Host sending ICE candidate');
      sigWS.send(JSON.stringify({ room: code, type: 'ice', ice: e.candidate }));
    }
  };
  
  rtcPeer.onconnectionstatechange = () => {
    console.log('Host connection state:', rtcPeer.connectionState);
    if (rtcPeer.connectionState === 'connected') {
      onStatus('🎮 Peer connected! Starting game...', 'ok');
    } else if (rtcPeer.connectionState === 'failed' || rtcPeer.connectionState === 'disconnected') {
      if (isOnline) netDisconnect();
    }
  };

  connectSignal(code,
    async (ws) => {
      onStatus('✅ Ready! Share code with friend →', 'ok');
      try {
        const offer = await rtcPeer.createOffer();
        await rtcPeer.setLocalDescription(offer);
        console.log('Host created offer');
      } catch (err) {
        console.error('Error creating offer:', err);
        onStatus('❌ Error creating connection', 'err');
      }
    },
    async (msg) => {
      if (msg.type === 'ready') {
        console.log('Host received ready, sending offer');
        sigWS.send(JSON.stringify({ room: code, type: 'offer', sdp: rtcPeer.localDescription }));
        onStatus('🔵 Friend found! Connecting...', 'wait');
      }
      if (msg.type === 'answer') {
        console.log('Host received answer');
        try {
          await rtcPeer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          for (const candidate of pendingCandidates) {
            await rtcPeer.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidates = [];
        } catch (err) {
          console.error('Error setting remote description:', err);
        }
      }
      if (msg.type === 'ice' && msg.ice) {
        console.log('Host received ICE candidate');
        if (rtcPeer.remoteDescription) {
          try {
            await rtcPeer.addIceCandidate(new RTCIceCandidate(msg.ice));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        } else {
          pendingCandidates.push(msg.ice);
        }
      }
    },
    (err) => {
      onStatus('❌ ' + err, 'err');
      if (rtcPeer) {
        rtcPeer.close();
        rtcPeer = null;
      }
    }
  );
}

async function joinGame(code, onStatus) {
  pendingCandidates = [];

  rtcPeer = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' }
    ]
  });

  rtcPeer.ondatachannel = e => {
    console.log('Joiner received data channel');
    rtcChan = e.channel;
    setupDataChannel(rtcChan);
  };

  rtcPeer.onicecandidate = e => {
    if (e.candidate && sigWS && sigWS.readyState === WebSocket.OPEN) {
      console.log('Joiner sending ICE candidate');
      sigWS.send(JSON.stringify({ room: code, type: 'ice', ice: e.candidate }));
    }
  };
  
  rtcPeer.onconnectionstatechange = () => {
    console.log('Joiner connection state:', rtcPeer.connectionState);
    if (rtcPeer.connectionState === 'failed' || rtcPeer.connectionState === 'disconnected') {
      if (isOnline) netDisconnect();
    }
  };

  connectSignal(code,
    (ws) => {
      onStatus('✅ Relay connected! Waiting for host...', 'ok');
      console.log('Joiner sending ready signal');
      ws.send(JSON.stringify({ room: code, type: 'ready' }));
    },
    async (msg) => {
      if (msg.type === 'offer') {
        console.log('Joiner received offer');
        onStatus('🔴 Host found! Connecting...', 'wait');
        try {
          await rtcPeer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await rtcPeer.createAnswer();
          await rtcPeer.setLocalDescription(answer);
          sigWS.send(JSON.stringify({ room: code, type: 'answer', sdp: rtcPeer.localDescription }));
          console.log('Joiner sent answer');
        } catch (err) {
          console.error('Error handling offer:', err);
          onStatus('❌ Connection error', 'err');
        }
      }
      if (msg.type === 'ice' && msg.ice) {
        console.log('Joiner received ICE candidate');
        if (rtcPeer.remoteDescription) {
          try {
            await rtcPeer.addIceCandidate(new RTCIceCandidate(msg.ice));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        } else {
          pendingCandidates.push(msg.ice);
        }
      }
    },
    (err) => {
      onStatus('❌ ' + err, 'err');
      if (rtcPeer) {
        rtcPeer.close();
        rtcPeer = null;
      }
    }
  );
}

function setupDataChannel(chan) {
  chan.onopen = () => {
    console.log('Data channel opened!');
    netConnected = true;
    isHost = (chan === rtcChan && rtcChan.label === 'game' && !!myRoomCode);
    myNetRole = isHost ? 'p1' : 'p2';
    onNetConnect(isHost, myNetRole);
  };

  chan.onmessage = e => {
    try {
      const msg = JSON.parse(e.data);
      onNetMessage(msg);
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  };

  chan.onclose = () => {
    console.log('Data channel closed');
    if (isOnline) netDisconnect();
  };
  
  chan.onerror = (err) => {
    console.error('Data channel error:', err);
  };
}

function netSend(obj) {
  if (rtcChan && rtcChan.readyState === 'open') {
    try {
      rtcChan.send(JSON.stringify(obj));
    } catch (err) {
      console.error('Error sending:', err);
    }
  }
}

function netDisconnect() {
  console.log('Network disconnect called');
  isOnline = false;
  netConnected = false;
  if (rtcPeer) {
    rtcPeer.close();
    rtcPeer = null;
  }
  rtcChan = null;
  if (sigWS) {
    sigWS.close();
    sigWS = null;
  }
  onNetDisconnect();
}

function sendNetState(player) {
  if (!isOnline || !netConnected || !rtcChan || rtcChan.readyState !== 'open') return;
  if (!player || player.dead) return;
  try {
    netSend({
      type: 'state',
      x: Math.round(player.x * 10) / 10,
      y: Math.round(player.y * 10) / 10,
      vx: Math.round(player.vx * 10) / 10,
      vy: Math.round(player.vy * 10) / 10,
      f: player.facing,
      g: player.onGround ? 1 : 0,
      s: Math.round(player.squash * 100) / 100,
      mh: player.maxHeight
    });
  } catch (err) {
    console.error('Error sending state:', err);
  }
}

function sendNetDie() {
  if (isOnline && netConnected) {
    netSend({ type: 'die' });
  }
}

function cleanupNetwork() {
  if (rtcPeer) {
    rtcPeer.close();
    rtcPeer = null;
  }
  rtcChan = null;
  netConnected = false;
  pendingCandidates = [];
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setNetCallbacks,
    hostGame,
    joinGame,
    netSend,
    netDisconnect,
    sendNetState,
    sendNetDie,
    cleanupNetwork,
    get isOnline() { return isOnline; },
    set isOnline(val) { isOnline = val; },
    get isHost() { return isHost; },
    get myNetRole() { return myNetRole; },
    get netConnected() { return netConnected; }
  };
}

// Global exports for browser onclick handlers
window.hostGame = hostGame;
window.joinGame = joinGame;
window.setNetCallbacks = setNetCallbacks;
window.netSend = netSend;
window.netDisconnect = netDisconnect;
window.sendNetState = sendNetState;
window.sendNetDie = sendNetDie;
window.cleanupNetwork = cleanupNetwork;
