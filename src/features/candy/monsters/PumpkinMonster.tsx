import { CandyBase, FACE_DARK, useSafeId, type MonsterArtProps } from './CandyBase';

/** Round ribbed body, small stem, triangle eyes, jagged grin. */
export function PumpkinMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  return (
    <g data-monster="pumpkin">
      <CandyBase
        uid={uid}
        color="var(--monster-pumpkin)"
        highlightAt={{ x: 31, y: 38 }}
        {...props}
        back={<path d="M44 28 L46 11 Q52 6 57 12 L56 28 Z" fill="#4f7a2a" stroke="#2f4a18" strokeWidth="1.5" strokeLinejoin="round" />}
        body={(fill) => <ellipse cx="50" cy="58" rx="41" ry="33" fill={fill} />}
        face={
          <g>
            <g fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinecap="round">
              <path d="M50 26 C38 38 38 78 50 90" />
              <path d="M50 26 C62 38 62 78 50 90" />
              <path d="M32 30 C18 42 18 74 34 87" />
              <path d="M68 30 C82 42 82 74 66 87" />
            </g>
            <path d="M28 54 L42 54 L35 41 Z" fill={FACE_DARK} />
            <path d="M58 54 L72 54 L65 41 Z" fill={FACE_DARK} />
            <path d="M27 64 L36 70 L42 63 L50 71 L58 63 L64 70 L73 64 Q70 82 50 83 Q30 82 27 64 Z" fill={FACE_DARK} />
          </g>
        }
      />
    </g>
  );
}
