import type { Guest, GuestPerson, GuestRsvp } from './types.ts'

function peopleOf(guest: Guest): Array<Pick<GuestPerson, 'type' | 'status' | 'name'>> {
  if (guest.people?.length) return guest.people
  return [
    {
      name: guest.familyName,
      type: 'adult',
      status: guest.status,
    },
  ]
}

export type GuestPeopleStats = {
  /** Total individual guests (people), not families. */
  total: number
  yes: number
  no: number
  pending: number
  /** Headcount still expected (yes + pending). */
  peopleYesPending: number
  adults: number
  children: number
}

/** Aggregate RSVP / headcount stats by person, not by family. */
export function countGuestPeople(guests: Guest[]): GuestPeopleStats {
  let yes = 0
  let no = 0
  let pending = 0
  let adults = 0
  let children = 0

  for (const guest of guests) {
    for (const person of peopleOf(guest)) {
      const status = (person.status || 'pending') as GuestRsvp
      if (status === 'yes') yes += 1
      else if (status === 'no') no += 1
      else pending += 1
      if (person.type === 'child') children += 1
      else adults += 1
    }
  }

  return {
    total: yes + no + pending,
    yes,
    no,
    pending,
    peopleYesPending: yes + pending,
    adults,
    children,
  }
}
