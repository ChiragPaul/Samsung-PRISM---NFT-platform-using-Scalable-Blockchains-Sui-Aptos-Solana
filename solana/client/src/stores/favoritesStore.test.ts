import { describe, it, expect, beforeEach } from 'vitest';
import { useFavoritesStore } from './favoritesStore';

describe('favoritesStore', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ mints: [] });
  });

  it('toggles a mint on and off', () => {
    const { toggle } = useFavoritesStore.getState();
    toggle('mintA');
    expect(useFavoritesStore.getState().mints).toContain('mintA');
    expect(useFavoritesStore.getState().isFavorite('mintA')).toBe(true);
    toggle('mintA');
    expect(useFavoritesStore.getState().mints).not.toContain('mintA');
    expect(useFavoritesStore.getState().isFavorite('mintA')).toBe(false);
  });

  it('add is idempotent and remove is safe', () => {
    const { add, remove } = useFavoritesStore.getState();
    add('m');
    add('m');
    expect(useFavoritesStore.getState().mints).toEqual(['m']);
    remove('m');
    remove('m');
    expect(useFavoritesStore.getState().mints).toEqual([]);
  });

  it('clears all favorites', () => {
    useFavoritesStore.setState({ mints: ['a', 'b', 'c'] });
    useFavoritesStore.getState().clear();
    expect(useFavoritesStore.getState().mints).toEqual([]);
  });
});
