import { CandyBase, useSafeId, type MonsterArtProps } from './CandyBase';

const WING = 'color-mix(in srgb, var(--monster-bat) 75%, black)';
const WING_RIM = 'color-mix(in srgb, var(--monster-bat) 70%, white)';
const INK = '#150d2b';
const LEFT_WING = 'M26 40 L2 22 L8 48 L2 74 L16 66 L22 80 L34 70 Z';

/** Round body with two pointed wing shapes and small ears, tiny fangs. */
export function BatMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  const wings = (
    <g>
      <path d={LEFT_WING} fill={WING} stroke={WING_RIM} strokeWidth="1.6" strokeLinejoin="round" />
      <g transform="translate(100 0) scale(-1 1)">
        <path d={LEFT_WING} fill={WING} stroke={WING_RIM} strokeWidth="1.6" strokeLinejoin="round" />
      </g>
    </g>
  );
  return (
    <g data-monster="bat">
      <CandyBase
        uid={uid}
        color="var(--monster-bat)"
        highlightAt={{ x: 38, y: 36 }}
        {...props}
        back={wings}
        body={(fill) => (
          <g fill={fill}>
            <path d="M28 34 L30 8 L46 24 Z" />
            <path d="M72 34 L70 8 L54 24 Z" />
            <circle cx="50" cy="55" r="29" />
          </g>
        )}
        face={
          <g>
            <path d="M31 14 L38 24 L33 27 Z" fill="#e7a3d6" opacity="0.8" />
            <path d="M69 14 L62 24 L67 27 Z" fill="#e7a3d6" opacity="0.8" />
            <circle cx="40" cy="52" r="6.5" fill="#fff" />
            <circle cx="60" cy="52" r="6.5" fill="#fff" />
            <circle cx="41" cy="53" r="3.2" fill={INK} />
            <circle cx="59" cy="53" r="3.2" fill={INK} />
            <path d="M42 66 Q50 72 58 66" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d="M44 67 L46 73 L48 68.5 Z" fill="#fff" />
            <path d="M52 68.5 L54 73 L56 67 Z" fill="#fff" />
          </g>
        }
      />
    </g>
  );
}
