import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getShopItems, UPGRADE_TYPE, UPGRADE_ART } from '../engine/upgrades'
import { getNextNode } from '../engine/nodes'
import { playClick } from '../audio/sounds'
import { SignalWave, NetworkMap } from './AsciiAnim'

export default function Terminal() {
  const [selectedCategory, setSelectedCategory] = useState('subroutine')
  const [purchaseFlash, setPurchaseFlash] = useState(null)

  const cache = useGameStore(s => s.cache)
  const subroutines = useGameStore(s => s.subroutines)
  const exploits = useGameStore(s => s.exploits)
  const kernelLevels = useGameStore(s => s.kernelLevels)
  const purchaseUpgrade = useGameStore(s => s.purchaseUpgrade)
  const proceedToNextNode = useGameStore(s => s.proceedToNextNode)
  const currentNodeId = useGameStore(s => s.currentNodeId)
  const firewalls = useGameStore(s => s.firewalls)
  const maxFirewalls = useGameStore(s => s.maxFirewalls)
  const soundEnabled = useGameStore(s => s.soundEnabled)

  const nextNode = getNextNode(currentNodeId)
  const items = getShopItems().filter(item => item.type === selectedCategory)

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
    if (cache < item.cost) return false
    if (item.type === UPGRADE_TYPE.SUBROUTINE) {
      return (subroutines[item.id] || 0) < item.maxLevel
    }
    if (item.type === UPGRADE_TYPE.KERNEL) {
      return (kernelLevels[item.id] || 0) < item.maxLevel
    }
    return true
  }

  const handlePurchase = (item) => {
    if (!canPurchase(item)) return
    if (soundEnabled) playClick()
    const success = purchaseUpgrade(item.id)
    if (success) {
      setPurchaseFlash(item.id)
      setTimeout(() => setPurchaseFlash(null), 400)
    }
  }

  const handleProceed = () => {
    if (soundEnabled) playClick()
    proceedToNextNode()
  }

  const categories = [
    { key: 'subroutine', label: 'SUBROUTINES', desc: 'Passive upgrades that enhance your scanning capabilities. Effects persist across all nodes.' },
    { key: 'exploit', label: 'EXPLOITS', desc: 'Single-use tools deployed during a scan. Consumed on activation — stock up before each node.' },
    { key: 'kernel', label: 'KERNEL', desc: 'Core system optimizations. Increase base stats like firewall integrity and cache capacity.' },
  ]

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header bar */}
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
        </div>
      </div>

      {/* Category tabs — centered, full width */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 border-b border-[var(--crt-green-dark)]">
        {categories.map(cat => {
          const isActive = selectedCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`text-sm py-2 px-6 border font-bold tracking-wider transition-all ${
                isActive
                  ? 'bg-[var(--crt-green)] text-black border-[var(--crt-green)] shadow-[0_0_8px_var(--crt-green-glow)]'
                  : 'bg-transparent text-[var(--crt-green-dim)] border-[var(--crt-green-dark)] hover:border-[var(--crt-green-dim)] hover:text-[var(--crt-green)]'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Category description */}
      <div className="shrink-0 px-5 py-2.5 text-center">
        <p className="text-[var(--crt-green-dim)] text-sm leading-relaxed">
          {categories.find(c => c.key === selectedCategory)?.desc}
        </p>
      </div>

      {/* Items grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {items.map(item => {
            const owned = getOwnedInfo(item)
            const canBuy = canPurchase(item)
            const isFlashing = purchaseFlash === item.id
            const art = UPGRADE_ART[item.id]

            return (
              <div
                key={item.id}
                className={`border flex flex-col items-center p-5 transition-all ${
                  isFlashing
                    ? 'border-[var(--crt-amber)] bg-[var(--crt-amber-dark)]'
                    : 'border-[var(--crt-green-dark)] hover:border-[var(--crt-green-dim)]'
                }`}
              >
                {/* ASCII art — large and centered */}
                {art && (
                  <pre className={`text-[clamp(1rem,2.5vh,1.6rem)] leading-[1.15] select-none font-mono text-center transition-colors ${
                    isFlashing ? 'text-[var(--crt-amber)] glow-amber' : 'text-[var(--crt-green)] glow'
                  }`}>
                    {art.join('\n')}
                  </pre>
                )}

                {/* Name */}
                <div className="text-[var(--crt-green)] font-bold text-base tracking-wider mt-3 text-center">
                  {item.name}
                </div>

                {/* Owned badge */}
                {owned && (
                  <div className="text-[var(--crt-cyan)] text-xs mt-1 tracking-wider">
                    {owned}
                  </div>
                )}

                {/* Description */}
                <p className="text-[var(--crt-green-dim)] text-sm mt-2 leading-relaxed text-center flex-1">
                  {item.description}
                </p>

                {/* Purchase row */}
                <div className="mt-4 flex items-center gap-3 w-full justify-center">
                  <span className="text-[var(--crt-amber)] glow-amber font-bold text-lg tabular-nums">${item.cost}</span>
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={!canBuy}
                    className={`terminal-btn text-xs py-1.5 px-4 ${canBuy ? 'terminal-btn-amber' : ''}`}
                  >
                    {!canBuy && cache < item.cost ? 'INSUFFICIENT' : !canBuy ? 'MAXED' : 'COMPILE'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Proceed bar */}
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
