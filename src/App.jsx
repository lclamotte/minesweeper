import { useEffect } from 'react'
import { useGameStore, GAME_PHASE } from './store/gameStore'
import BootSequence from './components/BootSequence'
import TitleScreen from './components/TitleScreen'
import GameGrid from './components/GameGrid'
import HUD from './components/HUD'
import NodeComplete from './components/NodeComplete'
import Terminal from './components/Terminal'
import GameOver from './components/GameOver'
import WinScreen from './components/WinScreen'
import CommandOverlay from './components/CommandOverlay'

export default function App() {
  const phase = useGameStore(s => s.phase)
  const initTheme = useGameStore(s => s.initTheme)

  useEffect(() => { initTheme() }, [initTheme])

  return (
    <div className="crt-screen crt-flicker">
      <div className="noise-overlay" />
      <div className="w-full h-full flex flex-col relative z-10 overflow-hidden">
        {phase === GAME_PHASE.BOOT && <BootSequence />}
        {phase === GAME_PHASE.TITLE && <TitleScreen />}
        {phase === GAME_PHASE.GRID && (
          <>
            <HUD />
            <GameGrid />
          </>
        )}
        {phase === GAME_PHASE.NODE_COMPLETE && <NodeComplete />}
        {phase === GAME_PHASE.TERMINAL && <Terminal />}
        {phase === GAME_PHASE.GAME_OVER && <GameOver />}
        {phase === GAME_PHASE.WIN && <WinScreen />}
        <CommandOverlay />
      </div>
    </div>
  )
}
