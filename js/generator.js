/* =========================================================
 *  AutoCalabazas · Generador de vóxeles
 *  IMPORTANTE: esta lógica está espejada 1:1 en el script
 *  Lua de lua.js (buildRandomLua). Si cambias algo aquí,
 *  cámbialo también allí.
 * ========================================================= */
(function () {
  'use strict';

  // Direcciones cardinales de Minecraft
  const DIRS = [
    { n: 'north', dx: 0, dz: -1 },
    { n: 'south', dx: 0, dz: 1 },
    { n: 'west', dx: -1, dz: 0 },
    { n: 'east', dx: 1, dz: 0 },
  ];

  // Códigos de bloque internos
  const CODE = {
    AIR: 0,
    BODY: 1,
    ACCENT: 2,
    SLAB_B: 3,
    SLAB_T: 4,
    STEM: 5,
    LEAF: 6,
    STEM_SLAB: 7,
  };
  // Escaleras: 10 + dir*2 + half (cuerpo) · 20 + dir*2 + half (tallo)
  const bodyStair = (d, h) => 10 + d * 2 + h;
  const stemStair = (d, h) => 20 + d * 2 + h;

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const TAU = Math.PI * 2;

  function generate(p, seed) {
    const rnd = mulberry32(seed >>> 0);
    const ri = (a, b) => (b <= a ? a : a + Math.floor(rnd() * (b - a + 1)));

    const v = p.variation / 100;
    const W = ri(Math.max(3, Math.round(p.maxW * (1 - v))), p.maxW);
    const H = ri(Math.max(3, Math.round(p.maxH * (1 - v))), p.maxH);
    const D = ri(Math.max(3, Math.round(p.maxD * (1 - v))), p.maxD);
    const L = p.perfectRound ? 1 : ri(p.lobesMin, Math.max(p.lobesMin, p.lobesMax));
    const groove = p.perfectRound ? 0 : (p.groove / 100) * (0.7 + 0.6 * rnd());
    const irr = p.perfectRound ? 0 : (p.irregular / 100);
    const amps = [];
    for (let n = 0; n < (p.perfectRound ? 1 : L); n++) amps.push(1 - irr * rnd());
    const pTop = p.perfectRound ? 2.0 : p.roundness;
    const pBot = p.perfectRound ? 2.0 : p.roundness + 1;
    const dip = p.perfectRound ? 0 : (p.dip / 100) * (0.6 + 0.8 * rnd());
    const rot = rnd() * TAU;
    const det = p.detail / 100;
    const stemMax = Math.max(p.stemMin, p.stemMax);

    function lobeInfo(nx, nz) {
      let t = ((Math.atan2(nz, nx) + rot) / TAU) * L;
      t = ((t % L) + L) % L;
      const s = 0.5 - 0.5 * Math.cos(TAU * t);
      const idx = Math.floor(t + 0.5) % L;
      return [s, idx];
    }

    function inside(u, vv, w) {
      const nx = (u - W / 2) / (W / 2);
      const ny = (vv - H / 2) / (H / 2);
      const nz = (w - D / 2) / (D / 2);
      if (ny < -1 || ny > 1) return false;
      const dh = Math.sqrt(nx * nx + nz * nz);
      const top = 1 - dip * Math.exp(-((dh / 0.38) ** 2));
      if (ny > top) return false;
      const pe = ny < 0 ? pBot : pTop;
      const vert = Math.pow(1 - Math.pow(Math.abs(ny), pe), 1 / pe);
      const [s, idx] = lobeInfo(nx, nz);
      const R = amps[idx] * (1 - groove * Math.pow(s, 1.5));
      return dh <= R * vert;
    }

    // ---------- Rejilla ----------
    const GY = H + stemMax + 3;
    const id = (i, j, k) => (j * D + k) * W + i;
    const inb = (i, j, k) => i >= 0 && i < W && j >= 0 && j < GY && k >= 0 && k < D;
    const solid = new Uint8Array(W * GY * D);
    const out = new Uint8Array(W * GY * D);
    const S = (i, j, k) => inb(i, j, k) && solid[id(i, j, k)] === 1;
    const put = (i, j, k, c) => {
      if (inb(i, j, k)) out[id(i, j, k)] = c;
    };

    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++)
        for (let k = 0; k < D; k++)
          if (inside(i + 0.5, j + 0.5, k + 0.5)) solid[id(i, j, k)] = 1;

    // ---------- Cuerpo + surcos ----------
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++)
        for (let k = 0; k < D; k++) {
          if (!S(i, j, k)) continue;
          let c = CODE.BODY;
          if (p.useAccent && groove > 0.03) {
            const surf = !(
              S(i + 1, j, k) && S(i - 1, j, k) && S(i, j + 1, k) &&
              S(i, j - 1, k) && S(i, j, k + 1) && S(i, j, k - 1)
            );
            if (surf) {
              const s = lobeInfo((i + 0.5 - W / 2) / (W / 2), (k + 0.5 - D / 2) / (D / 2))[0];
              if (s > 0.8) c = CODE.ACCENT;
            }
          }
          put(i, j, k, c);
        }

    // ---------- Detalles: escaleras y losas ----------
    for (let j = 0; j <= H; j++)
      for (let i = 0; i < W; i++)
        for (let k = 0; k < D; k++) {
          if (S(i, j, k)) continue;
          const below = j > 0 && S(i, j - 1, k);
          const above = S(i, j + 1, k);
          if (!below && !above) continue;
          const h = below ? 0 : 1;
          let placed = false;
          if (p.useStairs && rnd() < det) {
            let cand = -1, nc = 0;
            for (let d = 0; d < 4; d++) {
              const o = DIRS[d];
              if (S(i + o.dx, j, k + o.dz) && !S(i - o.dx, j, k - o.dz)) { cand = d; nc++; }
            }
            if (nc === 1) { put(i, j, k, bodyStair(cand, h)); placed = true; }
          }
          if (!placed && p.useSlabs) {
            let sub = below ? inside(i + 0.5, j + 0.25, k + 0.5) : inside(i + 0.5, j + 0.75, k + 0.5);
            if (!sub) {
              let edge = false;
              for (let d = 0; d < 4; d++) if (S(i + DIRS[d].dx, j, k + DIRS[d].dz)) edge = true;
              sub = edge && rnd() < det * 0.35;
            }
            if (sub) put(i, j, k, below ? CODE.SLAB_B : CODE.SLAB_T);
          }
        }

    // ---------- Tallo ----------
    const minI = Math.floor((W - 1) / 2);
    const maxI = p.stemSymmetric ? Math.floor(W / 2) : minI;
    const minK = Math.floor((D - 1) / 2);
    const maxK = p.stemSymmetric ? Math.floor(D / 2) : minK;

    let topJ = 0;
    for (let j = 0; j < H; j++) {
      for (let i = minI; i <= maxI; i++) {
        for (let k = minK; k <= maxK; k++) {
          if (S(i, j, k) && j > topJ) topJ = j;
        }
      }
    }
    const b0 = topJ + 1;
    const sh = ri(p.stemMin, stemMax);
    let cd = -1, bend = sh;
    if (p.stemCurve && !p.stemSymmetric && sh >= 2) { cd = ri(0, 3); bend = ri(1, sh - 1); }

    if (p.collar && W >= 7 && D >= 7) {
      for (let d = 0; d < 4; d++) {
        if (DIRS[d].dx !== 0) {
          const cx = DIRS[d].dx > 0 ? maxI + 1 : minI - 1;
          for (let cz = minK; cz <= maxK; cz++) {
            if (!S(cx, b0, cz) && S(cx, b0 - 1, cz) && rnd() < 0.5 + det * 0.5) put(cx, b0, cz, bodyStair(d ^ 1, 0));
          }
        } else {
          const cz = DIRS[d].dz > 0 ? maxK + 1 : minK - 1;
          for (let cx = minI; cx <= maxI; cx++) {
            if (!S(cx, b0, cz) && S(cx, b0 - 1, cz) && rnd() < 0.5 + det * 0.5) put(cx, b0, cz, bodyStair(d ^ 1, 0));
          }
        }
      }
    }

    for (let t = 0; t < sh; t++) {
      let offX = 0, offZ = 0;
      if (cd >= 0 && t >= bend) { offX = DIRS[cd].dx; offZ = DIRS[cd].dz; }
      for (let i = minI; i <= maxI; i++) {
        for (let k = minK; k <= maxK; k++) {
          put(i + offX, b0 + t, k + offZ, CODE.STEM);
        }
      }
    }
    if (p.stemTip) {
      let offX = 0, offZ = 0;
      if (cd >= 0) { offX = DIRS[cd].dx; offZ = DIRS[cd].dz; }
      for (let i = minI; i <= maxI; i++) {
        for (let k = minK; k <= maxK; k++) {
          if (cd >= 0) put(i + offX, b0 + sh, k + offZ, stemStair(cd, 0));
          else if (rnd() < 0.5) put(i + offX, b0 + sh, k + offZ, CODE.STEM_SLAB);
        }
      }
    }

    // ---------- Hojas ----------
    if (p.leaves) {
      const n = ri(1, 2);
      const used = {};
      for (let c = 0; c < n; c++) {
        const d = ri(0, 3);
        if (used[d]) continue;
        used[d] = true;
        const dist = ri(1, 2);
        const lx = ci + DIRS[d].dx * dist, lz = ck + DIRS[d].dz * dist;
        let ty = -1;
        for (let j = 0; j < H; j++) if (S(lx, j, lz)) ty = j;
        if (ty >= 0) put(lx, ty + 1, lz, CODE.LEAF);
      }
    }

    // ---------- Cara tétrica ----------
    if (p.carvedFace) {
      p.hollow = true; // force hollow
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const nx = (i - W / 2) / (W / 2);
          const ny = (j - H / 2) / (H / 2);
          let carve = false;

          // Ojos
          if (ny > 0.1 && ny < 0.5 && Math.abs(nx) > 0.2 && Math.abs(nx) < 0.6) {
            if (ny - 0.1 < (0.6 - Math.abs(nx)) * 1.5) carve = true;
          }
          // Nariz
          if (ny > -0.1 && ny < 0.1 && Math.abs(nx) < 0.15) {
            if (ny - -0.1 < 0.15 - Math.abs(nx)) carve = true;
          }
          // Boca
          if (ny > -0.6 && ny < -0.2 && Math.abs(nx) < 0.7) {
            const curve = (Math.abs(nx) * Math.abs(nx)) - 0.4;
            if (Math.abs(ny - curve) < 0.1) carve = true;
            if (carve) {
              const tx = Math.floor(nx * 10);
              if (tx === -3 && ny > curve) carve = false;
              if (tx === 3 && ny > curve) carve = false;
              if (tx === 0 && ny < curve) carve = false;
            }
          }

          if (carve) {
            for (let k = Math.floor(D / 2); k < D; k++) {
              if (S(i, j, k)) out[id(i, j, k)] = CODE.AIR;
            }
          }
        }
      }
    }

    // ---------- Hueca ----------
    if (p.hollow) {
      for (let j = 0; j < H; j++)
        for (let i = 0; i < W; i++)
          for (let k = 0; k < D; k++)
            if (
              S(i, j, k) && S(i + 1, j, k) && S(i - 1, j, k) && S(i, j + 1, k) &&
              S(i, j - 1, k) && S(i, j, k + 1) && S(i, j, k - 1)
            ) out[id(i, j, k)] = CODE.AIR;
    }

    // ---------- Resultado ----------
    const blocks = [];
    let maxY = 0;
    const stats = { body: 0, stairs: 0, slabs: 0, stem: 0, leaf: 0, accent: 0 };
    for (let j = 0; j < GY; j++)
      for (let k = 0; k < D; k++)
        for (let i = 0; i < W; i++) {
          const c = out[id(i, j, k)];
          if (!c) continue;
          blocks.push([i, j, k, c]);
          if (j + 1 > maxY) maxY = j + 1;
          if (c === CODE.BODY) stats.body++;
          else if (c === CODE.ACCENT) stats.accent++;
          else if (c === CODE.SLAB_B || c === CODE.SLAB_T || c === CODE.STEM_SLAB) stats.slabs++;
          else if (c >= 10) stats.stairs++;
          else if (c === CODE.STEM) stats.stem++;
          else if (c === CODE.LEAF) stats.leaf++;
        }

    return { W, H, D, GY, maxY, ci, ck, lobes: L, seed, blocks, stats };
  }

  window.PumpkinGen = { generate, DIRS, CODE, mulberry32, bodyStair, stemStair };
})();
