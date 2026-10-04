/* =========================================================
 *  AutoCalabazas · Constructores de scripts Lua para Axiom
 * ========================================================= */
(function () {
  'use strict';

  const clean = (s) => String(s || '').trim().replace(/[(),$\s]/g, '') || 'stone';
  const num = (n, d = 3) => Number(n).toFixed(d);

  function blockHeader(b) {
    return `body=$blockState(Cuerpo,${clean(b.body)})$
bodyStairs=$blockState(Escalera cuerpo,${clean(b.bodyStairs)})$
bodySlab=$blockState(Losa cuerpo,${clean(b.bodySlab)})$
accent=$blockState(Surcos,${clean(b.accent)})$
stem=$blockState(Tallo,${clean(b.stem)})$
stemStairs=$blockState(Escalera tallo,${clean(b.stemStairs)})$
stemSlab=$blockState(Losa tallo,${clean(b.stemSlab)})$
leaf=$blockState(Hoja,${clean(b.leaf)})$`;
  }

  const helpers = `local DIRN = {"north", "south", "west", "east"}

-- withBlockProperty seguro: si el bloque no tiene la propiedad, lo deja igual
local function prop(b, p)
    local ok, r = pcall(withBlockProperty, b, p)
    if ok and r ~= nil then return r end
    return b
end

local function stairs(base, d, h)
    local hs = "bottom"
    if h == 1 then hs = "top" end
    return prop(prop(base, "facing=" .. DIRN[d]), "half=" .. hs)
end`;

  // ---------------------------------------------------------
  // Script procedural: cada clic = calabaza nueva
  // ---------------------------------------------------------
  function buildRandomLua(p, b) {
    return `$once$
-- =========================================================
--  AutoCalabazas · Script ALEATORIO para Axiom Script Brush
--  Cada clic genera una calabaza distinta dentro de los
--  tamaños máximos. Puedes ajustar los valores en el juego.
-- =========================================================

maxW=$int(Ancho max,${p.maxW},3,48)$
maxH=$int(Alto max,${p.maxH},3,48)$
maxD=$int(Fondo max,${p.maxD},3,48)$
variacion=$int(Variacion %,${p.variation},0,80)$
detalle=$int(Detalle %,${p.detail},0,100)$
offY=$int(Desfase Y,0,-8,8)$

${blockHeader(b)}

-- ---------- Parámetros de forma (desde la app) ----------
local LOBES_MIN = ${p.lobesMin}
local LOBES_MAX = ${Math.max(p.lobesMin, p.lobesMax)}
local GROOVE = ${num(p.groove / 100)}
local IRREG = ${num(p.irregular / 100)}
local ROUND = ${num(p.roundness, 2)}
local DIP = ${num(p.dip / 100)}
local STEM_MIN = ${p.stemMin}
local STEM_MAX = ${Math.max(p.stemMin, p.stemMax)}
local USE_STAIRS = ${!!p.useStairs}
local USE_SLABS = ${!!p.useSlabs}
local USE_ACCENT = ${!!p.useAccent}
local STEM_CURVE = ${!!p.stemCurve}
local STEM_TIP = ${!!p.stemTip}
local COLLAR = ${!!p.collar}
local LEAVES = ${!!p.leaves}
local HOLLOW = ${!!p.hollow}
local PERFECT_ROUND = ${!!p.perfectRound}
local CARVED_FACE = ${!!p.carvedFace}
local STEM_SYMMETRIC = ${!!p.stemSymmetric}

local TAU = math.pi * 2
local DX = {0, 0, -1, 1}
local DZ = {-1, 1, 0, 0}
local OPP = {2, 1, 4, 3}

${helpers}

local function atan2(yv, xv)
    if xv > 0 then return math.atan(yv / xv) end
    if xv < 0 then
        if yv >= 0 then return math.atan(yv / xv) + math.pi end
        return math.atan(yv / xv) - math.pi
    end
    if yv > 0 then return math.pi / 2 end
    if yv < 0 then return -math.pi / 2 end
    return 0
end

local function rint(a, b)
    if b <= a then return a end
    return math.random(a, b)
end

local function round(n) return math.floor(n + 0.5) end

-- ---------- Medidas aleatorias ----------
local v = variacion / 100
local W = rint(math.max(3, round(maxW * (1 - v))), maxW)
local H = rint(math.max(3, round(maxH * (1 - v))), maxH)
local D = rint(math.max(3, round(maxD * (1 - v))), maxD)
local L = PERFECT_ROUND and 1 or rint(LOBES_MIN, math.max(LOBES_MIN, LOBES_MAX))
local groove = PERFECT_ROUND and 0 or (GROOVE * (0.7 + 0.6 * math.random()))
local amps = {}
local n_lobes = PERFECT_ROUND and 1 or L
for n = 0, n_lobes - 1 do amps[n] = 1 - (PERFECT_ROUND and 0 or IRREG) * math.random() end
local pTop = PERFECT_ROUND and 2.0 or ROUND
local pBot = PERFECT_ROUND and 2.0 or (ROUND + 1)
local dip = PERFECT_ROUND and 0 or (DIP * (0.6 + 0.8 * math.random()))
local rot = math.random() * TAU
local det = detalle / 100

local function lobeInfo(nx, nz)
    local t = ((atan2(nz, nx) + rot) / TAU) * L
    t = t % L
    local s = 0.5 - 0.5 * math.cos(TAU * t)
    local idx = math.floor(t + 0.5) % L
    return s, idx
end

local function inside(u, vv, w)
    local nx = (u - W / 2) / (W / 2)
    local ny = (vv - H / 2) / (H / 2)
    local nz = (w - D / 2) / (D / 2)
    if ny < -1 or ny > 1 then return false end
    local dh = math.sqrt(nx * nx + nz * nz)
    local top = 1 - dip * math.exp(-((dh / 0.38) ^ 2))
    if ny > top then return false end
    local pe = pTop
    if ny < 0 then pe = pBot end
    local vert = (1 - math.abs(ny) ^ pe) ^ (1 / pe)
    local s, idx = lobeInfo(nx, nz)
    local R = amps[idx] * (1 - groove * s ^ 1.5)
    return dh <= R * vert
end

-- ---------- Rejilla ----------
local GY = H + STEM_MAX + 3
local function K(i, j, k) return ((j + 4) * 512 + (i + 4)) * 512 + (k + 4) end
local solid = {}
local function S(i, j, k) return solid[K(i, j, k)] == true end
local out = {}
local list = {}
local function put(i, j, k, b)
    if i < 0 or i >= W or k < 0 or k >= D or j < 0 or j >= GY then return end
    local key = K(i, j, k)
    if out[key] == nil then list[#list + 1] = {i, j, k, key} end
    out[key] = b
end

for j = 0, H - 1 do for i = 0, W - 1 do for k = 0, D - 1 do
    if inside(i + 0.5, j + 0.5, k + 0.5) then solid[K(i, j, k)] = true end
end end end

local slabB = prop(bodySlab, "type=bottom")
local slabT = prop(bodySlab, "type=top")
local stemSlabB = prop(stemSlab, "type=bottom")
local leafP = prop(leaf, "persistent=true")

-- ---------- Cuerpo + surcos ----------
for j = 0, H - 1 do for i = 0, W - 1 do for k = 0, D - 1 do
    if S(i, j, k) then
        local b = body
        if USE_ACCENT and groove > 0.03 then
            local surf = not (S(i+1,j,k) and S(i-1,j,k) and S(i,j+1,k) and S(i,j-1,k) and S(i,j,k+1) and S(i,j,k-1))
            if surf then
                local s = lobeInfo((i + 0.5 - W / 2) / (W / 2), (k + 0.5 - D / 2) / (D / 2))
                if s > 0.8 then b = accent end
            end
        end
        put(i, j, k, b)
    end
end end end

-- ---------- Detalles: escaleras y losas ----------
for j = 0, H do for i = 0, W - 1 do for k = 0, D - 1 do
    if not S(i, j, k) then
        local below = j > 0 and S(i, j - 1, k)
        local above = S(i, j + 1, k)
        if below or above then
            local h = 1
            if below then h = 0 end
            local placed = false
            if USE_STAIRS and math.random() < det then
                local cand, nc = 0, 0
                for d = 1, 4 do
                    if S(i + DX[d], j, k + DZ[d]) and not S(i - DX[d], j, k - DZ[d]) then
                        cand = d
                        nc = nc + 1
                    end
                end
                if nc == 1 then
                    put(i, j, k, stairs(bodyStairs, cand, h))
                    placed = true
                end
            end
            if not placed and USE_SLABS then
                local sub
                if below then sub = inside(i + 0.5, j + 0.25, k + 0.5)
                else sub = inside(i + 0.5, j + 0.75, k + 0.5) end
                if not sub then
                    local edge = false
                    for d = 1, 4 do
                        if S(i + DX[d], j, k + DZ[d]) then edge = true end
                    end
                    sub = edge and math.random() < det * 0.35
                end
                if sub then
                    if below then put(i, j, k, slabB) else put(i, j, k, slabT) end
                end
            end
        end
    end
end end end

-- ---------- Tallo ----------
local ci = math.floor((W - 1) / 2)
local ck = math.floor((D - 1) / 2)

local minI = ci
local maxI = minI
if STEM_SYMMETRIC then maxI = math.floor(W / 2) end
local minK = ck
local maxK = minK
if STEM_SYMMETRIC then maxK = math.floor(D / 2) end

local topJ = 0
for j = 0, H - 1 do
    for i = minI, maxI do
        for k = minK, maxK do
            if S(i, j, k) and j > topJ then topJ = j end
        end
    end
end
local b0 = topJ + 1
local sh = rint(STEM_MIN, STEM_MAX)
local cd, bend = 0, sh
if STEM_CURVE and not STEM_SYMMETRIC and sh >= 2 then
    cd = rint(1, 4)
    bend = rint(1, sh - 1)
end

if COLLAR and W >= 7 and D >= 7 then
    for d = 1, 4 do
        if DX[d] ~= 0 then
            local cx = (DX[d] > 0) and (maxI + 1) or (minI - 1)
            for cz = minK, maxK do
                if not S(cx, b0, cz) and S(cx, b0 - 1, cz) and math.random() < 0.5 + det * 0.5 then
                    put(cx, b0, cz, stairs(bodyStairs, OPP[d], 0))
                end
            end
        else
            local cz = (DZ[d] > 0) and (maxK + 1) or (minK - 1)
            for cx = minI, maxI do
                if not S(cx, b0, cz) and S(cx, b0 - 1, cz) and math.random() < 0.5 + det * 0.5 then
                    put(cx, b0, cz, stairs(bodyStairs, OPP[d], 0))
                end
            end
        end
    end
end

for t = 0, sh - 1 do
    local offX, offZ = 0, 0
    if cd > 0 and t >= bend then
        offX = DX[cd]
        offZ = DZ[cd]
    end
    for i = minI, maxI do
        for k = minK, maxK do
            put(i + offX, b0 + t, k + offZ, stem)
        end
    end
end

if STEM_TIP then
    local offX, offZ = 0, 0
    if cd > 0 then
        offX = DX[cd]
        offZ = DZ[cd]
    end
    for i = minI, maxI do
        for k = minK, maxK do
            if cd > 0 then
                put(i + offX, b0 + sh, k + offZ, stairs(stemStairs, cd, 0))
            elseif math.random() < 0.5 then
                put(i + offX, b0 + sh, k + offZ, stemSlabB)
            end
        end
    end
end

-- ---------- Hojas ----------
if LEAVES then
    local n = rint(1, 2)
    local used = {}
    for c = 1, n do
        local d = rint(1, 4)
        if not used[d] then
            used[d] = true
            local dist = rint(1, 2)
            local lx, lz = ci + DX[d] * dist, ck + DZ[d] * dist
            local ty = -1
            for j = 0, H - 1 do if S(lx, j, lz) then ty = j end end
            if ty >= 0 then put(lx, ty + 1, lz, leafP) end
        end
    end
end

-- ---------- Cara tétrica ----------
if CARVED_FACE then
    HOLLOW = true
    for j = 0, H - 1 do
        for i = 0, W - 1 do
            local nx = (i - W / 2) / (W / 2)
            local ny = (j - H / 2) / (H / 2)
            local carve = false

            if ny > 0.1 and ny < 0.5 and math.abs(nx) > 0.2 and math.abs(nx) < 0.6 then
                if ny - 0.1 < (0.6 - math.abs(nx)) * 1.5 then carve = true end
            end
            if ny > -0.1 and ny < 0.1 and math.abs(nx) < 0.15 then
                if ny - -0.1 < 0.15 - math.abs(nx) then carve = true end
            end
            if ny > -0.6 and ny < -0.2 and math.abs(nx) < 0.7 then
                local curve = (math.abs(nx) * math.abs(nx)) - 0.4
                if math.abs(ny - curve) < 0.1 then carve = true end
                if carve then
                    local tx = math.floor(nx * 10)
                    if tx == -3 and ny > curve then carve = false end
                    if tx == 3 and ny > curve then carve = false end
                    if tx == 0 and ny < curve then carve = false end
                end
            end

            if carve then
                for k = math.floor(D / 2), D - 1 do
                    if S(i, j, k) then out[K(i, j, k)] = false end
                end
            end
        end
    end
end

-- ---------- Hueca (opcional) ----------
if HOLLOW then
    for j = 0, H - 1 do for i = 0, W - 1 do for k = 0, D - 1 do
        if S(i,j,k) and S(i+1,j,k) and S(i-1,j,k) and S(i,j+1,k) and S(i,j-1,k) and S(i,j,k+1) and S(i,j,k-1) then
            out[K(i, j, k)] = false
        end
    end end end
end

-- ---------- Colocar ----------
for n = 1, #list do
    local e = list[n]
    local b = out[e[4]]
    if b then
        setBlock(x + e[1] - ci, y + offY + e[2], z + e[3] - ck, b)
    end
end
`;
  }

  // ---------------------------------------------------------
  // Script "horneado": exactamente la calabaza de la vista previa
  // ---------------------------------------------------------
  function buildBakedLua(model, b) {
    const parts = [];
    let line = [];
    for (const [i, j, k, c] of model.blocks) {
      line.push(`${i - model.ci},${j},${k - model.ck},${c}`);
      if (line.length === 10) { parts.push('    ' + line.join(', ') + ','); line = []; }
    }
    if (line.length) parts.push('    ' + line.join(', ') + ',');

    return `$once$
-- =========================================================
--  AutoCalabazas · Calabaza FIJA (seed ${model.seed})
--  Tamaño: ${model.W} x ${model.maxY} x ${model.D}  ·  ${model.blocks.length} bloques
--  Siempre coloca exactamente la calabaza de la vista previa.
-- =========================================================

offY=$int(Desfase Y,0,-8,8)$

${blockHeader(b)}

${helpers}

local B = {}
B[1] = body
B[2] = accent
B[3] = prop(bodySlab, "type=bottom")
B[4] = prop(bodySlab, "type=top")
B[5] = stem
B[6] = prop(leaf, "persistent=true")
B[7] = prop(stemSlab, "type=bottom")
for d = 1, 4 do
    for h = 0, 1 do
        B[10 + (d - 1) * 2 + h] = stairs(bodyStairs, d, h)
        B[20 + (d - 1) * 2 + h] = stairs(stemStairs, d, h)
    end
end

-- dx, dy, dz, tipo
local DATA = {
${parts.join('\n')}
}

for n = 1, #DATA, 4 do
    setBlock(x + DATA[n], y + offY + DATA[n + 1], z + DATA[n + 2], B[DATA[n + 3]])
end
`;
  }

  window.PumpkinLua = { buildRandomLua, buildBakedLua };
})();
