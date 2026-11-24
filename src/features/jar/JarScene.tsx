import type { ReactNode } from 'react';
import { DeskGlow } from './DeskGlow';
import { JarBackGlass } from './JarBackGlass';
import { JarFrontGlass } from './JarFrontGlass';
import { JarLid } from './JarLid';
import {
  JAR_CLIP_ID,
  JAR_INSIDE_PATH,
  JAR_VIEWBOX,
} from './jarGeometry';
import './JarScene.css';

export interface JarSceneProps {
  /** Candies, drawn in jar coordinates and clipped to the jar's inside shape. */
  children?: ReactNode;
  /** Front glass layer (SVG content). Drawn above the candies. Defaults to JarFrontGlass. */
  frontGlass?: ReactNode;
  /** Lid (SVG content). Drawn above the front glass. Defaults to JarLid. */
  lid?: ReactNode;
  /** Soft desk shadow and glow (HTML or SVG), drawn behind the jar. */
  deskGlow?: ReactNode;
  /** Candies that spill onto the desk, drawn unclipped above the glass. */
  overflow?: ReactNode;
}

/**
 * Composes the jar back to front: back glass, clipped candies, front glass,
 * then lid. The desk glow sits behind the SVG.
 */
export function JarScene({ children, frontGlass, lid, deskGlow, overflow }: JarSceneProps) {
  return (
    <div className="jar-scene" data-testid="jar-scene">
      <div className="jar-scene__desk-glow">{deskGlow ?? <DeskGlow />}</div>
      <svg
        className="jar-scene__svg"
        viewBox={JAR_VIEWBOX}
        role="group"
        aria-label="Candy jar"
        overflow="visible"
      >
        <defs>
          <clipPath id={JAR_CLIP_ID}>
            <path d={JAR_INSIDE_PATH} />
          </clipPath>
        </defs>
        <JarBackGlass />
        <g clipPath={`url(#${JAR_CLIP_ID})`} data-testid="jar-candies">
          {children}
        </g>
        {frontGlass ?? <JarFrontGlass />}
        {lid ?? <JarLid />}
        {overflow}
      </svg>
    </div>
  );
}
