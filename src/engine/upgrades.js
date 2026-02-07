/**
 * Terminal shop upgrades — Subroutines, Exploits, and Kernel Optimizations
 */

export const UPGRADE_TYPE = {
  SUBROUTINE: 'subroutine',  // Permanent passive buff
  EXPLOIT: 'exploit',         // Limited-use active tool
  KERNEL: 'kernel',           // Base stat increase
}

export const UPGRADES = {
  // === SUBROUTINES (Passives) ===
  heuristics: {
    id: 'heuristics',
    name: 'HEURISTICS.exe',
    type: UPGRADE_TYPE.SUBROUTINE,
    description: 'Highlights cells adjacent to exactly 1 mine with a subtle indicator',
    cost: 60,
    maxLevel: 1,
    effect: 'Cells with value "1" pulse gently when revealed',
  },
  crypto_nodes: {
    id: 'crypto_nodes',
    name: 'CRYPTO_NODE.dll',
    type: UPGRADE_TYPE.SUBROUTINE,
    description: 'Cache gain multiplied by clear speed bonus',
    cost: 80,
    maxLevel: 3,
    effect: '+15% cache per level when completing node under par time',
  },
  packet_sniffer: {
    id: 'packet_sniffer',
    name: 'PKT_SNIFF.sys',
    type: UPGRADE_TYPE.SUBROUTINE,
    description: 'Displays mine counts on row/column headers',
    cost: 100,
    maxLevel: 1,
    effect: 'Row and column mine counts visible on grid edges',
  },
  entropy_harvester: {
    id: 'entropy_harvester',
    name: 'ENTROPY_HARV.bin',
    type: UPGRADE_TYPE.SUBROUTINE,
    description: 'Earn bonus entropy for each cell cleared in flood fills',
    cost: 70,
    maxLevel: 2,
    effect: '+1 entropy per cell in cascading reveals per level',
  },
  auto_flag: {
    id: 'auto_flag',
    name: 'AUTO_FLAG.cfg',
    type: UPGRADE_TYPE.SUBROUTINE,
    description: 'Automatically flags obvious mines when all neighbors are revealed',
    cost: 120,
    maxLevel: 1,
    effect: 'Mines surrounded by fully revealed cells get auto-flagged',
  },

  // === EXPLOITS (Active abilities) ===
  deep_scan: {
    id: 'deep_scan',
    name: 'DEEP_SCAN.0x',
    type: UPGRADE_TYPE.EXPLOIT,
    description: 'X-ray vision: peek at a 3x3 region without revealing',
    cost: 40,
    charges: 2,
    effect: 'Temporarily shows mine locations in a 3x3 area',
  },
  bit_shift: {
    id: 'bit_shift',
    name: 'BIT_SHIFT.hex',
    type: UPGRADE_TYPE.EXPLOIT,
    description: 'Safely reveal one random hidden non-mine cell',
    cost: 50,
    charges: 2,
    effect: 'Reveals a safe cell — guaranteed no mine',
  },
  defrag: {
    id: 'defrag',
    name: 'DEFRAG.opt',
    type: UPGRADE_TYPE.EXPLOIT,
    description: 'Reveals all cells with value 0 (empty) on the board',
    cost: 90,
    charges: 1,
    effect: 'Mass reveals all zero-cells and their neighbors',
  },

  // === KERNEL OPTIMIZATIONS (Stats) ===
  firewall_upgrade: {
    id: 'firewall_upgrade',
    name: 'FW_UPGRADE.patch',
    type: UPGRADE_TYPE.KERNEL,
    description: 'Adds +1 to maximum firewall capacity',
    cost: 100,
    maxLevel: 3,
    effect: '+1 max firewall per purchase',
  },
  cache_boost: {
    id: 'cache_boost',
    name: 'CACHE_BOOST.mod',
    type: UPGRADE_TYPE.KERNEL,
    description: 'Increases base cache rewards by 20%',
    cost: 80,
    maxLevel: 3,
    effect: '+20% cache rewards per level',
  },
  clock_speed: {
    id: 'clock_speed',
    name: 'CLK_SPEED.oc',
    type: UPGRADE_TYPE.KERNEL,
    description: 'Grants +30s to par time for speed bonuses',
    cost: 60,
    maxLevel: 2,
    effect: '+30s par time per level',
  },
}

// Small terminal-art icons for each upgrade (5 lines tall, monospace)
export const UPGRADE_ART = {
  heuristics: [
    '┌───┐',
    '│ ? │',
    '│►1◄│',
    '│ ? │',
    '└───┘',
  ],
  crypto_nodes: [
    ' ╔═╗ ',
    '╔╝$╚╗',
    '║ ₿ ║',
    '╚╗$╔╝',
    ' ╚═╝ ',
  ],
  packet_sniffer: [
    '┌┬┬┬┐',
    '├3 2┤',
    '├ ▓ ┤',
    '├1 4┤',
    '└┴┴┴┘',
  ],
  entropy_harvester: [
    '~~~~~',
    '}{}{}',
    '│ENT│',
    '}{}{}',
    '~~~~~',
  ],
  auto_flag: [
    '  ▲  ',
    ' ▲▲▲ ',
    ' │█│ ',
    '┌┤▓├┐',
    '└───┘',
  ],
  deep_scan: [
    '╭───╮',
    '│ ◉ │',
    '│/█\\│',
    '│\\▓/│',
    '╰───╯',
  ],
  bit_shift: [
    '01010',
    '10>>1',
    '01001',
    '1<<10',
    '01010',
  ],
  defrag: [
    '▓▒░▓▒',
    '░▒▓░▓',
    '█▓▒░█',
    '░░░░░',
    '█████',
  ],
  firewall_upgrade: [
    '┃┃┃┃┃',
    '┃█┃█┃',
    '┃┃+┃┃',
    '┃█┃█┃',
    '┃┃┃┃┃',
  ],
  cache_boost: [
    '╔$$$╗',
    '║ ▲ ║',
    '║▲▲▲║',
    '║ ▲ ║',
    '╚$$$╝',
  ],
  clock_speed: [
    '╭───╮',
    '│ ╱ │',
    '│╱  │',
    '│+30│',
    '╰───╯',
  ],
}

export function getShopItems() {
  return Object.values(UPGRADES)
}

export function getUpgrade(id) {
  return UPGRADES[id]
}
