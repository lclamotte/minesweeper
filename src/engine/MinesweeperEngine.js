/**
 * Headless Minesweeper Engine
 * Decoupled from rendering — handles board generation, validation, and game logic.
 */

export const CELL_STATE = {
  HIDDEN: 0,
  REVEALED: 1,
  FLAGGED: 2,
}

const NO_GUESS_MAX_COMPONENT_SIZE = 22
const NO_GUESS_MAX_SOLUTIONS = 50000

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

  _cellKey(row, col) {
    return `${row},${col}`
  }

  _cellId(row, col) {
    return row * this.cols + col
  }

  _idToRowCol(id) {
    return {
      row: Math.floor(id / this.cols),
      col: id % this.cols,
    }
  }

  _forEachNeighbor(row, col, cb) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          cb(nr, nc)
        }
      }
    }
  }

  _clearMineLayout() {
    this.mines.clear()
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.board[r][c] = 0
      }
    }
  }

  _rebuildAdjacency() {
    for (const key of this.mines) {
      const [r, c] = key.split(',').map(Number)
      this.board[r][c] = -1
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] === -1) continue
        let count = 0
        this._forEachNeighbor(r, c, (nr, nc) => {
          if (this.board[nr][nc] === -1) count++
        })
        this.board[r][c] = count
      }
    }
  }

  _collectConstraints(simState) {
    const constraints = []

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (simState[r][c] !== CELL_STATE.REVEALED) continue
        const value = this.board[r][c]
        if (value <= 0) continue

        const hidden = []
        let flagged = 0

        this._forEachNeighbor(r, c, (nr, nc) => {
          const state = simState[nr][nc]
          if (state === CELL_STATE.HIDDEN) {
            hidden.push(this._cellId(nr, nc))
          } else if (state === CELL_STATE.FLAGGED) {
            flagged++
          }
        })

        if (hidden.length === 0) continue

        const minesLeft = value - flagged
        if (minesLeft < 0 || minesLeft > hidden.length) {
          return { invalid: true, constraints: [] }
        }

        const hiddenSet = new Set(hidden)
        constraints.push({ hidden, hiddenSet, minesLeft })
      }
    }

    return { invalid: false, constraints }
  }

  _enumerateComponent(componentVars, componentConstraints) {
    const localIdxById = new Map()
    componentVars.forEach((id, idx) => localIdxById.set(id, idx))

    const normalizedConstraints = componentConstraints.map((constraint) => ({
      vars: constraint.hidden
        .filter(id => localIdxById.has(id))
        .map(id => localIdxById.get(id)),
      minesLeft: constraint.minesLeft,
    }))

    const varToConstraints = Array.from({ length: componentVars.length }, () => [])
    normalizedConstraints.forEach((constraint, ci) => {
      for (const varIdx of constraint.vars) {
        varToConstraints[varIdx].push(ci)
      }
    })

    const order = [...Array(componentVars.length).keys()].sort((a, b) => {
      return varToConstraints[b].length - varToConstraints[a].length
    })

    const assignedMines = Array(normalizedConstraints.length).fill(0)
    const assignedCells = Array(normalizedConstraints.length).fill(0)
    const assignment = Array(componentVars.length).fill(-1)
    const mineHits = Array(componentVars.length).fill(0)
    let solutionCount = 0
    let truncated = false

    const dfs = (depth) => {
      if (truncated) return

      if (depth === order.length) {
        for (let ci = 0; ci < normalizedConstraints.length; ci++) {
          if (assignedMines[ci] !== normalizedConstraints[ci].minesLeft) return
        }

        solutionCount++
        for (let i = 0; i < assignment.length; i++) {
          if (assignment[i] === 1) mineHits[i]++
        }

        if (solutionCount > NO_GUESS_MAX_SOLUTIONS) {
          truncated = true
        }
        return
      }

      const varIdx = order[depth]
      const related = varToConstraints[varIdx]

      for (const value of [0, 1]) {
        let valid = true
        for (const ci of related) {
          const nextMines = assignedMines[ci] + value
          const nextAssigned = assignedCells[ci] + 1
          const remaining = normalizedConstraints[ci].vars.length - nextAssigned
          const target = normalizedConstraints[ci].minesLeft
          if (nextMines > target || nextMines + remaining < target) {
            valid = false
            break
          }
        }
        if (!valid) continue

        assignment[varIdx] = value
        for (const ci of related) {
          assignedMines[ci] += value
          assignedCells[ci]++
        }

        dfs(depth + 1)

        for (const ci of related) {
          assignedMines[ci] -= value
          assignedCells[ci]--
        }
        assignment[varIdx] = -1

        if (truncated) return
      }
    }

    dfs(0)
    return { solutionCount, mineHits, truncated }
  }

  _buildConnectedComponents(constraints) {
    const varToConstraints = new Map()
    constraints.forEach((constraint, ci) => {
      for (const id of constraint.hidden) {
        if (!varToConstraints.has(id)) varToConstraints.set(id, [])
        varToConstraints.get(id).push(ci)
      }
    })

    const visited = new Set()
    const components = []

    for (const startId of varToConstraints.keys()) {
      if (visited.has(startId)) continue

      const queue = [startId]
      const vars = []
      const constraintSet = new Set()

      while (queue.length > 0) {
        const currentId = queue.pop()
        if (visited.has(currentId)) continue
        visited.add(currentId)
        vars.push(currentId)

        const related = varToConstraints.get(currentId) || []
        for (const ci of related) {
          if (constraintSet.has(ci)) continue
          constraintSet.add(ci)

          for (const nextId of constraints[ci].hidden) {
            if (!visited.has(nextId)) queue.push(nextId)
          }
        }
      }

      components.push({
        vars,
        constraints: [...constraintSet].map(ci => constraints[ci]),
      })
    }

    return components
  }

  _solveNoGuessFromFirstClick(startRow, startCol) {
    const simState = Array.from({ length: this.rows }, () => Array(this.cols).fill(CELL_STATE.HIDDEN))
    let revealedSafe = 0
    let flaggedMines = 0
    const safeTarget = this.rows * this.cols - this.mineCount

    const revealSafeCell = (row, col) => {
      if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return true
      if (simState[row][col] !== CELL_STATE.HIDDEN) return true
      if (this.board[row][col] === -1) return false

      const stack = [[row, col]]
      while (stack.length > 0) {
        const [r, c] = stack.pop()
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue
        if (simState[r][c] !== CELL_STATE.HIDDEN) continue
        if (this.board[r][c] === -1) return false

        simState[r][c] = CELL_STATE.REVEALED
        revealedSafe++

        if (this.board[r][c] === 0) {
          this._forEachNeighbor(r, c, (nr, nc) => {
            if (simState[nr][nc] === CELL_STATE.HIDDEN) {
              stack.push([nr, nc])
            }
          })
        }
      }
      return true
    }

    const flagMineCell = (row, col) => {
      if (simState[row][col] !== CELL_STATE.HIDDEN) return true
      if (this.board[row][col] !== -1) return false
      simState[row][col] = CELL_STATE.FLAGGED
      flaggedMines++
      return true
    }

    if (!revealSafeCell(startRow, startCol)) return false

    while (revealedSafe < safeTarget) {
      let madeProgress = false

      const toReveal = new Set()
      const toFlag = new Set()

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (simState[r][c] !== CELL_STATE.REVEALED) continue
          const value = this.board[r][c]
          if (value <= 0) continue

          const hidden = []
          let flagged = 0

          this._forEachNeighbor(r, c, (nr, nc) => {
            if (simState[nr][nc] === CELL_STATE.HIDDEN) {
              hidden.push(this._cellId(nr, nc))
            } else if (simState[nr][nc] === CELL_STATE.FLAGGED) {
              flagged++
            }
          })

          if (hidden.length === 0) continue

          const remaining = value - flagged
          if (remaining < 0 || remaining > hidden.length) {
            return false
          }

          if (remaining === 0) {
            hidden.forEach(id => toReveal.add(id))
          } else if (remaining === hidden.length) {
            hidden.forEach(id => toFlag.add(id))
          }
        }
      }

      if (toReveal.size > 0 || toFlag.size > 0) {
        madeProgress = true
        for (const id of toFlag) {
          const { row, col } = this._idToRowCol(id)
          if (!flagMineCell(row, col)) return false
        }
        for (const id of toReveal) {
          const { row, col } = this._idToRowCol(id)
          if (!revealSafeCell(row, col)) return false
        }
        continue
      }

      const { invalid, constraints } = this._collectConstraints(simState)
      if (invalid) return false

      if (constraints.length > 1) {
        const subsetReveal = new Set()
        const subsetFlag = new Set()

        const isSubset = (a, b) => {
          if (a.hidden.length > b.hidden.length) return false
          for (const id of a.hidden) {
            if (!b.hiddenSet.has(id)) return false
          }
          return true
        }

        const applySubset = (a, b) => {
          if (!isSubset(a, b)) return
          const diff = b.hidden.filter(id => !a.hiddenSet.has(id))
          if (diff.length === 0) return
          const mineDiff = b.minesLeft - a.minesLeft
          if (mineDiff < 0 || mineDiff > diff.length) return
          if (mineDiff === 0) {
            diff.forEach(id => subsetReveal.add(id))
          } else if (mineDiff === diff.length) {
            diff.forEach(id => subsetFlag.add(id))
          }
        }

        for (let i = 0; i < constraints.length; i++) {
          for (let j = i + 1; j < constraints.length; j++) {
            applySubset(constraints[i], constraints[j])
            applySubset(constraints[j], constraints[i])
          }
        }

        if (subsetReveal.size > 0 || subsetFlag.size > 0) {
          madeProgress = true
          for (const id of subsetFlag) {
            const { row, col } = this._idToRowCol(id)
            if (!flagMineCell(row, col)) return false
          }
          for (const id of subsetReveal) {
            const { row, col } = this._idToRowCol(id)
            if (!revealSafeCell(row, col)) return false
          }
          continue
        }
      }

      if (constraints.length > 0) {
        const exactReveal = new Set()
        const exactFlag = new Set()
        const components = this._buildConnectedComponents(constraints)

        for (const component of components) {
          if (component.vars.length === 0) continue
          if (component.vars.length > NO_GUESS_MAX_COMPONENT_SIZE) continue

          const result = this._enumerateComponent(component.vars, component.constraints)
          if (result.solutionCount === 0) return false
          if (result.truncated) continue

          for (let i = 0; i < component.vars.length; i++) {
            if (result.mineHits[i] === 0) {
              exactReveal.add(component.vars[i])
            } else if (result.mineHits[i] === result.solutionCount) {
              exactFlag.add(component.vars[i])
            }
          }
        }

        if (exactReveal.size > 0 || exactFlag.size > 0) {
          madeProgress = true
          for (const id of exactFlag) {
            const { row, col } = this._idToRowCol(id)
            if (!flagMineCell(row, col)) return false
          }
          for (const id of exactReveal) {
            const { row, col } = this._idToRowCol(id)
            if (!revealSafeCell(row, col)) return false
          }
        }
      }

      if (madeProgress) continue

      const hidden = []
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (simState[r][c] === CELL_STATE.HIDDEN) hidden.push(this._cellId(r, c))
        }
      }

      const remainingMines = this.mineCount - flaggedMines
      if (remainingMines < 0 || remainingMines > hidden.length) return false

      if (remainingMines === 0) {
        for (const id of hidden) {
          const { row, col } = this._idToRowCol(id)
          if (!revealSafeCell(row, col)) return false
        }
        continue
      }

      if (remainingMines === hidden.length) {
        for (const id of hidden) {
          const { row, col } = this._idToRowCol(id)
          if (!flagMineCell(row, col)) return false
        }
        continue
      }

      return false
    }

    return true
  }

  _placeMines(safeRow, safeCol) {
    const safeCells = new Set()
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = safeRow + dr
        const c = safeCol + dc
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          safeCells.add(this._cellKey(r, c))
        }
      }
    }

    // Generate until the board is fully solvable from the first click without any guess.
    while (true) {
      this._clearMineLayout()

      let placed = 0
      while (placed < this.mineCount) {
        const r = Math.floor(Math.random() * this.rows)
        const c = Math.floor(Math.random() * this.cols)
        const key = this._cellKey(r, c)
        if (!this.mines.has(key) && !safeCells.has(key)) {
          this.mines.add(key)
          placed++
        }
      }

      this._rebuildAdjacency()
      if (this._solveNoGuessFromFirstClick(safeRow, safeCol)) {
        return
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
