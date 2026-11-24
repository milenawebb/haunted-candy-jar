import { useId } from 'react';
import { BANDAGE_TITLE_MAX, tiltForId, truncateTitle } from './bandageText';
import './BandageNote.css';

export interface BandageNoteProps {
  taskId: string;
  title: string;
  /**
   * When true the note is NOT expanded; the full title is shown in the
   * Context_Menu. Kept as a data attribute so styling hooks can use it.
   */
  selected?: boolean;
}

/** Note size in SVG user units. The note is centred on (0, 0). */
export const NOTE_WIDTH = 150;
export const NOTE_HEIGHT = 26;
/** Text size in user units (12px minimum once the jar renders at 1:1 or larger). */
const FONT_SIZE = 14;

const W = NOTE_WIDTH / 2;
const H = NOTE_HEIGHT / 2;

/** Strip outline with jagged (frayed) left and right ends. */
const STRIP_PATH =
  `M ${-W + 4} ${-H} L ${W - 5} ${-H} ` +
  `L ${W - 1} ${-H + 4} L ${W - 5} ${-H + 8} L ${W + 1} ${-H + 12} L ${W - 4} ${-H + 17} ` +
  `L ${W} ${-H + 21} L ${W - 5} ${H} L ${-W + 5} ${H} ` +
  `L ${-W - 1} ${H - 5} L ${-W + 4} ${H - 9} L ${-W} ${H - 13} L ${-W + 5} ${H - 17} ` +
  `L ${-W + 1} ${-H + 3} Z`;

/** Short tail hanging down (toward the candy) from the left third of the strip. */
const TAIL_PATH =
  `M ${-W + 22} ${H - 1} L ${-W + 40} ${H - 1} L ${-W + 38} ${H + 9} ` +
  `L ${-W + 41} ${H + 15} L ${-W + 34} ${H + 13} L ${-W + 30} ${H + 21} ` +
  `L ${-W + 27} ${H + 12} L ${-W + 21} ${H + 16} L ${-W + 24} ${H + 8} Z`;

/**
 * Mummy-bandage note: linen strip with a woven texture, frayed ends, a stable
 * 2 to 4 degree tilt and a tail hanging toward the candy. Pure SVG, drawn
 * centred on (0, 0) so CandyItem can place it with a transform. Static, so
 * no reduced-motion fallback is needed.
 * The accessible name is the full title; the visible text is truncated.
 * Validates: Requirements 3.8, 10.1
 */
export function BandageNote({ taskId, title, selected = false }: BandageNoteProps) {
  const uid = useId().replace(/:/g, '');
  const patternId = `hcj-bandage-weave-${uid}`;
  const tilt = tiltForId(taskId);
  const shown = truncateTitle(title, BANDAGE_TITLE_MAX);

  return (
    <g
      className="bandage-note"
      data-testid="bandage-note"
      data-selected={selected ? 'true' : 'false'}
      transform={`rotate(${tilt.toFixed(2)})`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <pattern id={patternId} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="var(--color-bandage)" />
          <path d="M 0 0.5 H 4" stroke="rgba(43,33,24,0.10)" strokeWidth="0.6" />
          <path d="M 0.5 0 V 4" stroke="rgba(43,33,24,0.08)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <path d={TAIL_PATH} fill={`url(#${patternId})`} stroke="rgba(43,33,24,0.35)" strokeWidth="0.8" />
      <path d={STRIP_PATH} fill={`url(#${patternId})`} stroke="rgba(43,33,24,0.35)" strokeWidth="0.8" />
      <path
        d={`M ${-W + 8} ${-H + 3} H ${W - 10}`}
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1"
        fill="none"
      />
      <text
        className="bandage-note__text"
        x="0"
        y="0"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={FONT_SIZE}
        aria-hidden="true"
      >
        {shown}
      </text>
    </g>
  );
}
