import { CandyBase, FACE_DARK, useSafeId, type MonsterArtProps } from './CandyBase';

const SKULL =
  'M50 8 C77 8 90 28 88 50 C87 62 80 66 76 70 L76 84 Q76 90 70 90 L30 90 Q24 90 24 84 L24 70 C20 66 13 62 12 50 C10 28 23 8 50 8 Z';

/** Rounded skull body, big eye sockets, small nose gap, row of teeth. */
export function SkeletonMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  return (
    <g data-monster="skeleton">
      <CandyBase
        uid={uid}
        color="var(--monster-skeleton)"
        {...props}
        body={(fill) => <path d={SKULL} fill={fill} />}
        face={
          <g>
            <ellipse cx="36" cy="46" rx="12" ry="14" fill={FACE_DARK} />
            <ellipse cx="64" cy="46" rx="12" ry="14" fill={FACE_DARK} />
            <circle cx="36" cy="47" r="3" fill="#f3ecff" opacity="0.85" />
            <circle cx="64" cy="47" r="3" fill="#f3ecff" opacity="0.85" />
            <path d="M50 57 L43.5 70 L56.5 70 Z" fill={FACE_DARK} />
            <rect x="31" y="75" width="38" height="12" rx="3" fill="#fffdf3" stroke={FACE_DARK} strokeWidth="2.6" />
            <g stroke={FACE_DARK} strokeWidth="2.4">
              <path d="M40.5 75 L40.5 87" />
              <path d="M50 75 L50 87" />
              <path d="M59.5 75 L59.5 87" />
            </g>
          </g>
        }
      />
    </g>
  );
}
