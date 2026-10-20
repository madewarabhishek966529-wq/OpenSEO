const STOPWORDS = new Set(
	// English
	(
		"a about above after again against all also am an and any are aren't as at be because been before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further get got had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself just let's like make me more most mustn't my myself new no nor not now of off on once one only or other ought our ours ourselves out over own per same see shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too two under until up us use used using very via was wasn't way we we'd we'll we're we've well were weren't what what's when when's where where's which while who who's whom why why's will with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves " +
		'get started learn read click here menu home skip content cookie cookies privacy policy terms rights reserved copyright sign log login www com http https amp nbsp ' +
		// Spanish / Portuguese / French / German / Italian (most common)
		'el la los las un una unos unas de del al y o en que por para con sin es son se su sus lo le les como más pero muy ya este esta estos estas eso ' +
		'o os as um uma uns umas do da dos das no na nos nas em por para com sem é são se seu sua seus suas ao aos à às mais mas muito já este esta isso ' +
		'le la les un une des du de et ou en que qui pour par avec sans est sont se son sa ses ce cette ces au aux plus mais très dans sur pas vous nous ' +
		'der die das ein eine einer eines und oder in im mit von zu zum zur für auf ist sind sich sein seine nicht auch als an am bei es ich sie wir ihr den dem des ' +
		'il lo gli i un uno una di da in con su per tra fra e o che è sono si non come più ma anche nel nella dei delle'
	).split(/\s+/)
)

/** Lowercase words, keeping letters and digits in any language. */
export function tokenize(text: string): string[] {
	return (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).map((t) =>
		t.replace(/[’']s$/, '').replace(/['’-]+$/, '')
	)
}

function isKeyword(t: string) {
	return t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t)
}

export interface KeywordStat {
	term: string
	count: number
}

/** The most frequent words and two-word phrases, without stopwords. */
export function topKeywords(
	text: string,
	limit = 10
): { single: KeywordStat[]; phrases: KeywordStat[] } {
	const tokens = tokenize(text)
	const single = new Map<string, number>()
	const phrases = new Map<string, number>()

	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i]
		if (isKeyword(t)) single.set(t, (single.get(t) || 0) + 1)
		const next = tokens[i + 1]
		if (next && isKeyword(t) && isKeyword(next) && t !== next) {
			const p = `${t} ${next}`
			phrases.set(p, (phrases.get(p) || 0) + 1)
		}
	}
	const sort = (m: Map<string, number>, min: number) =>
		[...m.entries()]
			.filter(([, c]) => c >= min)
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.slice(0, limit)
			.map(([term, count]) => ({ term, count }))

	return { single: sort(single, 2), phrases: sort(phrases, 2) }
}

/** Whether a word or phrase appears in some text, matching whole words. */
export function containsTerm(haystack: string, term: string): boolean {
	if (!haystack) return false
	const tokens = tokenize(haystack).join(' ')

	return (' ' + tokens + ' ').includes(' ' + term + ' ')
}
