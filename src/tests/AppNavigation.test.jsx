import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App.jsx';

const completedCook = {
  id: 'cook1', name: 'Test Brisket', cut: 'Brisket', status: 'complete',
  startTime: 1_700_000_000_000, endTime: 1_700_030_000_000,
  smokerTarget: 225, smokerReadings: [], notes: '', rating: 0,
  probes: [{ name: 'Probe 1', target: 203, readings: [] }],
};

describe('navigation from completed cook detail', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('pitlogic-v5', JSON.stringify({ cooks: [completedCook], activeCooks: [], dis: {} }));
  });
  afterEach(() => cleanup());

  it.each([
    ['Dashboard', 'Home', 'Recent Cooks'],
    ['History', 'History', 'Cook History'],
    ['Analytics', 'Stats', 'Your Stats'],
    ['Guides', 'Guides', 'Pellet recommendation'],
    ['Recipes', 'Recipes', 'Recipes'],
    ['New Cook', 'Cook', 'New Cook Setup'],
  ])('shows %s after leaving detail', async (_destination, navLabel, content) => {
    render(<App />);
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    const main = screen.getByRole('main');

    fireEvent.click(within(nav).getByRole('button', { name: 'History' }));
    fireEvent.click(within(main).getByRole('button', { name: /Test Brisket/ }));
    expect(within(main).getByRole('button', { name: 'History' })).toBeTruthy();

    const target = within(nav).getByRole('button', { name: navLabel });
    fireEvent.click(target);

    expect(target.getAttribute('aria-current')).toBe('page');
    expect(main.textContent).toContain(content);
    if (navLabel === 'History') expect(within(main).getByRole('button', { name: /Test Brisket/ })).toBeTruthy();
    expect(main.textContent).not.toContain('Select a cook from History.');
    expect(within(main).queryByRole('button', { name: 'History' })).toBeNull();
  });
});
