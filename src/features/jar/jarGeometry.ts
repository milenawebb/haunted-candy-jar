/**
 * Shared jar geometry. All jar layers and the candy packing use these numbers
 * so everything lines up in one SVG coordinate space.
 */
import { packingRadius } from '../../utils/packingLayout';

export const JAR_VIEWBOX_WIDTH = 400;
/** Height of the jar itself (y 0 to 684). The lid and knob rise above y 0. */
export const JAR_BODY_HEIGHT = 684;
/** Extra headroom above y 0 so the tall glass lid and knob are not cut off. */
export const JAR_VIEWBOX_HEAD = 64;
export const JAR_VIEWBOX_HEIGHT = JAR_BODY_HEIGHT + JAR_VIEWBOX_HEAD;
export const JAR_VIEWBOX = `0 ${-JAR_VIEWBOX_HEAD} ${JAR_VIEWBOX_WIDTH} ${JAR_VIEWBOX_HEIGHT}`;

/** Maximum candies that sit inside the jar. */
export const JAR_CAPACITY = 40;

/**
 * Y where the straight wall ends and the shoulder starts curving in toward
 * the neck. The pile never rises above this line.
 */
export const JAR_SHOULDER_Y = 134;

/**
 * Box (in viewBox units) in which candies are packed. Pass `width` and
 * `height` to computePacking, then add `x` and `y` to each position.
 * Candy radius is min(w, h) / 10, so a candy is about 1/5 of this width wide.
 * The box runs from the shoulder (y 134) to the inside floor (y 634). Forty
 * candies at 5 per row settle to at most about 495 units high (measured over
 * many seeds, see the shoulder test), so the pile tops out just below the
 * shoulder.
 */
export const JAR_PACK_BOX = {
  x: 40,
  y: JAR_SHOULDER_Y,
  width: 320,
  height: 500,
} as const;

/** Candy radius that packingLayout derives for the pack box (32 units). */
export const JAR_CANDY_RADIUS = packingRadius(JAR_PACK_BOX.width, JAR_PACK_BOX.height);

/**
 * Visual radius of a candy in jar units: the farthest the drawn art reaches
 * from the candy centre, at any rotation within +/-15 degrees.
 *
 * A candy is drawn in a 100x100 box at 71.1 units (64 / 0.9), and each monster
 * is scaled so its largest side fills 90 of those 100 box units, so the round
 * bodies reach exactly the packing radius (32). The bat wing tips are the
 * farthest points (about 35.2 units at 15 degrees, stroke included), then the
 * spider legs and the Frankenstein rounded corners (34.3). 36 covers them. The
 * decay glow halo and the contact shadow are soft and fade out, so they are
 * covered by JAR_GLASS_MARGIN instead of being counted.
 */
export const JAR_VISUAL_RADIUS = 36;
/** Gap kept between the visual circle and the glass (covers the soft glow halo). */
export const JAR_GLASS_MARGIN = 3;
/**
 * How much farther than the packing radius a candy centre must stay from the
 * left wall, right wall and floor, so the visual circle clears the glass.
 */
export const JAR_EDGE_INSET = JAR_VISUAL_RADIUS + JAR_GLASS_MARGIN - JAR_CANDY_RADIUS;
/**
 * Neighbour overlap used for the jar (fraction of the radius). The walls moved
 * in by JAR_EDGE_INSET, so a row of 5 only fits when neighbours sink in a bit
 * further than the 0.08 default. Still under the 0.15 limit, and the drawn
 * art (64 across) already overlaps at this spacing.
 */
export const JAR_REST_OVERLAP = 0.12;

/** Inside walls and floor of the jar (straight parts of JAR_INSIDE_PATH). */
export const JAR_INSIDE_LEFT = 40;
export const JAR_INSIDE_RIGHT = 360;
export const JAR_INSIDE_FLOOR = 636;
/** Radius of the two rounded bottom corners of JAR_INSIDE_PATH. */
export const JAR_INSIDE_CORNER_RADIUS = 28;

/** Outer silhouette of the glass (wall thickness included). */
export const JAR_OUTER_PATH =
  'M 64 28 H 336 Q 344 28 344 38 V 70 Q 344 84 358 96 Q 372 108 372 130 V 612 ' +
  'Q 372 656 328 656 H 72 Q 28 656 28 612 V 130 Q 28 108 42 96 Q 56 84 56 70 V 38 Q 56 28 64 28 Z';

/** Inside shape of the jar, used as the candy clipPath and the back wall. */
export const JAR_INSIDE_PATH =
  'M 74 36 H 326 V 70 Q 326 90 346 104 Q 360 114 360 134 V 608 ' +
  'Q 360 636 332 636 H 68 Q 40 636 40 608 V 134 Q 40 114 54 104 Q 74 90 74 70 Z';

/** Y of the jar mouth (top of the inside shape). */
export const JAR_MOUTH_Y = 36;
export const JAR_MOUTH_LEFT = 74;
export const JAR_MOUTH_RIGHT = 326;
/** Horizontal center of the jar mouth. */
export const JAR_MOUTH_CENTER_X = (JAR_MOUTH_LEFT + JAR_MOUTH_RIGHT) / 2;
/** Y of the top of the outer neck, where the lid base rests. */
export const JAR_NECK_TOP_Y = 28;

/**
 * True when a circle at (x, y) with the given visual radius, plus `margin`,
 * lies inside the straight walls, the floor and the rounded bottom corners of
 * the inside glass (jar user units, not pack box units). Does not look at the
 * shoulder and neck above y 134.
 */
export function insideGlass(
  x: number,
  y: number,
  visualRadius: number = JAR_VISUAL_RADIUS,
  margin: number = JAR_GLASS_MARGIN,
): boolean {
  const r = visualRadius + margin;
  if (x - r < JAR_INSIDE_LEFT || x + r > JAR_INSIDE_RIGHT || y + r > JAR_INSIDE_FLOOR) return false;
  const cr = JAR_INSIDE_CORNER_RADIUS;
  const cy = JAR_INSIDE_FLOOR - cr;
  for (const cx of [JAR_INSIDE_LEFT + cr, JAR_INSIDE_RIGHT - cr]) {
    const inQuadrant = y > cy && (cx < JAR_MOUTH_CENTER_X ? x < cx : x > cx);
    if (inQuadrant && Math.hypot(x - cx, y - cy) + r > cr) return false;
  }
  return true;
}

/**
 * Lid pivot (viewBox units): the center of the lid's underside, resting on the
 * top of the jar neck. Rotate the lid around this point.
 */
export const JAR_LID_PIVOT = { x: JAR_MOUTH_CENTER_X, y: JAR_NECK_TOP_Y } as const;

/** Ids for SVG defs, shared so layers can reference the same clip. */
export const JAR_CLIP_ID = 'hcj-jar-inside-clip';
