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
    ['Stats', 'More', 'Your Stats'],
    ['Guides', 'More', 'Pellet recommendation'],
    ['Recipes', 'More', 'Recipes'],
    ['Cook', 'Cook', 'Start a cook'],
  ])('shows %s after leaving detail', async (_destination, navLabel, content) => {
    render(<App />);
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    const main = screen.getByRole('main');

    fireEvent.click(within(nav).getByRole('button', { name: 'History' }));
    fireEvent.click(within(main).getByRole('button', { name: /Test Brisket/ }));
    expect(within(main).getByRole('button', { name: 'History' })).toBeTruthy();

    const target = within(nav).getByRole('button', { name: navLabel });
    fireEvent.click(target);
    if (navLabel === 'More') fireEvent.click(within(main).getByRole('button', { name: _destination, exact: true }));

    expect(target.getAttribute('aria-current')).toBe('page');
    expect(main.textContent).toContain(content);
    if (navLabel === 'History') expect(within(main).getByRole('button', { name: /Test Brisket/ })).toBeTruthy();
    expect(main.textContent).not.toContain('Select a cook from History.');
    expect(within(main).queryByRole('button', { name: 'History' })).toBeNull();
  });

  it('keeps a manual cook draft while visiting Devices without changing saved cook data', async () => {
    render(<App />);
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    const before = localStorage.getItem('pitlogic-v5');
    fireEvent.click(within(nav).getByRole('button', { name: 'Cook', exact: true }));
    fireEvent.change(screen.getByLabelText('Smoker target °F'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'View device readings' }));
    expect(screen.getByRole('main').textContent).toContain('Devices');
    fireEvent.click(screen.getByRole('button', { name: 'Back to cook setup' }));
    expect(screen.getByLabelText('Smoker target °F').value).toBe('250');
    expect(localStorage.getItem('pitlogic-v5')).toBe(before);
    expect(within(nav).getAllByRole('button').map(b => b.textContent)).toEqual(['Home', 'Cook', 'History', 'More']);
  });
});
