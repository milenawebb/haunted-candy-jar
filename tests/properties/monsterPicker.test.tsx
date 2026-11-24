import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonsterPicker } from '../../src/features/forms/MonsterPicker';
import { MONSTER_KINDS } from '../../src/utils/monsterKind';
import type { MonsterKind } from '../../src/features/tasks/taskTypes';

/** Validates: Requirements 1.5, 12.1, 12.3 */

const NAMES = MONSTER_KINDS.map((k) => k.charAt(0).toUpperCase() + k.slice(1));

describe('MonsterPicker', () => {
  it('renders 8 buttons with capitalised monster names, in order', () => {
    render(<MonsterPicker value={null} onChange={() => {}} />);
    const group = screen.getByRole('group', { name: 'Choose a monster' });
    expect(group).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(8);
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(NAMES);
  });

  it('null value has no pressed button and shows the hint', () => {
    render(<MonsterPicker value={null} onChange={() => {}} />);
    for (const b of screen.getAllByRole('button')) {
      expect(b).toHaveAttribute('aria-pressed', 'false');
    }
    expect(screen.getByText('Surprise me')).toBeInTheDocument();
  });

  it('aria-pressed, ring and check mark reflect value', () => {
    render(<MonsterPicker value="mummy" onChange={() => {}} />);
    const mummy = screen.getByRole('button', { name: 'Mummy' });
    expect(mummy).toHaveAttribute('aria-pressed', 'true');
    expect(mummy).toHaveAttribute('data-selected', 'true');
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
    expect(screen.getByTestId('monster-check-mummy')).toBeInTheDocument();
    expect(screen.queryByTestId('monster-check-pumpkin')).toBeNull();
    expect(screen.queryByText('Surprise me')).toBeNull();
  });

  it('click calls onChange with the kind; clicking the selected one returns to auto', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<MonsterPicker value={null} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Spider' }));
    expect(onChange).toHaveBeenLastCalledWith('spider');
    rerender(<MonsterPicker value="spider" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Spider' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('arrow keys move focus and wrap; Home and End work; Enter and Space select', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonsterPicker value={null} onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    await user.tab();
    expect(buttons[0]).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(buttons[1]).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(buttons[7]).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(buttons[0]).toHaveFocus();
    await user.keyboard('{End}');
    expect(buttons[7]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(buttons[0]).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('pumpkin');
    await user.keyboard('{ArrowDown} ');
    expect(onChange).toHaveBeenLastCalledWith('mummy');
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
  });

  it('every button has a hit area of at least 44x44', () => {
    render(<MonsterPicker value={null} onChange={() => {}} />);
    for (const b of screen.getAllByRole('button')) {
      expect(parseInt(b.style.minWidth, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    }
  });

  it('works controlled', async () => {
    const user = userEvent.setup();
    function Host() {
      const [v, setV] = useState<MonsterKind | null>(null);
      return <MonsterPicker value={v} onChange={setV} />;
    }
    render(<Host />);
    await user.click(screen.getByRole('button', { name: 'Bat' }));
    expect(screen.getByRole('button', { name: 'Bat' })).toHaveAttribute('aria-pressed', 'true');
  });
});
