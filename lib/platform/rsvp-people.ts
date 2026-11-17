import { uid } from './ids.ts'
import type { GuestPerson, GuestRsvp, PersonType } from './types.ts'

export type RsvpPersonInput = {
  id?: string
  name?: string
  type?: PersonType
  status: GuestRsvp
  meal?: string
  dietary?: string
}

export type BuildRsvpPeopleOptions = {
  existing: GuestPerson[]
  submitted: RsvpPersonInput[]
  openRsvp: boolean
  allowPlusOne: boolean
  collectMeal: boolean
  collectDietary: boolean
}

export type BuildRsvpPeopleResult =
  | { ok: true; people: GuestPerson[] }
  | { ok: false; error: string }

function mealDietary(
  status: GuestRsvp,
  input: RsvpPersonInput,
  collectMeal: boolean,
  collectDietary: boolean,
): Pick<GuestPerson, 'meal' | 'dietary'> {
  const attending = status === 'yes'
  return {
    meal: collectMeal && attending ? (input.meal || '').trim() : '',
    dietary: collectDietary && attending ? (input.dietary || '').trim() : '',
  }
}

/**
 * Builds people[] for an RSVP submit (BarBeni-style closed invite).
 * Known guests keep name/type; only status/meal/dietary are updated.
 * New rows are allowed only for openRsvp or allowPlusOne.
 */
export function buildRsvpPeopleUpdate(opts: BuildRsvpPeopleOptions): BuildRsvpPeopleResult {
  const { existing, submitted, openRsvp, allowPlusOne, collectMeal, collectDietary } = opts
  const closedKnown = !openRsvp && existing.length > 0
  const allowNew = openRsvp || allowPlusOne
  const byId = new Map(existing.map((person) => [person.id, person]))
  const people: GuestPerson[] = []

  if (closedKnown) {
    const seen = new Set<string>()
    let plusOnes = 0

    for (const input of submitted) {
      if (input.id && byId.has(input.id)) {
        if (seen.has(input.id)) {
          return { ok: false, error: 'Seleção de convidados inválida.' }
        }
        seen.add(input.id)
        const current = byId.get(input.id)!
        people.push({
          id: current.id,
          name: current.name,
          type: current.type,
          status: input.status,
          ...mealDietary(input.status, input, collectMeal, collectDietary),
        })
        continue
      }

      if (input.id && !byId.has(input.id)) {
        return { ok: false, error: 'Seleção de convidados inválida.' }
      }

      if (!allowNew) {
        return { ok: false, error: 'Seleção de convidados inválida.' }
      }

      const name = (input.name || '').trim()
      if (!name) {
        return { ok: false, error: 'Nome obrigatório para novos convidados.' }
      }
      plusOnes += 1
      if (plusOnes > 20) {
        return { ok: false, error: 'Dados inválidos' }
      }
      people.push({
        id: uid(),
        name,
        type: input.type || 'adult',
        status: input.status,
        ...mealDietary(input.status, input, collectMeal, collectDietary),
      })
    }

    for (const current of existing) {
      if (!seen.has(current.id)) {
        return { ok: false, error: 'Responda a presença de todos os convidados da família.' }
      }
    }

    return { ok: true, people }
  }

  if (!submitted.length) {
    return { ok: false, error: 'Dados inválidos' }
  }

  for (const input of submitted) {
    const name = (input.name || '').trim()
    if (!name) {
      return { ok: false, error: 'Nome obrigatório para novos convidados.' }
    }
    const existingMatch = input.id && byId.has(input.id) ? byId.get(input.id)! : null
    people.push({
      id: existingMatch?.id || uid(),
      name: existingMatch && !openRsvp ? existingMatch.name : name,
      type: existingMatch && !openRsvp ? existingMatch.type : input.type || 'adult',
      status: input.status,
      ...mealDietary(input.status, input, collectMeal, collectDietary),
    })
  }

  return { ok: true, people }
}
