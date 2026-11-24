/**
 * Shared jar geometry. All jar layers and the candy packing use these numbers
 * so everything lines up in one SVG coordinate space.
 */

export const JAR_VIEWBOX_WIDTH = 400;
export const JAR_VIEWBOX_HEIGHT = 560;
export const JAR_VIEWBOX = `0 0 ${JAR_VIEWBOX_WIDTH} ${JAR_VIEWBOX_HEIGHT}`;

/** Maximum candies that sit inside the jar. */
export const JAR_CAPACITY = 24;

/**
 * Box (in viewBox units) in which candies are packed. Pass `width` and
 * `height` to computePacking, then add `x` and `y` to each position.
 * Candy radius is min(w, h) / 12, so a candy is about 1/6 of this width wide.
 */
export const JAR_PACK_BOX = {
  x: 40,
  y: 90,
  width: 320,
  height: 420,
} as const;

/** Candy radius that packingLayout derives for the pack box. */
export const JAR_CANDY_RADIUS = Math.min(JAR_PACK_BOX.width, JAR_PACK_BOX.height) / 12;

/** Outer silhouette of the glass (wall thickness included). */
export const JAR_OUTER_PATH =
  'M 64 28 H 336 Q 344 28 344 38 V 70 Q 344 84 358 96 Q 372 108 372 130 V 488 ' +
  'Q 372 532 328 532 H 72 Q 28 532 28 488 V 130 Q 28 108 42 96 Q 56 84 56 70 V 38 Q 56 28 64 28 Z';

/** Inside shape of the jar, used as the candy clipPath and the back wall. */
export const JAR_INSIDE_PATH =
  'M 74 36 H 326 V 70 Q 326 90 346 104 Q 360 114 360 134 V 484 ' +
  'Q 360 512 332 512 H 68 Q 40 512 40 484 V 134 Q 40 114 54 104 Q 74 90 74 70 Z';

/** Y of the jar mouth (top of the inside shape), where the lid sits. */
export const JAR_MOUTH_Y = 36;
export const JAR_MOUTH_LEFT = 74;
export const JAR_MOUTH_RIGHT = 326;

/** Horizontal center of the jar mouth. */
export const JAR_MOUTH_CENTER_X = (JAR_MOUTH_LEFT + JAR_MOUTH_RIGHT) / 2;

/**
 * Lid pivot (viewBox units): the center of the lid's underside, resting on the
 * rim of the jar neck. Rotate the lid around this point.
 */
export const JAR_LID_PIVOT = { x: JAR_MOUTH_CENTER_X, y: 30 } as const;

/** Ids for SVG defs, shared so layers can reference the same clip. */
export const JAR_CLIP_ID = 'hcj-jar-inside-clip';
