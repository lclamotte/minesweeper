import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getShopItems, UPGRADE_TYPE, UPGRADE_ART } from '../engine/upgrades'
import { getNextNode } from '../engine/nodes'
import { playClick } from '../audio/sounds'
import { SignalWave, NetworkMap } from './AsciiAnim'

function hashString(value) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

export default function Terminal() {
  const [selectedCategory, setSelectedCategory] = useState('subroutine')
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0)
  const [purchaseFlash, setPurchaseFlash] = useState(null)
  const [revealedDealId, setRevealedDealId] = useState(null)
  const optionRefs = useRef([])

  const cache = useGameStore(s => s.cache)
  const subroutines = useGameStore(s => s.subroutines)
  const exploits = useGameStore(s => s.exploits)
  const kernelLevels = useGameStore(s => s.kernelLevels)
  const rootAccess = useGameStore(s => s.rootAccess)
  const purchaseUpgrade = useGameStore(s => s.purchaseUpgrade)
  const proceedToNextNode = useGameStore(s => s.proceedToNextNode)
  const currentNodeId = useGameStore(s => s.currentNodeId)
  const firewalls = useGameStore(s => s.firewalls)
  const maxFirewalls = useGameStore(s => s.maxFirewalls)
  const soundEnabled = useGameStore(s => s.soundEnabled)

  const nextNode = getNextNode(currentNodeId)
  const hasDarkPool = (subroutines.dark_pool || 0) > 0

  const categories = [
    {
      key: 'subroutine',
      label: 'SUBROUTINES',
      desc: 'Passive upgrades that enhance scanning capabilities. Effects persist across all nodes.',
      filter: (item) => item.type === UPGRADE_TYPE.SUBROUTINE,
    },
    {
      key: 'exploit',
      label: 'EXPLOITS',
      desc: 'Single-use tools deployed during a scan. Consumed on activation.',
      filter: (item) => item.type === UPGRADE_TYPE.EXPLOIT,
    },
    {
      key: 'kernel',
      label: 'KERNEL',
      desc: 'Core system optimizations for baseline survivability and rewards.',
      filter: (item) => item.type === UPGRADE_TYPE.KERNEL && !item.requiresRoot,
    },
    {
      key: 'restricted',
      label: '[SUDO]',
      desc: 'Root-gated upgrades. High privilege, high impact.',
      filter: (item) => item.type === UPGRADE_TYPE.KERNEL && item.requiresRoot,
    },
  ]

  const selectedCategoryIndex = Math.max(0, categories.findIndex(cat => cat.key === selectedCategory))
  const activeCategory = categories[selectedCategoryIndex]

  const allCategoryItems = useMemo(() => getShopItems().filter(item => activeCategory.filter(item)), [activeCategory])

  const offerCount = hasDarkPool ? 4 : 3
  const offers = useMemo(() => {
    const seed = `${currentNodeId}-${selectedCategory}`
    const sorted = [...allCategoryItems].sort((a, b) => {
      const scoreA = hashString(`${seed}-${a.id}`)
      const scoreB = hashString(`${seed}-${b.id}`)
      return scoreA - scoreB
    })
    return sorted.slice(0, Math.min(offerCount, sorted.length))
  }, [allCategoryItems, currentNodeId, selectedCategory, offerCount])

  const discountedId = useMemo(() => {
    if (!hasDarkPool || offers.length === 0) return null
    const idx = hashString(`discount-${currentNodeId}-${selectedCategory}`) % offers.length
    return offers[idx].id
  }, [hasDarkPool, offers, currentNodeId, selectedCategory])

  const getPrice = (item) => {
    if (item.id === discountedId) return Math.max(1, Math.floor(item.cost * 0.5))
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

  const handleProceed = () => {
    if (soundEnabled) playClick()
    proceedToNextNode()
  }

  useEffect(() => {
    setSelectedOptionIdx(0)
    setRevealedDealId(null)
    optionRefs.current = []
  }, [selectedCategory])

  useEffect(() => {
    if (offers.length === 0) {
      setSelectedOptionIdx(0)
      return
    }
    if (selectedOptionIdx >= offers.length) {
      setSelectedOptionIdx(offers.length - 1)
    }
  }, [offers.length, selectedOptionIdx])

  useEffect(() => {
    const active = optionRefs.current[selectedOptionIdx]
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedOptionIdx, offers])

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
        setSelectedOptionIdx(idx => Math.min(Math.max(0, offers.length - 1), idx + 1))
        return
      }

      if (e.key === 'Enter') {
        if (offers.length === 0) return
        e.preventDefault()
        handlePurchase(offers[selectedOptionIdx])
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [categories, selectedCategoryIndex, offers, selectedOptionIdx, soundEnabled, cache, subroutines, exploits, kernelLevels, rootAccess])

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
                className={`text-sm py-2 px-5 border font-bold tracking-wider transition-all ${
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
        <p className="text-center text-sm mt-1 text-[var(--crt-green-dark)] tracking-wide">
          OFFERS: {offers.length}/{offerCount} {hasDarkPool ? '// DARK-POOL ACTIVE' : ''} // NAV: ← → CATEGORY, ↑ ↓ SELECT, ENTER COMPILE
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden py-4 px-3 md:px-5">
        <div
          className="w-full min-w-[980px] mx-auto grid gap-3 min-h-full"
          style={{ gridTemplateColumns: `repeat(${Math.max(offers.length, 1)}, minmax(300px, 1fr))` }}
        >
          {offers.map((item, idx) => {
            const owned = getOwnedInfo(item)
            const canBuy = canPurchase(item)
            const isFlashing = purchaseFlash === item.id
            const art = UPGRADE_ART[item.id]
            const discounted = item.id === discountedId
            const price = getPrice(item)
            const isSelected = idx === selectedOptionIdx
            const redacted = discounted && revealedDealId !== item.id && !isSelected
            const displayName = redacted ? '████████████' : item.name

            return (
              <div
                key={item.id}
                ref={(el) => { optionRefs.current[idx] = el }}
                onMouseEnter={() => {
                  setSelectedOptionIdx(idx)
                  if (discounted) setRevealedDealId(item.id)
                }}
                onMouseLeave={() => {
                  if (discounted) setRevealedDealId(null)
                }}
                onClick={() => handlePurchase(item)}
                className={`w-full h-full border-2 transition-all cursor-pointer min-h-[430px] ${
                  isFlashing
                    ? 'border-[var(--crt-amber)] bg-[var(--crt-amber-dark)]'
                    : isSelected
                      ? 'border-[var(--crt-green)] bg-[rgba(0,255,65,0.08)] shadow-[0_0_14px_var(--crt-green-glow)]'
                      : discounted
                        ? 'border-[var(--crt-red)] hover:border-[var(--crt-amber)]'
                        : 'border-[var(--crt-green-dark)] hover:border-[var(--crt-green-dim)]'
                }`}
              >
                <div className="flex flex-col h-full p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap shrink-0">
                    <div className="text-[var(--crt-green)] font-bold text-xl md:text-2xl tracking-wide">
                      {isSelected ? '▸ ' : ''}{displayName}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {discounted && (
                        <span className="text-[var(--crt-red)] text-sm md:text-base tracking-wider">DEAL -50%</span>
                      )}
                      {owned && (
                        <span className="text-[var(--crt-cyan)] text-sm md:text-base tracking-wider">{owned}</span>
                      )}
                    </div>
                  </div>

                  {art && (
                    <div className="flex-1 flex items-center justify-center border border-[var(--crt-green-dark)] bg-[rgba(0,0,0,0.25)] px-4 py-5 mt-3 mb-3 min-h-[250px]">
                      <pre className={`text-[clamp(1.9rem,5.2vh,3.5rem)] leading-[1.02] select-none font-mono text-center transition-colors ${
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

                  <div className="shrink-0 mt-auto pt-2 border-t border-[var(--crt-green-dark)]">
                    <p className="text-[var(--crt-green-dim)] text-sm md:text-base leading-snug mb-2">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="text-[var(--crt-amber)] glow-amber font-bold text-2xl tabular-nums">
                        ${price}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePurchase(item)
                        }}
                        disabled={!canBuy}
                        className={`terminal-btn text-sm md:text-base py-2 px-5 ${canBuy ? 'terminal-btn-amber' : ''}`}
                      >
                        {!rootAccess && item.requiresRoot
                          ? 'ROOT LOCK'
                          : !canBuy && cache < price
                            ? 'INSUFFICIENT'
                            : !canBuy
                              ? 'MAXED'
                              : 'COMPILE'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {offers.length === 0 && (
            <div className="h-full min-h-[240px] col-span-full flex items-center justify-center text-[var(--crt-green-dark)] text-lg border border-[var(--crt-green-dark)]">
              No binaries available in this channel.
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--crt-green-dark)]">
        <div className="flex justify-center py-1">
          <SignalWave width={60} speed={100} className="text-[0.6rem] text-[var(--crt-green-dark)] opacity-50" />
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="text-sm text-[var(--crt-green-dim)]">
            {nextNode && (
              <span>NEXT: {nextNode.name} // {nextNode.rows}x{nextNode.cols} // {nextNode.mines} MINES</span>
            )}
          </div>
          <button onClick={handleProceed} className="terminal-btn text-sm px-8 py-2.5">
            [ INJECT &gt;&gt; NODE {currentNodeId + 1} ]
          </button>
        </div>
      </div>
    </div>
  )
}
