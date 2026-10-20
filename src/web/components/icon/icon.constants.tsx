/** Hand-drawn 20×20 stroke icons. Keeping them local avoids an icon library dependency. */
export const PATHS = {
	audit: (
		<>
			<circle cx="10" cy="10" r="6.75" />
			<circle cx="10" cy="10" r="3" />
			<path d="M10 10 15 5" />
		</>
	),
	search: (
		<>
			<circle cx="8.75" cy="8.75" r="5.25" />
			<path d="m12.75 12.75 4 4" />
		</>
	),
	plus: <path d="M10 4.5v11M4.5 10h11" />,
	close: <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />,
	check: <path d="m4.75 10.5 3.25 3.25 7.25-7.5" />,
	alert: <path d="M10 5.25v5.75M10 14.5v.25" strokeWidth={2} />,
	info: <path d="M10 9v5.25M10 5.75V6" strokeWidth={2} />,
	dash: <path d="M6 10h8" strokeWidth={2} />,
	arrowRight: <path d="M4 10h12M11 5l5 5-5 5" />,
	arrowUp: <path d="M10 16V4.5M5 9.5l5-5 5 5" />,
	arrowDown: <path d="M10 4v11.5M5 10.5l5 5 5-5" />,
	swap: <path d="M4 7h11.5M12.25 3.75 15.5 7l-3.25 3.25M16 13H4.5M7.75 9.75 4.5 13l3.25 3.25" />,
	compare: (
		<>
			<rect x="2.75" y="5.25" width="5.75" height="9.5" rx="1.5" />
			<rect x="11.5" y="5.25" width="5.75" height="9.5" rx="1.5" />
			<path d="M10 3v14" />
		</>
	),
	external: (
		<path d="M7 13 14 6M8.5 6H14v5.5M14 13.5V15a1.5 1.5 0 0 1-1.5 1.5h-7.5A1.5 1.5 0 0 1 3.5 15V7.5A1.5 1.5 0 0 1 5 6h1.5" />
	),
	chevronDown: <path d="m5.5 8 4.5 4.5L14.5 8" />,
	chevronRight: <path d="m8 5.5 4.5 4.5L8 14.5" />,
	download: <path d="M10 3.5v9M6 8.75l4 4 4-4M4 16.25h12" />,
	printer: (
		<>
			<path d="M5.5 7V3.5h9V7" />
			<rect x="3" y="7" width="14" height="7" rx="2" />
			<rect x="6" y="11.5" width="8" height="5" rx="1" />
		</>
	),
	refresh: (
		<>
			<path d="M15.5 8.5A5.75 5.75 0 0 0 5 6.25M4.75 3.5v3h3" />
			<path d="M4.5 11.5A5.75 5.75 0 0 0 15 13.75M15.25 16.5v-3h-3" />
		</>
	),
	trash: (
		<path d="M4 6h12M8 6V4.25h4V6M5.5 6l.75 9.75A1.5 1.5 0 0 0 7.75 17h4.5a1.5 1.5 0 0 0 1.5-1.25L14.5 6" />
	),
	settings: (
		<>
			<path d="M3.5 6h6.25M14.25 6h2.25M3.5 14h2.25M10.25 14h6.25" />
			<circle cx="12" cy="6" r="2.25" />
			<circle cx="8" cy="14" r="2.25" />
		</>
	),
	clock: (
		<>
			<circle cx="10" cy="10" r="6.75" />
			<path d="M10 6.5V10l2.5 1.75" />
		</>
	),
	crawl: (
		<>
			<rect x="7.5" y="2.75" width="5" height="4" rx="1" />
			<rect x="2.75" y="13.25" width="5" height="4" rx="1" />
			<rect x="12.25" y="13.25" width="5" height="4" rx="1" />
			<path d="M10 6.75V10M5.25 13.25V10h9.5v3.25" />
		</>
	),
	mail: (
		<>
			<rect x="2.75" y="4.5" width="14.5" height="11" rx="2" />
			<path d="m3.25 6 6.75 5 6.75-5" />
		</>
	),
	globe: (
		<>
			<circle cx="10" cy="10" r="6.75" />
			<path d="M3.25 10h13.5M10 3.25c1.9 2.1 2.75 4.4 2.75 6.75S11.9 14.65 10 16.75C8.1 14.65 7.25 12.35 7.25 10S8.1 5.35 10 3.25Z" />
		</>
	),
	code: <path d="m7 6-4 4 4 4M13 6l4 4-4 4M11.25 4.5l-2.5 11" />,
	link: (
		<>
			<path d="M8.5 11.5a3.25 3.25 0 0 0 4.6 0l2.3-2.3a3.25 3.25 0 0 0-4.6-4.6l-.9.9" />
			<path d="M11.5 8.5a3.25 3.25 0 0 0-4.6 0l-2.3 2.3a3.25 3.25 0 0 0 4.6 4.6l.9-.9" />
		</>
	),
	onpage: (
		<>
			<path d="M5.5 2.75h5.75L15 6.5V15.5a1.75 1.75 0 0 1-1.75 1.75h-7.75A1.75 1.75 0 0 1 3.75 15.5v-11A1.75 1.75 0 0 1 5.5 2.75Z" />
			<path d="M11 2.75V6.75h4M7 10.5h6M7 13.5h4" />
		</>
	),
	performance: (
		<>
			<path d="M3.25 14a6.75 6.75 0 1 1 13.5 0" />
			<path d="m10 14 3.25-4.25" />
			<circle cx="10" cy="14" r="0.6" fill="currentColor" />
		</>
	),
	usability: (
		<>
			<rect x="5.5" y="2.5" width="9" height="15" rx="2.25" />
			<path d="M9 14.75h2" />
		</>
	),
	security: (
		<>
			<path d="M10 2.75 16 5v4.5c0 3.75-2.6 6.75-6 7.75-3.4-1-6-4-6-7.75V5Z" />
			<path d="m7.5 10 1.75 1.75L12.75 8" />
		</>
	),
	social: (
		<>
			<circle cx="14.5" cy="5" r="2" />
			<circle cx="5.5" cy="10" r="2" />
			<circle cx="14.5" cy="15" r="2" />
			<path d="m7.25 9 5.5-3M7.25 11l5.5 3" />
		</>
	),
	ai: (
		<>
			<path d="M9 3.5c.55 3.25 1.9 4.6 5.15 5.15C10.9 9.2 9.55 10.55 9 13.8c-.55-3.25-1.9-4.6-5.15-5.15C7.1 8.1 8.45 6.75 9 3.5Z" />
			<path d="M15 12.5c.25 1.4.85 2 2.25 2.25-1.4.25-2 .85-2.25 2.25-.25-1.4-.85-2-2.25-2.25 1.4-.25 2-.85 2.25-2.25Z" />
		</>
	),
	image: (
		<>
			<rect x="3" y="4" width="14" height="12" rx="2" />
			<circle cx="12.75" cy="7.75" r="1.25" />
			<path d="m3.5 13.5 4-3.75 3.25 3 2-1.75 3.75 3" />
		</>
	),
	menu: <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />,
	bell: (
		<>
			<path d="M5.25 13.75V9.5a4.75 4.75 0 0 1 9.5 0v4.25l1.5 1.75H3.75Z" />
			<path d="M8.5 17.75h3" />
		</>
	),
	play: <path d="M7 5.25v9.5L14.75 10Z" />,
	pause: <path d="M7.5 5.5v9M12.5 5.5v9" strokeWidth={2} />,
	sparkline: <path d="M3 14.5 7 9.5l3 3 3-6 4 4.5" />,
	tools: (
		<>
			<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l1.3-1.3a4 4 0 0 0-5.3-5.3l-1.3 1.3a1 1 0 0 0 0 1.4l1.6 1.6z" />
			<path d="m14 7-9.5 9.5a1.5 1.5 0 0 1-2.1-2.1L11.9 4.9" />
			<path d="m3 14 3 3" />
		</>
	),
	sparkles: (
		<>
			<path d="M9.5 3 11 7l4 1.5-4 1.5L9.5 14 8 10 4 8.5 8 7z" />
			<path d="m14 13 .75 2 2 .75-2 .75-.75 2-.75-2-2-.75 2-.75z" />
		</>
	),
	copy: (
		<>
			<rect x="7" y="7" width="9.5" height="9.5" rx="1.5" />
			<path d="M4 12.5V4.5A1.5 1.5 0 0 1 5.5 3H12" />
		</>
	),
	robot: (
		<>
			<rect x="4" y="6" width="12" height="10" rx="2" />
			<circle cx="8" cy="11" r="1" fill="currentColor" />
			<circle cx="12" cy="11" r="1" fill="currentColor" />
			<path d="M10 2v4M2 11h2M16 11h2" />
		</>
	),
	fileText: (
		<>
			<path d="M12 3H5a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5V7z" />
			<path d="M12 3v4h4M7 10h6M7 13h4" />
		</>
	)
}

