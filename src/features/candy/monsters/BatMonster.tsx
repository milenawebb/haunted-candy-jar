import { CandyBase, useSafeId, type MonsterArtProps } from './CandyBase';

const WING = 'color-mix(in srgb, var(--monster-bat) 80%, black)';
const WING_RIM = 'color-mix(in srgb, var(--monster-bat) 55%, white)';
const INK = '#150d2b';
const LEFT_WING = 'M26 40 L2 22 L8 48 L2 74 L16 66 L22 80 L34 70 Z';

/** Round body with two pointed wing shapes and small ears, tiny fangs. */
export function BatMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  const wings = (
    <g>
      <path d={LEFT_WING} fill={WING} stroke={WING_RIM} strokeWidth="2.2" strokeLinejoin="round" />
      <g transform="translate(100 0) scale(-1 1)">
        <path d={LEFT_WING} fill={WING} stroke={WING_RIM} strokeWidth="2.2" strokeLinejoin="round" />
      </g>
    </g>
  );
  return (
    <g data-monster="bat">
      <CandyBase
        uid={uid}
        color="var(--monster-bat)"
        highlightAt={{ x: 37, y: 37 }}
        {...props}
        back={wings}
        body={(fill) => (
          <g fill={fill}>
            <path d="M27 36 L29 6 L47 24 Z" />
            <path d="M73 36 L71 6 L53 24 Z" />
            <circle cx="50" cy="56" r="32" />
          </g>
        )}
        face={
          <g>
            <path d="M31 13 L39 24 L33 28 Z" fill="#f0a8dc" opacity="0.9" />
            <path d="M69 13 L61 24 L67 28 Z" fill="#f0a8dc" opacity="0.9" />
            <circle cx="39" cy="53" r="7.5" fill="#fff" />
            <circle cx="61" cy="53" r="7.5" fill="#fff" />
            <circle cx="40" cy="54" r="3.8" fill={INK} />
            <circle cx="60" cy="54" r="3.8" fill={INK} />
            <path d="M41 68 Q50 75 59 68" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" />
            <path d="M43 69.5 L45.5 76 L48 70.5 Z" fill="#fff" />
            <path d="M52 70.5 L54.5 76 L57 69.5 Z" fill="#fff" />
          </g>
        }
      />
    </g>
  );
}
