import { memo } from 'react'
import { CategoryTile } from '@web/components/category-tile'
import { GradeRing } from '@web/components/grade-ring'
import { Icon } from '@web/components/icon'
import { ScoreBar } from '@web/components/score-bar'
import { goodPreviews } from '@web/components/share-previews'
import type { ReportSidebarProps } from './report-sidebar.types'

/** The report's table of contents: the overall grade, then each category with its score. */
const ReportSidebar = (props: ReportSidebarProps) => {
	const { report } = props

	return (
		<aside className="report-sidebar">
			<a className="report-sidebar-overall" href="#overview">
				<GradeRing score={report.score} grade={report.grade} size="sm" />
				<span>
					<strong>Overall</strong>
					<span className="muted mono">{report.score}/100</span>
				</span>
			</a>
			<span className="sidebar-group-title">Categories</span>
			<nav className="report-sidebar-nav" aria-label="Report sections">
				{report.categories.map((category) => (
					<a
						key={category.id}
						className="report-sidebar-item"
						href={`#cat-${category.id}`}
					>
						<CategoryTile category={category.id} size={26} />
						<span className="report-sidebar-text">
							<span className="report-sidebar-name">{category.name}</span>
							<ScoreBar score={category.score} />
						</span>
						<span className="report-sidebar-grade mono">{category.grade}</span>
					</a>
				))}
			</nav>
			{report.sharing && (
				<>
					<span className="sidebar-group-title">Sharing</span>
					<a className="report-sidebar-item" href="#sharing">
						<span className="report-sidebar-icon" aria-hidden="true">
							<Icon name="image" size={15} />
						</span>
						<span className="report-sidebar-text">
							<span className="report-sidebar-name">Share previews</span>
						</span>
						<span
							className="report-sidebar-grade mono"
							title="Platforms where the link looks good"
						>
							{goodPreviews(report.sharing.previews)}/{report.sharing.previews.length}
						</span>
					</a>
				</>
			)}
		</aside>
	)
}

export default memo(ReportSidebar)
