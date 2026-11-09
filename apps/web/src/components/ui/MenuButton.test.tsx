import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MenuButton } from './MenuButton';

function renderMenu(onPick = vi.fn()) {
  render(
    <>
      <MenuButton
        id="share"
        label="Compartir"
        items={[
          { id: 'pdf', label: 'Guardar como PDF', onSelect: onPick },
          { id: 'wa', label: 'WhatsApp', href: 'https://wa.me/?text=hola', external: true },
        ]}
      />
      <button type="button">Fuera</button>
    </>,
  );
  return { trigger: screen.getByRole('button', { name: 'Compartir' }), onPick };
}

describe('MenuButton', () => {
  it('keeps its choices hidden until the button is pressed', () => {
    const { trigger } = renderMenu();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Guardar como PDF' })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const group = screen.getByRole('group', { name: 'Compartir' });
    expect(trigger).toHaveAttribute('aria-controls', group.id);
    expect(within(group).getByRole('button', { name: 'Guardar como PDF' })).toHaveFocus();
    const link = within(group).getByRole('link', { name: 'WhatsApp' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('runs the picked choice once, closes and returns focus to the button', () => {
    const { trigger, onPick } = renderMenu();
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar como PDF' }));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('group', { name: 'Compartir' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('moves between choices with the arrow keys and closes on Escape', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    const group = screen.getByRole('group', { name: 'Compartir' });

    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveFocus();
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: 'Guardar como PDF' })).toHaveFocus();
    fireEvent.keyDown(group, { key: 'ArrowUp' });
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveFocus();

    fireEvent.keyDown(group, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Compartir' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes without picking when the pointer goes down elsewhere', () => {
    const { trigger, onPick } = renderMenu();
    fireEvent.click(trigger);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Fuera' }));

    expect(screen.queryByRole('group', { name: 'Compartir' })).not.toBeInTheDocument();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('cannot be opened while disabled', () => {
    render(<MenuButton id="status" label="Cambiar estado" disabled items={[]} />);
    expect(screen.getByRole('button', { name: 'Cambiar estado' })).toBeDisabled();
  });
});
