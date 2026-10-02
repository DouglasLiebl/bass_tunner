<script setup lang="ts">
import {
  BASS_TUNING_CATEGORIES,
  centsToLabel,
  tuningLabel,
} from '~/utils/tuning'

const categories = BASS_TUNING_CATEGORIES
const selectedTuningId = ref('standard')
const selectedIndex = ref(0)

const currentTuning = computed(
  () =>
    categories
      .flatMap((c) => c.tunings)
      .find((t) => t.id === selectedTuningId.value) ?? categories[0].tunings[0],
)
const strings = computed(() => currentTuning.value.strings)
const selectedString = computed(() => strings.value[selectedIndex.value])

watch(selectedTuningId, () => {
  selectedIndex.value = 0
})

const { isListening, frequency, cents, volume, error, setTarget, start, stop } =
  usePitchDetector()

watch(
  selectedString,
  (s) => setTarget(s.frequency),
  { immediate: true },
)

const tuningStatus = computed(() => {
  if (cents.value === null) return null
  return centsToLabel(cents.value)
})

const needleRotation = computed(() => {
  if (cents.value === null) return 0
  const clamped = Math.max(-60, Math.min(60, cents.value))
  return (clamped / 60) * 48
})

const gaugeTicks = [-40, -20, 0, 20, 40].map((tick) => {
  const angle = (tick / 50) * 0.91
  return {
    tick,
    x1: 130 + 88 * Math.sin(angle),
    y1: 130 - 88 * Math.cos(angle),
    x2: 130 + 96 * Math.sin(angle),
    y2: 130 - 96 * Math.cos(angle),
  }
})

const listenLabel = computed(() => (isListening.value ? 'Listening' : 'Ready'))

const tuningHint = computed(() => {
  if (!isListening.value) return null
  if (cents.value === null) return 'Play the string'
  if (tuningStatus.value === 'in-tune') return 'In tune'
  if (tuningStatus.value === 'flat') return 'Tune up'
  return 'Tune down'
})

const displayCents = computed(() => {
  if (cents.value === null) return null
  const rounded = Math.round(cents.value)
  if (rounded === 0) return '0'
  return rounded > 0 ? `+${rounded}` : `${rounded}`
})

async function toggleListening() {
  if (isListening.value) stop()
  else await start()
}
</script>

<template>
  <div class="page">
  <div class="shell">
    <aside class="sidebar">
      <header class="sidebar-header">
        <h1 class="display-title">Bass Tuner</h1>
        <p class="label-caps">Four-string instrument</p>
      </header>

      <nav class="nav" aria-label="Select tuning">
        <section v-for="category in categories" :key="category.id" class="nav-section">
          <h2 class="label-caps nav-section-label">{{ category.name }}</h2>
          <ul class="nav-list">
            <li v-for="tuning in category.tunings" :key="tuning.id">
              <button
                class="nav-item"
                :class="{ active: selectedTuningId === tuning.id }"
                @click="selectedTuningId = tuning.id"
              >
                <span class="nav-item-name">{{ tuning.name }}</span>
                <span class="nav-item-notes">{{ tuningLabel(tuning) }}</span>
              </button>
            </li>
          </ul>
        </section>
      </nav>
    </aside>

    <main class="main">
      <div class="workspace">
        <header class="page-header">
          <div>
            <h2 class="page-title">{{ currentTuning.name }}</h2>
            <p class="page-meta">{{ tuningLabel(currentTuning) }}</p>
          </div>
          <span class="status" :class="{ live: isListening }">
            {{ listenLabel }}
          </span>
        </header>

        <section class="card tuner-card" :class="tuningStatus">
          <div class="gauge" aria-hidden="true">
            <svg class="gauge-svg" viewBox="0 0 260 150">
              <path
                d="M 30 130 A 100 100 0 0 1 230 130"
                fill="none"
                stroke="var(--line)"
                stroke-width="10"
                stroke-linecap="round"
              />
              <g>
                <line
                  v-for="t in gaugeTicks"
                  :key="t.tick"
                  :x1="t.x1"
                  :y1="t.y1"
                  :x2="t.x2"
                  :y2="t.y2"
                  stroke="var(--accent)"
                  stroke-width="1"
                  opacity="0.5"
                />
              </g>
              <g
                class="needle"
                :style="{ transform: `rotate(${needleRotation}deg)`, transformOrigin: '130px 130px' }"
              >
                <line x1="130" y1="130" x2="130" y2="54" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                <circle cx="130" cy="130" r="5" fill="currentColor" />
              </g>
            </svg>
            <div class="gauge-labels label-caps">
              <span>Flat</span>
              <span>Sharp</span>
            </div>
          </div>

          <p
            v-if="tuningHint"
            class="tuning-hint label-caps"
            :class="tuningStatus"
          >
            {{ tuningHint }}
          </p>

          <p class="note">{{ selectedString.note }}</p>

          <div class="readouts">
            <p v-if="displayCents !== null" class="readout-primary">{{ displayCents }} cents</p>
            <p v-else class="readout-primary muted">—</p>
            <p class="readout-meta">
              <span>{{ frequency ? frequency.toFixed(1) : '—' }}</span>
              <span class="readout-target">/ {{ selectedString.frequency }} Hz</span>
            </p>
          </div>

          <div class="meter">
            <div class="meter-fill" :style="{ width: `${Math.min(100, volume * 500)}%` }" />
          </div>
        </section>

        <section class="strings" aria-label="Select string">
          <button
            v-for="(str, i) in strings"
            :key="`${str.note}-${i}`"
            type="button"
            class="string-btn"
            :class="{ active: selectedIndex === i, tuned: selectedIndex === i && tuningStatus === 'in-tune' }"
            @click="selectedIndex = i"
          >
            {{ str.name }}
          </button>
        </section>

        <button
          class="btn-primary"
          :class="{ secondary: isListening }"
          @click="toggleListening"
        >
          {{ isListening ? 'Stop listening' : 'Start tuning' }}
        </button>

        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </div>
    </main>
  </div>

  <footer class="footbar">
    <div class="footbar-inner">
      <div class="footbar-block">
        <span class="label-caps footbar-label">About</span>
        <p class="footbar-text">
          Real-time pitch detection for four-string bass. Microphone access is required to tune.
        </p>
      </div>
      <div class="footbar-block">
        <span class="label-caps footbar-label">Reference</span>
        <p class="footbar-text">
          Concert pitch A4 = 440 Hz. A note is in tune when within ±5 cents of the target.
        </p>
      </div>
      <div class="footbar-block">
        <span class="label-caps footbar-label">How to use</span>
        <p class="footbar-text">
          Choose a tuning from the sidebar, select a string, start listening, and play that string.
        </p>
      </div>
    </div>
    <p class="footbar-credit">
      Built by
      <a
        href="https://github.com/DouglasLiebl"
        target="_blank"
        rel="noopener noreferrer"
      >Douglas Liebl</a>
    </p>
  </footer>
  </div>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.shell {
  flex: 1;
  min-height: 0;
  display: flex;
  width: 100%;
}

.sidebar {
  width: min(360px, 32vw);
  flex-shrink: 0;
  padding: var(--space-xl) clamp(1rem, 2vw, 2rem);
  background: var(--bg-secondary);
  border-right: 1px solid var(--line);
  overflow-y: auto;
}

.sidebar-header {
  padding-bottom: var(--space-lg);
  border-bottom: 1px solid var(--line);
}

.display-title {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.label-caps {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.sidebar-header .label-caps {
  margin-top: var(--space-xs);
}

.nav {
  margin-top: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.nav-section-label {
  padding: 0 var(--space-sm);
  margin-bottom: var(--space-xs);
  color: var(--accent);
}

.nav-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  width: 100%;
  min-height: 44px;
  padding: var(--space-xs) var(--space-sm);
  border: none;
  border-left: 2px solid transparent;
  border-radius: var(--radius);
  background: transparent;
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition), opacity var(--transition);
}

.nav-item:hover {
  background: rgba(237, 232, 224, 0.6);
  opacity: 0.9;
}

.nav-item.active {
  border-left-color: var(--accent);
  background: var(--bg-primary);
}

.nav-item.active .nav-item-name {
  font-weight: 500;
  color: var(--text-primary);
}

.nav-item-name {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--text-secondary);
  transition: color var(--transition);
}

.nav-item-notes {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--accent);
  letter-spacing: 0.02em;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(2rem, 4vw, 4rem) clamp(1.5rem, 5vw, 4rem);
  background: var(--bg-primary);
}

.workspace {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.page-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--text-primary);
}

.page-meta {
  margin-top: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.status {
  flex-shrink: 0;
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
  transition: border-color var(--transition), color var(--transition);
}

.status.live {
  border-color: var(--accent);
  color: var(--text-primary);
}

.tuning-hint {
  margin-top: var(--space-sm);
  color: var(--text-secondary);
}

.tuning-hint.in-tune {
  color: var(--text-primary);
}

.tuning-hint.flat,
.tuning-hint.sharp {
  color: var(--accent);
}

.card {
  background: var(--bg-primary);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
  text-align: center;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.tuner-card.in-tune {
  border-color: var(--accent);
  box-shadow: var(--shadow-lift);
}

.gauge-svg {
  width: 100%;
  max-width: 280px;
  display: block;
  margin: 0 auto;
  color: var(--text-primary);
}

.needle {
  transition: transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.tuner-card.in-tune .gauge-svg {
  color: var(--accent);
}

.gauge-labels {
  display: flex;
  justify-content: space-between;
  max-width: 248px;
  margin: var(--space-xs) auto 0;
  color: var(--accent);
}

.note {
  margin-top: var(--space-md);
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 8vw, 3.5rem);
  font-weight: 700;
  line-height: 1;
  color: var(--text-primary);
  transition: color var(--transition);
}

.tuner-card.in-tune .note {
  color: var(--accent);
}

.readouts {
  margin-top: var(--space-md);
}

.readout-primary {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--text-primary);
}

.readout-primary.muted {
  color: var(--line);
}

.readout-meta {
  margin-top: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.readout-target {
  color: var(--accent);
}

.meter {
  margin-top: var(--space-lg);
  height: 2px;
  background: var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.06s linear;
}

.strings {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.string-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.75rem;
  border: 1.5px solid var(--line);
  border-radius: var(--radius);
  background: transparent;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition), color var(--transition);
}

.string-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.string-btn.active {
  border-color: var(--accent);
  background: var(--bg-secondary);
  font-weight: 500;
  color: var(--text-primary);
}

.string-btn.tuned {
  border-color: var(--text-primary);
  font-weight: 600;
  color: var(--text-primary);
}

.btn-primary {
  width: 100%;
  min-height: 48px;
  padding: 12px 24px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-primary);
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition), box-shadow var(--transition), transform var(--transition);
}

.btn-primary:hover {
  background: #e0dbd3;
  box-shadow: var(--shadow-lift);
}

.btn-primary:active {
  transform: translateY(1px);
  box-shadow: none;
}

.btn-primary.secondary {
  background: transparent;
  border: 1.5px solid var(--line);
  font-weight: 500;
  color: var(--text-primary);
}

.btn-primary.secondary:hover {
  background: var(--bg-secondary);
}

.error {
  font-size: 0.875rem;
  color: #8b4a42;
  text-align: center;
  line-height: 1.6;
}

.footbar {
  flex-shrink: 0;
  border-top: 1px solid var(--line);
  background: var(--bg-secondary);
  padding: var(--space-md) clamp(1rem, 3vw, 2.5rem);
}

.footbar-inner {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(1rem, 3vw, 3rem);
}

.footbar-block {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.footbar-label {
  color: var(--accent);
}

.footbar-text {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-secondary);
  max-width: 48ch;
}

.footbar-credit {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--line);
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.footbar-credit a {
  margin-left: 0.25rem;
  color: var(--text-primary);
  font-weight: 500;
  text-decoration: none;
  transition: opacity var(--transition);
}

.footbar-credit a:hover {
  opacity: 0.75;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 768px) {
  .shell {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    max-height: none;
    border-right: none;
    border-bottom: 1px solid var(--line);
    padding: var(--space-lg) var(--space-md);
  }

  .workspace {
    max-width: none;
  }

  .nav {
    margin-top: var(--space-md);
  }

  .main {
    padding: var(--space-lg) var(--space-md) var(--space-xl);
  }

  .display-title {
    font-size: 1.75rem;
  }

  .footbar-inner {
    grid-template-columns: 1fr;
    gap: var(--space-md);
  }

  .footbar-text {
    max-width: none;
  }
}
</style>
