/**
 * Scheduled data refresh jobs.
 * Will run periodic tasks: market data refresh, K-line cache warming, etc.
 */

export function startRefreshJobs() {
  console.log('[Jobs] Data refresh scheduler started')

  // Refresh market data every 5 minutes during trading hours
  setInterval(async () => {
    try {
      console.log('[Jobs] Refreshing market data...')
      // TODO: Phase 3 - Fetch real data from EastMoney/Tushare
    } catch (err) {
      console.error('[Jobs] Refresh failed:', err)
    }
  }, 5 * 60 * 1000)

  console.log('[Jobs] Initial jobs registered')
}

export function stopRefreshJobs() {
  console.log('[Jobs] Scheduler stopped')
}
