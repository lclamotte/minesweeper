import { create } from 'zustand'
import { MinesweeperEngine, CELL_STATE } from '../engine/MinesweeperEngine'
import { getNode, getNextNode } from '../engine/nodes'
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
const LEDGER_BLOCK_SIZE = 5

const makeCellKey = (row, col) => `${row},${col}`

function cloneEngine(engine) {
  return Object.assign(Object.create(Object.getPrototypeOf(engine)), engine)
}

function randomFrom(arr) {
  if (!arr || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function rebuildAdjacency(engine) {
  for (let r = 0; r < engine.rows; r++) {
    for (let c = 0; c < engine.cols; c++) {
      engine.board[r][c] = 0
    }
  }

  for (const key of engine.mines) {
    const [r, c] = key.split(',').map(Number)
    engine.board[r][c] = -1
  }

  for (let r = 0; r < engine.rows; r++) {
    for (let c = 0; c < engine.cols; c++) {
      if (engine.board[r][c] === -1) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < engine.rows && nc >= 0 && nc < engine.cols && engine.board[nr][nc] === -1) {
            count++
          }
        }
      }
      engine.board[r][c] = count
    }
  }
}

function relocateMine(engine, fromRow, fromCol, bannedKeys = new Set()) {
  const sourceKey = makeCellKey(fromRow, fromCol)
  if (!engine.mines.has(sourceKey)) return false

  const candidates = []
  for (let r = 0; r < engine.rows; r++) {
    for (let c = 0; c < engine.cols; c++) {
      const key = makeCellKey(r, c)
      if (engine.mines.has(key)) continue
      if (bannedKeys.has(key)) continue
      if (engine.cellStates[r][c] !== CELL_STATE.HIDDEN) continue
      candidates.push({ row: r, col: c, key })
    }
  }

  const target = randomFrom(candidates)
  if (!target) return false

  engine.mines.delete(sourceKey)
  engine.mines.add(target.key)
  return true
}

function forceZeroAt(engine, row, col) {
  if (engine.firstClick) return

  const forbidden = new Set()
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < engine.rows && nc >= 0 && nc < engine.cols) {
        forbidden.add(makeCellKey(nr, nc))
      }
    }
  }

  const moveTargets = []
  if (engine.isMine(row, col)) {
    moveTargets.push([row, col])
  }
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < engine.rows && nc >= 0 && nc < engine.cols && engine.isMine(nr, nc)) {
        moveTargets.push([nr, nc])
      }
    }
  }

  for (const [mr, mc] of moveTargets) {
    relocateMine(engine, mr, mc, forbidden)
  }

  rebuildAdjacency(engine)
}

function buildLedgerLinks(mineOrder) {
  const links = []
  for (let i = 1; i < mineOrder.length; i++) {
    const current = mineOrder[i]
    let nearestIdx = 0
    let nearestDist = Number.POSITIVE_INFINITY

    for (let j = i - 1; j >= 0; j--) {
      const previous = mineOrder[j]
      const dr = current.row - previous.row
      const dc = current.col - previous.col
      const dist = dr * dr + dc * dc
      if (dist < nearestDist) {
        nearestDist = dist
        nearestIdx = j
      }
    }

    const nearest = mineOrder[nearestIdx]
    links.push({
      from: { row: nearest.row, col: nearest.col },
      to: { row: current.row, col: current.col },
      time: current.flaggedAt,
    })
  }
  return links
}

function revealLedgerBlockAdjacents(engine, blockMines) {
  const targets = new Set()
  const revealed = []

  for (const mine of blockMines) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const row = mine.row + dr
        const col = mine.col + dc
        if (row < 0 || row >= engine.rows || col < 0 || col >= engine.cols) continue
        if (engine.isMine(row, col)) continue
        targets.add(makeCellKey(row, col))
      }
    }
  }

  for (const target of targets) {
    const [row, col] = target.split(',').map(Number)
    if (engine.getCellState(row, col) !== CELL_STATE.HIDDEN) continue
    const result = engine.reveal(row, col)
    if (!result.hit && result.cells.length > 0) {
      revealed.push(...result.cells)
    }
  }

  return revealed
}

function getRandomAdjacentHiddenSafe(engine, row, col) {
  const candidates = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr < 0 || nr >= engine.rows || nc < 0 || nc >= engine.cols) continue
      if (engine.cellStates[nr][nc] !== CELL_STATE.HIDDEN) continue
      if (engine.isMine(nr, nc)) continue
      candidates.push([nr, nc])
    }
  }
  return randomFrom(candidates)
}

function miningRigReward(state, revealedCount, ledgerMineCount) {
  if ((state.subroutines.mining_rig || 0) < 1 || revealedCount <= 0) {
    return { cacheBonus: 0, nextProgress: state.miningRigProgress }
  }

  const total = state.miningRigProgress + revealedCount
  const chunks = Math.floor(total / 10)
  const multiplier = ledgerMineCount >= LEDGER_BLOCK_SIZE ? 2 : 1

  return {
    cacheBonus: chunks * multiplier,
    nextProgress: total % 10,
  }
}

function entropyReward(state, revealedCount, now) {
  if (revealedCount <= 0) return 0
  const harvest = state.subroutines.entropy_harvester ? state.subroutines.entropy_harvester : 1
  const overclockMult = state.overclockUntil > now ? 3 : 1
  return revealedCount * harvest * overclockMult
}

function consumeExploit(state, id) {
  return {
    ...state.exploits,
    [id]: Math.max(0, (state.exploits[id] || 0) - 1),
  }
}

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
    rootAccess: state.rootAccess,
    phase: state.phase,
    engine: state.engine ? state.engine.serialize() : null,
    elapsed: state.elapsed,
    showPacketSniffer: state.showPacketSniffer,
    rowMineCounts: state.rowMineCounts,
    colMineCounts: state.colMineCounts,
    ledgerLinks: state.ledgerLinks,
    ledgerMineOrder: state.ledgerMineOrder,
    ledgerValidatedBlocks: state.ledgerValidatedBlocks,
    ledgerPulse: state.ledgerPulse,
    zeroDayClicksUsed: state.zeroDayClicksUsed,
    miningRigProgress: state.miningRigProgress,
    overclockUntil: state.overclockUntil,
    sqlInjectActive: state.sqlInjectActive,
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
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
  phase: GAME_PHASE.TITLE,

  // Run state
  currentNodeId: 1,
  firewalls: 3,
  maxFirewalls: 3,
  cache: 0,
  entropy: 0,
  totalCacheEarned: 0,
  rootAccess: true,

  // Upgrades
  subroutines: {},
  exploits: {},
  kernelLevels: {},

  // Active ability state
  deepScanActive: false,
  sqlInjectActive: false,
  deepScanResults: null,
  overclockUntil: 0,

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
  ledgerLinks: [],
  ledgerMineOrder: [],
  ledgerValidatedBlocks: 0,
  ledgerPulse: null,
  zeroDayClicksUsed: 0,
  miningRigProgress: 0,

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
      rootAccess: true,
      subroutines: {},
      exploits: {},
      kernelLevels: {},
      deepScanActive: false,
      sqlInjectActive: false,
      deepScanResults: null,
      overclockUntil: 0,
      revealAnimations: [],
      mineExplosions: [],
      nodeCompleteData: null,
      elapsed: 0,
      ledgerLinks: [],
      ledgerMineOrder: [],
      ledgerValidatedBlocks: 0,
      ledgerPulse: null,
      zeroDayClicksUsed: 0,
      miningRigProgress: 0,
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
      rootAccess: save.rootAccess ?? true,
      subroutines: save.subroutines,
      exploits: save.exploits,
      kernelLevels: save.kernelLevels,
      deepScanActive: false,
      sqlInjectActive: false,
      deepScanResults: null,
      overclockUntil: save.overclockUntil || 0,
      revealAnimations: [],
      mineExplosions: [],
      nodeCompleteData: null,
      elapsed: save.elapsed || 0,
      ledgerLinks: save.ledgerLinks || [],
      ledgerMineOrder: save.ledgerMineOrder || [],
      ledgerValidatedBlocks: save.ledgerValidatedBlocks || 0,
      ledgerPulse: save.ledgerPulse || null,
      zeroDayClicksUsed: save.zeroDayClicksUsed || 0,
      miningRigProgress: save.miningRigProgress || 0,
    })

    if (save.phase === GAME_PHASE.TERMINAL || save.phase === GAME_PHASE.NODE_COMPLETE) {
      set({ phase: GAME_PHASE.TERMINAL, entropy: 0 })
    } else if (save.phase === GAME_PHASE.GRID && save.engine) {
      const engine = MinesweeperEngine.deserialize(save.engine)
      set({
        engine,
        phase: GAME_PHASE.GRID,
        showPacketSniffer: save.showPacketSniffer || false,
        rowMineCounts: save.rowMineCounts || [],
        colMineCounts: save.colMineCounts || [],
      })
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

    if (state.timerInterval) clearInterval(state.timerInterval)

    const hasPacketSniffer = (state.subroutines.packet_sniffer || 0) >= 1

    set({
      engine,
      currentNodeId: nodeId,
      revealAnimations: [],
      mineExplosions: [],
      deepScanActive: false,
      sqlInjectActive: false,
      deepScanResults: null,
      overclockUntil: 0,
      showPacketSniffer: hasPacketSniffer,
      rowMineCounts: [],
      colMineCounts: [],
      elapsed: 0,
      phase: GAME_PHASE.GRID,
      ledgerLinks: [],
      ledgerMineOrder: [],
      ledgerValidatedBlocks: 0,
      ledgerPulse: null,
      zeroDayClicksUsed: 0,
      miningRigProgress: 0,
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

    const wasHidden = engine.getCellState(row, col) === CELL_STATE.HIDDEN

    if (engine.firstClick) {
      get().startTimer()
    }

    if ((state.subroutines.zero_day || 0) >= 1 && state.zeroDayClicksUsed < 3 && wasHidden && !engine.firstClick) {
      forceZeroAt(engine, row, col)
    }

    const now = Date.now()
    const result = engine.reveal(row, col)

    if (result.hit) {
      if (soundEnabled) sfx.playExplosion()
      const newFirewalls = state.firewalls - 1

      const updates = {
        mineExplosions: [...state.mineExplosions, { row, col, time: now }],
        firewalls: newFirewalls,
      }

      if (newFirewalls <= 0) {
        get().stopTimer()
        engine.gameOver = true
        engine.endTime = now
        const allMines = engine.revealAllMines()
        set({
          ...updates,
          phase: GAME_PHASE.GAME_OVER,
          mineExplosions: [...updates.mineExplosions, ...allMines.map(m => ({ ...m, time: now }))],
          engine: cloneEngine(engine),
        })
        clearSave()
        return
      }

      if ((state.subroutines.hot_swap || 0) >= 1) {
        const mineKey = makeCellKey(row, col)
        engine.mines.delete(mineKey)
        engine.mineCount = Math.max(0, engine.mineCount - 1)
        engine.cellStates[row][col] = CELL_STATE.HIDDEN
        rebuildAdjacency(engine)

        const auto = getRandomAdjacentHiddenSafe(engine, row, col)
        let autoCells = []
        if (auto) {
          const autoResult = engine.reveal(auto[0], auto[1])
          if (!autoResult.hit && autoResult.cells.length > 0) {
            autoCells = autoResult.cells
          }
        }

        if (autoCells.length > 0) {
          const entropyBonus = entropyReward(state, autoCells.length, now)
          const { cacheBonus, nextProgress } = miningRigReward(state, autoCells.length, state.ledgerMineOrder.length)
          updates.entropy = state.entropy + entropyBonus
          updates.cache = state.cache + cacheBonus
          updates.miningRigProgress = nextProgress
          updates.revealAnimations = [...state.revealAnimations, ...autoCells.map(cell => ({ ...cell, time: now }))]
          if (soundEnabled) {
            autoCells.slice(0, 6).forEach((_, i) => sfx.playCascade(i))
          }
        }
      } else {
        engine.cellStates[row][col] = CELL_STATE.HIDDEN
      }

      if ((state.subroutines.zero_day || 0) >= 1 && state.zeroDayClicksUsed < 3 && wasHidden) {
        updates.zeroDayClicksUsed = state.zeroDayClicksUsed + 1
      }

      updates.engine = cloneEngine(engine)
      set(updates)

      if (engine.won) {
        get().stopTimer()
        if (soundEnabled) sfx.playWin()
        get().completeNode()
        return
      }

      saveGame(get())
      return
    }

    if (result.cells.length > 0) {
      if (soundEnabled) {
        if (result.cells.length > 1) {
          result.cells.slice(0, 8).forEach((_, i) => sfx.playCascade(i))
        } else {
          sfx.playReveal()
        }
      }

      const entropyBonus = entropyReward(state, result.cells.length, now)
      const { cacheBonus, nextProgress } = miningRigReward(state, result.cells.length, state.ledgerMineOrder.length)

      const updates = {
        entropy: state.entropy + entropyBonus,
        cache: state.cache + cacheBonus,
        miningRigProgress: nextProgress,
        revealAnimations: [...state.revealAnimations, ...result.cells.map(c => ({ ...c, time: now }))],
      }

      if ((state.subroutines.zero_day || 0) >= 1 && state.zeroDayClicksUsed < 3 && wasHidden) {
        updates.zeroDayClicksUsed = state.zeroDayClicksUsed + 1
      }

      if (state.showPacketSniffer && !engine.firstClick) {
        const rowCounts = []
        const colCounts = []
        for (let r = 0; r < engine.rows; r++) rowCounts.push(engine.getRowMineCount(r))
        for (let c = 0; c < engine.cols; c++) colCounts.push(engine.getColMineCount(c))
        updates.rowMineCounts = rowCounts
        updates.colMineCounts = colCounts
      }

      updates.engine = cloneEngine(engine)
      set(updates)

      if (engine.won) {
        get().stopTimer()
        if (soundEnabled) sfx.playWin()
        get().completeNode()
      } else {
        saveGame(get())
      }
    }
  },

  flagCell: (row, col) => {
    const state = get()
    const { engine, soundEnabled } = state
    if (!engine || engine.gameOver) return

    const result = engine.toggleFlag(row, col)
    if (!result) return
    if (soundEnabled) sfx.playFlag()

    const hasLedgerLink = (state.subroutines.ledger_link || 0) >= 1

    if (!hasLedgerLink) {
      set({
        engine: cloneEngine(engine),
        ledgerLinks: [],
        ledgerMineOrder: [],
        ledgerValidatedBlocks: 0,
        ledgerPulse: null,
      })
      saveGame(get())
      return
    }

    const now = Date.now()
    let ledgerMineOrder = state.ledgerMineOrder
    let ledgerValidatedBlocks = state.ledgerValidatedBlocks

    if (result.flagged) {
      const alreadyTracked = ledgerMineOrder.some(cell => cell.row === row && cell.col === col)
      if (!alreadyTracked && !engine.firstClick && engine.isMine(row, col)) {
        ledgerMineOrder = [...ledgerMineOrder, { row, col, flaggedAt: now }]
      }
    } else {
      ledgerMineOrder = ledgerMineOrder.filter(cell => !(cell.row === row && cell.col === col))
    }

    const ledgerLinks = buildLedgerLinks(ledgerMineOrder)
    let ledgerPulse = state.ledgerPulse
    let ledgerRevealCells = []

    if (!engine.firstClick) {
      const completedBlocks = Math.floor(ledgerMineOrder.length / LEDGER_BLOCK_SIZE)
      if (completedBlocks > ledgerValidatedBlocks) {
        const blockStart = ledgerValidatedBlocks * LEDGER_BLOCK_SIZE
        const blockMines = ledgerMineOrder.slice(blockStart, blockStart + LEDGER_BLOCK_SIZE)
        ledgerRevealCells = revealLedgerBlockAdjacents(engine, blockMines)

        const pulse = {
          block: ledgerValidatedBlocks + 1,
          mines: blockMines.map(cell => ({ row: cell.row, col: cell.col })),
          time: now,
        }
        ledgerPulse = pulse
        ledgerValidatedBlocks = completedBlocks

        setTimeout(() => {
          const activePulse = get().ledgerPulse
          if (activePulse && activePulse.time === pulse.time) {
            set({ ledgerPulse: null })
          }
        }, 750)
      }
    }

    const updates = {
      engine: cloneEngine(engine),
      ledgerMineOrder,
      ledgerLinks,
      ledgerValidatedBlocks,
      ledgerPulse,
    }

    if (ledgerRevealCells.length > 0) {
      if (soundEnabled) {
        ledgerRevealCells.slice(0, 6).forEach((_, i) => sfx.playCascade(i))
      }

      const entropyBonus = entropyReward(state, ledgerRevealCells.length, now)
      const { cacheBonus, nextProgress } = miningRigReward(state, ledgerRevealCells.length, ledgerMineOrder.length)
      updates.entropy = state.entropy + entropyBonus
      updates.cache = state.cache + cacheBonus
      updates.miningRigProgress = nextProgress
      updates.revealAnimations = [...state.revealAnimations, ...ledgerRevealCells.map(cell => ({ ...cell, time: now }))]
    }

    set(updates)

    if (engine.won) {
      get().stopTimer()
      if (soundEnabled) sfx.playWin()
      get().completeNode()
      return
    }

    saveGame(get())
  },

  chordReveal: (row, col) => {
    const state = get()
    const { engine, soundEnabled } = state
    if (!engine || engine.gameOver) return

    const now = Date.now()
    const result = engine.chordReveal(row, col)

    if (result.hit) {
      if (soundEnabled) sfx.playExplosion()
      const newFirewalls = state.firewalls - 1
      set({ firewalls: newFirewalls, engine: cloneEngine(engine) })

      if (newFirewalls <= 0) {
        get().stopTimer()
        engine.gameOver = true
        engine.endTime = now
        const allMines = engine.revealAllMines()
        set({
          phase: GAME_PHASE.GAME_OVER,
          mineExplosions: allMines.map(m => ({ ...m, time: now })),
          engine: cloneEngine(engine),
        })
        clearSave()
      } else {
        saveGame(get())
      }
      return
    }

    if (result.cells.length > 0) {
      if (soundEnabled) {
        result.cells.slice(0, 6).forEach((_, i) => sfx.playCascade(i))
      }

      const entropyBonus = entropyReward(state, result.cells.length, now)
      const { cacheBonus, nextProgress } = miningRigReward(state, result.cells.length, state.ledgerMineOrder.length)
      set({
        entropy: state.entropy + entropyBonus,
        cache: state.cache + cacheBonus,
        miningRigProgress: nextProgress,
        engine: cloneEngine(engine),
      })

      if (engine.won) {
        get().stopTimer()
        if (soundEnabled) sfx.playWin()
        get().completeNode()
      } else {
        saveGame(get())
      }
    }
  },

  completeNode: () => {
    const state = get()
    const node = getNode(state.currentNodeId)
    const elapsed = state.engine.getElapsedTime()

    const parTime = node.rows * node.cols * 0.8
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
      set({ phase: GAME_PHASE.TERMINAL, entropy: 0, deepScanResults: null, deepScanActive: false, sqlInjectActive: false })
      saveGame(get())
    } else {
      set({ phase: GAME_PHASE.WIN })
      clearSave()
    }
  },

  purchaseUpgrade: (upgradeId, offeredCost = null) => {
    const state = get()
    const upgrade = UPGRADES[upgradeId]
    if (!upgrade) return false

    const safeCost = Number.isFinite(offeredCost)
      ? Math.max(0, Math.min(upgrade.cost, Math.floor(offeredCost)))
      : upgrade.cost

    if (state.cache < safeCost) return false
    if (upgrade.requiresRoot && !state.rootAccess) return false

    if (state.soundEnabled) sfx.playPurchase()

    if (upgrade.type === UPGRADE_TYPE.SUBROUTINE) {
      const currentLevel = state.subroutines[upgradeId] || 0
      if (currentLevel >= upgrade.maxLevel) return false
      set({
        cache: state.cache - safeCost,
        subroutines: { ...state.subroutines, [upgradeId]: currentLevel + 1 },
      })
    } else if (upgrade.type === UPGRADE_TYPE.EXPLOIT) {
      const currentCharges = state.exploits[upgradeId] || 0
      set({
        cache: state.cache - safeCost,
        exploits: { ...state.exploits, [upgradeId]: currentCharges + (upgrade.charges || 1) },
      })
    } else if (upgrade.type === UPGRADE_TYPE.KERNEL) {
      const currentLevel = state.kernelLevels[upgradeId] || 0
      if (currentLevel >= upgrade.maxLevel) return false

      const updates = {
        cache: state.cache - safeCost,
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
    set({ deepScanActive: true, sqlInjectActive: false })
  },

  useDeepScan: (row, col) => {
    const state = get()
    const { engine } = state
    if (!engine || !state.deepScanActive) return

    const results = engine.deepScan(row, col)
    set({
      deepScanActive: false,
      deepScanResults: { cells: results, time: Date.now() },
      exploits: consumeExploit(state, 'deep_scan'),
    })

    setTimeout(() => {
      set({ deepScanResults: null })
    }, 3000)

    saveGame(get())
  },

  activateSqlInject: () => {
    const state = get()
    const charges = state.exploits.sql_inject || 0
    if (charges <= 0) return
    if (state.soundEnabled) sfx.playClick()
    set({ sqlInjectActive: true, deepScanActive: false })
  },

  useSqlInject: (row) => {
    const state = get()
    const { engine } = state
    if (!engine || !state.sqlInjectActive) return

    const cells = []
    for (let c = 0; c < engine.cols; c++) {
      cells.push({
        row,
        col: c,
        value: engine.board[row][c],
        isMine: engine.board[row][c] === -1,
        state: engine.cellStates[row][c],
      })
    }

    set({
      sqlInjectActive: false,
      deepScanResults: { cells, time: Date.now() },
      exploits: consumeExploit(state, 'sql_inject'),
    })

    setTimeout(() => {
      set({ deepScanResults: null })
    }, 3000)

    saveGame(get())
  },

  useBitShift: () => {
    const state = get()
    const { engine } = state
    if (!engine || engine.gameOver) return
    const charges = state.exploits.bit_shift || 0
    if (charges <= 0) return

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
    set({ exploits: consumeExploit(state, 'bit_shift') })
    get().revealCell(r, c)
    saveGame(get())
  },

  useDefrag: () => {
    const state = get()
    const { engine } = state
    if (!engine || engine.gameOver) return
    const charges = state.exploits.defrag || 0
    if (charges <= 0) return

    set({ exploits: consumeExploit(state, 'defrag') })

    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        if (engine.cellStates[r][c] === CELL_STATE.HIDDEN && engine.board[r][c] === 0 && !engine.firstClick) {
          get().revealCell(r, c)
        }
      }
    }

    saveGame(get())
  },

  useOverclock: () => {
    const state = get()
    const charges = state.exploits.overclock || 0
    if (charges <= 0) return

    const until = Date.now() + 15000
    set({
      overclockUntil: until,
      exploits: consumeExploit(state, 'overclock'),
    })
    saveGame(get())
  },

  useSystemRestore: () => {
    const state = get()
    const charges = state.exploits.system_restore || 0
    if (charges <= 0) return

    set({
      deepScanResults: null,
      deepScanActive: false,
      sqlInjectActive: false,
      ledgerPulse: null,
      exploits: consumeExploit(state, 'system_restore'),
    })
    saveGame(get())
  },

  useForkChain: () => {
    const state = get()
    const { engine, soundEnabled } = state
    const charges = state.exploits.fork_chain || 0
    if (!engine || engine.gameOver || charges <= 0) return

    const now = Date.now()

    let ledgerMineOrder = [...state.ledgerMineOrder]
    const tracked = new Set(ledgerMineOrder.map(cell => makeCellKey(cell.row, cell.col)))
    const flaggedMines = []

    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        if (engine.cellStates[r][c] === CELL_STATE.FLAGGED && engine.isMine(r, c)) {
          flaggedMines.push({ row: r, col: c })
        }
      }
    }

    for (const cell of flaggedMines) {
      const key = makeCellKey(cell.row, cell.col)
      if (!tracked.has(key)) {
        ledgerMineOrder.push({ ...cell, flaggedAt: now })
      }
    }

    ledgerMineOrder.sort((a, b) => a.flaggedAt - b.flaggedAt)

    let ledgerValidatedBlocks = state.ledgerValidatedBlocks
    const previousBlocks = ledgerValidatedBlocks
    const targetBlocks = Math.floor(ledgerMineOrder.length / LEDGER_BLOCK_SIZE)
    let revealedCells = []
    const pulseMines = []

    while (ledgerValidatedBlocks < targetBlocks) {
      const start = ledgerValidatedBlocks * LEDGER_BLOCK_SIZE
      const blockMines = ledgerMineOrder.slice(start, start + LEDGER_BLOCK_SIZE)
      revealedCells = revealedCells.concat(revealLedgerBlockAdjacents(engine, blockMines))
      pulseMines.push(...blockMines.map(cell => ({ row: cell.row, col: cell.col })))
      ledgerValidatedBlocks++
    }

    const ledgerLinks = buildLedgerLinks(ledgerMineOrder)
    const updates = {
      exploits: consumeExploit(state, 'fork_chain'),
      ledgerMineOrder,
      ledgerLinks,
      ledgerValidatedBlocks,
      engine: cloneEngine(engine),
    }

    if (ledgerValidatedBlocks > previousBlocks) {
      const pulse = {
        block: ledgerValidatedBlocks,
        mines: pulseMines,
        time: now,
      }
      updates.ledgerPulse = pulse
      setTimeout(() => {
        const activePulse = get().ledgerPulse
        if (activePulse && activePulse.time === pulse.time) {
          set({ ledgerPulse: null })
        }
      }, 750)
    }

    if (revealedCells.length > 0) {
      if (soundEnabled) {
        revealedCells.slice(0, 8).forEach((_, i) => sfx.playCascade(i))
      }
      const entropyBonus = entropyReward(state, revealedCells.length, now)
      const { cacheBonus, nextProgress } = miningRigReward(state, revealedCells.length, ledgerMineOrder.length)
      updates.entropy = state.entropy + entropyBonus
      updates.cache = state.cache + cacheBonus
      updates.miningRigProgress = nextProgress
      updates.revealAnimations = [...state.revealAnimations, ...revealedCells.map(cell => ({ ...cell, time: now }))]
    }

    set(updates)

    if (engine.won) {
      get().stopTimer()
      if (soundEnabled) sfx.playWin()
      get().completeNode()
      return
    }

    saveGame(get())
  },

  useSignalJammer: () => {
    const state = get()
    const { engine } = state
    const charges = state.exploits.signal_jammer || 0
    if (!engine || charges <= 0) return

    if (engine.startTime) {
      engine.startTime += 30000
    }

    set({
      exploits: consumeExploit(state, 'signal_jammer'),
      elapsed: engine.getElapsedTime(),
      engine: cloneEngine(engine),
    })
    saveGame(get())
  },

  useReboot: () => {
    const state = get()
    const { engine } = state
    const charges = state.exploits.reboot || 0
    if (!engine || engine.gameOver || engine.firstClick || charges <= 0) return

    const hiddenCells = []
    let hiddenMineCount = 0

    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        if (engine.cellStates[r][c] !== CELL_STATE.HIDDEN) continue
        hiddenCells.push([r, c])
        if (engine.isMine(r, c)) hiddenMineCount++
      }
    }

    if (hiddenCells.length <= hiddenMineCount) return

    for (const [r, c] of hiddenCells) {
      engine.mines.delete(makeCellKey(r, c))
    }

    const shuffled = shuffleInPlace([...hiddenCells])
    for (let i = 0; i < hiddenMineCount; i++) {
      const [r, c] = shuffled[i]
      engine.mines.add(makeCellKey(r, c))
    }

    rebuildAdjacency(engine)

    set({
      exploits: consumeExploit(state, 'reboot'),
      deepScanResults: null,
      engine: cloneEngine(engine),
    })
    saveGame(get())
  },

  useDockerCompose: () => {
    const state = get()
    const charges = state.exploits.docker_compose || 0
    if (charges <= 0) return

    set({ exploits: consumeExploit(state, 'docker_compose') })
    saveGame(get())
  },
}))

export const useGameStore = store
