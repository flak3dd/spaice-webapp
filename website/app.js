/**
 * SpaceDrop Website Client Logic
 * - Interactive Radar Canvas with Waves & Blips
 * - Real-Time Web Crypto PBKDF2 & AES-GCM Key Derivation Visualizer
 * - Interactive Drop Simulation & Clipboard Actions
 */

(function () {
  'use strict';

  // SpaceDrop 31-character unambiguous alphabet
  const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  // ==========================================================================
  // Toast Notification System
  // ==========================================================================
  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px) scale(0.95)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3200);
  }

  // ==========================================================================
  // Interactive Radar Canvas
  // ==========================================================================
  const radarCanvas = document.getElementById('hero-radar-canvas');
  if (radarCanvas) {
    const ctx = radarCanvas.getContext('2d');
    let width = (radarCanvas.width = radarCanvas.offsetWidth || 400);
    let height = (radarCanvas.height = radarCanvas.offsetHeight || 280);

    window.addEventListener('resize', () => {
      width = radarCanvas.width = radarCanvas.offsetWidth || 400;
      height = radarCanvas.height = radarCanvas.offsetHeight || 280;
    });

    let waveRadius = 0;
    const ripples = [];
    const blips = [
      { angle: 0.85, radiusRatio: 0.38, label: 'Space Live (2.4 km)', alpha: 1.0 },
      { angle: 2.7, radiusRatio: 0.44, label: 'Space Live (8.1 km)', alpha: 0.85 },
      { angle: 4.9, radiusRatio: 0.33, label: 'Space Live (1.2 km)', alpha: 0.95 }
    ];

    function drawRadar() {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.min(cx, cy) * 0.82;

      // 3 Reference Circles
      [0.35, 0.65, 0.95].forEach((ratio) => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius * ratio, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(30, 54, 72, 0.65)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Animated Expanding Wave
      waveRadius += 0.75;
      if (waveRadius > maxRadius) {
        waveRadius = 15;
      }
      const waveOpacity = Math.max(0, 1 - waveRadius / maxRadius) * 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(33, 171, 254, ${waveOpacity})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Nearby Space Blips
      blips.forEach((blip) => {
        const bx = cx + Math.cos(blip.angle) * (maxRadius * blip.radiusRatio);
        const by = cy + Math.sin(blip.angle) * (maxRadius * blip.radiusRatio);

        // Blip halo glow
        const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, 14);
        gradient.addColorStop(0, 'rgba(8, 193, 181, 0.7)');
        gradient.addColorStop(1, 'rgba(8, 193, 181, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bx, by, 14, 0, Math.PI * 2);
        ctx.fill();

        // Blip solid center
        ctx.beginPath();
        ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#08c1b5';
        ctx.fill();
      });

      // Draw Interactive Click Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 1.8;
        r.opacity -= 0.02;

        if (r.opacity <= 0) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(33, 171, 254, ${r.opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      requestAnimationFrame(drawRadar);
    }

    drawRadar();

    // Click/Tap on radar spawns ripple
    radarCanvas.addEventListener('click', (e) => {
      const rect = radarCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      ripples.push({ x: clickX, y: clickY, radius: 4, opacity: 0.8 });

      const statusEl = document.getElementById('radar-status-text');
      if (statusEl) {
        statusEl.textContent = 'Ping sent across area cell — 3 live encrypted spaces beaconing nearby.';
      }
    });
  }

  // ==========================================================================
  // Live Cryptographic Derivation Visualizer (Web Crypto API)
  // ==========================================================================
  const liveCodeInput = document.getElementById('live-code-input');
  const btnRandomCode = document.getElementById('btn-random-code');
  const keyDisplay = document.getElementById('derived-key-hex');
  const lookupDisplay = document.getElementById('derived-lookup-hex');

  async function deriveKeysFromCode(code) {
    if (!keyDisplay || !lookupDisplay) return;

    const normalized = (code || '').trim().toUpperCase();
    if (normalized.length !== 6) {
      keyDisplay.textContent = 'Enter 6 characters (A-Z, 2-9)…';
      lookupDisplay.textContent = 'Waiting for 6 characters…';
      return;
    }

    keyDisplay.textContent = 'Computing 120,000 PBKDF2 rounds…';
    lookupDisplay.textContent = 'Deriving lookup ID…';

    try {
      const encoder = new TextEncoder();
      const codeBytes = encoder.encode(normalized);
      const saltBytes = encoder.encode('pulsedrop.drop.v1');

      // Import code as PBKDF2 raw key
      const baseKey = await crypto.subtle.importKey(
        'raw',
        codeBytes,
        'PBKDF2',
        false,
        ['deriveBits']
      );

      // Derive 512 bits (64 bytes)
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          hash: 'SHA-256',
          salt: saltBytes,
          iterations: 120000
        },
        baseKey,
        512
      );

      const derivedBytes = new Uint8Array(derivedBits);
      const aesKeyBytes = derivedBytes.slice(0, 32);
      const lookupBytes = derivedBytes.slice(32);

      const toHex = (buf) =>
        Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');

      const aesKeyHex = toHex(aesKeyBytes);
      const lookupHex = toHex(lookupBytes);

      keyDisplay.textContent = aesKeyHex.slice(0, 32) + '… (256-bit AES-GCM)';
      lookupDisplay.textContent = lookupHex;
    } catch (err) {
      keyDisplay.textContent = 'Derivation error: ' + err.message;
      lookupDisplay.textContent = '—';
    }
  }

  function generateRandomCode() {
    let result = '';
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    for (let i = 0; i < 6; i++) {
      result += CHARSET[array[i] % CHARSET.length];
    }
    return result;
  }

  if (liveCodeInput) {
    liveCodeInput.addEventListener('input', (e) => {
      let val = e.target.value.toUpperCase();
      val = val.replace(/[^A-Z2-9]/g, '').slice(0, 6);
      e.target.value = val;
      deriveKeysFromCode(val);
    });

    // Initial calculation
    deriveKeysFromCode(liveCodeInput.value);
  }

  if (btnRandomCode && liveCodeInput) {
    btnRandomCode.addEventListener('click', () => {
      const newCode = generateRandomCode();
      liveCodeInput.value = newCode;
      deriveKeysFromCode(newCode);
      showToast(`Generated new drop code: ${newCode}`);
    });
  }

  // ==========================================================================
  // Mock Window Interactive Controls
  // ==========================================================================
  const mockCodeInput = document.getElementById('mock-code-input');
  const btnMockClaim = document.getElementById('btn-mock-claim');
  const btnMockDrop = document.getElementById('btn-mock-drop');

  if (mockCodeInput) {
    mockCodeInput.addEventListener('input', (e) => {
      let val = e.target.value.toUpperCase();
      val = val.replace(/[^A-Z2-9]/g, '').slice(0, 6);
      e.target.value = val;
    });
  }

  if (btnMockClaim) {
    btnMockClaim.addEventListener('click', () => {
      const code = (mockCodeInput?.value || '').trim();
      if (code.length !== 6) {
        showToast('Please enter a 6-character drop code');
        return;
      }
      showToast(`Opening drop ${code} in web client…`);
      window.open(`https://pulsedrop-d6x1mxr.rork.app/#/d/${code}`, '_blank');
    });
  }

  if (btnMockDrop) {
    btnMockDrop.addEventListener('click', () => {
      const randomCode = generateRandomCode();
      if (mockCodeInput) mockCodeInput.value = randomCode;
      showToast(`Created drop ${randomCode}! Ready to share.`);
    });
  }

  // ==========================================================================
  // Copy to Clipboard Buttons
  // ==========================================================================
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const text = targetEl.textContent;
        navigator.clipboard.writeText(text).then(() => {
          showToast('Copied to clipboard!');
        });
      }
    });
  });
})();
