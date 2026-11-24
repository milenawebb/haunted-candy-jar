import { CandyBase, FACE_DARK, useSafeId, type MonsterArtProps } from './CandyBase';

const BOLT = '#9aa3b8';
const BOLT_EDGE = '#3b4254';
const HAIR = '#15121a';

/** Tall rounded-rectangle green head, black jagged fringe, side bolts, stitched smile. */
export function FrankensteinMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  const clipId = `${uid}-head-clip`;
  const bolt = (side: 'left' | 'right') => {
    const flip = side === 'right' ? 'translate(100 0) scale(-1 1)' : undefined;
    return (
      <g transform={flip} fill={BOLT} stroke={BOLT_EDGE} strokeWidth="1.5" strokeLinejoin="round">
        <rect x="9" y="52" width="12" height="9" rx="3" />
        <rect x="8" y="47" width="6" height="19" rx="3" />
      </g>
    );
  };
  return (
    <g data-monster="frankenstein">
      <CandyBase
        uid={uid}
        color="var(--monster-frankenstein)"
        {...props}
        back={
          <g>
            {bolt('left')}
            {bolt('right')}
          </g>
        }
        body={(fill) => <rect x="18" y="8" width="64" height="84" rx="20" fill={fill} />}
        face={
          <g>
            <clipPath id={clipId}>
              <rect x="18" y="8" width="64" height="84" rx="20" />
            </clipPath>
            <path
              clipPath={`url(#${clipId})`}
              d="M16 6 L84 6 L84 30 L76 40 L67 28 L58 40 L50 27 L42 40 L33 28 L24 40 L16 30 Z"
              fill={HAIR}
            />
            <path d="M29 47 L45 47 M55 47 L71 47" stroke={FACE_DARK} strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="37" cy="57" r="7" fill="#fff" stroke={FACE_DARK} strokeWidth="1.5" />
            <circle cx="63" cy="57" r="7" fill="#fff" stroke={FACE_DARK} strokeWidth="1.5" />
            <circle cx="38" cy="58" r="3.4" fill={FACE_DARK} />
            <circle cx="62" cy="58" r="3.4" fill={FACE_DARK} />
            <path d="M32 74 Q50 86 68 74" stroke={FACE_DARK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <g stroke={FACE_DARK} strokeWidth="2.2" strokeLinecap="round">
              <path d="M38 75 L36.5 81" />
              <path d="M44 78.5 L43 85" />
              <path d="M50 80 L50 86.5" />
              <path d="M56 78.5 L57 85" />
              <path d="M62 75 L63.5 81" />
            </g>
          </g>
        }
      />
    </g>
  );
}
