import type { SVGProps } from 'react'
import type { PATHS } from './icon.constants'

export type IconName = keyof typeof PATHS

export type IconProps = { name: IconName; size?: number } & SVGProps<SVGSVGElement>
