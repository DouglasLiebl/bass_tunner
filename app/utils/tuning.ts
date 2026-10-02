export type BassString = {
  name: string
  note: string
  frequency: number
}

export type BassTuning = {
  id: string
  name: string
  strings: BassString[]
}

export type BassTuningCategory = {
  id: string
  name: string
  tunings: BassTuning[]
}

export const BASS_TUNING_CATEGORIES: BassTuningCategory[] = [
  {
    id: 'standard',
    name: 'Standard & near-standard',
    tunings: [
      {
        id: 'standard',
        name: 'Standard',
        strings: [
          { name: 'E', note: 'E1', frequency: 41.2034 },
          { name: 'A', note: 'A1', frequency: 55.0 },
          { name: 'D', note: 'D2', frequency: 73.4162 },
          { name: 'G', note: 'G2', frequency: 98.0 },
        ],
      },
      {
        id: 'drop-d',
        name: 'Drop D',
        strings: [
          { name: 'D', note: 'D1', frequency: 36.7081 },
          { name: 'A', note: 'A1', frequency: 55.0 },
          { name: 'D', note: 'D2', frequency: 73.4162 },
          { name: 'G', note: 'G2', frequency: 98.0 },
        ],
      },
      {
        id: 'half-step-down',
        name: 'Half-step down (E♭)',
        strings: [
          { name: 'E♭', note: 'E♭1', frequency: 38.8909 },
          { name: 'A♭', note: 'A♭1', frequency: 51.9131 },
          { name: 'D♭', note: 'D♭2', frequency: 69.2957 },
          { name: 'G♭', note: 'G♭2', frequency: 92.4986 },
        ],
      },
      {
        id: 'whole-step-down',
        name: 'Whole-step down (D)',
        strings: [
          { name: 'D', note: 'D1', frequency: 36.7081 },
          { name: 'G', note: 'G1', frequency: 49.0 },
          { name: 'C', note: 'C2', frequency: 65.4064 },
          { name: 'F', note: 'F2', frequency: 87.3071 },
        ],
      },
    ],
  },
  {
    id: 'lower',
    name: 'Lower tunings',
    tunings: [
      {
        id: 'drop-c',
        name: 'Drop C',
        strings: [
          { name: 'C', note: 'C1', frequency: 32.7032 },
          { name: 'G', note: 'G1', frequency: 49.0 },
          { name: 'C', note: 'C2', frequency: 65.4064 },
          { name: 'F', note: 'F2', frequency: 87.3071 },
        ],
      },
      {
        id: 'c-standard',
        name: 'C standard',
        strings: [
          { name: 'C', note: 'C1', frequency: 32.7032 },
          { name: 'F', note: 'F1', frequency: 43.6535 },
          { name: 'B♭', note: 'B♭1', frequency: 58.2705 },
          { name: 'E♭', note: 'E♭2', frequency: 77.7817 },
        ],
      },
      {
        id: 'drop-b',
        name: 'Drop B',
        strings: [
          { name: 'B', note: 'B0', frequency: 30.8677 },
          { name: 'F♯', note: 'F♯1', frequency: 46.2493 },
          { name: 'B', note: 'B1', frequency: 61.7354 },
          { name: 'E', note: 'E2', frequency: 82.4069 },
        ],
      },
      {
        id: 'b-standard',
        name: 'B standard (BEAD)',
        strings: [
          { name: 'B', note: 'B0', frequency: 30.8677 },
          { name: 'E', note: 'E1', frequency: 41.2034 },
          { name: 'A', note: 'A1', frequency: 55.0 },
          { name: 'D', note: 'D2', frequency: 73.4162 },
        ],
      },
    ],
  },
  {
    id: 'alternate',
    name: 'Higher or alternate',
    tunings: [
      {
        id: 'piccolo',
        name: 'Piccolo bass',
        strings: [
          { name: 'E', note: 'E2', frequency: 82.4069 },
          { name: 'A', note: 'A2', frequency: 110.0 },
          { name: 'D', note: 'D3', frequency: 146.832 },
          { name: 'G', note: 'G3', frequency: 195.998 },
        ],
      },
      {
        id: 'tenor',
        name: 'Tenor bass',
        strings: [
          { name: 'A', note: 'A1', frequency: 55.0 },
          { name: 'D', note: 'D2', frequency: 73.4162 },
          { name: 'G', note: 'G2', frequency: 98.0 },
          { name: 'C', note: 'C3', frequency: 130.813 },
        ],
      },
      {
        id: 'fifths',
        name: 'Fifths tuning',
        strings: [
          { name: 'C', note: 'C1', frequency: 32.7032 },
          { name: 'G', note: 'G1', frequency: 49.0 },
          { name: 'D', note: 'D2', frequency: 73.4162 },
          { name: 'A', note: 'A2', frequency: 110.0 },
        ],
      },
    ],
  },
]

export const BASS_TUNINGS: BassTuning[] = BASS_TUNING_CATEGORIES.flatMap(
  (category) => category.tunings,
)

export function tuningLabel(tuning: BassTuning): string {
  return tuning.strings.map((s) => s.name).join(' ')
}

export function frequencyToCents(frequency: number, target: number): number {
  return 1200 * Math.log2(frequency / target)
}

export function centsToLabel(cents: number): 'flat' | 'sharp' | 'in-tune' {
  if (Math.abs(cents) < 5) return 'in-tune'
  return cents < 0 ? 'flat' : 'sharp'
}
