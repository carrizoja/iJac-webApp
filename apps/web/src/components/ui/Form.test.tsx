import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label, HelpText, FieldError, Input, Textarea, Select } from './Form';

describe('Label', () => {
  it('renders a label with text', () => {
    render(<Label>Email</Label>);
    const label = screen.getByText(/email/i);
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe('LABEL');
  });

  it('associates with an input via htmlFor', () => {
    const { container } = render(
      <>
        <Label htmlFor="email-input">Email</Label>
        <input id="email-input" />
      </>
    );
    const label = container.querySelector('label[for="email-input"]');
    expect(label).toBeInTheDocument();
  });

  it('displays required asterisk when required is true', () => {
    render(<Label required>Password</Label>);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveClass('text-destructive');
  });

  it('applies custom className', () => {
    render(<Label className="custom-class">Custom</Label>);
    const label = screen.getByText(/custom/i);
    expect(label).toHaveClass('custom-class');
  });
});

describe('HelpText', () => {
  it('renders help text', () => {
    render(<HelpText>Use at least 8 characters</HelpText>);
    const text = screen.getByText(/use at least 8 characters/i);
    expect(text).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<HelpText>Help</HelpText>);
    const text = screen.getByText(/help/i);
    expect(text).toHaveClass('text-xs', 'text-fg-muted', 'mt-1.5');
  });

  it('can have custom className', () => {
    render(<HelpText className="custom">Help</HelpText>);
    const text = screen.getByText(/help/i);
    expect(text).toHaveClass('custom');
  });
});

describe('FieldError', () => {
  it('renders error message', () => {
    render(<FieldError>Email is required</FieldError>);
    const error = screen.getByText(/email is required/i);
    expect(error).toBeInTheDocument();
  });

  it('has alert role by default', () => {
    render(<FieldError>Error</FieldError>);
    const error = screen.getByRole('alert');
    expect(error).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<FieldError>Error</FieldError>);
    const error = screen.getByText(/error/i);
    expect(error).toHaveClass('text-sm', 'text-destructive', 'font-medium');
  });

  it('can have custom role', () => {
    render(<FieldError role="status">Message</FieldError>);
    const error = screen.getByRole('status');
    expect(error).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" id="email" />);
    const label = screen.getByLabelText(/email/i);
    expect(label).toHaveAttribute('id', 'email');
  });

  it('renders with help text', () => {
    render(<Input label="Password" helpText="Use 8+ characters" id="pwd" />);
    const helpText = screen.getByText(/use 8\+ characters/i);
    expect(helpText).toBeInTheDocument();
  });

  it('renders with error state', () => {
    render(<Input label="Username" error="Username is taken" id="user" />);
    const errorMsg = screen.getByText(/username is taken/i);
    expect(errorMsg).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('generates stable ID when not provided', () => {
    const { container } = render(<Input label="Field" />);
    const input = container.querySelector('input');
    expect(input?.id).toBeTruthy();
    expect(input?.id).toMatch(/^input-/);
  });

  it('shows required indicator', () => {
    render(<Input label="Email" required id="email" />);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
  });

  it('sets aria-describedby for error and help text', () => {
    render(
      <Input
        id="test-input"
        label="Field"
        error="Error message"
        helpText="Help message"
      />
    );
    const input = screen.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toContain('test-input-error');
    expect(describedBy).toContain('test-input-help');
  });

  it('supports different input types', () => {
    render(<Input type="email" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.type).toBe('email');
  });

  it('can be disabled', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input');
  });
});

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('renders with label', () => {
    render(<Textarea label="Comments" id="comments" />);
    const textarea = screen.getByLabelText(/comments/i);
    expect(textarea).toHaveAttribute('id', 'comments');
  });

  it('renders with help text', () => {
    render(
      <Textarea
        label="Description"
        helpText="Maximum 500 characters"
        id="desc"
      />
    );
    const helpText = screen.getByText(/maximum 500 characters/i);
    expect(helpText).toBeInTheDocument();
  });

  it('renders with error state', () => {
    render(
      <Textarea label="Notes" error="This field is required" id="notes" />
    );
    const errorMsg = screen.getByText(/this field is required/i);
    expect(errorMsg).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('supports custom rows and cols', () => {
    render(<Textarea rows={10} cols={50} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.getAttribute('rows')).toBe('10');
    expect(textarea.getAttribute('cols')).toBe('50');
  });
});

describe('Select', () => {
  it('renders a select element', () => {
    render(<Select id="test-select-1" />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Select label="Country" id="country" />);
    const select = screen.getByLabelText(/country/i);
    expect(select).toHaveAttribute('id', 'country');
  });

  it('renders options from array', () => {
    render(
      <Select
        id="status-array"
        options={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ]}
      />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(select.options[0].value).toBe('active');
    expect(select.options[0].textContent).toBe('Active');
    expect(select.options[1].value).toBe('inactive');
    expect(select.options[1].textContent).toBe('Inactive');
  });

  it('renders children as options', () => {
    render(
      <Select id="status-children">
        <option value="pending">Pending</option>
        <option value="done">Done</option>
      </Select>
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(select.options[0].value).toBe('pending');
    expect(select.options[0].textContent).toBe('Pending');
    expect(select.options[1].value).toBe('done');
    expect(select.options[1].textContent).toBe('Done');
  });

  it('renders with error state', () => {
    render(
      <Select
        id="country-error"
        label="Country"
        error="Please select a country"
      />
    );
    const errorMsg = screen.getByText(/please select a country/i);
    expect(errorMsg).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Select id="test-select-disabled" disabled />);
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('supports required indicator', () => {
    render(<Select label="Category" required id="cat" />);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
  });
});
