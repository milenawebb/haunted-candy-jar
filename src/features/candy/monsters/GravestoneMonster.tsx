import { CandyBase, FACE_DARK, useSafeId, type MonsterArtProps } from './CandyBase';

const STONE = 'M16 92 L16 40 C16 20 31 8 50 8 C69 8 84 20 84 40 L84 92 Z';
const CROSS = 'color-mix(in srgb, var(--monster-gravestone) 55%, black)';

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
            <rect x="46" y="17" width="8" height="24" rx="2" fill={CROSS} />
            <rect x="38" y="24" width="24" height="8" rx="2" fill={CROSS} />
            <circle cx="37" cy="56" r="7" fill="#fff" />
            <circle cx="63" cy="56" r="7" fill="#fff" />
            <circle cx="38" cy="57" r="3.5" fill={FACE_DARK} />
            <circle cx="62" cy="57" r="3.5" fill={FACE_DARK} />
            <path d="M40 72 Q50 81 60 72" stroke={FACE_DARK} strokeWidth="3" fill="none" strokeLinecap="round" />
            <ellipse cx="29" cy="68" rx="4.5" ry="3" fill="#f6a6c1" opacity="0.7" />
            <ellipse cx="71" cy="68" rx="4.5" ry="3" fill="#f6a6c1" opacity="0.7" />
            <path d="M16 86 L84 86" stroke={CROSS} strokeWidth="1.5" opacity="0.5" />
          </g>
        }
      />
    </g>
  );
}
