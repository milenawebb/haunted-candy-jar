import type { CSSProperties } from 'react';
import type { DecayStage, MonsterKind } from '../tasks/taskTypes';
import { CandyBase, useSafeId, type MonsterArtProps } from './monsters/CandyBase';
import { MummyMonster } from './monsters/MummyMonster';
import { PumpkinMonster } from './monsters/PumpkinMonster';
import { SkeletonMonster } from './monsters/SkeletonMonster';
import { SpiderMonster } from './monsters/SpiderMonster';

/**
 * Dispatches to one of the SVG candy monsters.
 *
 * Coordinate system: every monster is a <g> on a 100x100 box. MonsterShape adds
 * a contact shadow below it, so its own box is 100 wide by 108 tall.
 *
 * Two ways to embed:
 * - standalone (default): renders its own <svg viewBox="0 0 100 108">, sized by
 *   `size` (px) or, when omitted, by the --candy-size CSS custom property
 *   (72px desktop, 60px mobile, see tokens.css).
 * - nested (`nested` prop): renders a nested <svg> positioned with `x`, `y`,
 *   `width` inside a parent SVG (the jar), so no extra HTML element is created.
 */
export interface MonsterShapeProps extends MonsterArtProps {
  kind: MonsterKind;
  /** Exposed as data-decay-stage. DecayOverlay (a later task) drives the look. */
  decayStage: DecayStage;
  /** Width in px. Default comes from --candy-size. */
  size?: number;
  /** Render a nested <svg> for use inside another SVG. */
  nested?: { x: number; y: number; width: number };
}

const BOX_W = 100;
const BOX_H = 108;

/** TEMPORARY: simple blob for the four monsters added in task 21. */
function PlaceholderMonster({ kind, ...art }: MonsterArtProps & { kind: MonsterKind }) {
  const uid = useSafeId();
  return (
    <g data-monster={kind} data-placeholder="true">
      <CandyBase
        uid={uid}
        color={`var(--monster-${kind})`}
        {...art}
        body={(fill) => <circle cx="50" cy="52" r="38" fill={fill} />}
      />
    </g>
  );
}

function renderMonster(kind: MonsterKind, art: MonsterArtProps) {
  switch (kind) {
    case 'pumpkin':
      return <PumpkinMonster {...art} />;
    case 'mummy':
      return <MummyMonster {...art} />;
    case 'skeleton':
      return <SkeletonMonster {...art} />;
    case 'spider':
      return <SpiderMonster {...art} />;
    default:
      // Task 21 replaces this with the remaining four monsters and a never check.
      return <PlaceholderMonster kind={kind} {...art} />;
  }
}

export function MonsterShape({
  kind,
  decayStage,
  size,
  nested,
  highlightOpacity,
  sparkleOpacity,
}: MonsterShapeProps) {
  const uid = useSafeId();
  const blurId = `${uid}-blur`;
  const art: MonsterArtProps = { highlightOpacity, sparkleOpacity };

  const content = (
    <>
      <defs>
        <filter id={blurId} x="-30%" y="-200%" width="160%" height="500%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <ellipse
        data-part="contact-shadow"
        cx="50"
        cy="101"
        rx="30"
        ry="4.5"
        fill="rgba(0,0,0,0.4)"
        filter={`url(#${blurId})`}
      />
      {renderMonster(kind, art)}
    </>
  );

  if (nested) {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        data-decay-stage={decayStage}
        x={nested.x}
        y={nested.y}
        width={nested.width}
        height={(nested.width * BOX_H) / BOX_W}
        viewBox={`0 0 ${BOX_W} ${BOX_H}`}
        overflow="visible"
      >
        {content}
      </svg>
    );
  }

  const style: CSSProperties = {
    width: size ?? 'var(--candy-size, 72px)',
    height: 'auto',
    display: 'block',
    overflow: 'visible',
  };
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-decay-stage={decayStage}
      viewBox={`0 0 ${BOX_W} ${BOX_H}`}
      style={style}
    >
      {content}
    </svg>
  );
}
