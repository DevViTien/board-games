// Single entry point for icons: the app never imports lucide-react directly (enforced by ESLint),
// so the icon set can be swapped here. Names end in "Icon" to avoid clashing with domain
// components such as a game Clock. Add icons only when a feature uses them.
export type { LucideIcon as IconComponent, LucideProps as IconProps } from "lucide-react";
export { Clock as ClockIcon, Users as UsersIcon } from "lucide-react";
