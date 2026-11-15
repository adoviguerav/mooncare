// Moon Care mini demo: the screens of the real app (apps/web) with a snapshot of its data.
// No backend and no sign-in: it reads window.DEMO_DATA (data/snapshot.js) and saves nothing.
// It keeps the markup and class names of apps/web, so css/app.css draws it the same way.
(function () {
  'use strict'

  var DATA = window.DEMO_DATA
  var TODAY = DATA.today

  // --- From apps/web/src/lib/groups.ts ---
  var MOOD_PREFIX = 'mood_'
  var MOOD_DAY_COUNT_IDS = ['mood_sad_days_14', 'mood_tense_days_14']
  var MOOD_ORDER = ['mood_happy', 'mood_rested', 'mood_alert', 'mood_neutral', 'mood_tired', 'mood_tense', 'mood_sad']
  var NASA_ASTRONAUTS = 'NASA, Inspiration4 astronauts'
  var EARTH_WEARABLE = 'LifeSnaps, wearable on Earth'
  var GROUPS = [
    { title: 'Blood chemistry', icon: 'drop', origin: NASA_ASTRONAUTS, ids: ['glucose', 'sodium', 'potassium', 'chloride', 'creatinine', 'urea_nitrogen', 'egfr', 'albumin', 'calcium'] },
    { title: 'Blood cells', icon: 'flask', origin: NASA_ASTRONAUTS, ids: ['white_blood_cells', 'lymphocytes', 'hemoglobin'] },
    { title: 'Inflammation', icon: 'shield', origin: NASA_ASTRONAUTS, ids: ['il_6', 'tnf_alpha', 'il_1_beta', 'ifn_gamma', 'crp', 'fibrinogen'] },
    { title: 'Heart', icon: 'heart', origin: EARTH_WEARABLE, ids: ['heart_rate', 'resting_heart_rate', 'heart_rate_variability', 'vo2_max'] },
    { title: 'Breathing', icon: 'wind', origin: EARTH_WEARABLE, ids: ['spo2', 'breathing_rate'] },
    { title: 'Activity', icon: 'bolt', origin: EARTH_WEARABLE, ids: ['very_active_minutes', 'steps'] },
    { title: 'Sleep', icon: 'moon', origin: EARTH_WEARABLE, ids: ['sleep_duration', 'sleep_efficiency', 'sleep_awake_minutes'] },
    { title: 'Temperature', icon: 'temperature', origin: EARTH_WEARABLE, ids: ['skin_temperature'] },
    { title: 'Mind', icon: 'brain', origin: EARTH_WEARABLE, ids: ['stress_score', 'anxiety_score', 'positive_affect', 'negative_affect'] },
    { title: 'Ship', icon: 'radiation', origin: 'NASA RadLab, ISS detector', ids: ['radiation_dose_rate'] },
  ]
  var OTHER_GROUP = { title: 'Other', icon: 'chart', origin: '' }
  var DAILY_VITAL_IDS = ['resting_heart_rate', 'sleep_duration', 'spo2', 'skin_temperature', 'very_active_minutes', 'heart_rate_variability']
  var SPARKLINE_DAYS = 14
  var INDICATOR_ICONS = { vo2_max: 'bolt', heart_rate_variability: 'chart', spo2: 'drop', sleep_efficiency: 'ok', egfr: 'shield' }
  var ROUTINE_TASKS = [
    { title: 'Daily check-in', icon: 'smile', ids: MOOD_ORDER },
    { title: 'Blood chemistry test', icon: 'drop', ids: GROUPS[0].ids },
    { title: 'Blood count', icon: 'flask', ids: GROUPS[1].ids },
    { title: 'Inflammation markers', icon: 'shield', ids: GROUPS[2].ids },
  ]
  var ROLE_NAMES = { commander: 'Commander', medical_officer: 'Medical officer', crew_member: 'Crew member' }

  // --- From apps/web/src/components/Icon.tsx ---
  var ICONS = {
    alert: 'M12 4 2.8 19.5h18.4L12 4ZM12 10v4.2M12 17h.01',
    back: 'M15 5l-7 7 7 7',
    bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z',
    brain: 'M9 5a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5 3 3 0 0 0 4 3V5ZM15 5a3 3 0 0 1 3 3v1a3 3 0 0 1 1 5 3 3 0 0 1-4 3V5Z',
    chart: 'M4 18 9 12l4 3 7-9',
    database: 'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3ZM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3',
    drop: 'M12 3.5s6 6.3 6 10.5a6 6 0 0 1-12 0c0-4.2 6-10.5 6-10.5ZM9.5 14.5a2.5 2.5 0 0 0 2.5 2.5',
    flask: 'M9 3h6M10 3v6L5 18.5A1.8 1.8 0 0 0 6.6 21h10.8a1.8 1.8 0 0 0 1.6-2.5L14 9V3M7.5 15h9',
    heart: 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10ZM7 12h2.5l1.5-2.5 2 5 1.5-2.5H17',
    home: 'M4 11.5 12 4l8 7.5M6 10v10h4.5v-6h3v6H18V10',
    list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
    ok: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0ZM8 12.4l2.7 2.7L16 9.5',
    radiation: 'M10.3 12a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 0 0-3.4 0ZM12 12 8.2 5.4a8.8 8.8 0 0 1 7.6 0ZM12 12l7.6 0a8.8 8.8 0 0 1-3.8 6.6ZM12 12l-3.8 6.6a8.8 8.8 0 0 1-3.8-6.6Z',
    shield: 'M12 3 4.5 6v5.5c0 4.5 3.1 8 7.5 9.5 4.4-1.5 7.5-5 7.5-9.5V6L12 3ZM8.8 12l2.2 2.2 4.2-4.4',
    smile: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0ZM8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01',
    temperature: 'M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0ZM12 9v7',
    users: 'M5.8 9a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 0 0-6.4 0ZM3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M14.6 9.5a2.4 2.4 0 1 0 4.8 0 2.4 2.4 0 0 0-4.8 0ZM17 14c2.6 0 4.5 1.7 4.5 4.5',
    wind: 'M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3',
  }
  function icon(name, size) {
    size = size || 22
    return '<svg class="icon" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>'
  }

  // --- From apps/web/src/components/MoodFace.tsx ---
  var INK = '#2b1408'
  var EYES = '<circle cx="24" cy="29" r="2.6" fill="' + INK + '" stroke="none"/><circle cx="40" cy="29" r="2.6" fill="' + INK + '" stroke="none"/>'
  var BLUSH = '<circle cx="17" cy="37" r="4" fill="#ff5d73" opacity=".35" stroke="none"/><circle cx="47" cy="37" r="4" fill="#ff5d73" opacity=".35" stroke="none"/>'
  var WIDE_EYES = function (pupil) {
    return '<circle cx="24" cy="28" r="4.5" fill="#fff"/><circle cx="40" cy="28" r="4.5" fill="#fff"/><circle cx="24" cy="28" r="' + pupil + '" fill="' + INK + '" stroke="none"/><circle cx="40" cy="28" r="' + pupil + '" fill="' + INK + '" stroke="none"/>'
  }
  var FACES = {
    mood_happy: ['#ffe35c', '#f2b705', EYES + '<path d="M22 38q10 9 20 0"/>'],
    mood_rested: ['#ffc27a', '#f08a3c', '<path d="M19 29q5-6 10 0M35 29q5-6 10 0"/><path d="M25 40q7 5 14 0"/>' + BLUSH],
    mood_alert: ['#9fe9ff', '#1fa8d8', WIDE_EYES(1.8) + '<path d="M19 20q5-3 10-1M35 19q5-2 10 1"/><path d="M25 40q7 5 14 0"/>'],
    mood_neutral: ['#fff1a0', '#e9cf4a', EYES + '<path d="M26 41h12"/>'],
    mood_tired: ['#d9dde3', '#8a94a3', '<path d="M19 29h10M35 29h10"/><path d="M20 33q4 2 8 0M36 33q4 2 8 0" opacity=".45"/><ellipse cx="32" cy="43" rx="4" ry="3" fill="' + INK + '" stroke="none"/>'],
    mood_tense: ['#9ee89b', '#3fae5a', WIDE_EYES(1.6) + '<rect x="22" y="38" width="20" height="9" rx="3" fill="#fff"/><path d="M27 38v9M32 38v9M37 38v9"/>'],
    mood_sad: ['#8fd0f5', '#3b86c4', '<path d="M19 28l10-4M45 28l-10-4"/>' + EYES + '<path d="M25 44q7-6 14 0"/><path d="M44 34q3 4 0 6q-3-2 0-6" fill="#d6f0ff" stroke="none"/>'],
  }
  function moodFace(id, size) {
    var face = FACES[id]
    if (!face) return ''
    size = size || 44
    return '<svg class="mood-face" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" aria-hidden="true"><defs><radialGradient id="face-' + id + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + face[0] + '"/><stop offset="1" stop-color="' + face[1] + '"/></radialGradient></defs><circle cx="32" cy="32" r="29" fill="url(#face-' + id + ')"/><ellipse cx="24" cy="15" rx="13" ry="6" fill="#fff" opacity=".3"/><g fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + face[2] + '</g></svg>'
  }

  // --- From apps/web/src/lib/format.ts ---
  var DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  var VALUE_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })
  var SMALL_VALUE_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })
  var MS_PER_DAY = 86400000
  function valueParts(value, unit) {
    if (unit === 'min' && value >= 60) {
      var minutes = Math.round(value)
      return { amount: Math.floor(minutes / 60) + ' h ' + (minutes % 60) + ' min', unit: '' }
    }
    var format = Math.abs(value) < 10 ? SMALL_VALUE_FORMAT : VALUE_FORMAT
    return { amount: format.format(value), unit: unit || '' }
  }
  function formatValue(value, unit) {
    var parts = valueParts(value, unit)
    return parts.unit === '' ? parts.amount : parts.amount + ' ' + parts.unit
  }
  function formatTakenAt(takenAt) {
    var parts = takenAt.split('T')
    var day = DATE_FORMAT.format(new Date(parts[0] + 'T00:00'))
    return parts[1] === '00:00' ? day : day + ', ' + parts[1]
  }
  function addDays(date, days) {
    var shifted = new Date(date + 'T00:00Z')
    shifted.setUTCDate(shifted.getUTCDate() + days)
    return shifted.toISOString().slice(0, 10)
  }
  function daysSince(takenAt, today) {
    return Math.round((Date.parse(today + 'T00:00Z') - Date.parse(takenAt.slice(0, 10) + 'T00:00Z')) / MS_PER_DAY)
  }
  function formatAge(takenAt, today) {
    var days = daysSince(takenAt, today)
    if (days <= 0) return 'Today'
    return days === 1 ? 'Yesterday' : days + ' days ago'
  }
  function esc(text) {
    return String(text == null ? '' : text).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function groupOf(id) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].ids.indexOf(id) >= 0) return GROUPS[i]
    return OTHER_GROUP
  }
  function iconOf(id) {
    return INDICATOR_ICONS[id] || groupOf(id).icon
  }

  // --- The data: the snapshot, plus the check-ins of this visit, which live only in memory ---
  var visitCheckins = {}
  function detailOf(crewId, indicatorId) {
    return DATA.details[crewId + '/' + indicatorId] || null
  }
  function readingsBetween(crewId, indicatorId, from) {
    var detail = detailOf(crewId, indicatorId)
    if (!detail) return []
    return detail.readings.filter(function (r) { return r.taken_at.slice(0, 10) >= from })
  }
  function panelOf(crewId) {
    var panel = DATA.panels[crewId]
    var chosen = visitCheckins[crewId]
    if (!chosen) return panel.indicators
    return panel.indicators.map(function (ind) {
      if (ind.id.indexOf(MOOD_PREFIX) !== 0 || MOOD_DAY_COUNT_IDS.indexOf(ind.id) >= 0) return ind
      var copy = Object.assign({}, ind)
      copy.reading = { taken_at: TODAY + 'T00:00', value: chosen.indexOf(ind.id) >= 0 ? 1 : 0 }
      copy.due = false
      return copy
    })
  }

  // --- State and rendering ---
  var app = document.getElementById('app')
  var state = { crew: null, tab: 'today', indicator: null, editingCheckin: false, chosen: [], days: null }

  var chartWidth = 0

  function render() {
    if (state.crew === null) app.innerHTML = picker()
    else if (state.indicator === null) app.innerHTML = panel()
    else app.innerHTML = indicatorScreen()
    fitChart()
  }

  // The chart keeps the size of its text on a phone and on a tablet: drawn again at the real width of its box
  function fitChart() {
    var box = app.querySelector('.chart-box')
    if (!box) return
    var width = Math.round(box.clientWidth)
    if (width > 0 && width !== chartWidth) {
      chartWidth = width
      render()
    }
  }
  addEventListener('resize', function () { if (state.indicator !== null) fitChart() })

  function picker() {
    return '<main class="screen picker">' + document.getElementById('logo').innerHTML +
      '<p class="picker-tagline">A daily health panel for life beyond Earth</p>' +
      '<section class="card picker-card"><div class="card-heading"><span class="icon-badge">' + icon('users') + '</span><div><h1>Who is checking in?</h1><p class="muted">Choose a profile to open their health panel. No PIN in this demo.</p></div></div>' +
      '<div class="profiles">' + DATA.crew.map(function (m, i) {
        var initials = m.name.split(' ').map(function (w) { return w[0] }).join('')
        return '<button class="profile" style="animation-delay:' + i * 60 + 'ms" data-crew="' + m.id + '"><span class="avatar" aria-hidden="true">' + esc(initials) + '</span><span class="profile-text"><strong>' + esc(m.name) + '</strong><span class="muted">' + ROLE_NAMES[m.role] + '</span></span></button>'
      }).join('') + '</div></section></main>'
  }

  function panel() {
    var crew = state.crew
    var indicators = panelOf(crew.id)
    var isCount = function (i) { return MOOD_DAY_COUNT_IDS.indexOf(i.id) >= 0 }
    var isMood = function (i) { return i.id.indexOf(MOOD_PREFIX) === 0 && !isCount(i) }
    var moods = indicators.filter(isMood).sort(function (a, b) { return MOOD_ORDER.indexOf(a.id) - MOOD_ORDER.indexOf(b.id) })
    var counts = indicators.filter(isCount)
    var measurements = indicators.filter(function (i) { return !isMood(i) && !isCount(i) })
    var alerts = indicators.filter(function (i) { return i.broken_rule !== null })

    var body = ''
    if (state.tab === 'today') body = todayTab(crew, indicators, moods, counts, measurements, alerts.filter(function (a) { return !isCount(a) }))
    if (state.tab === 'data') body = dataTab(measurements)
    if (state.tab === 'alerts') body = alertsTab(alerts)

    var tabs = [['today', 'Today', 'home'], ['data', 'Data', 'database'], ['alerts', 'Alerts', 'alert']]
    return '<main class="screen with-tabs"><header class="screen-header"><div><h1>' + esc(crew.name) + '</h1><p class="muted">' + formatTakenAt(TODAY + 'T00:00') + '</p></div><button class="ghost" data-action="switch">Switch profile</button></header>' + body + '</main>' +
      '<nav class="tabs" aria-label="Sections of the panel">' + tabs.map(function (t) {
        var count = t[0] === 'alerts' && alerts.length > 0 ? '<span class="tab-count" aria-label="' + alerts.length + ' alerts">' + alerts.length + '</span>' : ''
        return '<button data-tab="' + t[0] + '"' + (state.tab === t[0] ? ' aria-current="page"' : '') + '>' + icon(t[2]) + '<span>' + t[1] + '</span>' + count + '</button>'
      }).join('') + '</nav>'
  }

  function todayTab(crew, indicators, moods, counts, measurements, alerts) {
    var todayMoods = moods.filter(function (m) { return m.reading && m.reading.taken_at.indexOf(TODAY) === 0 })
    var chosenToday = todayMoods.filter(function (m) { return m.reading.value === 1 })
    var checkedIn = todayMoods.length > 0
    var html = '<section class="card"><div class="card-heading"><span class="icon-badge">' + icon('smile') + '</span><h2>How are you today?</h2>' + streak(crew.id, checkedIn) + '</div>'
    if (!checkedIn || state.editingCheckin) {
      html += '<div class="checkin"><p class="muted">Choose every mood that fits. In this demo it is kept only until you close the page.</p><div class="moods" role="group" aria-label="Your mood today">' +
        moods.map(function (m) {
          return '<button class="mood" data-mood="' + m.id + '" aria-pressed="' + (state.chosen.indexOf(m.id) >= 0) + '">' + moodFace(m.id) + '<span>' + esc(m.name) + '</span></button>'
        }).join('') + '</div><button class="primary" data-action="save-checkin">Save check-in</button></div>'
    } else {
      html += '<div class="checkin-done"><div class="checkin-answer">' + (chosenToday.length === 0 ? '<span>No mood chosen</span>' : chosenToday.map(function (m) {
        return '<span class="checkin-mood">' + moodFace(m.id, 36) + esc(m.name) + '</span>'
      }).join('')) + '</div><button class="ghost" data-action="edit-checkin">Change</button></div>'
    }
    counts.filter(function (c) { return c.broken_rule !== null }).forEach(function (c) {
      html += '<button class="mood-alert" data-indicator="' + c.id + '"><strong>' + esc(c.broken_rule.title) + '</strong><span>' + esc(c.broken_rule.explanation) + '</span><span><strong>What to do:</strong> ' + esc(c.broken_rule.action) + '</span></button>'
    })
    html += '</section>'

    if (alerts.length === 0) {
      html += '<section class="card status status-ok">' + icon('ok', 28) + '<div><h2>All measurements in range</h2><p class="muted">Nothing needs your attention today.</p></div></section>'
    } else {
      html += '<button class="card status status-alert" data-tab="alerts">' + icon('alert', 28) + '<span><strong>' + alerts.length + ' ' + (alerts.length === 1 ? 'value needs' : 'values need') + ' attention</strong><span class="muted">' + esc(alerts.map(function (a) { return a.name }).join(', ')) + '</span></span><span class="status-link">See what to do</span></button>'
    }

    html += routines(indicators)

    var vitals = DAILY_VITAL_IDS.map(function (id) { return measurements.filter(function (i) { return i.id === id })[0] }).filter(Boolean)
    html += '<section><h2 class="section-title">Your vitals</h2><div class="tiles tiles-vitals">' + vitals.map(function (i) {
      var values = readingsBetween(crew.id, i.id, addDays(TODAY, -SPARKLINE_DAYS)).map(function (r) { return r.value })
      return tile(i, sparkline(values))
    }).join('') + '</div></section>'
    return html
  }

  function streak(crewId, checkedInToday) {
    var days = {}
    readingsBetween(crewId, 'mood_neutral', addDays(TODAY, -120)).forEach(function (r) { days[r.taken_at.slice(0, 10)] = true })
    if (checkedInToday) days[TODAY] = true
    var day = checkedInToday ? TODAY : addDays(TODAY, -1)
    var count = 0
    while (days[day]) { count++; day = addDays(day, -1) }
    return count === 0 ? '' : '<span class="streak">' + count + '-day streak</span>'
  }

  function routines(indicators) {
    var tasks = ROUTINE_TASKS.map(function (task) {
      var measured = indicators.filter(function (i) { return task.ids.indexOf(i.id) >= 0 })
      var cadence = measured[0] && measured[0].cadence_days
      if (!cadence) return null
      var due = measured.some(function (i) { return i.due })
      var last = measured.filter(function (i) { return i.reading }).map(function (i) { return i.reading.taken_at }).sort().pop()
      var every = cadence === 1 ? 'Every day' : 'Every ' + cadence + ' days'
      var detail = last === undefined ? every + '. Never done' : every + '. Last: ' + formatAge(last, TODAY).toLowerCase()
      var left = last === undefined ? 0 : cadence - daysSince(last, TODAY)
      var status = 'Due today'
      if (!due) status = last && last.indexOf(TODAY) === 0 ? 'Done today' : 'In ' + left + ' ' + (left === 1 ? 'day' : 'days')
      return { title: task.title, icon: task.icon, due: due, detail: detail, status: status }
    }).filter(Boolean)
    var silent = indicators.filter(function (i) { return i.measured_by === 'sensor' && i.due })
    var dueCount = tasks.filter(function (t) { return t.due }).length
    return '<section class="card"><div class="card-heading"><span class="icon-badge">' + icon('list') + '</span><div><h2>Your routines</h2><p class="origin">A task is done when its reading arrives.</p></div>' +
      (dueCount === 0 ? '<span class="chip chip-ok">Up to date</span>' : '<span class="chip chip-due">' + dueCount + ' due today</span>') + '</div><ul class="routines">' +
      tasks.map(function (t) {
        return '<li class="' + (t.due ? 'routine routine-due' : 'routine') + '"><span class="routine-icon">' + icon(t.due ? t.icon : 'ok', 18) + '</span><span class="routine-text"><strong>' + t.title + '</strong><span class="muted">' + t.detail + '</span></span><span class="' + (t.due ? 'chip chip-due' : 'chip chip-quiet') + '">' + t.status + '</span></li>'
      }).join('') + '</ul>' +
      (silent.length > 0 ? '<p class="routine-warning">' + icon('alert', 18) + 'No new data from a sensor: ' + esc(silent.map(function (i) { return i.name }).join(', ')) + '.</p>' : '') + '</section>'
  }

  function sparkline(values) {
    if (values.length < 2) return ''
    var W = 120, H = 32, P = 3
    var low = Math.min.apply(null, values), span = Math.max.apply(null, values) - low || 1
    var points = values.map(function (v, i) {
      return (P + (i / (values.length - 1)) * (W - 2 * P)).toFixed(1) + ',' + (H - P - ((v - low) / span) * (H - 2 * P)).toFixed(1)
    })
    return '<svg class="sparkline" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><polyline pathLength="1" points="' + points.join(' ') + '"/></svg>'
  }

  function tile(indicator, extra) {
    var r = indicator.reading, broken = indicator.broken_rule
    var html = '<button class="' + (broken === null ? 'tile' : 'tile tile-alert') + '" data-indicator="' + indicator.id + '"><span class="tile-head"><span class="tile-icon">' + icon(iconOf(indicator.id), 16) + '</span><span class="tile-name">' + esc(indicator.name) + '</span>' + (broken !== null ? '<span class="chip chip-alert">Out of range</span>' : '') + '</span>'
    if (r === null) html += '<span class="muted">No reading yet</span>'
    else {
      var v = valueParts(r.value, indicator.unit)
      html += '<span class="tile-value">' + v.amount + (v.unit !== '' ? '<span class="tile-unit"> ' + esc(v.unit) + '</span>' : '') + '</span><span class="tile-age">Measured ' + formatAge(r.taken_at, TODAY).toLowerCase() + '</span>'
    }
    return html + (extra || '') + '</button>'
  }

  function dataTab(measurements) {
    var grouped = []
    GROUPS.forEach(function (g) { grouped = grouped.concat(g.ids) })
    var groups = GROUPS.map(function (g) {
      return { title: g.title, icon: g.icon, origin: g.origin, indicators: g.ids.map(function (id) { return measurements.filter(function (i) { return i.id === id })[0] }).filter(Boolean) }
    })
    groups.push({ title: OTHER_GROUP.title, icon: OTHER_GROUP.icon, origin: '', indicators: measurements.filter(function (i) { return grouped.indexOf(i.id) < 0 }) })
    return groups.filter(function (g) { return g.indicators.length > 0 }).map(function (g) {
      var alertCount = g.indicators.filter(function (i) { return i.broken_rule !== null }).length
      var status = alertCount === 0 ? '<span class="chip chip-quiet">' + g.indicators.length + ' ' + (g.indicators.length === 1 ? 'value' : 'values') + '</span>' : '<span class="chip chip-alert">' + alertCount + ' out of range</span>'
      return '<details class="card group"' + (alertCount > 0 ? ' open' : '') + '><summary class="card-heading"><span class="icon-badge">' + icon(g.icon) + '</span><span><h2>' + g.title + '</h2>' + (g.origin ? '<span class="origin">' + g.origin + '</span>' : '') + '</span>' + status + '<span class="group-chevron">' + icon('back', 18) + '</span></summary><div class="tiles">' + g.indicators.map(function (i) { return tile(i) }).join('') + '</div></details>'
    }).join('')
  }

  function alertsTab(alerts) {
    if (alerts.length === 0) return '<section class="card status status-ok">' + icon('ok', 28) + '<div><h2>No alerts today</h2><p class="muted">Every value with a limit is inside it.</p></div></section>'
    return alerts.map(function (i) {
      return '<button class="card alert-card" data-indicator="' + i.id + '"><span class="card-heading"><span class="icon-badge icon-badge-alert">' + icon(iconOf(i.id)) + '</span><span><strong class="alert-title">' + esc(i.broken_rule.title) + '</strong><span class="muted">' + esc(i.name) + (i.reading ? ', ' + formatAge(i.reading.taken_at, TODAY).toLowerCase() : '') + '</span></span>' +
        (i.reading ? '<span class="alert-value">' + formatValue(i.reading.value, i.unit) + '</span>' : '') + '</span><span class="alert-text">' + esc(i.broken_rule.explanation) + '</span><span class="alert-action"><strong>What to do</strong>' + esc(i.broken_rule.action) + '</span></button>'
    }).join('')
  }

  // --- Indicator screen, from apps/web/src/features/indicator/IndicatorScreen.tsx (without Learn more) ---
  var RANGES = [['24 h', 1], ['7 d', 7], ['30 d', 30], ['90 d', 90], ['1 y', 365]]

  function indicatorScreen() {
    var crew = state.crew, id = state.indicator
    var detail = detailOf(crew.id, id)
    var head = '<header class="detail-header"><button class="back" data-action="back" aria-label="Back to the panel">' + icon('back') + '</button><div><p class="eyebrow">' + groupOf(id).title + '</p><h1>' + esc(detail ? detail.indicator.name : id) + '</h1></div></header>'
    if (!detail) return '<main class="screen detail">' + head + '<p class="muted">No data for this indicator in the demo.</p></main>'

    var unit = detail.indicator.unit, rules = detail.rules
    var all = detail.readings
    var latest = all[all.length - 1], previous = all[all.length - 2]
    var readingsOf = function (days) {
      if (!latest) return []
      var from = Date.parse(latest.taken_at + 'Z') - days * MS_PER_DAY
      return all.filter(function (r) { return Date.parse(r.taken_at + 'Z') >= from })
    }
    var useful = RANGES.filter(function (r) { return readingsOf(r[1]).length >= 2 })
    var start = (useful.filter(function (r) { return readingsOf(r[1]).length >= 5 })[0] || [null, 365])[1]
    var days = state.days || start
    var readings = readingsOf(days)
    var broken = latest ? rules.filter(function (r) { return r.id === latest.broken_rule_id })[0] : undefined
    var fixed = rules.filter(function (r) { return r.baseline_direction === null })[0]
    var status = getStatus(latest, rules)

    var html = '<main class="screen detail">' + head + '<section class="card reading-card"><p class="eyebrow">Your latest reading</p>'
    if (!latest) html += '<p class="muted">No readings yet.</p>'
    else {
      html += '<div class="reading-top"><p class="' + (latest.broken_rule_id === null ? 'detail-value' : 'detail-value is-alert') + '">' + formatValue(latest.value, unit) + '</p><span class="chip chip-' + status.tone + '">' + status.label + '</span></div><p class="muted">Measured ' + formatAge(latest.taken_at, TODAY).toLowerCase() + ', ' + formatTakenAt(latest.taken_at) + '</p>'
      if (fixed) html += rangeBar(fixed, latest.value, unit)
    }
    html += '</section><section class="card explain"><div><h2>What it is</h2><p>' + esc(detail.indicator.why_it_matters) + '</p></div><div><h2>What is normal</h2><p>' + esc(describeNormal(rules, unit)) + '</p></div>' +
      (latest ? '<div><h2>What your reading means</h2><p>' + esc(describeReading(latest, previous, rules, unit)) + '</p></div>' : '') +
      '<div' + (broken ? ' class="explain-action"' : '') + '><h2>What to do</h2><p>' + esc(describeAction(broken, rules)) + '</p></div></section>'

    html += '<section class="card"><div class="card-heading"><h2>How it has changed</h2><div class="ranges" role="group" aria-label="Time shown in the chart">' + useful.map(function (r) {
      return '<button data-days="' + r[1] + '" aria-pressed="' + (r[1] === days) + '">' + r[0] + '</button>'
    }).join('') + '</div></div>' + (readings.length === 0 ? '<p class="muted">No readings in this time.</p>' : chart(detail.indicator.name, unit, readings, rules))
    var out = readings.filter(function (r) { return r.broken_rule_id !== null })
    if (out.length > 0) html += '<h3>Out of range</h3><ul class="out-of-range">' + out.map(function (r) { return '<li><span>' + formatTakenAt(r.taken_at) + '</span><strong>' + formatValue(r.value, unit) + '</strong></li>' }).join('') + '</ul>'
    html += '</section><section class="card explain"><div><h2>How it is measured</h2><p>' + esc(detail.indicator.how_to_measure) + '</p></div></section>'

    var src = detail.indicator.source
    html += '<details class="card group"><summary class="card-heading"><h2>Where the numbers come from</h2><span class="group-chevron">' + icon('back', 18) + '</span></summary><div class="rule"><p>The readings on this screen are real, open data that stands in for this crew member. They come from: <strong>' + esc(src.name) + '</strong>.</p><p class="muted">' + esc(src.citation) + '</p><a class="source-link" href="' + esc(src.url) + '" target="_blank" rel="noreferrer">' + esc(src.url) + '</a></div>' +
      rules.map(function (r) { return '<div class="rule"><strong>Alert: ' + esc(r.title) + '</strong><p>It comes when the value is ' + esc(describeLimits(r, unit)) + '.</p><p class="muted">Where the limit comes from: ' + esc(r.threshold_source) + '</p></div>' }).join('') +
      (rules.length === 0 ? '<p class="muted">This indicator has no alert rule yet.</p>' : '') + '</details></main>'
    return html
  }

  function getStatus(latest, rules) {
    if (latest && latest.broken_rule_id != null) {
      var rule = rules.filter(function (r) { return r.id === latest.broken_rule_id })[0]
      return { label: rule && rule.baseline_direction === null ? 'Out of the normal range' : 'Far from your usual', tone: 'alert' }
    }
    if (rules.some(function (r) { return r.baseline_direction === null })) return { label: 'In the normal range', tone: 'ok' }
    if (rules.length > 0) return { label: 'Near your usual', tone: 'ok' }
    return { label: 'No range to compare', tone: 'due' }
  }
  function normalRange(rule, unit) {
    if (rule.low !== null && rule.high !== null) return formatValue(rule.low, null) + ' to ' + formatValue(rule.high, unit)
    return rule.low !== null ? formatValue(rule.low, unit) + ' or more' : formatValue(rule.high || 0, unit) + ' or less'
  }
  function describeNormal(rules, unit) {
    var fixed = rules.filter(function (r) { return r.baseline_direction === null })[0]
    if (fixed) return 'A normal value is ' + normalRange(fixed, unit) + '.'
    if (rules.length > 0) return 'There is no fixed number for everyone. Your reading is compared with your own usual value of the last 4 weeks.'
    return 'There is no agreed normal range for this. What matters is how it changes over time for you.'
  }
  function describeAction(broken, rules) {
    if (broken) return broken.action
    if (rules.length === 0) return 'Nothing. Keep measuring it and watch how it changes.'
    return 'Nothing for now. If it leaves the normal range: ' + rules[0].action
  }
  function describeReading(latest, previous, rules, unit) {
    var broken = rules.filter(function (r) { return r.id === latest.broken_rule_id })[0]
    var fixed = rules.filter(function (r) { return r.baseline_direction === null })[0]
    var s = []
    if (broken) s.push(broken.explanation)
    else if (fixed) s.push('It is inside the normal range.')
    else if (rules.length > 0) s.push('No alert: it is not far from your own usual value.')
    else s.push('It has no normal range to compare with. Look at how it moves in the chart below.')
    if (previous) {
      var d = daysSince(previous.taken_at, latest.taken_at.slice(0, 10))
      var when = d === 0 ? 'earlier the same day' : d === 1 ? 'the day before' : d + ' days before'
      s.push('The reading ' + when + ' was ' + formatValue(previous.value, unit) + '.')
    }
    return s.join(' ')
  }
  function describeLimits(rule, unit) {
    if (rule.baseline_direction !== null) return 'well ' + rule.baseline_direction + ' your own usual value'
    var l = []
    if (rule.low !== null) l.push('below ' + formatValue(rule.low, unit))
    if (rule.high !== null) l.push('above ' + formatValue(rule.high, unit))
    return l.join(' or ')
  }
  function rangeBar(rule, value, unit) {
    var limit = rule.low !== null ? rule.low : rule.high
    if (limit === null) return ''
    var span = rule.low !== null && rule.high !== null ? rule.high - rule.low : Math.abs(limit) * 0.5
    var nLow = rule.low !== null ? rule.low : limit - span
    var nHigh = rule.high !== null ? rule.high : limit + span
    var start = Math.min(nLow - span * 0.4, value), end = Math.max(nHigh + span * 0.4, value)
    var pct = function (a) { return ((a - start) / (end - start)) * 100 }
    var b0 = rule.low === null ? 0 : pct(rule.low), b1 = rule.high === null ? 100 : pct(rule.high)
    return '<div class="range-bar" role="img" aria-label="Your reading against the normal range, ' + esc(normalRange(rule, unit)) + '"><div class="range-track"><span class="range-band" style="left:' + b0 + '%;width:' + (b1 - b0) + '%"></span><span class="range-marker" style="left:' + pct(value) + '%"></span></div><div class="range-labels">' +
      (rule.low !== null ? '<span style="left:' + b0 + '%">' + formatValue(rule.low, null) + '</span>' : '') + (rule.high !== null ? '<span style="left:' + b1 + '%">' + formatValue(rule.high, null) + '</span>' : '') +
      '</div><p class="muted">The green band is the normal range. The marker is your reading.</p></div>'
  }

  // --- History chart, from apps/web/src/features/indicator/HistoryChart.tsx ---
  var HOUR_FORMAT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  var DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  var DAY_YEAR_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' })
  var TICK_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

  function chart(name, unit, readings, rules) {
    var H = 280, M = { top: 28, right: 24, bottom: 34, left: 52 }
    // Drawn at the width of its box, measured after the first render (see fitChart)
    var width = chartWidth || 640
    var times = readings.map(function (r) { return Date.parse(r.taken_at + 'Z') })
    var fixedRules = rules.filter(function (r) { return r.baseline_direction === null })
    var limits = []
    fixedRules.forEach(function (r) { if (r.low !== null) limits.push(r.low); if (r.high !== null) limits.push(r.high) })
    var values = readings.map(function (r) { return r.value }).concat(limits)
    var t0 = Math.min.apply(null, times), tSpan = Math.max.apply(null, times) - t0 || 1
    var low = Math.min.apply(null, values), vSpan = Math.max.apply(null, values) - low || Math.abs(low) || 1
    var bottom = low - vSpan * 0.1, top = low + vSpan * 1.1
    var pw = Math.max(width - M.left - M.right, 1), ph = H - M.top - M.bottom
    var x = function (t) { return M.left + ((t - t0) / tSpan) * pw }
    var y = function (v) { return M.top + ph - ((v - bottom) / (top - bottom)) * ph }

    var svg = '<svg class="chart" width="' + width + '" height="' + H + '" role="img" aria-label="' + esc(name) + ' history: ' + readings.length + ' readings"><text class="chart-label chart-unit" x="' + M.left + '" y="14" text-anchor="end">' + esc(unit || '') + '</text>'
    var rough = (top - bottom) / 6, mag = Math.pow(10, Math.floor(Math.log10(rough)))
    var step = [1, 2, 5, 10].map(function (f) { return f * mag }).filter(function (c) { return c >= rough })[0] || mag
    for (var v = Math.ceil(bottom / step) * step; v <= top; v += step) {
      v = Number(v.toPrecision(12))
      svg += '<line class="chart-grid" x1="' + M.left + '" x2="' + (width - M.right) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="chart-label" x="' + (M.left - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + TICK_FORMAT.format(v) + '</text>'
    }
    fixedRules.forEach(function (r) {
      var yt = r.high === null ? M.top : y(r.high), yb = r.low === null ? M.top + ph : y(r.low)
      svg += '<rect class="chart-band" x="' + M.left + '" y="' + yt + '" width="' + pw + '" height="' + (yb - yt) + '"/>'
    })
    limits.forEach(function (l) {
      svg += '<line class="chart-limit" x1="' + M.left + '" x2="' + (width - M.right) + '" y1="' + y(l) + '" y2="' + y(l) + '"/><text class="chart-label chart-limit-label" x="' + (width - M.right - 4) + '" y="' + (y(l) - 5) + '" text-anchor="end">limit ' + TICK_FORMAT.format(l) + '</text>'
    })
    var unitMs = tSpan <= 2 * MS_PER_DAY ? 3600000 : MS_PER_DAY
    var tStep = Math.max(1, Math.ceil(tSpan / Math.max(2, Math.floor(pw / 110)) / unitMs)) * unitMs
    var fmt = tSpan <= 2 * MS_PER_DAY ? HOUR_FORMAT : tSpan <= 120 * MS_PER_DAY ? DAY_FORMAT : DAY_YEAR_FORMAT
    for (var t = Math.ceil(t0 / tStep) * tStep; t <= t0 + tSpan; t += tStep) {
      svg += '<text class="chart-label" x="' + x(t) + '" y="' + (H - 10) + '" text-anchor="middle">' + fmt.format(t) + '</text>'
    }
    svg += '<polyline class="chart-line" pathLength="1" points="' + readings.map(function (r, i) { return x(times[i]) + ',' + y(r.value) }).join(' ') + '"/>'
    var everyDot = readings.length <= 40
    readings.forEach(function (r, i) {
      if (!everyDot && r.broken_rule_id === null) return
      svg += '<circle class="' + (r.broken_rule_id === null ? 'chart-dot' : 'chart-dot chart-dot-alert') + '" cx="' + x(times[i]) + '" cy="' + y(r.value) + '" r="' + (r.broken_rule_id === null ? 3.5 : 5.5) + '"><title>' + formatTakenAt(r.taken_at) + ': ' + formatValue(r.value, unit) + '</title></circle>'
    })
    return '<div class="chart-box">' + svg + '</svg></div>'
  }

  // --- Taps ---
  app.addEventListener('click', function (event) {
    var el = event.target.closest('button, a')
    if (!el || el.tagName === 'A') return
    var d = el.dataset
    if (d.crew) {
      state.crew = DATA.crew.filter(function (m) { return String(m.id) === d.crew })[0]
      state.tab = 'today'; state.editingCheckin = false; state.chosen = visitCheckins[state.crew.id] || []
    } else if (d.tab) {
      state.tab = d.tab
    } else if (d.indicator) {
      state.indicator = d.indicator; state.days = null
    } else if (d.days) {
      state.days = Number(d.days)
    } else if (d.mood) {
      var i = state.chosen.indexOf(d.mood)
      if (i >= 0) state.chosen.splice(i, 1); else state.chosen.push(d.mood)
      el.setAttribute('aria-pressed', String(i < 0))
      return
    } else if (d.action === 'save-checkin') {
      visitCheckins[state.crew.id] = state.chosen.slice(); state.editingCheckin = false
    } else if (d.action === 'edit-checkin') {
      state.editingCheckin = true
    } else if (d.action === 'back') {
      state.indicator = null
    } else if (d.action === 'switch') {
      state.crew = null
    } else return
    render()
    window.scrollTo(0, 0)
  })

  render()
})()
