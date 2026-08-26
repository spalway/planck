/**
 * The single entry point scripts/make-social.mjs bundles.
 *
 * It exists so the generator pulls the real roster, the real sprite
 * composition and the real instrument table rather than reimplementing any of
 * them. A profile picture that stops matching the roster is the kind of drift
 * nobody notices until someone points at it.
 */

export { ROSTER } from "@/lib/brokers"
export { composeSprite, spritePalette, DESK_COLOR } from "@/lib/sprite-compose"
export { INSTRUMENTS, DESKS } from "@/lib/instruments"
