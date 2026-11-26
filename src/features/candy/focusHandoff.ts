/**
 * Where keyboard focus goes when the candy that has it is completed.
 * `chooseNextFocusId` is pure. `handOffFocus` does the DOM work.
 */

/** The candy after `completedId` in tab order, else the one before it, else null. */
export function chooseNextFocusId(ids: readonly string[], completedId: string): string | null {
  const i = ids.indexOf(completedId);
  if (i < 0) return null;
  return ids[i + 1] ?? ids[i - 1] ?? null;
}

/**
 * Moves focus off a completed candy, but only when focus is on it (or inside
 * it). Other candies that are also completing are skipped. With no candy left
 * focus goes to the "Add a candy" button.
 */
export function handOffFocus(completed: Element, completedId: string): void {
  const active = document.activeElement;
  if (!active || !completed.contains(active)) return;
  const candies = Array.from(document.querySelectorAll<SVGGraphicsElement>('[data-testid="candy-item"]')).filter(
    (el) => el === completed || el.getAttribute('data-completing') !== 'true',
  );
  const nextId = chooseNextFocusId(
    candies.map((el) => el.getAttribute('data-task-id') ?? ''),
    completedId,
  );
  const target = nextId
    ? candies.find((el) => el.getAttribute('data-task-id') === nextId)
    : document.querySelector<HTMLElement>('.add-candy-fab');
  target?.focus();
}
