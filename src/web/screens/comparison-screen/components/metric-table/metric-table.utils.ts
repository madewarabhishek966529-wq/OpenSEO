import { formatMetric, type MetricComparison } from '@shared/compare'

/** The difference in the metric's own unit: "+120 ms", "−410 KB", "±0". */
export function changeText(metric: MetricComparison): string {
	const diff = metric.b - metric.a
	if (!diff) return '±0'

	return `${diff > 0 ? '+' : '−'}${formatMetric(metric.unit, Math.abs(diff))}`
}
