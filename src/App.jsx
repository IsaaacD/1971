import { useState } from 'react'
import { ThemeProvider } from './styles/ThemeContext'
import ThemeToggle from './components/ThemeToggle'
import ChartSection from './components/ChartSection'

const chartSections = [
  {
    dataFile: 'data/wage-productivity.json',
    title: 'Wages vs. Productivity',
    source: 'BLS, FRED',
    fredIds: ['OPHNFB', 'COMPRNFB'],
    description: 'From 1948 to 1973, productivity and compensation grew in tandem. After 1973, productivity continued rising while real wages stagnated, creating a widening gap. This chart shows the divergence that defined late-20th century inequality.'
  },
  {
    dataFile: 'data/gdp-per-capita.json',
    title: 'Real GDP Per Capita',
    source: 'FRED (BEA)',
    fredIds: ['A939RX0Q048SBEA'],
    description: 'Real GDP per capita measures average economic output per person, adjusted for inflation. The steady climb reflects long-term growth, but the rate of growth slowed noticeably after the early 1970s.'
  },
  {
    dataFile: 'data/federal-debt.json',
    title: 'Federal Debt as % of GDP',
    source: 'FRED',
    fredIds: ['GFDGDPA188S'],
    description: 'Federal debt as a share of GDP fell dramatically after WWII, reaching a low near 30% in the early 1970s. Since then, debt has climbed steadily, accelerating sharply after 2008 and again in 2020.'
  },
  {
    dataFile: 'data/inflation.json',
    title: 'Consumer Price Index (Inflation)',
    source: 'BLS, FRED',
    fredIds: ['CPIAUCSL'],
    description: 'The CPI tracks the cost of a representative basket of goods and services. The index shows the cumulative effect of inflation over decades, with particularly sharp rises in the 1970s energy crises and 2021-2022 pandemic period.'
  },
  {
    dataFile: 'data/gini-coefficient.json',
    title: 'Income Inequality (Gini Coefficient)',
    source: 'Census Bureau, FRED',
    fredIds: ['SIPOVGINIUSA'],
    description: 'The Gini coefficient measures income inequality on a scale from 0 (perfect equality) to 1 (perfect inequality). The U.S. Gini was relatively stable until the mid-1970s, then began a steady climb that continues today.'
  },
  {
    dataFile: 'data/corporate-tax.json',
    title: 'Top Marginal Tax Rates',
    source: 'Tax Foundation, FRED',
    fredIds: ['IITTRHB'],
    description: 'The top marginal income tax rate fell from over 90% in the 1950s to 70% by 1964, then dropped sharply in the 1980s and again after 2017. The highest bracket rate has not exceeded 70% since 1980.'
  },
  {
    dataFile: 'data/savings-rate.json',
    title: 'Personal Savings Rate',
    source: 'BEA, FRED',
    fredIds: ['PSAVERT'],
    description: 'The personal savings rate peaked in the 1970s and has trended downward since, falling below 3% in the mid-2000s. The spike in 2020 reflects pandemic-era lockdowns and stimulus checks.'
  },
  {
    dataFile: 'data/stock-market.json',
    title: 'Stock Market (S&P 500) vs. Wages',
    source: 'FRED, BLS',
    fredIds: ['SP500', 'AHETPI'],
    description: 'This chart compares stock market performance to wage growth. The S&P 500 data on FRED begins in 2016, limiting historical comparison. Both series are indexed to their first available data point.'
  },
  {
    dataFile: 'data/trade-deficit.json',
    title: 'Trade Balance',
    source: 'BEA, FRED',
    fredIds: ['NETEXP'],
    description: 'The U.S. trade balance shifted from surplus to persistent deficit starting in the 1970s. Net exports have been negative for most years since 1975, reflecting growing import dependence.'
  },
  {
    dataFile: 'data/housing-affordability.json',
    title: 'Housing Affordability',
    source: 'FRED, Census',
    fredIds: ['USSTHPI'],
    description: 'The FHFA House Price Index tracks median home prices. The index begins in 1975, so the 1971 baseline is extrapolated. Home prices have risen far faster than incomes since the 1990s.'
  }
]

function Header() {
  return (
    <header className="site-header">
      <h1 className="site-title">What Happened in 1971?</h1>
      <p className="site-subtitle">
        “I don’t believe we shall ever have a good money again before we take the thing out of the hands of government, that is, we can’t take it violently out of the hands of government, all we can do is by some sly roundabout way introduce something that they can’t stop.” – F.A. Hayek 1984      </p>
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
            description={section.description || ''}
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
