// Single entry point for icons: the app never imports lucide-react directly (enforced by ESLint),
// so the icon set can be swapped here. Names end in "Icon" to avoid clashing with domain
// components such as a game Clock. Add icons only when a feature uses them.
export type { LucideIcon as IconComponent, LucideProps as IconProps } from "lucide-react";
export {
  ArrowLeft as ArrowLeftIcon,
  ArrowUpDown as ArrowUpDownIcon,
  BookOpen as BookOpenIcon,
  Check as CheckIcon,
  ChevronRight as ChevronRightIcon,
  CircleAlert as CircleAlertIcon,
  Clock as ClockIcon,
  Flag as FlagIcon,
  Globe as GlobeIcon,
  LoaderCircle as LoaderIcon,
  MessageCircle as MessageCircleIcon,
  MessageCircleOff as MessageCircleOffIcon,
  Monitor as MonitorIcon,
  Moon as MoonIcon,
  RotateCw as RotateCwIcon,
  Send as SendIcon,
  Sun as SunIcon,
  Trophy as TrophyIcon,
  WifiOff as WifiOffIcon,
  X as XIcon,
  Zap as ZapIcon,
} from "lucide-react";
