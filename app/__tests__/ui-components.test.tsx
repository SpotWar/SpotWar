import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { NButton } from '../components/ui/NButton';
import { NField } from '../components/ui/NField';
import { renderWithI18n, waitForTestId } from '../test-utils/render';

/**
 * Component-level tests for the two interactive primitives. `waitForTestId`
 * handles React 19's async commit; `NStrength` (tested via the field's host) and
 * the icons are decorative (lucide is stubbed in jest.setup).
 */

describe('NButton', () => {
  it('fires onPress when enabled', async () => {
    const onPress = jest.fn();
    render(<NButton label="Go" onPress={onPress} testID="btn" />);
    fireEvent.press(await waitForTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', async () => {
    const onPress = jest.fn();
    render(<NButton label="Go" onPress={onPress} disabled testID="btn" />);
    fireEvent.press(await waitForTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire onPress while loading, and reports busy state', async () => {
    const onPress = jest.fn();
    render(<NButton label="Working" onPress={onPress} loading testID="btn" />);
    const btn = await waitForTestId('btn');
    fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
    expect(btn.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });
});

describe('NField', () => {
  it('renders the label and reflects typed text via onChangeText', async () => {
    const onChangeText = jest.fn();
    render(<NField label="Email" value="" onChangeText={onChangeText} testID="field" />);
    fireEvent.changeText(await waitForTestId('field'), 'max@spotwar.run');
    expect(onChangeText).toHaveBeenCalledWith('max@spotwar.run');
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('shows the helper row in the error state', async () => {
    render(
      <NField
        label="Email"
        value="max@spot"
        onChangeText={() => {}}
        error="That doesn't look like a valid email"
        testID="field"
      />,
    );
    expect(await waitForTestId('field-error')).toHaveTextContent(
      "That doesn't look like a valid email",
    );
  });

  it('does not render the error helper when valid', async () => {
    render(
      <NField
        label="Email"
        value="max@spotwar.run"
        onChangeText={() => {}}
        valid
        testID="field"
      />,
    );
    await waitForTestId('field');
    expect(screen.queryByTestId('field-error')).toBeNull();
  });

  it('toggles password visibility with the eye button', async () => {
    render(
      <NField
        label="Password"
        value="secret"
        onChangeText={() => {}}
        secureTextEntry
        testID="pw"
      />,
    );
    const input = await waitForTestId('pw');
    expect(input.props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByTestId('pw-eye'));
    // The reveal toggle is a setState; React 19 commits it asynchronously.
    await waitFor(() =>
      expect(screen.getByTestId('pw').props.secureTextEntry).toBe(false),
    );
  });
});

describe('NStrength (via i18n)', () => {
  // NStrength reads useI18n() for its level labels, so it mounts in a provider.
  it('lights the level-appropriate label', async () => {
    const { NStrength } = require('../components/ui/NStrength') as typeof import('../components/ui/NStrength');
    renderWithI18n(<NStrength level={3} />);
    await waitForTestId('password-strength');
    // FR default: level 3 → "Fort".
    expect(screen.getByText('Fort')).toBeTruthy();
  });
});
