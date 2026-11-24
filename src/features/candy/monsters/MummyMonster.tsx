import { CandyBase, FACE_DARK, useSafeId, type MonsterArtProps } from './CandyBase';

/** Rounded body wrapped in crossing bandage bands, two eyes peeking through a gap. */
export function MummyMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  const clipId = `${uid}-clip`;
  return (
    <g data-monster="mummy">
      <CandyBase
        uid={uid}
        color="var(--monster-mummy)"
        {...props}
        body={(fill) => <circle cx="50" cy="52" r="38" fill={fill} />}
        face={
          <g>
            <clipPath id={clipId}>
              <circle cx="50" cy="52" r="38" />
            </clipPath>
            <g clipPath={`url(#${clipId})`} fill="rgba(150,125,80,0.35)" stroke="rgba(110,90,55,0.6)" strokeWidth="1.2" strokeLinejoin="round">
              <path d="M6 26 L94 12 L96 24 L6 40 Z" />
              <path d="M4 68 L96 54 L96 66 L6 84 Z" />
              <path d="M12 12 L28 6 L92 84 L76 92 Z" />
              <path d="M88 12 L72 6 L8 84 L24 92 Z" />
            </g>
            <rect x="22" y="40" width="56" height="15" rx="7.5" fill={FACE_DARK} />
            <circle cx="37" cy="47.5" r="5.5" fill="#fff" />
            <circle cx="63" cy="47.5" r="5.5" fill="#fff" />
            <circle cx="38" cy="48" r="2.6" fill={FACE_DARK} />
            <circle cx="62" cy="48" r="2.6" fill={FACE_DARK} />
          </g>
        }
      />
    </g>
  );
}
