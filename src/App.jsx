import { useState, useEffect } from 'react'
import { ThemeProvider } from './styles/ThemeContext'
import ThemeToggle from './components/ThemeToggle'
import ChartSection from './components/ChartSection'
import FredSearch from './components/FredSearch'

const chartSections = [
  { dataFile: 'data/wage-productivity.json', imageFile: 'images/01-pay-and-productivity.png', title: 'Wages vs. Productivity', source: 'BLS, FRED', fredIds: ['OPHNFB', 'COMPRNFB'], description: 'From 1948 to 1973, productivity and compensation grew in tandem. After 1973, productivity continued rising while real wages stagnated.' },
  { dataFile: 'data/real-wages.json', imageFile: 'images/02-wages.jpg', title: 'Real Wages', source: 'BLS, FRED', fredIds: ['COMPRNFB', 'RCPHBS', 'AHETPI', 'CEU0500000030'], description: 'Real hourly compensation adjusted for inflation, showing wage stagnation since the 1970s.' },
  { dataFile: 'data/median-household-income.json', imageFile: 'images/03-wages2arrow.jpg', title: 'Real Household Income by Percentile', source: 'FRED (World Bank; Census CE), BLS, BEA', fredIds: ['MEHOINUSA672N', 'CXUINCBEFTXLB0106M', 'CXUINCBEFTXLB0102M', 'A792RC0A052NBEA', 'CES0500000030'], description: 'Reconstruction of the CBPP chart "Income Gains Widely Shared in Early Postwar Decades - But Not Since Then" (Census CPS percentiles P20/P50/P95 of real family income, 1947-2016, 1973=100). FRED/BLS/BEA do not publish those exact CPS percentiles, so the closest available series are shown: median household income (FRED/World Bank, 1984-), Census CE-survey bottom/top-20% average incomes as percentile proxies (1984-), BEA personal income per capita (1947-), and BLS average weekly earnings (1964-, which peak in the early 1970s and stagnate). Nominal series are deflated with CPI-U; each series is indexed to 1973=100 when it has 1973 data, otherwise to its first year.' },
  { dataFile: 'data/household-income-real.json', imageFile: 'images/04-img0658-1.jpg', title: 'Household Income (Real)', source: 'World Bank, FRED', fredIds: ['MEHOINUSA672N'], description: 'Real median household income showing purchasing power over time.' },
  { dataFile: 'data/gdp-per-capita.json', imageFile: 'images/05-share-of-gross-domestic-income.png', title: 'Real GDP Per Capita', source: 'BEA, FRED', fredIds: ['A939RX0Q048SBEA'], description: 'Real GDP per capita measures average economic output per person, adjusted for inflation.' },
  { dataFile: 'data/labor-share-income.json', imageFile: 'images/06-img0727arrow.png', title: 'Labor Share of National Income', source: 'BEA, FRED', fredIds: ['CL30109093'], description: 'The share of national income going to workers as compensation vs. capital owners.' },
  { dataFile: 'data/top-income-share.json', imageFile: 'images/07-img0601arrow.jpg', title: 'Top Income Share', source: 'BLS, FRED', fredIds: ['EMPLRU'], description: 'Proxy for income concentration using total employment trends.' },
  { dataFile: 'data/gini-coefficient.json', imageFile: 'images/08-gini.png', title: 'Income Inequality (Gini Coefficient)', source: 'World Bank, FRED', fredIds: ['SIPOVGINIUSA'], description: 'The Gini coefficient measures income inequality on a scale from 0 (perfect equality) to 1 (perfect inequality).' },
  { dataFile: 'data/racial-inequality.json', imageFile: 'images/09-racial-inequality.png', title: 'Racial Income Gap', source: 'World Bank, FRED', fredIds: ['MEHOINUSAAA672N', 'MEHOINUSAAB672N'], description: 'Comparing real median income across racial groups.' },
  { dataFile: 'data/gender-pay-gap.json', imageFile: 'images/10-men-vs-women.jpg', title: 'Gender Earnings Gap', source: 'OECD, FRED', fredIds: ['LRAC43FEUSM088S', 'LRAC43MAUSM088S'], description: 'Comparing male and female earnings over time.' },
  { dataFile: 'data/female-labor-force.json', imageFile: 'images/11-dual-income-1.jpg', title: 'Female Labor Force Participation', source: 'BLS, FRED', fredIds: ['LNS11300002'], description: 'The rise and fall of female labor force participation, reflecting dual-income households.' },
  { dataFile: 'data/national-income-share.json', imageFile: 'images/12-national-income.png', title: 'National Income: Labor Compensation Share', source: 'BEA, FRED', fredIds: ['CL30109093'], description: 'Labor compensation as a share of GDP, showing the shift toward capital income.' },
  { dataFile: 'data/wealth-inequality.json', imageFile: 'images/13-ray-dalio-wealth-inequality.png', title: 'Wealth Inequality', source: 'BEA, FRED', fredIds: ['CP'], description: 'Corporate profits as a proxy for capital concentration and wealth inequality.' },
  { dataFile: 'data/food-inflation.json', imageFile: 'images/14-campbells-soup.png', title: 'Food Price Inflation', source: 'BLS, FRED', fredIds: ['CPIAUCSL'], description: 'The cumulative effect of inflation on everyday food prices.' },
  { dataFile: 'data/inflation.json', imageFile: 'images/15-cummulative-inflation.png', title: 'Consumer Price Index (Inflation)', source: 'BLS, FRED', fredIds: ['CPIAUCSL'], description: 'The CPI tracks the cumulative effect of inflation over decades.' },
  { dataFile: 'data/minimum-wage.json', imageFile: 'images/16-2j03rkcw.jpg', title: 'Real Minimum Wage', source: 'BLS, FRED', fredIds: ['LEU0255537500A'], description: 'Minimum wage workers as a share of employment. Data starts 2000.' },
  { dataFile: 'data/cpi-basket.json', imageFile: 'images/17-cpi-basket-1.png', title: 'CPI All Items', source: 'BLS, FRED', fredIds: ['CPIAUCSL'], description: 'The consumer price index for all urban consumers.' },
  { dataFile: 'data/housing-costs.json', imageFile: 'images/18-efkgav8wwaenvoc.png', title: 'Housing Costs', source: 'FHFA, FRED', fredIds: ['USSTHPI'], description: 'FHFA House Price Index tracking median home prices.' },
  { dataFile: 'data/student-loan-debt.json', imageFile: 'images/19-eyzm2fwsamocf9-1.png', title: 'Student Loan Debt', source: 'Federal Reserve, FRED', fredIds: ['HHSFCALTT027S'], description: 'Household sector credit as a proxy for rising student debt burden.' },
  { dataFile: 'data/housing-affordability.json', imageFile: 'images/20-home-prices-amsterdam.png', title: 'Housing Affordability', source: 'FHFA, FRED', fredIds: ['USSTHPI'], description: 'Home prices have risen far faster than incomes since the 1990s.' },
  { dataFile: 'data/house-price-income.json', imageFile: 'images/21-e8j1qysxsai4g5d.jpg', title: 'House Prices', source: 'FHFA, FRED', fredIds: ['USSTHPI'], description: 'FHFA house price index showing housing market trends.' },
  { dataFile: 'data/homeownership-rate.json', imageFile: 'images/22-unknownjpg.jpg', title: 'Homeownership Rate', source: 'Census, FRED', fredIds: ['RHORUSQ156N'], description: 'The proportion of households that are owner-occupied.' },
  { dataFile: 'data/us-gold-reserves.json', imageFile: 'images/23-usgoldreserves.png', title: 'US Gold Reserves', source: 'NBER, FRED', fredIds: ['M14062USM027NNBR'], description: 'Federal Reserve gold reserves. Data ends 1949.' },
  { dataFile: 'data/m2-money-supply.json', imageFile: 'images/24-do5g42luuae65cp1.jpg', title: 'M2 Money Supply', source: 'Federal Reserve, FRED', fredIds: ['M2SL'], description: 'M2 money supply tracking the expansion of the monetary base.' },
  { dataFile: 'data/fed-balance-sheet.json', imageFile: 'images/25-g4sdod-xeaeo24f.jpg', title: 'Federal Reserve Total Assets', source: 'Federal Reserve, FRED', fredIds: ['WALCL'], description: 'The Fed balance sheet expansion, especially post-2008 and 2020.' },
  { dataFile: 'data/education-spending.json', imageFile: 'images/26-books.jpg', title: 'Education Spending', source: 'BEA, FRED', fredIds: ['PCECC'], description: 'Personal consumption expenditures as a proxy for education spending trends.' },
  { dataFile: 'data/rd-spending.json', imageFile: 'images/27-peerreview.jpg', title: 'R&D Government Spending', source: 'Federal Reserve, FRED', fredIds: ['FSGDRES'], description: 'Federal R&D obligations over time.' },
  { dataFile: 'data/currency-stability.json', imageFile: 'images/28-currency-crashes.png', title: 'Currency Stability', source: 'Federal Reserve, FRED', fredIds: ['DTWEXBPA'], description: 'Trade-weighted dollar index tracking currency strength.' },
  { dataFile: 'data/m1-money-supply.json', imageFile: 'images/29-img1376.png', title: 'M1 Money Supply', source: 'Federal Reserve, FRED', fredIds: ['MSL'], description: 'M1 money supply tracking narrow money metrics.' },
  { dataFile: 'data/bretton-woods.json', imageFile: 'images/30-graspbrettonwoodstitledarrow-1.jpg', title: 'Bretton Woods System', source: 'NBER, FRED', fredIds: ['M14062USM027NNBR'], description: 'US gold reserves under the Bretton Woods system. Data ends 1949.' },
  { dataFile: 'data/federal-debt-public-gdp.json', imageFile: 'images/31-federdebtheldbypublic2021.jpg', title: 'Federal Debt Held by Public / GDP', source: 'Treasury, FRED', fredIds: ['FYPUGDA188S'], description: 'Federal debt held by the public as a percentage of GDP.' },
  { dataFile: 'data/federal-debt-public.json', imageFile: 'images/32-federaldebtpublic.jpg', title: 'Federal Debt Held by Public', source: 'Treasury, FRED', fredIds: ['FYGFDPUN'], description: 'Total federal debt held by the public.' },
  { dataFile: 'data/government-spending-gdp.json', imageFile: 'images/33-eifme9yu0ae8xnz.jpg', title: 'Government Spending', source: 'BEA, FRED', fredIds: ['M318191Q027NBEA'], description: 'Federal budget outlays over time.' },
  { dataFile: 'data/debt-per-capita.json', imageFile: 'images/34-roundcube.png', title: 'National Debt', source: 'Treasury, FRED', fredIds: ['GYGSFDQ189S'], description: 'Gross federal debt tracking national debt growth.' },
  { dataFile: 'data/federal-debt.json', imageFile: 'images/35-fed-deficit-vs-gdp.png', title: 'Federal Debt as % of GDP', source: 'Treasury, FRED', fredIds: ['GFDGDPA188S'], description: 'Federal debt as a share of GDP fell after WWII, then climbed steadily since the 1970s.' },
  { dataFile: 'data/federal-deficit.json', imageFile: 'images/36-federal-deficit.jpg', title: 'Federal Deficit', source: 'Treasury, FRED', fredIds: ['FYFSD'], description: 'Federal surplus or deficit in nominal dollars.' },
  { dataFile: 'data/federal-outlays.json', imageFile: 'images/37-outlays.jpg', title: 'Federal Outlays', source: 'BEA, FRED', fredIds: ['M318191Q027NBEA'], description: 'Federal government budget outlays.' },
  { dataFile: 'data/defense-spending.json', imageFile: 'images/38-israel.png', title: 'Defense Spending', source: 'Treasury, FRED', fredIds: ['FSDDEF'], description: 'Federal spending for defense over time.' },
  { dataFile: 'data/bank-assets.json', imageFile: 'images/39-bank-assets.jpg', title: 'Bank Assets', source: 'Federal Reserve, FRED', fredIds: ['BOGZ1BB027922405'], description: 'Total assets of all commercial banks.' },
  { dataFile: 'data/sp500-pe-ratio.json', imageFile: 'images/40-sp-500-pe-ratio.jpg', title: 'S&P 500 P/E Ratio', source: 'St. Louis Fed, FRED', fredIds: ['TBMEY'], description: 'Buffett indicator (market cap/GDP) as proxy for P/E ratio.' },
  { dataFile: 'data/shiller-cape.json', imageFile: 'images/41-pe-shiller.jpg', title: 'Cyclically Adjusted P/E Ratio', source: 'St. Louis Fed, FRED', fredIds: ['TBMEY'], description: 'Buffett indicator as proxy for Shiller CAPE.' },
  { dataFile: 'data/sp500-index.json', imageFile: 'images/42-sp-1.jpg', title: 'S&P 500 Index', source: 'S&P, FRED', fredIds: ['SP500'], description: 'S&P 500 index. FRED data starts 2016.' },
  { dataFile: 'data/corporate-investment.json', imageFile: 'images/43-speculationproduction-1.jpg', title: 'Corporate Investment', source: 'BEA, FRED', fredIds: ['CI'], description: 'Gross private domestic investment tracking real economy investment.' },
  { dataFile: 'data/corporate-profits.json', imageFile: 'images/44-e90vtjfwqacj6g3.jpg', title: 'Corporate Profits', source: 'BEA, FRED', fredIds: ['CP'], description: 'Corporate profits after tax showing the shift of income to capital.' },
  { dataFile: 'data/savings-rate.json', imageFile: 'images/45-savingsrate.jpg', title: 'Personal Savings Rate', source: 'BEA, FRED', fredIds: ['PSAVERT'], description: 'The personal savings rate peaked in the 1970s and has trended downward.' },
  { dataFile: 'data/private-savings-gdp.json', imageFile: 'images/46-savingsgdp.jpg', title: 'Private Savings', source: 'BEA, FRED', fredIds: ['PS'], description: 'Personal savings in nominal terms.' },
  { dataFile: 'data/household-debt-income.json', imageFile: 'images/47-7dc2e053-b6dc-471e-a41b-1aac52be41f5.jpg', title: 'Household Debt Service Ratio', source: 'Federal Reserve, FRED', fredIds: ['TDSP'], description: 'Debt service payments as percent of disposable income. Data starts 2005.' },
  { dataFile: 'data/trade-deficit.json', imageFile: 'images/48-tradebalance1.jpg', title: 'Trade Balance', source: 'BEA, FRED', fredIds: ['NETEXP'], description: 'The U.S. trade balance shifted from surplus to persistent deficit starting in the 1970s.' },
  { dataFile: 'data/consumer-credit.json', imageFile: 'images/49-ewuc3gru0auousejpeg-1.jpg', title: 'Consumer Credit', source: 'Federal Reserve, FRED', fredIds: ['HHSFCALTT027S'], description: 'Household sector credit tracking consumer debt growth.' },
  { dataFile: 'data/unemployment-rate.json', imageFile: 'images/50-edzn042uwaab9ss.jpg', title: 'Unemployment Rate', source: 'BLS, FRED', fredIds: ['UNRATE'], description: 'The unemployment rate tracking labor market health.' },
  { dataFile: 'data/10yr-treasury-yield.json', imageFile: 'images/51-10-year-bond-yield.jpg', title: '10-Year Treasury Yield', source: 'Federal Reserve, FRED', fredIds: ['GS10'], description: 'The 10-year Treasury yield as a benchmark interest rate.' },
  { dataFile: 'data/inflation-rate.json', imageFile: 'images/52-ehq1sryxkag5iif.jpg', title: 'Inflation Rate (CPI)', source: 'BLS, FRED', fredIds: ['CPIAUCSL'], description: 'Consumer price index tracking cumulative inflation.' },
  { dataFile: 'data/energy-consumption.json', imageFile: 'images/53-energy-per-capita.png', title: 'Energy Consumption', source: 'BEA, FRED', fredIds: ['USPCEPCGAS'], description: 'Per capita energy consumption tracking energy use.' },
  { dataFile: 'data/co2-emissions.json', imageFile: 'images/54-untitled-1jpg.jpg', title: 'CO2 Emissions', source: 'BEA, FRED', fredIds: ['USPCEPCGAS'], description: 'Energy consumption as a proxy for CO2 emissions trends.' },
  { dataFile: 'data/political-polarization.json', imageFile: 'images/55-ideological-positions.jpg', title: 'Political Polarization', source: 'Static image', fredIds: [], description: 'Growing political polarization in the United States. (No FRED data available.)' },
  { dataFile: 'data/lobbying-spending.json', imageFile: 'images/56-simpler-1.jpg', title: 'Lobbying Spending', source: 'Static image', fredIds: [], description: 'Rise in lobbying expenditures. (No FRED data available.)' },
  { dataFile: 'data/government-effectiveness.json', imageFile: 'images/57-political-problems.jpg', title: 'Government Effectiveness', source: 'Static image', fredIds: [], description: 'Government effectiveness and governance trends. (No FRED data available.)' },
  { dataFile: 'data/voter-turnout.json', imageFile: 'images/58-eyjmmocvaaic3yd.jpg', title: 'Voter Turnout', source: 'Static image', fredIds: [], description: 'Voter turnout in presidential elections. (No FRED data available.)' },
  { dataFile: 'data/senate-filibuster.json', imageFile: 'images/59-cloture.png', title: 'Senate Filibuster / Cloture', source: 'Static image', fredIds: [], description: 'Senate cloture votes and filibuster usage. (No FRED data available.)' },
  { dataFile: 'data/campaign-contributions.json', imageFile: 'images/60-dk8rnmg.png', title: 'Campaign Contributions', source: 'Static image', fredIds: [], description: 'Campaign contribution trends. (No FRED data available.)' },
  { dataFile: 'data/lobbyists.json', imageFile: 'images/61-ejquitsuyaauxis.png', title: 'Number of Lobbyists', source: 'Static image', fredIds: [], description: 'Growth in registered lobbyists. (No FRED data available.)' },
  { dataFile: 'data/incarceration-rate.json', imageFile: 'images/62-unknown-4.png', title: 'Incarceration Rate', source: 'Static image', fredIds: [], description: 'US incarceration rate trends. (No FRED data available.)' },
  { dataFile: 'data/violent-crime-rate.json', imageFile: 'images/63-fisl9jwxiamxbvh.jpg', title: 'Violent Crime Rate', source: 'Static image', fredIds: [], description: 'Violent crime rate trends. (No FRED data available.)' },
  { dataFile: 'data/robbery-rate.json', imageFile: 'images/64-robbery-rates.png', title: 'Robbery Rate', source: 'Static image', fredIds: [], description: 'Robbery rate per capita. (No FRED data available.)' },
  { dataFile: 'data/incarceration-rate-alt.json', imageFile: 'images/65-incarcerationrate.jpg', title: 'Incarceration Rate', source: 'Static image', fredIds: [], description: 'Incarceration rate per 100k population. (No FRED data available.)' },
  { dataFile: 'data/drug-overdose.json', imageFile: 'images/66-fv3zumgwyaajjil.jpg', title: 'Drug Overdose Deaths', source: 'Static image', fredIds: [], description: 'Drug overdose death trends. (No FRED data available.)' },
  { dataFile: 'data/life-expectancy.json', imageFile: 'images/67-eqmf1inxeaaocmj.jpg', title: 'Life Expectancy at Birth', source: 'World Bank, FRED', fredIds: ['SPDYNLE00INUSA'], description: 'Life expectancy at birth in the United States.' },
  { dataFile: 'data/healthcare-cost-per-capita.json', imageFile: 'images/68-gfwaunaw4aapfvw.jpg', title: 'Healthcare Cost Per Capita', source: 'BEA, FRED', fredIds: ['HLTHSCPCHCSA'], description: 'Health expenditures per capita. Data starts 2000.' },
  { dataFile: 'data/healthcare-spending-gdp.json', imageFile: 'images/69-eztlkdtxsaayeda-1.png', title: 'Healthcare Spending', source: 'BEA, FRED', fredIds: ['DHLCRC1Q027SBEA'], description: 'Health care personal consumption expenditures.' },
  { dataFile: 'data/obesity-rate.json', imageFile: 'images/70-img0977.jpg', title: 'Obesity Rate', source: 'Static image', fredIds: [], description: 'Adult obesity rate trends. (No FRED data available.)' },
  { dataFile: 'data/marriage-rate.json', imageFile: 'images/71-families.png', title: 'Marriage Rate', source: 'Census, FRED', fredIds: ['TTLHH'], description: 'Total households as a proxy for family formation trends.' },
  { dataFile: 'data/divorce-rate.json', imageFile: 'images/72-eaqhgk4x0aad-6hjpeg.jpg', title: 'Divorce Rate', source: 'Static image', fredIds: [], description: 'Divorce rate trends. (No FRED data available.)' },
  { dataFile: 'data/fertility-rate.json', imageFile: 'images/73-children-per-woman-1.jpg', title: 'Total Fertility Rate', source: 'World Bank, FRED', fredIds: ['SPDYNTFRTINUSA'], description: 'Total fertility rate tracking births per woman.' },
  { dataFile: 'data/child-poverty.json', imageFile: 'images/74-ey0djovuwaal2ri-1.jpg', title: 'Child Poverty Rate', source: 'Census, FRED', fredIds: ['PPAAUS00000A156NCEN'], description: 'Poverty rate for all ages as proxy for child poverty.' },
  { dataFile: 'data/health-coverage.json', imageFile: 'images/75-health-care-and-population.png', title: 'Health Coverage', source: 'BEA, FRED', fredIds: ['DHLCRC1Q027SBEA'], description: 'Health care PCE as a proxy for health coverage trends.' },
  { dataFile: 'data/dental-health.json', imageFile: 'images/76-eyyiyheucaug4wt.png', title: 'Dental / Oral Health', source: 'World Bank, FRED', fredIds: ['SPDYNLE00INUSA'], description: 'Life expectancy as a proxy for overall health outcomes.' },
  { dataFile: 'data/suicide-rate.json', imageFile: 'images/77-imagepng.png', title: 'Suicide Rate', source: 'Static image', fredIds: [], description: 'Suicide rate trends. (No FRED data available.)' },
  { dataFile: 'data/meat-consumption.json', imageFile: 'images/78-meat-consumption-copy.jpg', title: 'Meat Consumption', source: 'BEA, FRED', fredIds: ['PCECC'], description: 'Personal consumption expenditures as proxy for meat consumption.' },
  { dataFile: 'data/food-consumption.json', imageFile: 'images/79-imagepng-1.png', title: 'Food Consumption', source: 'BEA, FRED', fredIds: ['PCECC'], description: 'Personal consumption expenditures as proxy for food consumption.' },
  { dataFile: 'data/diet-nutrition.json', imageFile: 'images/80-diet.jpg', title: 'Diet and Nutrition', source: 'Static image', fredIds: [], description: 'Diet and nutrition trends. (No FRED data available.)' },
  { dataFile: 'data/processed-food.json', imageFile: 'images/81-image-2.png', title: 'Processed Food Consumption', source: 'Static image', fredIds: [], description: 'Processed food consumption trends. (No FRED data available.)' }
]

function Header({ onNavigate }) {
  const currentHash = window.location.hash || '#/'

  return (
    <header className="site-header">
      <h1 className="site-title">What Happened in 1971?</h1>
      <nav className="site-nav">
        <button
          className={`site-nav-btn ${currentHash !== '#/search' ? 'site-nav-btn-active' : ''}`}
          onClick={() => onNavigate('#/')}
        >
          Charts
        </button>
        <button
          className={`site-nav-btn ${currentHash === '#/search' ? 'site-nav-btn-active' : ''}`}
          onClick={() => onNavigate('#/search')}
        >
          Data Sources
        </button>
      </nav>
      <p className="site-subtitle">
        "I don't believe we shall ever have a good money again before we take the thing out of the hands of government, that is, we can't take it violently out of the hands of government, all we can do is by some sly roundabout way introduce something that they can't stop." – F.A. Hayek 1984
      </p>
      <p>
        This site is a tribute to wtfhappenedin1971.com. <br />
        <a href="https://wtfhappenedin1971.com/" target="_blank" rel="noopener noreferrer">
          Visit the original WTF Happened in 1971 website
        </a>
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
  const [view, setView] = useState(window.location.hash || '#/')

  useEffect(() => {
    const onHash = () => setView(window.location.hash || '#/')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (hash) => {
    window.location.hash = hash
    setView(hash)
  }

  return (
    <div className="app-container">
      <Header onNavigate={navigate} />
      <ThemeToggle />
      <main className="charts-main">
        {view === '#/search' ? (
          <FredSearch />
        ) : (
          chartSections.map((section, i) => (
            <ChartSection
              key={i}
              dataFile={section.dataFile}
              imageFile={section.imageFile}
              title={section.title}
              source={section.source}
              fredIds={section.fredIds || []}
              description={section.description || ''}
              chartNumber={i + 1}
            />
          ))
        )}
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
