import {
  Box,
  Brain,
  Clock,
  Container,
  Database,
  GitBranch,
  Globe,
  Hammer,
  Inbox,
  Layers,
  Radio,
  Scroll,
  Shuffle,
  Terminal,
  Waves,
  Workflow,
  Zap,
} from 'lucide-react'

/**
 * The icon for a target's service.
 *
 * `lib/rules.js` names an icon rather than returning one, so the domain model
 * stays free of components and can be tested and reused outside React. This is
 * the one place that turns those names into marks.
 */
const ICONS = {
  zap: Zap,
  inbox: Inbox,
  radio: Radio,
  workflow: Workflow,
  container: Container,
  shuffle: Shuffle,
  waves: Waves,
  scroll: Scroll,
  terminal: Terminal,
  layers: Layers,
  hammer: Hammer,
  gitBranch: GitBranch,
  brain: Brain,
  database: Database,
  globe: Globe,
  clock: Clock,
  box: Box,
}

export function TargetIcon({ icon, className }) {
  const Icon = ICONS[icon] ?? Box
  return <Icon className={className} aria-hidden="true" />
}
