/* =========================================================
 *  AutoCalabazas · Colores de bloques y paletas
 * ========================================================= */
(function () {
  'use strict';

  const BLOCK_COLORS = {
    red_sandstone: '#b5621f', cut_red_sandstone: '#bb6621', smooth_red_sandstone: '#b5621f',
    chiseled_red_sandstone: '#b05d1d', orange_sandstone: '#c8691f',
    orange_terracotta: '#a1531d', terracotta: '#985e43', red_terracotta: '#8f3d2e',
    yellow_terracotta: '#ba8523', brown_terracotta: '#4d3323', green_terracotta: '#4c532a',
    lime_terracotta: '#677535', white_terracotta: '#d1b2a1', black_terracotta: '#251710',
    orange_concrete: '#e06100', orange_wool: '#f07613', pumpkin: '#c67718', carved_pumpkin: '#c67718',
    acacia_planks: '#a85a32', acacia_log: '#676157', stripped_acacia_log: '#ae5c3b',
    spruce_planks: '#735531', spruce_log: '#3b2810', dark_oak_planks: '#42301a', dark_oak_log: '#3c2e1a',
    oak_planks: '#a2834f', oak_log: '#6d5532', birch_planks: '#c0af79', jungle_planks: '#a07350',
    mangrove_planks: '#763631', cherry_planks: '#e3b3ad', bamboo_planks: '#c3ad53',
    crimson_planks: '#653147', warped_planks: '#2b6963',
    waxed_cut_copper: '#bf6b51', cut_copper: '#bf6b51', waxed_exposed_cut_copper: '#9b7a65',
    waxed_weathered_cut_copper: '#6c9a6e', waxed_oxidized_cut_copper: '#4fab90', oxidized_cut_copper: '#4fab90',
    smooth_quartz: '#ebe5de', quartz_block: '#ebe5de', calcite: '#dfe0dc', white_concrete: '#cfd5d6',
    diorite: '#bcbcbc', smooth_sandstone: '#e0d6a8', sandstone: '#d8cb9b', cut_sandstone: '#d9cd9e',
    mud_bricks: '#89684f', packed_mud: '#8e6b50', mud: '#3c393d',
    mossy_cobblestone: '#6e775f', mossy_stone_bricks: '#737a63', moss_block: '#596e2d', moss_carpet: '#596e2d',
    cobblestone: '#7f7f7f', stone: '#7e7e7e', stone_bricks: '#7a7a7a', prismarine: '#639c97',
    dark_prismarine: '#335b4b', azalea_leaves: '#5a7a26', flowering_azalea_leaves: '#6a7a3a',
    oak_leaves: '#4a7a20', jungle_leaves: '#3f8a1f', spruce_leaves: '#3a5a3a', birch_leaves: '#6a8a3f',
    dark_oak_leaves: '#3a6a18', green_concrete: '#495b24', lime_concrete: '#5ea918', green_wool: '#546d1b',
    yellow_concrete: '#f1af15', brown_concrete: '#603c20', nether_bricks: '#2c161a', red_nether_bricks: '#450709',
    blackstone: '#2a2428', polished_blackstone: '#353038', deepslate_tiles: '#363637', bricks: '#966153',
    granite: '#956756', polished_granite: '#9a6a59', end_stone_bricks: '#dade9e', purpur_block: '#a97ea9',
  };

  const cache = {};
  function resolveColor(raw) {
    const id = String(raw || '').trim().toLowerCase().replace(/^minecraft:/, '').replace(/\[.*$/, '');
    if (cache[id]) return cache[id];
    let col = BLOCK_COLORS[id];
    if (!col) {
      const base = id.replace(/_(stairs|slab|wall)$/, '');
      const tries = [base, base + '_planks', base + 's', base + '_block',
        base.replace(/_brick$/, '_bricks'), base.replace(/_tile$/, '_tiles')];
      for (const t of tries) if (BLOCK_COLORS[t]) { col = BLOCK_COLORS[t]; break; }
    }
    if (!col) {
      let h = 0;
      for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      col = `hsl(${h % 360}, 45%, 50%)`;
    }
    cache[id] = col;
    return col;
  }

  const PRESETS = {
    clasica: {
      name: 'Clásica · arenisca roja',
      body: 'red_sandstone', bodyStairs: 'red_sandstone_stairs', bodySlab: 'red_sandstone_slab',
      accent: 'orange_terracotta', stem: 'green_terracotta', stemStairs: 'mossy_cobblestone_stairs',
      stemSlab: 'mossy_cobblestone_slab', leaf: 'azalea_leaves',
    },
    original: {
      name: 'Original · orange_sandstone',
      body: 'orange_sandstone', bodyStairs: 'orange_sandstone_stairs', bodySlab: 'orange_sandstone_slab',
      accent: 'orange_terracotta', stem: 'green_terracotta', stemStairs: 'mossy_cobblestone_stairs',
      stemSlab: 'mossy_cobblestone_slab', leaf: 'azalea_leaves',
    },
    acacia: {
      name: 'Madera de acacia',
      body: 'acacia_planks', bodyStairs: 'acacia_stairs', bodySlab: 'acacia_slab',
      accent: 'stripped_acacia_log', stem: 'dark_oak_log', stemStairs: 'dark_oak_stairs',
      stemSlab: 'dark_oak_slab', leaf: 'oak_leaves',
    },
    cobre: {
      name: 'Cobre brillante',
      body: 'waxed_cut_copper', bodyStairs: 'waxed_cut_copper_stairs', bodySlab: 'waxed_cut_copper_slab',
      accent: 'waxed_exposed_cut_copper', stem: 'waxed_oxidized_cut_copper',
      stemStairs: 'waxed_oxidized_cut_copper_stairs', stemSlab: 'waxed_oxidized_cut_copper_slab',
      leaf: 'azalea_leaves',
    },
    blanca: {
      name: 'Calabaza blanca',
      body: 'smooth_quartz', bodyStairs: 'smooth_quartz_stairs', bodySlab: 'smooth_quartz_slab',
      accent: 'calcite', stem: 'spruce_log', stemStairs: 'spruce_stairs', stemSlab: 'spruce_slab',
      leaf: 'azalea_leaves',
    },
    verde: {
      name: 'Verde musgo',
      body: 'mossy_stone_bricks', bodyStairs: 'mossy_stone_brick_stairs', bodySlab: 'mossy_stone_brick_slab',
      accent: 'moss_block', stem: 'spruce_log', stemStairs: 'spruce_stairs', stemSlab: 'spruce_slab',
      leaf: 'oak_leaves',
    },
    podrida: {
      name: 'Podrida / barro',
      body: 'mud_bricks', bodyStairs: 'mud_brick_stairs', bodySlab: 'mud_brick_slab',
      accent: 'packed_mud', stem: 'dark_oak_log', stemStairs: 'dark_oak_stairs', stemSlab: 'dark_oak_slab',
      leaf: 'dark_oak_leaves',
    },
  };

  window.PumpkinBlocks = { resolveColor, PRESETS };
})();
