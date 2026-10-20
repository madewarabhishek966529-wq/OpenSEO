export interface ImageSize {
	format: 'png' | 'jpeg' | 'gif' | 'webp' | 'ico' | 'svg' | 'avif' | 'bmp'
	width?: number
	height?: number
	/** Every size inside an .ico file, like "16x16". */
	sizes?: string[]
}

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
	return bytes.every((b, i) => buf[offset + i] === b)
}

function ascii(buf: Buffer, start: number, end: number): string {
	return buf.subarray(start, end).toString('latin1')
}

function jpegSize(buf: Buffer): ImageSize {
	let offset = 2
	while (offset + 9 < buf.length) {
		if (buf[offset] !== 0xff) {
			offset++
			continue
		}
		const marker = buf[offset + 1]
		// Start-of-frame markers carry the dimensions; C4, C8 and CC are other tables.
		const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
		if (isFrame) {
			return {
				format: 'jpeg',
				height: buf.readUInt16BE(offset + 5),
				width: buf.readUInt16BE(offset + 7)
			}
		}
		if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
			offset += 2
			continue
		}
		offset += 2 + buf.readUInt16BE(offset + 2)
	}

	return { format: 'jpeg' }
}

function webpSize(buf: Buffer): ImageSize {
	const chunk = ascii(buf, 12, 16)
	if (chunk === 'VP8 ' && buf.length >= 30) {
		return {
			format: 'webp',
			width: buf.readUInt16LE(26) & 0x3fff,
			height: buf.readUInt16LE(28) & 0x3fff
		}
	}
	if (chunk === 'VP8L' && buf.length >= 25) {
		const [b1, b2, b3, b4] = [buf[21], buf[22], buf[23], buf[24]]

		return {
			format: 'webp',
			width: 1 + (((b2 & 0x3f) << 8) | b1),
			height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))
		}
	}
	if (chunk === 'VP8X' && buf.length >= 30) {
		return {
			format: 'webp',
			width: 1 + buf.readUIntLE(24, 3),
			height: 1 + buf.readUIntLE(27, 3)
		}
	}

	return { format: 'webp' }
}

function icoSize(buf: Buffer): ImageSize {
	const count = buf.readUInt16LE(4)
	const sizes: string[] = []
	let width = 0
	let height = 0
	for (let i = 0; i < count && 6 + i * 16 + 16 <= buf.length; i++) {
		const entry = 6 + i * 16
		// A stored 0 means 256 pixels.
		const w = buf[entry] || 256
		const h = buf[entry + 1] || 256
		sizes.push(`${w}x${h}`)
		if (w * h > width * height) {
			width = w
			height = h
		}
	}

	return { format: 'ico', width: width || undefined, height: height || undefined, sizes }
}

function svgLength(value: string | undefined): number | undefined {
	const match = value?.match(/^\s*([\d.]+)\s*(px)?\s*$/)

	return match ? Math.round(Number(match[1])) : undefined
}

function svgSize(text: string): ImageSize {
	const tag = text.match(/<svg\b[^>]*>/i)?.[0] ?? ''
	const attr = (name: string) =>
		tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1]
	let width = svgLength(attr('width'))
	let height = svgLength(attr('height'))
	const viewBox = attr('viewBox')
		?.split(/[\s,]+/)
		.map(Number)
		.filter((n) => Number.isFinite(n))
	if ((!width || !height) && viewBox?.length === 4) {
		width = width ?? Math.round(viewBox[2])
		height = height ?? Math.round(viewBox[3])
	}

	return { format: 'svg', width, height }
}

function avifSize(buf: Buffer): ImageSize {
	const ispe = buf.indexOf('ispe', 0, 'latin1')
	if (ispe === -1 || ispe + 16 > buf.length) return { format: 'avif' }

	// Box layout: "ispe", 4 bytes of version and flags, then width and height.
	return {
		format: 'avif',
		width: buf.readUInt32BE(ispe + 8),
		height: buf.readUInt32BE(ispe + 12)
	}
}

/** Reads an image's format and pixel size from its bytes, without decoding it. */
export function imageSize(buf: Buffer): ImageSize | null {
	if (buf.length < 12) return null
	if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47])) {
		return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
	}
	if (startsWith(buf, [0xff, 0xd8])) return jpegSize(buf)
	if (ascii(buf, 0, 4) === 'GIF8') {
		return { format: 'gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
	}
	if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP') return webpSize(buf)
	if (startsWith(buf, [0, 0, 1, 0]) || startsWith(buf, [0, 0, 2, 0])) return icoSize(buf)
	if (ascii(buf, 4, 8) === 'ftyp' && /avi[fs]|mif1|heic/.test(ascii(buf, 8, 32))) {
		return avifSize(buf)
	}
	if (ascii(buf, 0, 2) === 'BM') {
		return { format: 'bmp', width: buf.readInt32LE(18), height: Math.abs(buf.readInt32LE(22)) }
	}
	const head = buf.subarray(0, 4096).toString('utf8')
	if (/<svg\b/i.test(head)) return svgSize(buf.toString('utf8'))

	return null
}
