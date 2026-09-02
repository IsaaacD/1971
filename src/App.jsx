import { useState } from 'react'
import { ThemeProvider } from './styles/ThemeContext'
import ThemeToggle from './components/ThemeToggle'
import ChartSection from './components/ChartSection'

const chartSections = [
  {
    dataFile: '/data/wage-productivity.json',
    title: 'Wages vs. Productivity',
    source: 'BLS, FRED',
    fredIds: ['OPHNFB', 'COMPRNFB']
  },
  {
    dataFile: '/data/gdp-per-capita.json',
    title: 'Real GDP Per Capita',
    source: 'FRED (BEA)',
    fredIds: ['A939RX0Q048SBEA']
  },
  {
    dataFile: '/data/federal-debt.json',
    title: 'Federal Debt as % of GDP',
    source: 'FRED',
    fredIds: ['GFDGDPA188S']
  },
  {
    dataFile: '/data/inflation.json',
    title: 'Consumer Price Index (Inflation)',
    source: 'BLS, FRED',
    fredIds: ['CPIAUCSL']
  },
  {
    dataFile: '/data/gini-coefficient.json',
    title: 'Income Inequality (Gini Coefficient)',
    source: 'Census Bureau, FRED',
    fredIds: ['SIPOVGINIUSA']
  },
  {
    dataFile: '/data/corporate-tax.json',
    title: 'Top Marginal Tax Rates',
    source: 'Tax Foundation, FRED',
    fredIds: ['IITTRHB']
  },
  {
    dataFile: '/data/savings-rate.json',
    title: 'Personal Savings Rate',
    source: 'BEA, FRED',
    fredIds: ['PSAVERT']
  },
  {
    dataFile: '/data/stock-market.json',
    title: 'Stock Market (S&P 500) vs. Wages',
    source: 'FRED, BLS',
    fredIds: ['SP500', 'AHETPI']
  },
  {
    dataFile: '/data/trade-deficit.json',
    title: 'Trade Balance',
    source: 'BEA, FRED',
    fredIds: ['NETEXP']
  },
  {
    dataFile: '/data/housing-affordability.json',
    title: 'Housing Affordability',
    source: 'FRED, Census',
    fredIds: ['USSTHPI']
  }
]

function Header() {
  return (
    <header className="site-header">
      <h1 className="site-title">What Happened in 1971?</h1>
      <p className="site-subtitle">
        An interactive look at the economic divergence that shaped the modern era.
      </p>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <p>Data sourced from FRED, BLS, BEA, Census Bureau, and World Bank.</p>
      <p>All charts are interactive: hover for details, scroll to zoom, click legend to toggle series.</p>
    </footer>
  )
}

function AppContent() {
  return (
    <div className="app-container">
      <Header />
      <ThemeToggle />
      <main className="charts-main">
        {chartSections.map((section, i) => (
          <ChartSection
            key={i}
            dataFile={section.dataFile}
            title={section.title}
            source={section.source}
            fredIds={section.fredIds || []}
          />
        ))}
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
