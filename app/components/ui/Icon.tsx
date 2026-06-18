import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  User,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { colors } from '../../theme/tokens';

/**
 * Thin wrapper over `lucide-react-native` so screens reference icons by the
 * design handoff's semantic names (`mail`, `bolt`, `alert`, …) rather than the
 * library's. The handoff's icon set maps 1:1 to lucide names; this table is the
 * single place that translation lives. Stroke is the design's 1.8px.
 */
const ICONS: Record<string, LucideIcon> = {
  mail: Mail,
  lock: Lock,
  user: User,
  eye: Eye,
  eyeOff: EyeOff,
  check: Check,
  arrow: ArrowRight,
  back: ArrowLeft,
  chevron: ChevronRight,
  bolt: Zap,
  alert: AlertTriangle,
  refresh: RefreshCw,
};

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color = colors.text,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
