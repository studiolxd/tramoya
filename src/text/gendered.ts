/** How the player asked to be addressed. */
export type Gender = 'male' | 'female' | 'neutral'

// Picks the form that matches how the player wants to be addressed:
// g('Bienvenido al equipo', 'Bienvenida al equipo', 'Te damos la bienvenida al equipo').
// The neutral form rephrases the sentence; no "-e" or "-x" endings.
export type GenderPick = (male: string, female: string, neutral: string) => string

// Plain strings are the same for everyone; functions adapt to the player.
export type GenderedText = string | ((g: GenderPick) => string)

export function resolveText(text: GenderedText, gender: Gender): string {
  if (typeof text === 'string') return text
  return text((male, female, neutral) => ({ male, female, neutral })[gender])
}
