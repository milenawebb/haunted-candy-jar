import { CandyBase, FACE_DARK, useSafeId, type MonsterArtProps } from './CandyBase';

const STONE = 'M16 92 L16 40 C16 20 31 8 50 8 C69 8 84 20 84 40 L84 92 Z';
const CROSS = 'color-mix(in srgb, var(--monster-gravestone) 45%, black)';

/** Arched tombstone body with a small cross and friendly eyes. */
export function GravestoneMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  return (
    <g data-monster="gravestone">
      <CandyBase
        uid={uid}
        color="var(--monster-gravestone)"
        {...props}
        body={(fill) => <path d={STONE} fill={fill} />}
        face={
          <g>
            <rect x="45.5" y="16" width="9" height="25" rx="2.5" fill={CROSS} />
            <rect x="37" y="23.5" width="26" height="9" rx="2.5" fill={CROSS} />
            <circle cx="37" cy="57" r="8" fill="#fff" />
            <circle cx="63" cy="57" r="8" fill="#fff" />
            <circle cx="38" cy="58" r="4" fill={FACE_DARK} />
            <circle cx="62" cy="58" r="4" fill={FACE_DARK} />
            <path d="M39 73 Q50 83 61 73" stroke={FACE_DARK} strokeWidth="3.6" fill="none" strokeLinecap="round" />
            <ellipse cx="27" cy="70" rx="5" ry="3.4" fill="#f6a6c1" opacity="0.8" />
            <ellipse cx="73" cy="70" rx="5" ry="3.4" fill="#f6a6c1" opacity="0.8" />
            <path d="M16 86 L84 86" stroke={CROSS} strokeWidth="2" opacity="0.5" />
          </g>
        }
      />
    </g>
  );
}
