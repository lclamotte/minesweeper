import { create } from 'zustand'
import { MinesweeperEngine, CELL_STATE } from '../engine/MinesweeperEngine'
import { getNode, getNextNode, NODES } from '../engine/nodes'
import { UPGRADES, UPGRADE_TYPE } from '../engine/upgrades'
import { applyTheme, THEMES } from '../themes'
import * as sfx from '../audio/sounds'

export const GAME_PHASE = {
  BOOT: 'boot',
  TITLE: 'title',
  GRID: 'grid',
  NODE_COMPLETE: 'node_complete',
  TERMINAL: 'terminal',
  GAME_OVER: 'game_over',
  WIN: 'win',
}

const SAVE_KEY = 'datamines-save'

function saveGame(state) {
  const data = {
    currentNodeId: state.currentNodeId,
    firewalls: state.firewalls,
    maxFirewalls: state.maxFirewalls,
    cache: state.cache,
    entropy: state.entropy,
    totalCacheEarned: state.totalCacheEarned,
    subroutines: state.subroutines,
    exploits: state.exploits,
    kernelLevels: state.kernelLevels,
    phase: state.phase,
    engine: state.engine ? state.engine.serialize() : null,
    elapsed: state.elapsed,
    showPacketSniffer: state.showPacketSniffer,
    rowMineCounts: state.rowMineCounts,
    colMineCounts: state.colMineCounts,
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY)
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null
}

export function getSaveInfo() {
  const save = loadGame()
  if (!save) return null
  return { currentNodeId: save.currentNodeId, cache: save.cache }
}

const store = create((set, get) => ({
  // Game phase
  phase: GAME_PHASE.BOOT,

  // Run state
  currentNodeId: 1,
  firewalls: 3,
  maxFirewalls: 3,
  cache: 0,
  entropy: 0,
  totalCacheEarned: 0,

  // Upgrades
  subroutines: {},   // { upgradeId: level }
  exploits: {},      // { upgradeId: chargesRemaining }
  kernelLevels: {},  // { upgradeId: level }

  // Active ability state
  deepScanActive: false,
  deepScanResults: null,

  // Engine reference
  engine: null,

  // Theme
  currentTheme: localStorage.getItem('datamines-theme') || 'phosphor',

  // UI state
  commandOverlayOpen: false,
  revealAnimations: [],
  mineExplosions: [],
  nodeCompleteData: null,
  showPacketSniffer: false,
  rowMineCounts: [],
  colMineCounts: [],
  soundEnabled: true,

  // Timer
  elapsed: 0,
  timerInterval: null,

  // Actions
  openCommandOverlay: () => set({ commandOverlayOpen: true }),
  closeCommandOverlay: () => set({ commandOverlayOpen: false }),
  setPhase: (phase) => set({ phase }),

  toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),

  setTheme: (themeId) => {
    if (!THEMES[themeId]) return
    localStorage.setItem('datamines-theme', themeId)
    applyTheme(themeId)
    set({ currentTheme: themeId })
  },

  initTheme: () => {
    const themeId = get().currentTheme
    applyTheme(themeId)
  },

  startNewRun: () => {
    clearSave()
    set({
      phase: GAME_PHASE.GRID,
      currentNodeId: 1,
      firewalls: 3,
      maxFirewalls: 3,
      cache: 0,
      entropy: 0,
      totalCacheEarned: 0,
      subroutines: {},
      exploits: {},
      kernelLevels: {},
      deepScanActive: false,
      deepScanResults: null,
      revealAnimations: [],
      mineExplosions: [],
      nodeCompleteData: null,
      elapsed: 0,
    })
    get().initNode(1)
  },

  resumeRun: () => {
    const save = loadGame()
    if (!save) return
    set({
      currentNodeId: save.currentNodeId,
      firewalls: save.firewalls,
      maxFirewalls: save.maxFirewalls,
      cache: save.cache,
      entropy: save.entropy,
      totalCacheEarned: save.totalCacheEarned,
      subroutines: save.subroutines,
      exploits: save.exploits,
      kernelLevels: save.kernelLevels,
      deepScanActive: false,
      deepScanResults: null,
      revealAnimations: [],
      mineExplosions: [],
      nodeCompleteData: null,
      elapsed: save.elapsed || 0,
    })
    if (save.phase === GAME_PHASE.TERMINAL || save.phase === GAME_PHASE.NODE_COMPLETE) {
      set({ phase: GAME_PHASE.TERMINAL, entropy: 0 })
    } else if (save.phase === GAME_PHASE.GRID && save.engine) {
      // Restore exact grid state from save
      const engine = MinesweeperEngine.deserialize(save.engine)
      set({
        engine,
        phase: GAME_PHASE.GRID,
        showPacketSniffer: save.showPacketSniffer || false,
        rowMineCounts: save.rowMineCounts || [],
        colMineCounts: save.colMineCounts || [],
      })
      // Resume the timer if the grid is in progress (mines placed)
      if (!engine.firstClick && !engine.gameOver) {
        get().startTimer()
      }
    } else {
      get().initNode(save.currentNodeId)
    }
  },

  abandonRun: () => {
    clearSave()
    get().stopTimer()
    set({ phase: GAME_PHASE.TITLE })
  },

  initNode: (nodeId) => {
    const node = getNode(nodeId)
    const engine = new MinesweeperEngine(node.rows, node.cols, node.mines)
    const state = get()

    // Clear previous timer
    if (state.timerInterval) clearInterval(state.timerInterval)

    // Packet sniffer state
    const hasPacketSniffer = (state.subroutines.packet_sniffer || 0) >= 1

    set({
      engine,
      currentNodeId: nodeId,
      revealAnimations: [],
      mineExplosions: [],
      deepScanActive: false,
      deepScanResults: null,
      showPacketSniffer: hasPacketSniffer,
      rowMineCounts: [],
      colMineCounts: [],
      elapsed: 0,
      phase: GAME_PHASE.GRID,
    })
  },

  startTimer: () => {
    const state = get()
    if (state.timerInterval) clearInterval(state.timerInterval)
    const interval = setInterval(() => {
      const engine = get().engine
      if (engine && engine.startTime) {
        set({ elapsed: engine.getElapsedTime() })
      }
    }, 1000)
    set({ timerInterval: interval })
  },

  stopTimer: () => {
    const state = get()
    if (state.timerInterval) {
      clearInterval(state.timerInterval)
      set({ timerInterval: null })
    }
  },

  revealCell: (row, col) => {
    const state = get()
    const { engine, soundEnabled } = state
    if (!engine || engine.gameOver) return

    // Start timer on first click
    if (engine.firstClick) {
      get().startTimer()
    }

    const result = engine.reveal(row, col)

    if (result.hit) {
      // Hit a mine
      if (soundEnabled) sfx.playExplosion()
      const newFirewalls = state.firewalls - 1

      set({
        mineExplosions: [...state.mineExplosions, { row, col, time: Date.now() }],
        firewalls: newFirewalls,
      })

      if (newFirewalls <= 0) {
        // Game over
        get().stopTimer()
        engine.gameOver = true
        engine.endTime = Date.now()
        const allMines = engine.revealAllMines()
        set({
          phase: GAME_PHASE.GAME_OVER,
          mineExplosions: [...get().mineExplosions, ...allMines.map(m => ({ ...m, time: Date.now() }))],
        })
        clearSave()
      } else {
        // Firewall absorbed it — re-hide the cell and continue
        engine.cellStates[row][col] = CELL_STATE.HIDDEN
        engine.revealedCount = Math.max(0, engine.revealedCount)
        saveGame(get())
      }
      // Force re-render
      set({ engine: Object.assign(Object.create(Object.getPrototypeOf(engine)), engine) })
    } else if (result.cells.length > 0) {
      // Successful reveal
      if (soundEnabled) {
        if (result.cells.length > 1) {
          result.cells.slice(0, 8).forEach((_, i) => sfx.playCascade(i))
        } else {
          sfx.playReveal()
        }
      }

      // Calculate entropy from reveal
      const entropyBonus = state.subroutines.entropy_harvester
        ? result.cells.length * (state.subroutines.entropy_harvester)
        : result.cells.length

      set({
        entropy: state.entropy + entropyBonus,
        revealAnimations: [...state.revealAnimations, ...result.cells.map(c => ({ ...c, time: Date.now() }))],
      })

      // Update packet sniffer after first click
      if (state.showPacketSniffer && !engine.firstClick) {
        const rowCounts = []
        const colCounts = []
        for (let r = 0; r < engine.rows; r++) rowCounts.push(engine.getRowMineCount(r))
        for (let c = 0; c < engine.cols; c++) colCounts.push(engine.getColMineCount(c))
        set({ rowMineCounts: rowCounts, colMineCounts: colCounts })
      }

      // Check win
      if (engine.won) {
        get().stopTimer()
        if (soundEnabled) sfx.playWin()
        get().completeNode()
      } else {
        saveGame(get())
      }

      // Force re-render
      set({ engine: Object.assign(Object.create(Object.getPrototypeOf(engine)), engine) })
    }
  },

  flagCell: (row, col) => {
    const state = get()
    const { engine, soundEnabled } = state
    if (!engine || engine.gameOver) return

    const result = engine.toggleFlag(row, col)
    if (result && soundEnabled) sfx.playFlag()
    if (result) {
      set({ engine: Object.assign(Object.create(Object.getPrototypeOf(engine)), engine) })
      saveGame(get())
    }
  },

  chordReveal: (row, col) => {
    const state = get()
    const { engine, soundEnabled } = state
    if (!engine || engine.gameOver) return

    const result = engine.chordReveal(row, col)
    if (result.hit) {
      if (soundEnabled) sfx.playExplosion()
      const newFirewalls = state.firewalls - 1
      set({ firewalls: newFirewalls })

      if (newFirewalls <= 0) {
        get().stopTimer()
        engine.gameOver = true
        engine.endTime = Date.now()
        const allMines = engine.revealAllMines()
        set({
          phase: GAME_PHASE.GAME_OVER,
          mineExplosions: allMines.map(m => ({ ...m, time: Date.now() })),
        })
        clearSave()
      } else {
        saveGame(get())
      }
      set({ engine: Object.assign(Object.create(Object.getPrototypeOf(engine)), engine) })
    } else if (result.cells.length > 0) {
      if (soundEnabled) {
        result.cells.slice(0, 6).forEach((_, i) => sfx.playCascade(i))
      }
      const entropyBonus = result.cells.length
      set({ entropy: state.entropy + entropyBonus })

      if (engine.won) {
        get().stopTimer()
        if (soundEnabled) sfx.playWin()
        get().completeNode()
      } else {
        saveGame(get())
      }
      set({ engine: Object.assign(Object.create(Object.getPrototypeOf(engine)), engine) })
    }
  },

  completeNode: () => {
    const state = get()
    const node = getNode(state.currentNodeId)
    const elapsed = state.engine.getElapsedTime()

    // Calculate rewards
    const parTime = node.rows * node.cols * 0.8 // ~0.8s per cell par
    const clockBonus = (state.kernelLevels.clock_speed || 0) * 30
    const effectivePar = parTime + clockBonus
    const underPar = elapsed < effectivePar

    let cacheEarned = node.cacheReward
    const cacheBoostLevel = state.kernelLevels.cache_boost || 0
    cacheEarned = Math.floor(cacheEarned * (1 + cacheBoostLevel * 0.2))

    if (underPar) {
      const cryptoLevel = state.subroutines.crypto_nodes || 0
      const speedBonus = 1 + cryptoLevel * 0.15
      cacheEarned = Math.floor(cacheEarned * speedBonus)
    }

    const entropyEarned = Math.floor(state.entropy * node.entropyMultiplier)

    // Firewall reward: +1 firewall if completed without taking damage
    const perfectClear = state.firewalls === state.maxFirewalls
    const firewallBonus = perfectClear ? 1 : 0
    const newFirewalls = Math.min(state.firewalls + firewallBonus, state.maxFirewalls)

    const nextNode = getNextNode(state.currentNodeId)

    const totalEarned = cacheEarned + entropyEarned

    set({
      phase: GAME_PHASE.NODE_COMPLETE,
      cache: state.cache + totalEarned,
      totalCacheEarned: state.totalCacheEarned + totalEarned,
      firewalls: newFirewalls,
      nodeCompleteData: {
        nodeName: node.name,
        elapsed,
        parTime: effectivePar,
        underPar,
        cacheEarned,
        entropyEarned,
        perfectClear,
        firewallBonus,
        hasNextNode: !!nextNode,
      },
    })
    saveGame(get())
  },

  proceedToTerminal: () => {
    const state = get()
    const nextNode = getNextNode(state.currentNodeId)
    if (nextNode) {
      set({ phase: GAME_PHASE.TERMINAL, entropy: 0 })
      saveGame(get())
    } else {
      set({ phase: GAME_PHASE.WIN })
      clearSave()
    }
  },

  purchaseUpgrade: (upgradeId) => {
    const state = get()
    const upgrade = UPGRADES[upgradeId]
    if (!upgrade || state.cache < upgrade.cost) return false

    if (state.soundEnabled) sfx.playPurchase()

    if (upgrade.type === UPGRADE_TYPE.SUBROUTINE) {
      const currentLevel = state.subroutines[upgradeId] || 0
      if (currentLevel >= upgrade.maxLevel) return false
      set({
        cache: state.cache - upgrade.cost,
        subroutines: { ...state.subroutines, [upgradeId]: currentLevel + 1 },
      })
    } else if (upgrade.type === UPGRADE_TYPE.EXPLOIT) {
      const currentCharges = state.exploits[upgradeId] || 0
      set({
        cache: state.cache - upgrade.cost,
        exploits: { ...state.exploits, [upgradeId]: currentCharges + upgrade.charges },
      })
    } else if (upgrade.type === UPGRADE_TYPE.KERNEL) {
      const currentLevel = state.kernelLevels[upgradeId] || 0
      if (currentLevel >= upgrade.maxLevel) return false

      // Apply kernel effects immediately
      const updates = {
        cache: state.cache - upgrade.cost,
        kernelLevels: { ...state.kernelLevels, [upgradeId]: currentLevel + 1 },
      }

      if (upgradeId === 'firewall_upgrade') {
        updates.maxFirewalls = state.maxFirewalls + 1
        updates.firewalls = state.firewalls + 1
      }

      set(updates)
    }
    saveGame(get())
    return true
  },

  proceedToNextNode: () => {
    const state = get()
    const nextNode = getNextNode(state.currentNodeId)
    if (nextNode) {
      get().initNode(nextNode.id)
    }
  },

  // === Active Abilities ===
  activateDeepScan: () => {
    const state = get()
    const charges = state.exploits.deep_scan || 0
    if (charges <= 0) return
    if (state.soundEnabled) sfx.playDeepScan()
    set({ deepScanActive: true })
  },

  useDeepScan: (row, col) => {
    const state = get()
    const { engine } = state
    if (!engine || !state.deepScanActive) return

    const results = engine.deepScan(row, col)
    set({
      deepScanActive: false,
      deepScanResults: { cells: results, time: Date.now() },
      exploits: { ...state.exploits, deep_scan: (state.exploits.deep_scan || 0) - 1 },
    })

    // Auto-clear results after 3 seconds
    setTimeout(() => {
      set({ deepScanResults: null })
    }, 3000)
  },

  useBitShift: () => {
    const state = get()
    const { engine } = state
    if (!engine || engine.gameOver) return
    const charges = state.exploits.bit_shift || 0
    if (charges <= 0) return

    // Find a random hidden non-mine cell
    const hidden = []
    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        if (engine.cellStates[r][c] === CELL_STATE.HIDDEN && engine.board[r][c] !== -1) {
          hidden.push([r, c])
        }
      }
    }
    if (hidden.length === 0) return

    const [r, c] = hidden[Math.floor(Math.random() * hidden.length)]
    set({
      exploits: { ...state.exploits, bit_shift: charges - 1 },
    })
    get().revealCell(r, c)
  },

  useDefrag: () => {
    const state = get()
    const { engine } = state
    if (!engine || engine.gameOver) return
    const charges = state.exploits.defrag || 0
    if (charges <= 0) return

    // Find all hidden zero-value cells and reveal them
    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        if (engine.cellStates[r][c] === CELL_STATE.HIDDEN && engine.board[r][c] === 0) {
          // Only works after first click (mines placed)
          if (!engine.firstClick) {
            get().revealCell(r, c)
          }
        }
      }
    }
    set({
      exploits: { ...state.exploits, defrag: charges - 1 },
    })
  },
}))

export const useGameStore = store
