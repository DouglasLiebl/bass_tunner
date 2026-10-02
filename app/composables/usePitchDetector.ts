import { frequencyToCents } from '~/utils/tuning'

function autoCorrelate(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length

  let rms = 0
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i]
  }
  rms = Math.sqrt(rms / SIZE)
  if (rms < 0.01) return null

  let r1 = 0
  let r2 = SIZE - 1
  const threshold = 0.2
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) r1 = i
    else break
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) r2 = SIZE - i
    else break
  }

  const trimmed = buffer.slice(r1, r2)
  const trimmedSize = trimmed.length

  const correlations = new Float32Array(trimmedSize)
  for (let lag = 0; lag < trimmedSize; lag++) {
    let sum = 0
    for (let i = 0; i < trimmedSize - lag; i++) {
      sum += trimmed[i] * trimmed[i + lag]
    }
    correlations[lag] = sum
  }

  let d = 0
  while (d < trimmedSize - 1 && correlations[d] > correlations[d + 1]) {
    d++
  }

  let maxVal = -1
  let maxPos = -1
  for (let i = d; i < trimmedSize; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i]
      maxPos = i
    }
  }

  if (maxPos <= 0) return null

  const y1 = correlations[maxPos - 1] ?? correlations[maxPos]
  const y2 = correlations[maxPos]
  const y3 = correlations[maxPos + 1] ?? correlations[maxPos]
  const a = (y1 + y3 - 2 * y2) / 2
  const b = (y3 - y1) / 2
  const refinedPos = a !== 0 ? maxPos - b / (2 * a) : maxPos

  const frequency = sampleRate / refinedPos
  if (frequency < 30 || frequency > 500) return null

  return frequency
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

  const buffer = shallowRef<Float32Array | null>(null)

  function setTarget(freq: number) {
    targetFrequency = freq
  }

  function detect() {
    if (!analyser || !audioContext || !buffer.value) return

    analyser.getFloatTimeDomainData(buffer.value)

    let rms = 0
    for (let i = 0; i < buffer.value.length; i++) {
      rms += buffer.value[i] * buffer.value[i]
    }
    volume.value = Math.sqrt(rms / buffer.value.length)

    const detected = autoCorrelate(buffer.value, audioContext.sampleRate)
    frequency.value = detected

    if (detected && targetFrequency) {
      cents.value = frequencyToCents(detected, targetFrequency)
    } else {
      cents.value = null
    }

    animationId = requestAnimationFrame(detect)
  }

  async function start() {
    error.value = null

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContext = new AudioContext()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048

      const source = audioContext.createMediaStreamSource(mediaStream)
      source.connect(analyser)

      buffer.value = new Float32Array(analyser.fftSize)
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
