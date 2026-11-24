import { CandyBase, useSafeId, type MonsterArtProps } from './CandyBase';

/** Pale lavender face. The red token is used for the cape collar only. */
const FACE = '#cdbcf0';
const HAIR = '#1a0b24';
const CAPE_LINING = '#1a0b14';
const INK = '#2a0a24';

/** Pale lavender head with a widow's peak, red and black cape collar behind, small fangs. */
export function VampireMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  const collar = (
    <g strokeLinejoin="round">
      <path
        d="M6 94 L12 44 L30 68 L50 52 L70 68 L88 44 L94 94 Q50 102 6 94 Z"
        fill="var(--monster-vampire)"
        stroke="#4d0d1c"
        strokeWidth="1.5"
      />
      <path d="M17 93 L26 70 L50 86 L74 70 L83 93 Q50 99 17 93 Z" fill={CAPE_LINING} />
    </g>
  );
  return (
    <g data-monster="vampire">
      <CandyBase
        uid={uid}
        color={FACE}
        {...props}
        back={collar}
        body={(fill) => <ellipse cx="50" cy="50" rx="33" ry="35" fill={fill} />}
        face={
          <g>
            <path
              d="M16 46 C12 20 30 10 50 10 C70 10 88 20 84 46 C77 38 67 35 58 30 L50 42 L42 30 C33 35 23 38 16 46 Z"
              fill={HAIR}
            />
            <path d="M30 48 L44 52 M70 48 L56 52" stroke={HAIR} strokeWidth="3.2" strokeLinecap="round" />
            <ellipse cx="38" cy="58" rx="5" ry="5.6" fill={INK} />
            <ellipse cx="62" cy="58" rx="5" ry="5.6" fill={INK} />
            <circle cx="39.6" cy="56" r="1.7" fill="#fff" />
            <circle cx="63.6" cy="56" r="1.7" fill="#fff" />
            <ellipse cx="29" cy="68" rx="4.5" ry="3" fill="#f2a6c8" opacity="0.7" />
            <ellipse cx="71" cy="68" rx="4.5" ry="3" fill="#f2a6c8" opacity="0.7" />
            <path d="M38 71 Q50 79 62 71" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M41 72.5 L44.5 82 L48 74.5 Z" fill="#fff" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M52 74.5 L55.5 82 L59 72.5 Z" fill="#fff" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          </g>
        }
      />
    </g>
  );
}
