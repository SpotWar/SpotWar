import { Text, type StyleProp, type TextStyle } from 'react-native';

import { body, heading, mono } from '../../theme/typography';

/** Anton display heading. Accepts multi-line strings (`\n` from i18n). */
export function Heading({
  size = 34,
  children,
  style,
}: {
  size?: number;
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[heading(size), style]}>{children}</Text>;
}

/** Archivo body copy. */
export function Body({
  size = 15,
  children,
  style,
}: {
  size?: number;
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[body(size), style]}>{children}</Text>;
}

/** Space Mono "intel" caption. */
export function Mono({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[mono(), style]}>{children}</Text>;
}
