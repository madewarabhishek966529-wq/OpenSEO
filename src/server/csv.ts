function cell(value: unknown): string {
	const text = value == null ? '' : String(value)

	return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** A CSV file as a download response. */
export function csvResponse(fileName: string, columns: string[], rows: unknown[][]): Response {
	const body = [columns, ...rows].map((row) => row.map(cell).join(',')).join('\n')

	return new Response(`${body}\n`, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${fileName}"`
		}
	})
}
