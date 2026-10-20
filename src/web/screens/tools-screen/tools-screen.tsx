'use client'

import { memo, useState } from 'react'
import { PageHeader } from '@web/components/page-header'
import { Icon } from '@web/components/icon'
import type { ToolTab } from './tools-screen.types'
import { SerpSimulator } from './components/serp-simulator/serp-simulator'
import { RobotsTester } from './components/robots-tester/robots-tester'
import { SchemaGenerator } from './components/schema-generator/schema-generator'
import { HeaderInspector } from './components/header-inspector/header-inspector'

export const ToolsScreen = memo(() => {
	const [activeTab, setActiveTab] = useState<ToolTab>('serp')

	return (
		<div className="screen">
			<PageHeader
				title="SEO Utilities"
				description="Interactive tools for SERP snippet simulation, robots.txt testing, structured data generation, and HTTP inspection."
			/>

			<div className="tools-nav">
				<button
					type="button"
					className={`tools-tab-btn ${activeTab === 'serp' ? 'is-active' : ''}`}
					onClick={() => setActiveTab('serp')}
				>
					<Icon name="search" size={15} />
					<span>SERP Simulator</span>
				</button>
				<button
					type="button"
					className={`tools-tab-btn ${activeTab === 'robots' ? 'is-active' : ''}`}
					onClick={() => setActiveTab('robots')}
				>
					<Icon name="robot" size={15} />
					<span>Robots.txt Tester</span>
				</button>
				<button
					type="button"
					className={`tools-tab-btn ${activeTab === 'schema' ? 'is-active' : ''}`}
					onClick={() => setActiveTab('schema')}
				>
					<Icon name="code" size={15} />
					<span>Schema Generator</span>
				</button>
				<button
					type="button"
					className={`tools-tab-btn ${activeTab === 'inspect' ? 'is-active' : ''}`}
					onClick={() => setActiveTab('inspect')}
				>
					<Icon name="security" size={15} />
					<span>HTTP & Security Inspector</span>
				</button>
			</div>

			<div className="tool-card">
				{activeTab === 'serp' && <SerpSimulator />}
				{activeTab === 'robots' && <RobotsTester />}
				{activeTab === 'schema' && <SchemaGenerator />}
				{activeTab === 'inspect' && <HeaderInspector />}
			</div>
		</div>
	)
})

ToolsScreen.displayName = 'ToolsScreen'
