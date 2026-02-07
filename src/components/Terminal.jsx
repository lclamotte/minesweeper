import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getShopItems, UPGRADE_TYPE } from '../engine/upgrades'
import { getNextNode } from '../engine/nodes'
import { playClick } from '../audio/sounds'

export default function Terminal() {
  const [selectedCategory, setSelectedCategory] = useState('subroutine')
  const [selectedItem, setSelectedItem] = useState(null)
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
    return true // exploits can always be purchased
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
    { key: 'subroutine', label: 'SUBROUTINES', desc: 'Passive Buffs' },
    { key: 'exploit', label: 'EXPLOITS', desc: 'Active Tools' },
    { key: 'kernel', label: 'KERNEL', desc: 'Stat Upgrades' },
  ]

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-hidden">
      {/* Terminal header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-xs text-[var(--crt-green-dim)]">
          <span>root@datamines</span>
          <span className="text-[var(--crt-green)]">:</span>
          <span className="text-[var(--crt-amber)]">~/terminal</span>
          <span className="text-[var(--crt-green)]">$</span>
          <span className="text-[var(--crt-green)] glow">compile --interactive</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <h1 className="text-lg text-[var(--crt-green)] glow-strong tracking-[0.5em] font-bold">
              TERMINAL
            </h1>
            <p className="text-[10px] text-[var(--crt-green-dim)] tracking-[0.3em] mt-1">
              COMPILE YOUR BUILD // SELECT UPGRADES
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--crt-green-dim)]">CACHE</span>
              <span className="text-lg text-[var(--crt-amber)] glow-amber font-bold tabular-nums">
                ${cache}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-[var(--crt-green-dim)]">FW</span>
              <span className="text-sm text-[var(--crt-green)] tabular-nums">
                {firewalls}/{maxFirewalls}
              </span>
            </div>
          </div>
        </div>
        <div className="w-full h-px bg-[var(--crt-green-dark)] mt-3" />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-4">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => { setSelectedCategory(cat.key); setSelectedItem(null) }}
            className={`terminal-btn text-[10px] py-1 px-3 ${
              selectedCategory === cat.key
                ? 'bg-[var(--crt-green)] text-black'
                : ''
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map(item => {
            const owned = getOwnedInfo(item)
            const canBuy = canPurchase(item)
            const isFlashing = purchaseFlash === item.id

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`border p-3 cursor-pointer transition-all ${
                  isFlashing
                    ? 'border-[var(--crt-amber)] bg-[var(--crt-amber-dark)]'
                    : selectedItem?.id === item.id
                      ? 'border-[var(--crt-green)] bg-[#0a1a0a]'
                      : 'border-[var(--crt-green-dark)] hover:border-[var(--crt-green-dim)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[var(--crt-green)] text-xs font-bold truncate">{item.name}</p>
                    <p className="text-[var(--crt-green-dim)] text-[10px] mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[var(--crt-amber)] text-xs font-bold">${item.cost}</p>
                    {owned && (
                      <p className="text-[var(--crt-cyan)] text-[9px] mt-1">{owned}</p>
                    )}
                  </div>
                </div>

                {/* Purchase button */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[9px] text-[var(--crt-green-dark)]">{item.effect}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePurchase(item) }}
                    disabled={!canBuy}
                    className={`terminal-btn text-[9px] py-0.5 px-2 ${
                      !canBuy ? '' : 'terminal-btn-amber'
                    }`}
                  >
                    {!canBuy && cache < item.cost ? 'INSUFFICIENT' : !canBuy ? 'MAX' : 'COMPILE'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Proceed button */}
      <div className="mt-4 pt-4 border-t border-[var(--crt-green-dark)] flex items-center justify-between">
        <div className="text-[10px] text-[var(--crt-green-dim)]">
          {nextNode && (
            <span>NEXT: {nextNode.name} // {nextNode.rows}x{nextNode.cols} // {nextNode.mines} MINES</span>
          )}
        </div>
        <button onClick={handleProceed} className="terminal-btn px-6 py-2">
          [ INJECT &gt;&gt; NODE {currentNodeId + 1} ]
        </button>
      </div>
    </div>
  )
}
