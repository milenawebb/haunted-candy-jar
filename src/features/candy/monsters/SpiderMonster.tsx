import { CandyBase, useSafeId, type MonsterArtProps } from './CandyBase';

const LEG_COLOR = 'color-mix(in srgb, var(--monster-spider) 60%, black)';
const LEG_PATHS = [
  'M27 44 Q12 34 8 22',
  'M24 53 Q8 48 3 38',
  'M24 62 Q8 66 3 77',
  'M28 70 Q16 82 12 92',
];

/** Round body with four short legs on each side, cluster of small eyes. */
export function SpiderMonster(props: MonsterArtProps) {
  const uid = useSafeId();
  const legs = (
    <g fill="none" stroke={LEG_COLOR} strokeWidth="5" strokeLinecap="round">
      {LEG_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
      <g transform="translate(100 0) scale(-1 1)">
        {LEG_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </g>
  );
  return (
    <g data-monster="spider">
      <CandyBase
        uid={uid}
        color="var(--monster-spider)"
        highlightAt={{ x: 36, y: 38 }}
        {...props}
        back={legs}
        body={(fill) => <circle cx="50" cy="54" r="29" fill={fill} />}
        face={
          <g>
            <circle cx="40" cy="52" r="7" fill="#fff" />
            <circle cx="60" cy="52" r="7" fill="#fff" />
            <circle cx="41" cy="53" r="3.4" fill="#1a0a2e" />
            <circle cx="59" cy="53" r="3.4" fill="#1a0a2e" />
            <g fill="#ffd9ff">
              <circle cx="33" cy="42" r="2.6" />
              <circle cx="67" cy="42" r="2.6" />
              <circle cx="43" cy="40" r="2.6" />
              <circle cx="57" cy="40" r="2.6" />
            </g>
            <path d="M42 66 Q50 72 58 66" fill="none" stroke="#1a0a2e" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        }
      />
    </g>
  );
}
