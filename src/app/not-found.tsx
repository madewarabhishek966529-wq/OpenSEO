import Link from 'next/link'
import { EmptyState } from '@web/components/empty-state'

const NotFound = () => {
	return (
		<div className="not-found">
			<EmptyState icon="search" title="Nothing here">
				<p>This report or page doesn&apos;t exist, or it was deleted.</p>
				<p>
					<Link className="button button--primary" href="/">
						Run a new audit
					</Link>
				</p>
			</EmptyState>
		</div>
	)
}

export default NotFound
