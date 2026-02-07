/**
 * Headless Minesweeper Engine
 * Decoupled from rendering — handles board generation, validation, and game logic.
 */

export const CELL_STATE = {
  HIDDEN: 0,
  REVEALED: 1,
  FLAGGED: 2,
}

export class MinesweeperEngine {
  constructor(rows, cols, mineCount) {
    this.rows = rows
    this.cols = cols
    this.mineCount = Math.min(mineCount, rows * cols - 9) // ensure at least 9 safe cells
    this.board = []
    this.mines = new Set()
    this.cellStates = []
    this.gameOver = false
    this.won = false
    this.firstClick = true
    this.revealedCount = 0
    this.flaggedCount = 0
    this.startTime = null
    this.endTime = null
    this._initBoard()
  }

  _initBoard() {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(0))
    this.cellStates = Array.from({ length: this.rows }, () => Array(this.cols).fill(CELL_STATE.HIDDEN))
  }

  _placeMines(safeRow, safeCol) {
    this.mines.clear()
    const safeCells = new Set()
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = safeRow + dr
        const c = safeCol + dc
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          safeCells.add(`${r},${c}`)
        }
      }
    }

    let placed = 0
    while (placed < this.mineCount) {
      const r = Math.floor(Math.random() * this.rows)
      const c = Math.floor(Math.random() * this.cols)
      const key = `${r},${c}`
      if (!this.mines.has(key) && !safeCells.has(key)) {
        this.mines.add(key)
        this.board[r][c] = -1
        placed++
      }
    }

    // Calculate adjacency numbers
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] === -1) continue
        let count = 0
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            const nr = r + dr
            const nc = c + dc
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === -1) {
              count++
            }
          }
        }
        this.board[r][c] = count
      }
    }
  }

  reveal(row, col) {
    if (this.gameOver) return { hit: false, cells: [] }
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return { hit: false, cells: [] }
    if (this.cellStates[row][col] !== CELL_STATE.HIDDEN) return { hit: false, cells: [] }

    if (this.firstClick) {
      this.firstClick = false
      this.startTime = Date.now()
      this._placeMines(row, col)
    }

    // Hit a mine
    if (this.board[row][col] === -1) {
      this.cellStates[row][col] = CELL_STATE.REVEALED
      return { hit: true, cells: [{ row, col, value: -1 }] }
    }

    // Flood fill for empty cells
    const revealed = []
    const stack = [[row, col]]
    const visited = new Set()

    while (stack.length > 0) {
      const [r, c] = stack.pop()
      const key = `${r},${c}`
      if (visited.has(key)) continue
      if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue
      if (this.cellStates[r][c] !== CELL_STATE.HIDDEN) continue
      visited.add(key)

      this.cellStates[r][c] = CELL_STATE.REVEALED
      this.revealedCount++
      revealed.push({ row: r, col: c, value: this.board[r][c] })

      if (this.board[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            stack.push([r + dr, c + dc])
          }
        }
      }
    }

    // Check win condition
    if (this.revealedCount === this.rows * this.cols - this.mineCount) {
      this.won = true
      this.gameOver = true
      this.endTime = Date.now()
    }

    return { hit: false, cells: revealed }
  }

  toggleFlag(row, col) {
    if (this.gameOver) return null
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null
    if (this.cellStates[row][col] === CELL_STATE.REVEALED) return null

    if (this.cellStates[row][col] === CELL_STATE.FLAGGED) {
      this.cellStates[row][col] = CELL_STATE.HIDDEN
      this.flaggedCount--
      return { row, col, flagged: false }
    } else {
      this.cellStates[row][col] = CELL_STATE.FLAGGED
      this.flaggedCount++
      return { row, col, flagged: true }
    }
  }

  chordReveal(row, col) {
    if (this.gameOver) return { hit: false, cells: [] }
    if (this.cellStates[row][col] !== CELL_STATE.REVEALED) return { hit: false, cells: [] }

    const value = this.board[row][col]
    if (value <= 0) return { hit: false, cells: [] }

    let flagCount = 0
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          if (this.cellStates[nr][nc] === CELL_STATE.FLAGGED) flagCount++
        }
      }
    }

    if (flagCount !== value) return { hit: false, cells: [] }

    let allCells = []
    let anyHit = false

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          if (this.cellStates[nr][nc] === CELL_STATE.HIDDEN) {
            const result = this.reveal(nr, nc)
            allCells = allCells.concat(result.cells)
            if (result.hit) anyHit = true
          }
        }
      }
    }

    return { hit: anyHit, cells: allCells }
  }

  // Deep Scan: reveal all cells in a 3x3 area (active ability)
  deepScan(centerRow, centerCol) {
    const results = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = centerRow + dr
        const c = centerCol + dc
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          results.push({
            row: r,
            col: c,
            value: this.board[r][c],
            isMine: this.board[r][c] === -1,
            state: this.cellStates[r][c],
          })
        }
      }
    }
    return results
  }

  // Packet Sniffer: count mines in a row or column
  getRowMineCount(row) {
    let count = 0
    for (let c = 0; c < this.cols; c++) {
      if (this.board[row][c] === -1) count++
    }
    return count
  }

  getColMineCount(col) {
    let count = 0
    for (let r = 0; r < this.rows; r++) {
      if (this.board[r][col] === -1) count++
    }
    return count
  }

  revealAllMines() {
    const cells = []
    for (const key of this.mines) {
      const [r, c] = key.split(',').map(Number)
      if (this.cellStates[r][c] !== CELL_STATE.REVEALED) {
        cells.push({ row: r, col: c, value: -1 })
      }
    }
    return cells
  }

  getElapsedTime() {
    if (!this.startTime) return 0
    const end = this.endTime || Date.now()
    return Math.floor((end - this.startTime) / 1000)
  }

  getCompletionPercent() {
    const total = this.rows * this.cols - this.mineCount
    return total > 0 ? Math.floor((this.revealedCount / total) * 100) : 0
  }

  isMine(row, col) {
    return this.board[row][col] === -1
  }

  getCellState(row, col) {
    return this.cellStates[row][col]
  }

  getCellValue(row, col) {
    return this.board[row][col]
  }

  serialize() {
    return {
      rows: this.rows,
      cols: this.cols,
      mineCount: this.mineCount,
      board: this.board,
      mines: [...this.mines],
      cellStates: this.cellStates,
      gameOver: this.gameOver,
      won: this.won,
      firstClick: this.firstClick,
      revealedCount: this.revealedCount,
      flaggedCount: this.flaggedCount,
      startTime: this.startTime,
      endTime: this.endTime,
    }
  }

  static deserialize(data) {
    const engine = Object.create(MinesweeperEngine.prototype)
    engine.rows = data.rows
    engine.cols = data.cols
    engine.mineCount = data.mineCount
    engine.board = data.board
    engine.mines = new Set(data.mines)
    engine.cellStates = data.cellStates
    engine.gameOver = data.gameOver
    engine.won = data.won
    engine.firstClick = data.firstClick
    engine.revealedCount = data.revealedCount
    engine.flaggedCount = data.flaggedCount
    engine.startTime = data.startTime
    engine.endTime = data.endTime
    return engine
  }
}
