import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GHOST_CHEER_DURATION_MS,
  GHOST_CHEER_REDUCED_MS,
  GhostCheer,
} from '../../src/features/candy/GhostCheer';

function setReduced(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderGhost(onDone?: () => void) {
  return render(
    <svg viewBox="0 0 100 100">
      <GhostCheer onDone={onDone} />
    </svg>,
  );
}

describe('GhostCheer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a hidden, non-interactive ghost with the float class', () => {
    setReduced(false);
    const { getByTestId } = renderGhost();
    const g = getByTestId('ghost-cheer');
    expect(g.getAttribute('aria-hidden')).toBe('true');
    expect(g.getAttribute('style')).toContain('pointer-events');
    expect(g.getAttribute('class')).toContain('ghost-cheer--float');
  });

  it('calls onDone once after the animation duration', () => {
    setReduced(false);
    const onDone = vi.fn();
    renderGhost(onDone);
    act(() => {
      vi.advanceTimersByTime(GHOST_CHEER_DURATION_MS - 1);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reduced motion: static class, no float, onDone after 1 s', () => {
    setReduced(true);
    const onDone = vi.fn();
    const { getByTestId } = renderGhost(onDone);
    const cls = getByTestId('ghost-cheer').getAttribute('class') ?? '';
    expect(cls).toContain('ghost-cheer--static');
    expect(cls).not.toContain('float');
    act(() => {
      vi.advanceTimersByTime(GHOST_CHEER_REDUCED_MS - 1);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('clears its timer on unmount and never calls onDone', () => {
    setReduced(false);
    const onDone = vi.fn();
    const { unmount } = renderGhost(onDone);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10000);
    expect(onDone).not.toHaveBeenCalled();
  });
});
