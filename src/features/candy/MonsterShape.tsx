import type { CSSProperties } from 'react';
import type { DecayStage, MonsterKind } from '../tasks/taskTypes';
import { useSafeId, type MonsterArtProps } from './monsters/CandyBase';
import { DecayOverlay } from './DecayOverlay';
import { decayLook } from './decayLook';
import { BatMonster } from './monsters/BatMonster';
import { FrankensteinMonster } from './monsters/FrankensteinMonster';
import { GravestoneMonster } from './monsters/GravestoneMonster';
import { VampireMonster } from './monsters/VampireMonster';
import { MummyMonster } from './monsters/MummyMonster';
import { PumpkinMonster } from './monsters/PumpkinMonster';
import { SkeletonMonster } from './monsters/SkeletonMonster';
import { SpiderMonster } from './monsters/SpiderMonster';

/**
 * Dispatches to one of the SVG candy monsters.
 *
 * Coordinate system: every monster is a <g> on a 100x100 box. Each one is
 * scaled and centered (ART_FIT) so its largest side fills CANDY_ART_FILL of
 * the box. MonsterShape adds a soft contact shadow below it, so its own box is
 * 100 wide by 108 tall.
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
  /** Exposed as data-decay-stage. The look comes from decayLook(stage) and DecayOverlay. */
  decayStage: DecayStage;
  /** Width in px. Default comes from --candy-size. */
  size?: number;
  /** Render a nested <svg> for use inside another SVG. */
  nested?: { x: number; y: number; width: number };
}

const BOX_W = 100;
const BOX_H = 108;
/** Fraction of the 100x100 box that the largest side of each monster fills. */
export const CANDY_ART_FILL = 0.9;

/** Drawn bounding box of each monster: centre (cx, cy) and largest side (extent), in art units. */
const ART_FIT: Record<MonsterKind, { cx: number; cy: number; extent: number }> = {
  pumpkin: { cx: 50, cy: 48.5, extent: 85 },
  mummy: { cx: 50, cy: 52, extent: 76 },
  skeleton: { cx: 50, cy: 49, extent: 82 },
  spider: { cx: 50, cy: 57, extent: 94 },
  frankenstein: { cx: 50, cy: 50, extent: 84 },
  vampire: { cx: 50, cy: 53.5, extent: 88 },
  bat: { cx: 50, cy: 47, extent: 96 },
  gravestone: { cx: 50, cy: 50, extent: 84 },
};

function fitTransform(kind: MonsterKind): string {
  const { cx, cy, extent } = ART_FIT[kind];
  const s = (BOX_W * CANDY_ART_FILL) / extent;
  return `translate(50 50) scale(${s}) translate(${-cx} ${-cy})`;
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
    case 'frankenstein':
      return <FrankensteinMonster {...art} />;
    case 'vampire':
      return <VampireMonster {...art} />;
    case 'bat':
      return <BatMonster {...art} />;
    case 'gravestone':
      return <GravestoneMonster {...art} />;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
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
  const look = decayLook(decayStage);
  const art: MonsterArtProps = {
    highlightOpacity: highlightOpacity ?? look.highlightOpacity,
    sparkleOpacity: sparkleOpacity ?? look.sparkleOpacity,
    strongRim: look.strongRim,
  };

  const content = (
    <>
      <defs>
        <filter id={blurId} x="-30%" y="-200%" width="160%" height="500%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <ellipse
        data-part="contact-shadow"
        data-shadow={look.strongShadow ? 'strong' : undefined}
        cx="52"
        cy="98"
        rx={look.strongShadow ? 40 : 34}
        ry={look.strongShadow ? 7.5 : 5.5}
        fill={look.strongShadow ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.42)'}
        filter={`url(#${blurId})`}
      />
      <DecayOverlay stage={decayStage} layer="back" uid={uid} />
      <g
        data-part="monster-body"
        style={look.bodyFilter === 'none' ? undefined : { filter: look.bodyFilter }}
      >
        <g transform={fitTransform(kind)}>{renderMonster(kind, art)}</g>
      </g>
      <DecayOverlay stage={decayStage} layer="front" uid={uid} />
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
