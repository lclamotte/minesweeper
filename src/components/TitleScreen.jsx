import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { hasSave, getSaveInfo } from '../store/gameStore'
import { getNode } from '../engine/nodes'
import { playClick } from '../audio/sounds'
import { THEMES } from '../themes'
import { DataStream, SignalWave, GlitchText, TerminalLog } from './AsciiAnim'

const ASCII_TITLE = `
 ██████╗  ██████╗  ██████╗ ████████╗
 ██╔══██╗██╔═══██╗██╔═══██╗╚══██╔══╝
 ██████╔╝██║   ██║██║   ██║   ██║
 ██╔══██╗██║   ██║██║   ██║   ██║
 ██║  ██║╚██████╔╝╚██████╔╝   ██║
 ╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝
 ███████╗██╗    ██╗███████╗███████╗██████╗ ███████╗██████╗
 ██╔════╝██║    ██║██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗
 ███████╗██║ █╗ ██║█████╗  █████╗  ██████╔╝█████╗  ██████╔╝
 ╚════██║██║███╗██║██╔══╝  ██╔══╝  ██╔═══╝ ██╔══╝  ██╔══██╗
 ███████║╚███╔███╔╝███████╗███████╗██║     ███████╗██║  ██║
 ╚══════╝ ╚══╝╚══╝ ╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝`

export default function TitleScreen() {
  const startNewRun = useGameStore(s => s.startNewRun)
  const resumeRun = useGameStore(s => s.resumeRun)
  const soundEnabled = useGameStore(s => s.soundEnabled)
  const toggleSound = useGameStore(s => s.toggleSound)
  const currentTheme = useGameStore(s => s.currentTheme)
  const setTheme = useGameStore(s => s.setTheme)

  const [saveExists, setSaveExists] = useState(false)
  const [saveInfo, setSaveInfo] = useState(null)

  useEffect(() => {
    const exists = hasSave()
    setSaveExists(exists)
    if (exists) setSaveInfo(getSaveInfo())
  }, [])

  const handleStart = () => {
    if (soundEnabled) playClick()
    startNewRun()
  }

  const handleResume = () => {
    if (soundEnabled) playClick()
    resumeRun()
  }

  const handleCycleTheme = () => {
    const ids = Object.keys(THEMES)
    if (ids.length === 0) return
    const currentIdx = Math.max(0, ids.indexOf(currentTheme))
    const nextIdx = (currentIdx + 1) % ids.length
    if (soundEnabled) playClick()
    setTheme(ids[nextIdx])
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Flanking data streams */}
      <div className="absolute left-[3%] top-[10%] opacity-20 pointer-events-none hidden lg:block">
        <DataStream width={16} height={20} speed={100} className="text-[0.7rem] text-[var(--crt-green)]" />
      </div>
      <div className="absolute right-[3%] top-[8%] opacity-20 pointer-events-none hidden lg:block">
        <DataStream width={16} height={22} speed={130} className="text-[0.7rem] text-[var(--crt-green)]" />
      </div>

      {/* Scrolling terminal log — bottom-left ambient */}
      <div className="absolute left-[3%] bottom-[8%] opacity-15 pointer-events-none hidden lg:block">
        <TerminalLog lines={4} speed={2200} className="text-[0.65rem] text-[var(--crt-green-dim)]" />
      </div>

      {/* Title */}
      <pre className="text-[var(--crt-green)] glow-strong leading-none select-none whitespace-pre text-[1.4vw] lg:text-[1.1vw]">
        {ASCII_TITLE}
      </pre>

      {/* Signal wave under title */}
      <div className="mt-[1.5vh]">
        <SignalWave width={40} speed={90} className="text-[0.8rem] text-[var(--crt-green-dark)]" />
      </div>

      <div className="text-center space-y-3 mt-[2vh]">
        <p className="text-[var(--crt-green-dim)] text-[clamp(0.85rem,1.5vw,1.15rem)] tracking-[0.22em] uppercase">
          CLEAR THE GRID. AVOID THE MINES. REACH ROOT ACCESS.
        </p>
        <p className="text-[var(--crt-amber)] text-[clamp(1rem,2vw,1.6rem)] tracking-widest glow-amber">
          &gt;&gt; <GlitchText text="ROOT ACCESS REQUIRED" intensity={0.04} speed={120} /> &lt;&lt;
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 mt-[3vh]">
        {saveExists ? (
          <>
            <button
              onClick={handleResume}
              className="terminal-btn terminal-btn-amber text-[clamp(1.05rem,2vw,1.6rem)] tracking-[0.45em] px-16 py-4 shadow-[0_0_14px_var(--crt-green-glow)]"
            >
              [ RESUME ]
            </button>
            {saveInfo && (
              <p className="text-[var(--crt-green-dim)] text-[clamp(0.7rem,1.1vw,0.9rem)] tracking-wider">
                Node {saveInfo.currentNodeId} — {getNode(saveInfo.currentNodeId).name} — ${saveInfo.cache} cache
              </p>
            )}
            <button
              onClick={handleStart}
              className="terminal-btn text-[clamp(0.95rem,1.55vw,1.2rem)] tracking-[0.34em] px-11 py-3"
            >
              [ NEW RUN ]
            </button>
          </>
        ) : (
          <button
            onClick={handleStart}
            className="terminal-btn terminal-btn-amber text-[clamp(1.05rem,2vw,1.6rem)] tracking-[0.45em] px-16 py-4 shadow-[0_0_14px_var(--crt-green-glow)]"
          >
            [ INFILTRATE ]
          </button>
        )}

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="border border-[var(--crt-green-dark)] text-[var(--crt-green-dim)] text-[clamp(0.72rem,1.05vw,0.88rem)] px-3 py-1.5 tracking-[0.18em] uppercase hover:text-[var(--crt-green)] hover:border-[var(--crt-green-dim)] transition-colors"
          >
            Audio: {soundEnabled ? 'On' : 'Off'}
          </button>
          <button
            onClick={handleCycleTheme}
            className="border border-[var(--crt-green-dark)] text-[var(--crt-green-dim)] text-[clamp(0.72rem,1.05vw,0.88rem)] px-3 py-1.5 tracking-[0.18em] uppercase hover:text-[var(--crt-green)] hover:border-[var(--crt-green-dim)] transition-colors"
          >
            Theme: {THEMES[currentTheme]?.name || currentTheme}
          </button>
        </div>
      </div>
    </div>
  )
}
