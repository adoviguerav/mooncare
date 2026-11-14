// The datasets are from 2021 and 2022, so "today" is a fixed demo date, not the clock.
// Open the app with ?date=YYYY-MM-DD to look at another day.
const DEMO_DATE = '2021-11-02'

export const TODAY = new URLSearchParams(window.location.search).get('date') ?? DEMO_DATE

export const HISTORY_DAYS = 365
