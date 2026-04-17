/**
 * Group Templates — predefined setups for common use-cases.
 * Each template pre-fills the group name hint, suggested categories,
 * default split type and a visual identity.
 */

export type SplitType = 'EQUAL' | 'CUSTOM' | 'PERCENTAGE';

export interface GroupTemplate {
  id: string;
  emoji: string;
  /** Gradient class (Tailwind) for the card background */
  gradient: string;
  /** Tailwind color for icon/border accents */
  color: string;
  /** i18n key for the label */
  labelKey: string;
  /** i18n key for the description */
  descKey: string;
  /** Suggested expense categories to pre-select */
  categories: string[];
  /** Default split behaviour */
  defaultSplitType: SplitType;
}

export const GROUP_TEMPLATES: GroupTemplate[] = [
  {
    id: 'trip',
    emoji: '✈️',
    gradient: 'from-blue-500/10 to-indigo-500/10',
    color: 'text-blue-400',
    labelKey: 'template.trip',
    descKey: 'template.trip_desc',
    categories: ['accommodation', 'transport', 'food', 'entertainment'],
    defaultSplitType: 'EQUAL',
  },
  {
    id: 'household',
    emoji: '🏠',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    color: 'text-emerald-400',
    labelKey: 'template.household',
    descKey: 'template.household_desc',
    categories: ['market', 'food', 'other'],
    defaultSplitType: 'EQUAL',
  },
  {
    id: 'office',
    emoji: '🍱',
    gradient: 'from-amber-500/10 to-orange-500/10',
    color: 'text-amber-400',
    labelKey: 'template.office',
    descKey: 'template.office_desc',
    categories: ['food'],
    defaultSplitType: 'EQUAL',
  },
  {
    id: 'wedding',
    emoji: '💍',
    gradient: 'from-pink-500/10 to-rose-500/10',
    color: 'text-pink-400',
    labelKey: 'template.wedding',
    descKey: 'template.wedding_desc',
    categories: ['entertainment', 'food', 'other'],
    defaultSplitType: 'CUSTOM',
  },
  {
    id: 'project',
    emoji: '💼',
    gradient: 'from-purple-500/10 to-violet-500/10',
    color: 'text-purple-400',
    labelKey: 'template.project',
    descKey: 'template.project_desc',
    categories: ['other', 'transport'],
    defaultSplitType: 'PERCENTAGE',
  },
  {
    id: 'blank',
    emoji: '⚡',
    gradient: 'from-white/5 to-white/5',
    color: 'text-white/60',
    labelKey: 'template.blank',
    descKey: 'template.blank_desc',
    categories: [],
    defaultSplitType: 'EQUAL',
  },
];
