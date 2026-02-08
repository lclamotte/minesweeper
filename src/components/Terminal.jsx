import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getShopItems, UPGRADE_TYPE, UPGRADE_ART } from '../engine/upgrades'
import { getNextNode } from '../engine/nodes'
import { playClick } from '../audio/sounds'
import { SignalWave, NetworkMap } from './AsciiAnim'

const OFFERS_PER_CATEGORY = 3
const TERMINAL_RELOAD_COST = 45

function hashString(value) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

function pickRandomDistinct(items, count) {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = tmp
  }
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

function buildCombinations(items, size) {
  const combos = []
  const stack = []

  const dfs = (startIdx) => {
    if (stack.length === size) {
      combos.push([...stack])
      return
    }

    const remaining = size - stack.length
    for (let i = startIdx; i <= items.length - remaining; i++) {
      stack.push(items[i])
      dfs(i + 1)
      stack.pop()
    }
  }

  dfs(0)
  return combos
}

function getOfferCategory(item) {
  return item.type === UPGRADE_TYPE.EXPLOIT ? 'exploit' : 'daemon'
}

function pickOfferSet(pool, previousOfferIds = [], count = OFFERS_PER_CATEGORY) {
  const target = Math.min(count, pool.length)
  if (target <= 0) return []
  if (target === pool.length) return pickRandomDistinct(pool, target)

  const previousSet = new Set(previousOfferIds)
  const combos = buildCombinations(pool, target)

  let bestScore = Number.POSITIVE_INFINITY
  const bestCombos = []

  for (const combo of combos) {
    const overlap = combo.reduce((acc, item) => acc + (previousSet.has(item.id) ? 1 : 0), 0)
    const score = overlap

    if (score < bestScore) {
      bestScore = score
      bestCombos.length = 0
      bestCombos.push(combo)
    } else if (score === bestScore) {
      bestCombos.push(combo)
    }
  }

  if (bestCombos.length === 0) return pickRandomDistinct(pool, target)
  return bestCombos[Math.floor(Math.random() * bestCombos.length)]
}

export default function Terminal() {
  const [selectedCategory, setSelectedCategory] = useState('daemon')
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0)
  const [purchaseFlash, setPurchaseFlash] = useState(null)
  const [revealedDealId, setRevealedDealId] = useState(null)
  const [offerIdsByCategory, setOfferIdsByCategory] = useState({ daemon: [], exploit: [] })
  const optionRefs = useRef([])

  const cache = useGameStore(s => s.cache)
  const subroutines = useGameStore(s => s.subroutines)
  const exploits = useGameStore(s => s.exploits)
  const kernelLevels = useGameStore(s => s.kernelLevels)
  const rootAccess = useGameStore(s => s.rootAccess)
  const purchaseUpgrade = useGameStore(s => s.purchaseUpgrade)
  const purchaseTerminalReload = useGameStore(s => s.purchaseTerminalReload)
  const proceedToNextNode = useGameStore(s => s.proceedToNextNode)
  const currentNodeId = useGameStore(s => s.currentNodeId)
  const firewalls = useGameStore(s => s.firewalls)
  const maxFirewalls = useGameStore(s => s.maxFirewalls)
  const soundEnabled = useGameStore(s => s.soundEnabled)

  const nextNode = getNextNode(currentNodeId)
  const hasDarkPool = (subroutines.dark_pool || 0) > 0

  const categories = [
    {
      key: 'daemon',
      label: 'DAEMONS',
      desc: 'Passive upgrades that persist across nodes.',
    },
    {
      key: 'exploit',
      label: 'EXPLOITS',
      desc: 'Active tools consumed on use while clearing the current node.',
    },
  ]

  const selectedCategoryIndex = Math.max(0, categories.findIndex(cat => cat.key === selectedCategory))
  const activeCategory = categories[selectedCategoryIndex]

  const daemonOfferPool = useMemo(
    () => getShopItems().filter(item =>
      item.type === UPGRADE_TYPE.SUBROUTINE ||
      item.type === UPGRADE_TYPE.KERNEL
    ),
    []
  )
  const exploitOfferPool = useMemo(
    () => getShopItems().filter(item => item.type === UPGRADE_TYPE.EXPLOIT),
    []
  )

  const daemonOfferById = useMemo(
    () => new Map(daemonOfferPool.map(item => [item.id, item])),
    [daemonOfferPool]
  )
  const exploitOfferById = useMemo(
    () => new Map(exploitOfferPool.map(item => [item.id, item])),
    [exploitOfferPool]
  )

  const daemonOffers = useMemo(
    () => offerIdsByCategory.daemon.map(id => daemonOfferById.get(id)).filter(Boolean),
    [offerIdsByCategory.daemon, daemonOfferById]
  )
  const exploitOffers = useMemo(
    () => offerIdsByCategory.exploit.map(id => exploitOfferById.get(id)).filter(Boolean),
    [offerIdsByCategory.exploit, exploitOfferById]
  )

  const visibleOffers = useMemo(
    () => selectedCategory === 'daemon' ? daemonOffers : exploitOffers,
    [selectedCategory, daemonOffers, exploitOffers]
  )

  const discountedIds = useMemo(() => {
    if (!hasDarkPool) {
      return { daemon: null, exploit: null }
    }

    const pickDiscount = (items, ids, key) => {
      if (items.length === 0) return null
      const seed = `discount-${currentNodeId}-${key}-${ids.join('|')}`
      const idx = hashString(seed) % items.length
      return items[idx].id
    }

    return {
      daemon: pickDiscount(daemonOffers, offerIdsByCategory.daemon, 'daemon'),
      exploit: pickDiscount(exploitOffers, offerIdsByCategory.exploit, 'exploit'),
    }
  }, [hasDarkPool, currentNodeId, daemonOffers, exploitOffers, offerIdsByCategory.daemon, offerIdsByCategory.exploit])

  const canReload = cache >= TERMINAL_RELOAD_COST && (
    daemonOfferPool.length > 1 || exploitOfferPool.length > 1
  )

  useEffect(() => {
    setOfferIdsByCategory({
      daemon: pickOfferSet(daemonOfferPool, [], OFFERS_PER_CATEGORY).map(item => item.id),
      exploit: pickOfferSet(exploitOfferPool, [], OFFERS_PER_CATEGORY).map(item => item.id),
    })
    setSelectedOptionIdx(0)
    setRevealedDealId(null)
    optionRefs.current = []
  }, [daemonOfferPool, exploitOfferPool, currentNodeId])

  useEffect(() => {
    setSelectedOptionIdx(0)
    setRevealedDealId(null)
    optionRefs.current = []
  }, [selectedCategory])

  useEffect(() => {
    if (visibleOffers.length === 0) {
      setSelectedOptionIdx(0)
      return
    }
    if (selectedOptionIdx >= visibleOffers.length) {
      setSelectedOptionIdx(visibleOffers.length - 1)
    }
  }, [visibleOffers.length, selectedOptionIdx])

  useEffect(() => {
    const active = optionRefs.current[selectedOptionIdx]
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedOptionIdx, visibleOffers])

  const getPrice = (item) => {
    const category = getOfferCategory(item)
    if (item.id === discountedIds[category]) return Math.max(1, Math.floor(item.cost * 0.5))
    return item.cost
  }

  const getOwnedInfo = (item) => {
    if (item.type === UPGRADE_TYPE.SUBROUTINE) {
      const level = subroutines[item.id] || 0
      return level > 0 ? `LVL ${level}/${item.maxLevel}` : null
    }
    if (item.type === UPGRADE_TYPE.EXPLOIT) {
      const charges = exploits[item.id] || 0
      return charges > 0 ? `${charges} CHARGES` : null
    }
    if (item.type === UPGRADE_TYPE.KERNEL) {
      const level = kernelLevels[item.id] || 0
      return level > 0 ? `LVL ${level}/${item.maxLevel}` : null
    }
    return null
  }

  const canPurchase = (item) => {
    const price = getPrice(item)
    if (cache < price) return false
    if (item.requiresRoot && !rootAccess) return false

    if (item.type === UPGRADE_TYPE.SUBROUTINE) {
      return (subroutines[item.id] || 0) < item.maxLevel
    }
    if (item.type === UPGRADE_TYPE.KERNEL) {
      return (kernelLevels[item.id] || 0) < item.maxLevel
    }
    return true
  }

  const handlePurchase = (item) => {
    if (!item || !canPurchase(item)) return
    if (soundEnabled) playClick()
    const success = purchaseUpgrade(item.id, getPrice(item))
    if (success) {
      setPurchaseFlash(item.id)
      setTimeout(() => setPurchaseFlash(null), 400)
    }
  }

  const handleReloadOffers = () => {
    if (!canReload) return
    const success = purchaseTerminalReload(TERMINAL_RELOAD_COST)
    if (!success) return
    if (soundEnabled) playClick()

    const rerollIds = (pool, prevIds) => {
      let next = pickOfferSet(pool, prevIds, OFFERS_PER_CATEGORY)
      let attempts = 0
      const prevSorted = [...prevIds].sort().join('|')
      while (attempts < 5) {
        const nextSorted = next.map(item => item.id).sort().join('|')
        if (nextSorted !== prevSorted) break
        next = pickOfferSet(pool, prevIds, OFFERS_PER_CATEGORY)
        attempts++
      }
      return next.map(item => item.id)
    }

    setOfferIdsByCategory((prev) => {
      return {
        daemon: rerollIds(daemonOfferPool, prev.daemon),
        exploit: rerollIds(exploitOfferPool, prev.exploit),
      }
    })
    setSelectedOptionIdx(0)
    setRevealedDealId(null)
    optionRefs.current = []
  }

  const handleProceed = () => {
    if (soundEnabled) playClick()
    proceedToNextNode()
  }

  useEffect(() => {
    const onKeyDown = (e) => {
      const targetTag = e.target?.tagName
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prevIdx = (selectedCategoryIndex - 1 + categories.length) % categories.length
        setSelectedCategory(categories[prevIdx].key)
        return
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextIdx = (selectedCategoryIndex + 1) % categories.length
        setSelectedCategory(categories[nextIdx].key)
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedOptionIdx(idx => Math.max(0, idx - 1))
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedOptionIdx(idx => Math.min(Math.max(0, visibleOffers.length - 1), idx + 1))
        return
      }

      if ((e.key === 'r' || e.key === 'R') && canReload) {
        e.preventDefault()
        handleReloadOffers()
        return
      }

      if (e.key === 'Enter') {
        if (visibleOffers.length === 0) return
        e.preventDefault()
        handlePurchase(visibleOffers[selectedOptionIdx])
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [categories, selectedCategoryIndex, visibleOffers, selectedOptionIdx, canReload, soundEnabled, cache, subroutines, exploits, kernelLevels, rootAccess])

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 py-3 border-b border-[var(--crt-green-dark)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[var(--crt-green)] glow-strong tracking-[0.4em] font-bold text-lg">TERMINAL</span>
          <span className="text-[var(--crt-green-dim)] text-sm">//</span>
          <span className="text-[var(--crt-green-dim)] text-sm">COMPILE YOUR BUILD</span>
          <NetworkMap activeNode={currentNodeId + 1} className="text-xs text-[var(--crt-green-dim)] ml-2 hidden lg:block" />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)] text-sm">FIREWALL</span>
            <span className="text-[var(--crt-green)] font-bold text-lg">{firewalls}/{maxFirewalls}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)] text-sm">CACHE</span>
            <span className="text-[var(--crt-amber)] glow-amber font-bold text-xl tabular-nums">${cache}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)] text-sm">ROOT</span>
            <span className={`font-bold text-sm ${rootAccess ? 'text-[var(--crt-green)]' : 'text-[var(--crt-red)]'}`}>
              {rootAccess ? 'GRANTED' : 'DENIED'}
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-5 py-3 border-b border-[var(--crt-green-dark)]">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {categories.map((cat, idx) => {
            const isActive = selectedCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`text-lg md:text-xl py-2.5 px-6 border font-bold tracking-[0.25em] transition-all ${
                  isActive
                    ? 'bg-[var(--crt-green)] text-black border-[var(--crt-green)] shadow-[0_0_8px_var(--crt-green-glow)]'
                    : 'bg-transparent text-[var(--crt-green-dim)] border-[var(--crt-green-dark)] hover:border-[var(--crt-green-dim)] hover:text-[var(--crt-green)]'
                }`}
              >
                {idx === selectedCategoryIndex ? '▸ ' : ''}{cat.label}
              </button>
            )
          })}
        </div>

        <p className="text-center text-[var(--crt-green-dim)] text-base md:text-lg leading-relaxed mt-3 px-6">
          {activeCategory.desc}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden flex items-center justify-center py-2 px-3 md:px-5">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.max(visibleOffers.length, 1)}, minmax(200px, 250px))` }}
        >
          {visibleOffers.map((item, idx) => {
            const owned = getOwnedInfo(item)
            const canBuy = canPurchase(item)
            const isFlashing = purchaseFlash === item.id
            const art = UPGRADE_ART[item.id]
            const discounted = item.id === discountedIds[getOfferCategory(item)]
            const price = getPrice(item)
            const isSelected = idx === selectedOptionIdx
            const redacted = discounted && revealedDealId !== item.id && !isSelected
            const displayName = redacted ? '████████████' : item.name

            return (
              <div key={item.id} className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-2 pb-1.5">
                  {discounted && (
                    <span className="text-[var(--crt-red)] text-xs tracking-wider line-through opacity-60">${item.cost}</span>
                  )}
                  <span className="text-[var(--crt-amber)] glow-amber font-bold text-lg tabular-nums">${price}</span>
                </div>

                <div
                  ref={(el) => { optionRefs.current[idx] = el }}
                  onMouseEnter={() => {
                    setSelectedOptionIdx(idx)
                    if (discounted) setRevealedDealId(item.id)
                  }}
                  onMouseLeave={() => {
                    if (discounted) setRevealedDealId(null)
                  }}
                  onClick={() => setSelectedOptionIdx(idx)}
                  className={`w-full rounded-lg overflow-hidden transition-all cursor-pointer ${
                    isFlashing
                      ? 'shadow-[0_0_20px_var(--crt-amber),inset_0_0_30px_rgba(255,176,0,0.15)]'
                      : discounted
                          ? 'shadow-[0_0_10px_rgba(255,60,60,0.3)]'
                          : ''
                  }`}
                  style={{
                    border: `2px solid ${
                      isFlashing ? 'var(--crt-amber)'
                        : discounted ? 'var(--crt-red)'
                          : 'var(--crt-green-dark)'
                    }`,
                    background: isFlashing
                      ? 'linear-gradient(180deg, rgba(255,176,0,0.12) 0%, rgba(0,0,0,0.9) 100%)'
                      : 'linear-gradient(180deg, rgba(10,18,10,0.95) 0%, rgba(2,4,2,0.98) 100%)',
                  }}
                >
                  <div className="flex flex-col h-full">
                    <div className={`shrink-0 px-3 py-1.5 flex items-center justify-between border-b ${
                      isFlashing ? 'border-[var(--crt-amber)] bg-[rgba(255,176,0,0.1)]'
                        : discounted ? 'border-[var(--crt-red)] bg-[rgba(255,60,60,0.06)]'
                          : 'border-[var(--crt-green-dark)] bg-[rgba(0,255,65,0.03)]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[0.65rem] tracking-[0.3em] font-bold px-2 py-0.5 rounded-sm ${
                          item.type === UPGRADE_TYPE.EXPLOIT
                            ? 'bg-[rgba(255,176,0,0.15)] text-[var(--crt-amber)]'
                            : 'bg-[rgba(0,255,65,0.15)] text-[var(--crt-green)]'
                        }`}>
                          {item.type === UPGRADE_TYPE.EXPLOIT ? 'EXP' : 'DMN'}
                        </span>
                      </div>
                      {owned && (
                        <span className="text-[var(--crt-cyan)] text-xs tracking-wider">{owned}</span>
                      )}
                    </div>

                    <div className="shrink-0 px-3 pt-2 pb-1">
                      <div className={`font-bold text-base md:text-lg tracking-wide leading-tight ${
                        discounted ? 'text-[var(--crt-red)]' : 'text-[var(--crt-green)]'
                      }`}>
                        {displayName}
                      </div>
                      {discounted && !redacted && (
                        <span className="text-[var(--crt-red)] text-xs tracking-[0.2em]">DARK-POOL DEAL -50%</span>
                      )}
                    </div>

                    {art && (
                      <div className="flex items-center justify-center mx-2 my-1 py-8 rounded border border-[var(--crt-green-dark)] bg-[rgba(0,0,0,0.35)]">
                        <pre className={`text-[clamp(1.8rem,5.5vh,3.4rem)] leading-[1.02] select-none font-mono text-center transition-colors ${
                          isFlashing
                            ? 'text-[var(--crt-amber)] glow-amber'
                            : discounted
                              ? 'text-[var(--crt-red)] glow-red'
                              : 'text-[var(--crt-green)] glow'
                        }`}>
                          {art.join('\n')}
                        </pre>
                      </div>
                    )}

                    <div className="shrink-0 px-2 py-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePurchase(item)
                        }}
                        disabled={!canBuy}
                        className={`terminal-btn w-full text-xs md:text-sm py-2 tracking-[0.2em] ${canBuy ? 'terminal-btn-amber' : ''}`}
                      >
                        {!rootAccess && item.requiresRoot
                          ? '[ ROOT LOCK ]'
                          : !canBuy && cache < price
                            ? '[ INSUFFICIENT ]'
                            : !canBuy
                              ? '[ MAXED ]'
                              : '[ COMPILE ]'}
                      </button>
                    </div>

                    <div className={`shrink-0 mt-auto px-3 py-2 border-t ${
                      isFlashing ? 'border-[var(--crt-amber)]' : 'border-[var(--crt-green-dark)]'
                    }`}>
                      <p className="text-[var(--crt-green-dim)] text-xs md:text-sm leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {visibleOffers.length === 0 && (
            <div className="min-h-[120px] col-span-full flex items-center justify-center text-[var(--crt-green-dark)] text-lg border border-[var(--crt-green-dark)] px-4 text-center">
              No offers in this tab. Switch tabs or reload the terminal catalog.
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--crt-green-dark)]">
        <div className="flex justify-center py-1">
          <SignalWave width={60} speed={100} className="text-[0.6rem] text-[var(--crt-green-dark)] opacity-50" />
        </div>
        <div className="px-5 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-[var(--crt-green-dim)]">
            {nextNode && (
              <span>NEXT: {nextNode.name} // {nextNode.rows}x{nextNode.cols} // {nextNode.mines} MINES</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReloadOffers}
              disabled={!canReload}
              className="terminal-btn text-sm px-5 py-2.5 terminal-btn-amber disabled:opacity-40"
              title={`Reroll all offers for $${TERMINAL_RELOAD_COST}`}
            >
              [ RELOAD -${TERMINAL_RELOAD_COST} ]
            </button>
            <button onClick={handleProceed} className="terminal-btn text-sm px-8 py-2.5">
              [ PROCEED &gt;&gt; NODE {currentNodeId + 1} ]
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
