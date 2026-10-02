import { centsFromDetected, normalizeToTargetOctave } from '~/utils/tuning'

const FFT_SIZE = 8192
const RMS_THRESHOLD = 0.004
const RMS_THRESHOLD_LOW = 0.0025
const YIN_THRESHOLD = 0.18
const YIN_THRESHOLD_LOW = 0.28
const CENTS_SMOOTHING = 0.2
const FREQ_SMOOTHING = 0.25
const HOLD_FRAMES = 10
const HOLD_FRAMES_LOW = 18
const VOLUME_HOLD_THRESHOLD = 0.002
const MIN_FREQ = 27
const MAX_FREQ = 400
const LOW_TARGET_HZ = 50

type YinCandidate = {
  tau: number
  clarity: number
  frequency: number
}

function parabolicTau(yin: Float32Array, tau: number): number {
  const x0 = Math.max(1, tau - 1)
  const x2 = Math.min(yin.length - 1, tau + 1)
  if (x0 === tau || x2 === tau) return tau

  const s0 = yin[x0]
  const s1 = yin[tau]
  const s2 = yin[x2]
  const denom = 2 * (2 * s1 - s2 - s0)
  if (Math.abs(denom) < 1e-12) return tau
  return tau + (s2 - s0) / denom
}

function collectLocalMinima(
  yin: Float32Array,
  minTau: number,
  maxTau: number,
  threshold: number,
): YinCandidate[] {
  const candidates: YinCandidate[] = []

  for (let tau = minTau + 1; tau < maxTau - 1; tau++) {
    if (yin[tau] >= threshold) continue
    if (yin[tau] > yin[tau - 1] || yin[tau] > yin[tau + 1]) continue

    let t = tau
    while (t + 1 < maxTau && yin[t + 1] <= yin[t]) t++

    const refined = parabolicTau(yin, t)
    candidates.push({
      tau: refined,
      clarity: yin[t],
      frequency: 0,
    })
    tau = t + 1
  }

  return candidates
}

function bestNearTau(
  yin: Float32Array,
  expectedTau: number,
  minTau: number,
  maxTau: number,
  window: number,
): YinCandidate | null {
  const start = Math.max(minTau, Math.floor(expectedTau - window))
  const end = Math.min(maxTau - 1, Math.ceil(expectedTau + window))
  if (start >= end) return null

  let bestTau = -1
  let bestVal = Infinity
  for (let tau = start; tau <= end; tau++) {
    if (yin[tau] < bestVal) {
      bestVal = yin[tau]
      bestTau = tau
    }
  }

  if (bestTau < 0 || bestVal > 0.45) return null

  const refined = parabolicTau(yin, bestTau)
  return { tau: refined, clarity: bestVal, frequency: 0 }
}

function yinDetect(
  buffer: Float32Array,
  sampleRate: number,
  targetFrequency: number | null,
): number | null {
  const size = buffer.length
  const lowTarget =
    targetFrequency !== null && targetFrequency < LOW_TARGET_HZ

  let rms = 0
  for (let i = 0; i < size; i++) {
    rms += buffer[i] * buffer[i]
  }
  rms = Math.sqrt(rms / size)
  const rmsGate = lowTarget ? RMS_THRESHOLD_LOW : RMS_THRESHOLD
  if (rms < rmsGate) return null

  const half = Math.floor(size / 2)
  const yin = new Float32Array(half)

  for (let tau = 1; tau < half; tau++) {
    let sum = 0
    for (let i = 0; i < half; i++) {
      const delta = buffer[i] - buffer[i + tau]
      sum += delta * delta
    }
    yin[tau] = sum
  }

  yin[0] = 1
  let runningSum = 0
  for (let tau = 1; tau < half; tau++) {
    runningSum += yin[tau]
    yin[tau] = runningSum === 0 ? 1 : (yin[tau] * tau) / runningSum
  }

  const minTau = Math.max(2, Math.floor(sampleRate / MAX_FREQ))
  const maxTau = Math.min(half - 1, Math.floor(sampleRate / MIN_FREQ))
  const threshold = lowTarget ? YIN_THRESHOLD_LOW : YIN_THRESHOLD

  const candidates = collectLocalMinima(yin, minTau, maxTau, threshold)

  if (targetFrequency) {
    const window = Math.max(4, Math.floor(sampleRate / targetFrequency / 12))
    for (const harmonic of [1, 2, 3]) {
      const expectedTau = sampleRate / (targetFrequency * harmonic)
      if (expectedTau < minTau || expectedTau > maxTau) continue
      const near = bestNearTau(yin, expectedTau, minTau, maxTau, window)
      if (near) candidates.push(near)
    }
  }

  if (!candidates.length) {
    let minVal = 1
    let minTauEst = -1
    for (let tau = minTau; tau < maxTau; tau++) {
      if (yin[tau] < minVal) {
        minVal = yin[tau]
        minTauEst = tau
      }
    }
    if (minTauEst < 0 || minVal > 0.4) return null
    candidates.push({
      tau: parabolicTau(yin, minTauEst),
      clarity: minVal,
      frequency: 0,
    })
  }

  for (const c of candidates) {
    c.frequency = sampleRate / c.tau
  }

  let best: YinCandidate | null = null
  let bestScore = Infinity

  for (const c of candidates) {
    if (c.frequency < MIN_FREQ || c.frequency > MAX_FREQ) continue

    let score = c.clarity * 1000

    if (targetFrequency) {
      const cents = Math.abs(centsFromDetected(c.frequency, targetFrequency))
      score += cents
      if (cents > 120) score += 80
    } else if (!best) {
      best = c
      break
    }

    if (score < bestScore) {
      bestScore = score
      best = c
    }
  }

  if (!best && candidates.length) {
    best = candidates.reduce((a, b) => (a.clarity < b.clarity ? a : b))
  }

  if (!best) return null
  if (best.frequency < MIN_FREQ || best.frequency > MAX_FREQ) return null

  return best.frequency
}

function smoothValue(current: number | null, next: number, factor: number): number {
  if (current === null) return next
  return current * (1 - factor) + next * factor
}

export function usePitchDetector() {
  const isListening = ref(false)
  const frequency = ref<number | null>(null)
  const cents = ref<number | null>(null)
  const volume = ref(0)
  const error = ref<string | null>(null)

  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let mediaStream: MediaStream | null = null
  let animationId: number | null = null
  let targetFrequency: number | null = null

  let smoothedFrequency: number | null = null
  let smoothedCents: number | null = null
  let lastRawFrequency: number | null = null
  let holdFrames = 0

  const buffer = shallowRef<Float32Array | null>(null)

  function setTarget(freq: number) {
    targetFrequency = freq
    smoothedCents = null
    smoothedFrequency = null
    lastRawFrequency = null
    holdFrames = 0
  }

  function resetSmoothing() {
    smoothedFrequency = null
    smoothedCents = null
    lastRawFrequency = null
    holdFrames = 0
  }

  function detect() {
    if (!analyser || !audioContext || !buffer.value) return

    analyser.getFloatTimeDomainData(buffer.value)

    let rms = 0
    for (let i = 0; i < buffer.value.length; i++) {
      rms += buffer.value[i] * buffer.value[i]
    }
    const currentVolume = Math.sqrt(rms / buffer.value.length)
    volume.value = smoothValue(volume.value || 0, currentVolume, 0.35)

    const lowTarget =
      targetFrequency !== null && targetFrequency < LOW_TARGET_HZ
    const holdLimit = lowTarget ? HOLD_FRAMES_LOW : HOLD_FRAMES

    const detected = yinDetect(
      buffer.value,
      audioContext.sampleRate,
      targetFrequency,
    )
    let rawFrequency = detected

    if (
      rawFrequency === null &&
      lastRawFrequency !== null &&
      currentVolume >= VOLUME_HOLD_THRESHOLD
    ) {
      holdFrames++
      if (holdFrames <= holdLimit) {
        rawFrequency = lastRawFrequency
      }
    } else if (rawFrequency !== null) {
      lastRawFrequency = rawFrequency
      holdFrames = 0
    } else {
      holdFrames = 0
      if (currentVolume < VOLUME_HOLD_THRESHOLD) {
        lastRawFrequency = null
      }
    }

    if (rawFrequency && targetFrequency) {
      const snapped = normalizeToTargetOctave(rawFrequency, targetFrequency)
      smoothedFrequency = smoothValue(smoothedFrequency, snapped, FREQ_SMOOTHING)
      frequency.value = smoothedFrequency

      const rawCents = centsFromDetected(rawFrequency, targetFrequency)
      smoothedCents = smoothValue(smoothedCents, rawCents, CENTS_SMOOTHING)
      cents.value = smoothedCents
    } else if (currentVolume < VOLUME_HOLD_THRESHOLD || holdFrames > holdLimit) {
      frequency.value = null
      cents.value = null
      smoothedFrequency = null
      smoothedCents = null
    }

    animationId = requestAnimationFrame(detect)
  }

  async function start() {
    error.value = null

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      audioContext = new AudioContext()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0

      const highPass = audioContext.createBiquadFilter()
      highPass.type = 'highpass'
      highPass.frequency.value = 20
      highPass.Q.value = 0.5

      const lowShelf = audioContext.createBiquadFilter()
      lowShelf.type = 'lowshelf'
      lowShelf.frequency.value = 90
      lowShelf.gain.value = 8

      const source = audioContext.createMediaStreamSource(mediaStream)
      source.connect(highPass)
      highPass.connect(lowShelf)
      lowShelf.connect(analyser)

      buffer.value = new Float32Array(analyser.fftSize)
      resetSmoothing()
      isListening.value = true
      detect()
    } catch (e) {
      error.value =
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone access to tune.'
          : 'Could not access microphone.'
      stop()
    }
  }

  function stop() {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    mediaStream?.getTracks().forEach((track) => track.stop())
    mediaStream = null

    audioContext?.close()
    audioContext = null
    analyser = null
    buffer.value = null
    resetSmoothing()

    isListening.value = false
    frequency.value = null
    cents.value = null
    volume.value = 0
  }

  onUnmounted(stop)

  return {
    isListening,
    frequency,
    cents,
    volume,
    error,
    setTarget,
    start,
    stop,
  }
}
