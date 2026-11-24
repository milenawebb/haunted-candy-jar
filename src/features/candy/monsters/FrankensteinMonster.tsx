import { CandyBase, FACE_DARK, useSafeId, type MonsterArtProps } from './CandyBase';

const HEAD = 'M20 20 L80 20 Q88 20 88 28 L88 80 Q88 90 78 90 L22 90 Q12 90 12 80 L12 28 Q12 20 20 20 Z';
const BOLT = 'color-mix(in srgb, #8d95a8 70%, black)';
const HAIR = '#2a2f1f';

/** Flat-topped square-ish body, neck bolts on the sides, stitched brow and mouth. */
export function FrankensteinMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  const bolts = (
    <g>
      <rect x="2" y="50" width="12" height="7" rx="2.5" fill={BOLT} />
      <rect x="2" y="46" width="4" height="15" rx="2" fill={BOLT} />
      <rect x="86" y="50" width="12" height="7" rx="2.5" fill={BOLT} />
      <rect x="94" y="46" width="4" height="15" rx="2" fill={BOLT} />
    </g>
  );
  return (
    <g data-monster="frankenstein">
      <CandyBase
        uid={uid}
        color="var(--monster-frankenstein)"
        {...props}
        back={bolts}
        body={(fill) => <path d={HEAD} fill={fill} />}
        face={
          <g>
            <path d="M12 28 Q12 20 20 20 L80 20 Q88 20 88 28 L88 36 L76 31 L64 37 L50 31 L36 37 L24 31 L12 36 Z" fill={HAIR} />
            <path d="M24 46 L44 43" stroke={FACE_DARK} strokeWidth="3" strokeLinecap="round" />
            <path d="M76 46 L56 43" stroke={FACE_DARK} strokeWidth="3" strokeLinecap="round" />
            <circle cx="34" cy="54" r="5.5" fill="#fff" />
            <circle cx="66" cy="54" r="5.5" fill="#fff" />
            <circle cx="35" cy="55" r="2.8" fill={FACE_DARK} />
            <circle cx="65" cy="55" r="2.8" fill={FACE_DARK} />
            <path d="M30 74 L70 74" stroke={FACE_DARK} strokeWidth="3" strokeLinecap="round" />
            <g stroke={FACE_DARK} strokeWidth="2" strokeLinecap="round">
              <path d="M38 69 L38 79" />
              <path d="M46 69 L46 79" />
              <path d="M54 69 L54 79" />
              <path d="M62 69 L62 79" />
            </g>
            <path d="M70 26 L70 44 M65 31 L75 31 M65 37 L75 37" stroke={FACE_DARK} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7" />
          </g>
        }
      />
    </g>
  );
}
