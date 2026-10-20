export interface BrandMarkProps {
	name: string
	/** A logo URL or data URI. Without one, the OpenSEO mark is drawn in the accent color. */
	logo?: string
	/** Hide the name next to the mark. */
	compact?: boolean
}
