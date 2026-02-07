import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useGameStore, GAME_PHASE } from '../store/gameStore'
import { CELL_STATE } from '../engine/MinesweeperEngine'
import { getCanvasColors } from '../themes'

const CELL_SIZE = 32
const CELL_GAP = 1
const HEADER_SIZE = 24 // for packet sniffer row/col labels

export default function GameGrid() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [hoveredCell, setHoveredCell] = useState(null)
  const [canvasScale, setCanvasScale] = useState(1)

  const currentTheme = useGameStore(s => s.currentTheme)
  const COLORS = useMemo(() => getCanvasColors(currentTheme), [currentTheme])

  const engine = useGameStore(s => s.engine)
  const phase = useGameStore(s => s.phase)
  const revealCell = useGameStore(s => s.revealCell)
  const flagCell = useGameStore(s => s.flagCell)
  const deepScanActive = useGameStore(s => s.deepScanActive)
  const deepScanResults = useGameStore(s => s.deepScanResults)
  const useDeepScan = useGameStore(s => s.useDeepScan)
  const mineExplosions = useGameStore(s => s.mineExplosions)
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

  // Fit canvas to container
  useEffect(() => {
    if (!containerRef.current || !engine) return
    const dims = getGridDimensions()
    const container = containerRef.current
    const maxW = container.clientWidth * 0.92
    const maxH = container.clientHeight * 0.92
    const scale = Math.min(maxW / dims.width, maxH / dims.height)
    setCanvasScale(scale)
  }, [engine, getGridDimensions])

  // Canvas rendering
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

    // Clear
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, dims.width, dims.height)

    // Draw packet sniffer headers
    if (showPacketSniffer && rowMineCounts.length > 0) {
      ctx.font = '10px "Fira Code", monospace'
      ctx.fillStyle = COLORS.packetSnifferText
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Column headers
      for (let c = 0; c < engine.cols; c++) {
        const x = dims.offsetX + c * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
        ctx.fillText(String(colMineCounts[c] ?? ''), x, dims.offsetY / 2)
      }

      // Row headers
      for (let r = 0; r < engine.rows; r++) {
        const y = dims.offsetY + r * (CELL_SIZE + CELL_GAP) + CELL_GAP + CELL_SIZE / 2
        ctx.fillText(String(rowMineCounts[r] ?? ''), dims.offsetX / 2, y)
      }
    }

    // Draw cells
    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        const x = dims.offsetX + c * (CELL_SIZE + CELL_GAP) + CELL_GAP
        const y = dims.offsetY + r * (CELL_SIZE + CELL_GAP) + CELL_GAP
        const state = engine.cellStates[r][c]
        const value = engine.board[r][c]
        const isHovered = hoveredCell && hoveredCell.row === r && hoveredCell.col === c

        if (state === CELL_STATE.HIDDEN) {
          // Hidden cell
          ctx.fillStyle = isHovered ? COLORS.hiddenHover : COLORS.hidden
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
          ctx.strokeStyle = COLORS.hiddenBorder
          ctx.lineWidth = 0.5
          ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)

          // Subtle grid dot
          ctx.fillStyle = COLORS.hiddenDot
          ctx.fillRect(x + CELL_SIZE / 2 - 0.5, y + CELL_SIZE / 2 - 0.5, 1, 1)

        } else if (state === CELL_STATE.FLAGGED) {
          // Flagged cell
          ctx.fillStyle = COLORS.hidden
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
          ctx.strokeStyle = COLORS.flagStroke
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)

          // Flag symbol
          ctx.font = 'bold 16px "Fira Code", monospace'
          ctx.fillStyle = COLORS.flag
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('⚑', x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 1)

        } else if (state === CELL_STATE.REVEALED) {
          // Revealed cell
          ctx.fillStyle = COLORS.revealed
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
          ctx.strokeStyle = COLORS.revealedBorder
          ctx.lineWidth = 0.5
          ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)

          if (value === -1) {
            // Mine
            ctx.font = 'bold 16px "Fira Code", monospace'
            ctx.fillStyle = COLORS.mine
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('✱', x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 1)
          } else if (value > 0) {
            ctx.font = 'bold 14px "Fira Code", monospace'
            ctx.fillStyle = COLORS.text[value] || '#ffffff'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(String(value), x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 1)
          }
        }
      }
    }

    // Draw deep scan overlay
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

    // Draw mine explosion effects
    const now = Date.now()
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

    // Deep scan cursor overlay
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

  }, [engine, hoveredCell, deepScanResults, deepScanActive, mineExplosions, showPacketSniffer, rowMineCounts, colMineCounts, getGridDimensions, COLORS])

  // Mouse event handlers
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

    revealCell(cell.row, cell.col)
  }, [getCellFromEvent, revealCell, deepScanActive, useDeepScan])

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
            cursor: deepScanActive ? 'cell' : 'crosshair',
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
      <div className="text-[var(--crt-green-dark)] text-[10px] mt-3 tracking-wider select-none">
        LEFT CLICK: REVEAL &nbsp;|&nbsp; RIGHT CLICK: FLAG
      </div>
    </div>
  )
}
