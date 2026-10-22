import type { EventCategory } from '../data/types'
import type { IconName } from './Icon'

export const CATEGORY_ICON: Record<EventCategory, IconName> = {
  system: 'link',
  robot: 'robot',
  drone: 'drone',
  radar: 'radar',
  survey: 'territories',
}
