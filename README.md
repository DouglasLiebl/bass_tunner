# Bass Tuner

A browser-based tuner for **4-string bass guitar**. It uses your microphone to detect pitch in real time and shows how close each string is to the selected target note.

Built with [Nuxt](https://nuxt.com/) and the Web Audio API. No install required beyond running the dev server or deploying the static build.

## Features

- **Real-time pitch detection** via microphone (autocorrelation algorithm)
- **Visual feedback** — semicircle gauge, cents readout, and frequency display
- **11 tunings** grouped by category, from standard E A D G to drop tunings, piccolo, and fifths
- **Per-string selection** — tune one string at a time against a fixed target frequency
- **In-tune indicator** — within ±5 cents of the target
- **Responsive layout** — sidebar tuning picker on desktop, stacked on mobile

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A microphone and a browser that supports `getUserMedia` (Chrome, Firefox, Safari, Edge)

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Allow microphone access when prompted.

### Production

```bash
npm run build
npm run preview
```

For static hosting:

```bash
npm run generate
```

Output is written to `.output/public`.

## How to use

1. Pick a **tuning** from the sidebar (e.g. Standard, Drop D).
2. Select the **string** you want to tune (E, A, D, or G).
3. Click **Start tuning** and allow microphone access.
4. Play the selected string on your bass.
5. Adjust until the needle is centered and the status shows **In tune**.

**Flat** means the pitch is too low — tighten the string. **Sharp** means it is too high — loosen the string.

Reference pitch: **A4 = 440 Hz**.

## Supported tunings

### Standard & near-standard

| Tuning | Notes (low → high) |
|--------|-------------------|
| Standard | E A D G |
| Drop D | D A D G |
| Half-step down (E♭) | E♭ A♭ D♭ G♭ |
| Whole-step down (D) | D G C F |

### Lower tunings

| Tuning | Notes |
|--------|-------|
| Drop C | C G C F |
| C standard | C F B♭ E♭ |
| Drop B | B F♯ B E |
| B standard (BEAD) | B E A D |

### Higher or alternate

| Tuning | Notes |
|--------|-------|
| Piccolo bass | E A D G (octave up) |
| Tenor bass | A D G C |
| Fifths tuning | C G D A |

## Tech stack

- [Nuxt 4](https://nuxt.com/) / [Vue 3](https://vuejs.org/)
- Web Audio API — `AudioContext`, `AnalyserNode`, microphone input
- Pitch detection — autocorrelation on the time-domain signal
- Typography — Playfair Display, Inter, JetBrains Mono

## Project structure

```
app/
  app.vue                 # Main UI
  assets/css/cartesian.css  # Design tokens
  composables/
    usePitchDetector.ts   # Microphone & pitch logic
  utils/
    tuning.ts             # Tuning definitions & cents math
```

## Browser notes

- Microphone permission is required and must be granted per origin.
- Works best in a quiet room with a single note at a time.
- Very low tunings (e.g. B0) depend on mic quality and may be less stable on some devices.

## Author

Built by [Douglas Liebl](https://github.com/DouglasLiebl).
