/**
 * Node (level) definitions for the roguelike progression.
 * Each node increases in difficulty with more mines, larger grids, and corrupted tiles.
 */

export const NODES = [
  {
    id: 1,
    name: 'PERIMETER_SCAN',
    subtitle: 'Firewall Outer Layer',
    rows: 9,
    cols: 9,
    mines: 10,
    cacheReward: 50,
    entropyMultiplier: 1.0,
  },
  {
    id: 2,
    name: 'SUBNET_ALPHA',
    subtitle: 'Internal Network Segment',
    rows: 10,
    cols: 12,
    mines: 18,
    cacheReward: 80,
    entropyMultiplier: 1.2,
  },
  {
    id: 3,
    name: 'DATA_NEXUS',
    subtitle: 'Central Processing Hub',
    rows: 12,
    cols: 14,
    mines: 28,
    cacheReward: 120,
    entropyMultiplier: 1.5,
  },
  {
    id: 4,
    name: 'CIPHER_VAULT',
    subtitle: 'Encrypted Storage Array',
    rows: 14,
    cols: 16,
    mines: 42,
    cacheReward: 180,
    entropyMultiplier: 2.0,
  },
  {
    id: 5,
    name: 'KERNEL_CORE',
    subtitle: 'System Root Access Point',
    rows: 16,
    cols: 18,
    mines: 58,
    cacheReward: 300,
    entropyMultiplier: 3.0,
  },
  {
    id: 6,
    name: 'DEEP_NET',
    subtitle: 'Hidden Network Layer',
    rows: 16,
    cols: 20,
    mines: 70,
    cacheReward: 450,
    entropyMultiplier: 4.0,
  },
  {
    id: 7,
    name: 'ROOT_ACCESS',
    subtitle: 'Final Breach',
    rows: 18,
    cols: 22,
    mines: 90,
    cacheReward: 1000,
    entropyMultiplier: 5.0,
  },
]

export function getNode(nodeId) {
  return NODES.find(n => n.id === nodeId) || NODES[0]
}

export function getNextNode(nodeId) {
  const idx = NODES.findIndex(n => n.id === nodeId)
  if (idx >= 0 && idx < NODES.length - 1) return NODES[idx + 1]
  return null
}
