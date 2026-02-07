import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { CELL_STATE } from '../engine/MinesweeperEngine'
import { getCanvasColors } from '../themes'

const CELL_SIZE = 32
const CELL_GAP = 1
const HEADER_SIZE = 24 // for packet sniffer row/col labels
const LEDGER_LINK_RGB = '57, 255, 20'

export default function GameGrid() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [hoveredCell, setHoveredCell] = useState(null)
  const [canvasScale, setCanvasScale] = useState(1)
  const [animTick, setAnimTick] = useState(0)

  const currentTheme = useGameStore(s => s.currentTheme)
  const COLORS = useMemo(() => getCanvasColors(currentTheme), [currentTheme])

  const engine = useGameStore(s => s.engine)
  const revealCell = useGameStore(s => s.revealCell)
  const flagCell = useGameStore(s => s.flagCell)
  const deepScanActive = useGameStore(s => s.deepScanActive)
  const sqlInjectActive = useGameStore(s => s.sqlInjectActive)
  const deepScanResults = useGameStore(s => s.deepScanResults)
  const useDeepScan = useGameStore(s => s.useDeepScan)
  const useSqlInject = useGameStore(s => s.useSqlInject)
  const mineExplosions = useGameStore(s => s.mineExplosions)
  const ledgerEnabled = useGameStore(s => (s.subroutines.ledger_link || 0) > 0)
  const bruteForceEnabled = useGameStore(s => (s.subroutines.brute_force || 0) > 0)
  const deepPacketEnabled = useGameStore(s => (s.subroutines.deep_packet || 0) > 0)
  const ledgerLinks = useGameStore(s => s.ledgerLinks)
  const ledgerPulse = useGameStore(s => s.ledgerPulse)
  const showPacketSniffer = useGameStore(s => s.showPacketSniffer)
  const rowMineCounts = useGameStore(s => s.rowMineCounts)
  const colMineCounts = useGameStore(s => s.colMineCounts)

  const getGridDimensions = useCallback(() => {
    if (!engine) return { width: 0, height: 0, offsetX: 0, offsetY: 0 }
    const offset = showPacketSniffer ? HEADER_SIZE : 0
    return {
      width: engine.cols * (CELL_SIZE + CELL_GAP) + CELL_GAP + offset,
      height: engine.rows * (CELL_SIZE + CELL_GAP) + CELL_GAP + offset,
      offsetX: offset,
      offsetY: offset,
    }
  }, [engine, showPacketSniffer])

  useEffect(() => {
    if (!containerRef.current || !engine) return
    const dims = getGridDimensions()
    const container = containerRef.current
    const maxW = container.clientWidth * 0.96
    const maxH = container.clientHeight * 0.98
    const scale = Math.min(maxW / dims.width, maxH / dims.height)
    setCanvasScale(scale)
  }, [engine, getGridDimensions])

  useEffect(() => {
    const hasAnimatedState = ledgerEnabled || bruteForceEnabled || deepPacketEnabled || deepScanActive || sqlInjectActive
    if (!hasAnimatedState && !ledgerPulse) return
    const interval = setInterval(() => {
      setAnimTick(tick => tick + 1)
    }, 90)
    return () => clearInterval(interval)
  }, [ledgerEnabled, bruteForceEnabled, deepPacketEnabled, deepScanActive, sqlInjectActive, ledgerPulse])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !engine) return
    const ctx = canvas.getContext('2d')
    const dims = getGridDimensions()
    const dpr = window.devicePixelRatio || 1

    canvas.width = dims.width * dpr
    canvas.height = dims.height * dpr
    canvas.style.width = `${dims.width}px`
    canvas.style.height = `${dims.height}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, dims.width, dims.height)

    if (showPacketSniffer && rowMineCounts.length > 0) {
      ctx.font = '10px "Fira Code", monospace'
      ctx.fillStyle = COLORS.packetSnifferText
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (let c = 0; c < engine.cols; c++) {
        const x = dims.offsetX + c * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
        ctx.fillText(String(colMineCounts[c] ?? ''), x, dims.offsetY / 2)
      }

      for (let r = 0; r < engine.rows; r++) {
        const y = dims.offsetY + r * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
        ctx.fillText(String(rowMineCounts[r] ?? ''), dims.offsetX / 2, y)
      }
    }

    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        const x = dims.offsetX + c * (CELL_SIZE + CELL_GAP) + CELL_GAP
        const y = dims.offsetY + r * (CELL_SIZE + CELL_GAP) + CELL_GAP
        const state = engine.cellStates[r][c]
        const value = engine.board[r][c]
        const isHovered = hoveredCell && hoveredCell.row === r && hoveredCell.col === c

        if (state === CELL_STATE.HIDDEN) {
          ctx.fillStyle = isHovered ? COLORS.hiddenHover : COLORS.hidden
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
          ctx.strokeStyle = COLORS.hiddenBorder
          ctx.lineWidth = 0.5
          ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)

          ctx.fillStyle = COLORS.hiddenDot
          ctx.fillRect(x + CELL_SIZE / 2 - 0.5, y + CELL_SIZE / 2 - 0.5, 1, 1)

        } else if (state === CELL_STATE.FLAGGED) {
          ctx.fillStyle = COLORS.hidden
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
          ctx.strokeStyle = COLORS.flagStroke
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)

          ctx.font = 'bold 16px "Fira Code", monospace'
          ctx.fillStyle = COLORS.flag
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('⚑', x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 1)

        } else if (state === CELL_STATE.REVEALED) {
          ctx.fillStyle = COLORS.revealed
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
          ctx.strokeStyle = COLORS.revealedBorder
          ctx.lineWidth = 0.5
          ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)

          if (value === -1) {
            ctx.font = 'bold 16px "Fira Code", monospace'
            ctx.fillStyle = COLORS.mine
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('✱', x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 1)
          } else if (value > 0) {
            ctx.font = 'bold 14px "Fira Code", monospace'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            if (bruteForceEnabled) {
              if (value <= 2) {
                ctx.fillStyle = 'rgba(120, 220, 120, 0.9)'
              } else if (value <= 4) {
                ctx.fillStyle = 'rgba(255, 176, 0, 0.95)'
              } else {
                const pulse = 0.55 + Math.abs(Math.sin((animTick + r + c) * 0.5)) * 0.45
                ctx.fillStyle = `rgba(255, 40, 40, ${pulse})`
                ctx.shadowColor = 'rgba(255, 40, 40, 0.8)'
                ctx.shadowBlur = 6
              }
            } else {
              ctx.fillStyle = COLORS.text[value] || '#ffffff'
            }

            ctx.fillText(String(value), x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 1)
            ctx.shadowBlur = 0
          }
        }
      }
    }

    if (ledgerEnabled && ledgerLinks.length > 0) {
      ctx.save()
      ctx.lineCap = 'round'
      ctx.setLineDash([5, 3])

      ledgerLinks.forEach((link, idx) => {
        const fromX = dims.offsetX + link.from.col * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
        const fromY = dims.offsetY + link.from.row * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
        const toX = dims.offsetX + link.to.col * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
        const toY = dims.offsetY + link.to.row * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
        const flicker = 0.4 + Math.abs(Math.sin((animTick + idx * 5) * 0.65)) * 0.45

        ctx.lineDashOffset = -((animTick * 0.8 + idx * 2) % 8)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = `rgba(${LEDGER_LINK_RGB}, ${flicker})`
        ctx.shadowColor = `rgba(${LEDGER_LINK_RGB}, 0.7)`
        ctx.shadowBlur = 7
        ctx.beginPath()
        ctx.moveTo(fromX, fromY)
        ctx.lineTo(toX, toY)
        ctx.stroke()

        ctx.setLineDash([])
        ctx.shadowBlur = 0
        ctx.lineWidth = 0.8
        ctx.strokeStyle = `rgba(${LEDGER_LINK_RGB}, ${Math.min(1, flicker + 0.25)})`
        ctx.beginPath()
        ctx.moveTo(fromX, fromY)
        ctx.lineTo(toX, toY)
        ctx.stroke()
        ctx.setLineDash([5, 3])
      })

      ctx.restore()
    }

    if (deepScanResults) {
      deepScanResults.cells.forEach(cell => {
        const x = dims.offsetX + cell.col * (CELL_SIZE + CELL_GAP) + CELL_GAP
        const y = dims.offsetY + cell.row * (CELL_SIZE + CELL_GAP) + CELL_GAP

        ctx.fillStyle = cell.isMine ? COLORS.scanMine : COLORS.scanSafe
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)

        if (cell.isMine) {
          ctx.font = 'bold 14px "Fira Code", monospace'
          ctx.fillStyle = COLORS.mine
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('!', x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 1)
        }
      })
    }

    const now = Date.now()

    if (ledgerEnabled && ledgerPulse) {
      const age = now - ledgerPulse.time
      if (age < 700 && Array.isArray(ledgerPulse.mines)) {
        const progress = age / 700
        ledgerPulse.mines.forEach(mine => {
          const x = dims.offsetX + mine.col * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
          const y = dims.offsetY + mine.row * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
          const radius = progress * CELL_SIZE * 1.7
          const alpha = 1 - progress

          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${LEDGER_LINK_RGB}, ${alpha * 0.16})`
          ctx.fill()
          ctx.strokeStyle = `rgba(${LEDGER_LINK_RGB}, ${alpha * 0.8})`
          ctx.lineWidth = 1.2
          ctx.stroke()
        })
      }
    }

    mineExplosions.forEach(exp => {
      const age = now - exp.time
      if (age < 500) {
        const x = dims.offsetX + exp.col * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
        const y = dims.offsetY + exp.row * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
        const radius = (age / 500) * CELL_SIZE * 1.5
        const alpha = 1 - age / 500

        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 51, 51, ${alpha * 0.3})`
        ctx.fill()
        ctx.strokeStyle = `rgba(255, 51, 51, ${alpha})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    if (deepScanActive && hoveredCell) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = hoveredCell.row + dr
          const c = hoveredCell.col + dc
          if (r >= 0 && r < engine.rows && c >= 0 && c < engine.cols) {
            const x = dims.offsetX + c * (CELL_SIZE + CELL_GAP) + CELL_GAP
            const y = dims.offsetY + r * (CELL_SIZE + CELL_GAP) + CELL_GAP
            ctx.fillStyle = COLORS.scanOverlay
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
          }
        }
      }
    }

    if (sqlInjectActive && hoveredCell) {
      const row = hoveredCell.row
      for (let c = 0; c < engine.cols; c++) {
        const x = dims.offsetX + c * (CELL_SIZE + CELL_GAP) + CELL_GAP
        const y = dims.offsetY + row * (CELL_SIZE + CELL_GAP) + CELL_GAP
        ctx.fillStyle = 'rgba(255, 51, 51, 0.12)'
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
      }
    }

    if (deepPacketEnabled && hoveredCell && engine.cellStates[hoveredCell.row][hoveredCell.col] === CELL_STATE.FLAGGED) {
      const x = dims.offsetX + hoveredCell.col * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
      const y = dims.offsetY + hoveredCell.row * (CELL_SIZE + CELL_GAP) + CELL_GAP - 8
      const isCorrect = engine.isMine(hoveredCell.row, hoveredCell.col)
      const wobble = Math.round(Math.sin(animTick * 0.4) * 3)
      const pct = isCorrect ? 92 + wobble : 14 + wobble

      ctx.font = 'bold 10px "Fira Code", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isCorrect ? 'rgba(0,255,120,0.95)' : 'rgba(255,90,90,0.95)'
      ctx.fillText(`${Math.max(1, Math.min(99, pct))}%`, x, y)
    }

  }, [engine, hoveredCell, deepScanResults, deepScanActive, sqlInjectActive, mineExplosions, ledgerEnabled, bruteForceEnabled, deepPacketEnabled, ledgerLinks, ledgerPulse, animTick, showPacketSniffer, rowMineCounts, colMineCounts, getGridDimensions, COLORS])

  const getCellFromEvent = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas || !engine) return null
    const rect = canvas.getBoundingClientRect()
    const dims = getGridDimensions()
    const scaleX = dims.width / rect.width
    const scaleY = dims.height / rect.height
    const mx = (e.clientX - rect.left) * scaleX - dims.offsetX
    const my = (e.clientY - rect.top) * scaleY - dims.offsetY

    const col = Math.floor(mx / (CELL_SIZE + CELL_GAP))
    const row = Math.floor(my / (CELL_SIZE + CELL_GAP))

    if (row >= 0 && row < engine.rows && col >= 0 && col < engine.cols) {
      return { row, col }
    }
    return null
  }, [engine, getGridDimensions])

  const handleMouseMove = useCallback((e) => {
    setHoveredCell(getCellFromEvent(e))
  }, [getCellFromEvent])

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null)
  }, [])

  const handleClick = useCallback((e) => {
    const cell = getCellFromEvent(e)
    if (!cell) return

    if (deepScanActive) {
      useDeepScan(cell.row, cell.col)
      return
    }

    if (sqlInjectActive) {
      useSqlInject(cell.row)
      return
    }

    revealCell(cell.row, cell.col)
  }, [getCellFromEvent, revealCell, deepScanActive, sqlInjectActive, useDeepScan, useSqlInject])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    const cell = getCellFromEvent(e)
    if (cell) flagCell(cell.row, cell.col)
  }, [getCellFromEvent, flagCell])

  if (!engine) return null

  const dims = getGridDimensions()
  const scaledWidth = dims.width * canvasScale
  const scaledHeight = dims.height * canvasScale

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col items-center justify-center overflow-hidden min-h-0"
    >
      <div style={{ width: scaledWidth, height: scaledHeight, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: dims.width,
            height: dims.height,
            transform: `scale(${canvasScale})`,
            transformOrigin: 'top left',
            imageRendering: 'pixelated',
            cursor: deepScanActive || sqlInjectActive ? 'cell' : 'crosshair',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        />
      </div>
    </div>
  )
}
