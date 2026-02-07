/**
 * Web Audio API sound generator for mechanical/terminal sounds.
 * All sounds are procedurally generated — no external audio files needed.
 */

let audioCtx = null

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function playClick() {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05)
  gain.gain.setValueAtTime(0.08, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.05)
}

export function playReveal() {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(600 + Math.random() * 400, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.04)
  gain.gain.setValueAtTime(0.05, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.06)
}

export function playCascade(index = 0) {
  const ctx = getAudioContext()
  const delay = index * 0.01
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(300 + index * 30, ctx.currentTime + delay)
  gain.gain.setValueAtTime(0.03, ctx.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.04)
  osc.start(ctx.currentTime + delay)
  osc.stop(ctx.currentTime + delay + 0.04)
}

export function playFlag() {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(440, ctx.currentTime)
  osc.frequency.setValueAtTime(660, ctx.currentTime + 0.05)
  gain.gain.setValueAtTime(0.05, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.1)
}

export function playExplosion() {
  const ctx = getAudioContext()
  const bufferSize = ctx.sampleRate * 0.3
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15))
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1000, ctx.currentTime)
  filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
  source.start(ctx.currentTime)
}

export function playWin() {
  const ctx = getAudioContext()
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12)
    gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.12)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3)
    osc.start(ctx.currentTime + i * 0.12)
    osc.stop(ctx.currentTime + i * 0.12 + 0.3)
  })
}

export function playPurchase() {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(200, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1)
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2)
  gain.gain.setValueAtTime(0.06, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.25)
}

export function playDeepScan() {
  const ctx = getAudioContext()
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(1200 - i * 200, ctx.currentTime + i * 0.08)
    gain.gain.setValueAtTime(0.05, ctx.currentTime + i * 0.08)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.1)
    osc.start(ctx.currentTime + i * 0.08)
    osc.stop(ctx.currentTime + i * 0.08 + 0.1)
  }
}

export function playBoot() {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(100, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.5)
  gain.gain.setValueAtTime(0.04, ctx.currentTime)
  gain.gain.setValueAtTime(0.04, ctx.currentTime + 0.4)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.6)
}
