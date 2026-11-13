/** The guests sit on this circle, in hundredths of the board's side, from the top, clockwise. */
export const TABLE_RADIUS = 38;

/** Where a guest sits, in hundredths of the board's side. */
export function seatOf(guests: number, guest: number): { readonly x: number; readonly y: number } {
  const angle = -Math.PI / 2 + (2 * Math.PI * guest) / guests;
  return { x: 50 + TABLE_RADIUS * Math.cos(angle), y: 50 + TABLE_RADIUS * Math.sin(angle) };
}

/** A guest's name: a letter from A, the same in every language. */
export function guestName(guest: number): string {
  return String.fromCodePoint(0x41 + guest);
}
