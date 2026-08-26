/**
 * The sprite grids.
 *
 * Data, not a component. It lives here so broker-sprite.tsx exports a
 * component and nothing else: a React module that also exports a constant
 * cannot Fast Refresh, and every edit to it forces a full page reload.
 *
 * Every row must be exactly SPRITE_SIZE wide or the art skews. The tests in
 * broker-sprite.test.tsx assert that, which is why these are exported at all.
 */

export const SPRITE_SIZE = 16

/**
 * 16x16. "." transparent · h hair · s skin · e eye · m mouth
 * c suit · w shirt · t tie (desk colour) · p headset
 */
export const SPRITE_ROWS = [
  "................",
  ".....hhhhhh.....",
  "...hhhhhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..hhsssssssshh..",
  "..hssssssssssh..",
  "..hsseesseessh..",
  "..hssssssssssh..",
  "..hsssmmmmsssh..",
  "...hssssssssh...",
  "......ssss......",
  "...ccccwwcccc...",
  "..ccccwttwcccc..",
  "..ccccwttwcccc..",
  "..cccccttccccc..",
  "..cccccccccccc..",
]

/** A brimmed hat for high nerve. */
export const SPRITE_HAT = [
  "....hhhhhhhh....",
  "...hhhhhhhhhh...",
  ".hhhhhhhhhhhhhh.",
]
