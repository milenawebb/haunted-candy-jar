import { CandyBase, useSafeId, type MonsterArtProps } from './CandyBase';

const HAIR = '#1c0a12';
const CAPE = '#2b0c18';
const INK = '#2a0a14';

/** Round body with a widow's-peak hairline, small fangs, tiny cape collar. */
export function VampireMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  const collar = (
    <g>
      <path d="M14 66 L6 94 Q50 102 94 94 L86 66 Z" fill={CAPE} />
      <path d="M14 66 L6 94 L36 90 Z" fill="#4a1426" />
      <path d="M86 66 L94 94 L64 90 Z" fill="#4a1426" />
    </g>
  );
  return (
    <g data-monster="vampire">
      <CandyBase
        uid={uid}
        color="var(--monster-vampire)"
        {...props}
        back={collar}
        body={(fill) => <circle cx="50" cy="50" r="38" fill={fill} />}
        face={
          <g>
            <path d="M13 44 C12 22 30 12 50 12 C70 12 88 22 87 44 C80 36 70 34 62 30 L50 44 L38 30 C30 34 20 36 13 44 Z" fill={HAIR} />
            <path d="M31 52 Q37 47 43 52" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M57 52 Q63 47 69 52" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="37" cy="55" r="3.2" fill={INK} />
            <circle cx="63" cy="55" r="3.2" fill={INK} />
            <path d="M36 68 Q50 78 64 68" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M40 70 L43.5 79 L47 72 Z" fill="#fff" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
            <path d="M53 72 L56.5 79 L60 70 Z" fill="#fff" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          </g>
        }
      />
    </g>
  );
}
