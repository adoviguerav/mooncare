// The moon server of the crew app mini demo, inside the browser.
// The crew app (apps/mobile, built as it is) calls /api; this answers from the snapshot of real data
// (../demo/data/snapshot.js) instead of a server. Any 6-digit PIN signs in. Nothing leaves the browser,
// and what the visitor changes lasts only until the tab is closed (sessionStorage).
(function () {
  'use strict'

  var DATA = window.DEMO_DATA
  var STATE_KEY = 'mooncare-demo-api'
  var MOOD_PREFIX = 'mood_'
  var MOOD_DAY_COUNT_IDS = ['mood_sad_days_14', 'mood_tense_days_14']
  var CHECKIN_TASK = 'checkin'
  var XP_PER_LEVEL = 1000
  var SESSION_DAYS = 10

  function load() {
    try {
      return JSON.parse(sessionStorage.getItem(STATE_KEY)) || {}
    } catch (e) {
      return {}
    }
  }
  var state = load()
  state.checkins = state.checkins || {}
  state.ticks = state.ticks || {}
  state.drinks = state.drinks || {}
  state.breaths = state.breaths || {}
  function save() {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(state))
    } catch (e) {
      // private window: the demo still works until the page reloads
    }
  }

  function reply(status, body) {
    // A snapshot taken before the crew app demo existed has no users or checklists: say so, never answer empty
    if (status !== 204 && body === undefined) {
      status = 503
      body = { detail: 'The demo data is missing a part. Run tools/snapshot.py again.' }
    }
    var init = { status: status, headers: { 'Content-Type': 'application/json' } }
    return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), init))
  }
  var notFound = function () { return reply(404, { detail: 'Not in this demo' }) }

  function me() {
    if (state.userId == null) return null
    var user = DATA.users.users.filter(function (u) { return u.id === state.userId })[0]
    if (!user) return null
    return { id: user.id, display_name: user.display_name, role: user.role, crew_member_id: user.crew_member_id, node_role: 'moon' }
  }

  function isMood(id) {
    return id.indexOf(MOOD_PREFIX) === 0 && MOOD_DAY_COUNT_IDS.indexOf(id) < 0
  }

  // The panel of the snapshot, with the check-in of this visit on top
  function panel(crewId) {
    var snapshot = DATA.panels[crewId]
    if (!snapshot) return null
    var chosen = state.checkins[crewId]
    if (!chosen) return snapshot
    return {
      date: snapshot.date,
      indicators: snapshot.indicators.map(function (indicator) {
        if (!isMood(indicator.id)) return indicator
        var copy = Object.assign({}, indicator)
        copy.reading = { taken_at: DATA.today + 'T00:00', value: chosen.indexOf(indicator.id) >= 0 ? 1 : 0 }
        copy.due = false
        return copy
      }),
    }
  }

  function indicator(crewId, indicatorId, from, to) {
    var detail = DATA.details[crewId + '/' + indicatorId]
    if (!detail) return null
    var readings = detail.readings.filter(function (r) {
      var day = r.taken_at.slice(0, 10)
      return day >= from && day <= to
    })
    var chosen = state.checkins[crewId]
    if (chosen && isMood(indicatorId) && to >= DATA.today) {
      readings = readings.filter(function (r) { return r.taken_at.slice(0, 10) !== DATA.today })
      readings.push({ taken_at: DATA.today + 'T00:00', value: chosen.indexOf(indicatorId) >= 0 ? 1 : 0, broken_rule_id: null })
    }
    return { indicator: detail.indicator, rules: detail.rules, readings: readings }
  }

  // The checklist of the snapshot, with this visit's check-in and ticks, and the XP they add or take away
  function checklist(crewId) {
    var snapshot = DATA.checklists[crewId]
    if (!snapshot) return null
    var ticks = state.ticks[crewId] || {}
    var xp = snapshot.progress.xp
    var streak = snapshot.progress.streak
    var tasks = snapshot.tasks.map(function (task) {
      var done = task.done
      if (task.id === CHECKIN_TASK && state.checkins[crewId] && !task.done) {
        done = true
        streak += 1
      }
      if (task.completion === 'manual' && ticks[task.id] !== undefined) done = ticks[task.id]
      if (done !== task.done) xp += done ? task.xp : -task.xp
      return Object.assign({}, task, { done: done })
    })
    return {
      date: snapshot.date,
      tasks: tasks,
      progress: { xp: xp, level: Math.floor(xp / XP_PER_LEVEL) + 1, level_xp: xp % XP_PER_LEVEL, next_level_xp: XP_PER_LEVEL, streak: streak },
    }
  }

  // Hydration: the goal of the snapshot, with this visit's drinks
  function hydration(crewId) {
    var snapshot = DATA.hydration && DATA.hydration[crewId]
    if (!snapshot) return undefined
    var drinks = state.drinks[crewId] || []
    return {
      date: snapshot.date,
      goal: snapshot.goal,
      total_ml: snapshot.total_ml + drinks.reduce(function (sum, d) { return sum + d.ml }, 0),
      drinks: snapshot.drinks.concat(drinks),
      full_days_in_a_row: snapshot.full_days_in_a_row,
    }
  }

  function breathing(crewId) {
    var snapshot = DATA.breathing && DATA.breathing[crewId]
    if (!snapshot) return undefined
    return { date: snapshot.date, sessions: snapshot.sessions + (state.breaths[crewId] || 0) }
  }

  function route(method, path, query, body) {
    var parts = path.split('/').filter(Boolean)
    if (path === '/auth/users') return reply(200, DATA.users)
    if (path === '/auth/login' && method === 'POST') {
      var user = DATA.users.users.filter(function (u) { return u.id === body.user_id })[0]
      if (!user || !/^\d{6}$/.test(body.pin || '')) return reply(401, { detail: 'Wrong name or PIN' })
      state.userId = user.id
      save()
      return reply(200, { user: me(), expires_at: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString(), token: null })
    }
    if (path === '/auth/logout') {
      state.userId = null
      save()
      return reply(204)
    }
    var user = me()
    if (user === null) return reply(401, { detail: 'Not signed in' })
    if (path === '/auth/me') return reply(200, user)
    if (path === '/node') return reply(200, DATA.node)
    if (path === '/sync/history') return reply(200, [])
    if (path === '/sync') return reply(409, { detail: 'There is no link with Earth in this demo' })
    if (path === '/crew') return reply(200, { crew: DATA.crew })

    if (parts[0] !== 'crew') return notFound()
    var crewId = Number(parts[1])
    var crewWide = user.role === 'commander' || user.role === 'medical_officer'
    if (!crewWide && user.crew_member_id !== crewId) return reply(403, { detail: 'You can only see your own health data' })

    if (parts[2] === 'panel') return panel(crewId) ? reply(200, panel(crewId)) : notFound()
    if (parts[2] === 'indicators') {
      var detail = indicator(crewId, parts[3], query.get('from'), query.get('to'))
      return detail ? reply(200, detail) : notFound()
    }
    if (parts[2] === 'checkins' && method === 'PUT') {
      if (user.crew_member_id !== crewId) return reply(403, { detail: 'You can only check in for yourself' })
      state.checkins[crewId] = body.moods
      save()
      return reply(200, { date: parts[3], moods: body.moods })
    }
    if (parts[2] === 'hydration' && method === 'GET') return reply(200, hydration(crewId))
    if (parts[2] === 'hydration' && method === 'POST') {
      if (user.crew_member_id !== crewId) return reply(403, { detail: 'You can only check in for yourself' })
      var list = (state.drinks[crewId] = state.drinks[crewId] || [])
      if (parts[4] === 'undo') {
        if (!list.length) return reply(409, { detail: 'There is no drink to undo on this day' })
        list.pop()
      } else {
        if (!(body.ml > 0 && body.ml <= 1000)) return reply(422, { detail: 'A drink is between 1 ml and 1 litre' })
        list.push({ drunk_at: new Date().toISOString(), ml: body.ml })
      }
      save()
      return reply(200, hydration(crewId))
    }
    if (parts[2] === 'breathing' && method === 'GET') return reply(200, breathing(crewId))
    if (parts[2] === 'breathing' && method === 'POST') {
      if (user.crew_member_id !== crewId) return reply(403, { detail: 'You can only check in for yourself' })
      state.breaths[crewId] = (state.breaths[crewId] || 0) + 1
      save()
      return reply(200, breathing(crewId))
    }
    if (parts[2] === 'tasks' && parts.length === 4) return checklist(crewId) ? reply(200, checklist(crewId)) : notFound()
    if (parts[2] === 'tasks' && parts.length === 5 && method === 'PUT') {
      if (user.crew_member_id !== crewId) return reply(403, { detail: 'You can only tick your own tasks' })
      var task = DATA.checklists[crewId].tasks.filter(function (t) { return t.id === parts[4] })[0]
      if (!task) return notFound()
      if (task.completion !== 'manual') return reply(409, { detail: 'This task completes itself when its reading arrives' })
      state.ticks[crewId] = state.ticks[crewId] || {}
      state.ticks[crewId][task.id] = Boolean(body.done)
      save()
      return reply(200, checklist(crewId))
    }
    return notFound()
  }

  var realFetch = window.fetch.bind(window)
  window.fetch = function (input, init) {
    var url = new URL(typeof input === 'string' ? input : input.url, location.href)
    var apiAt = url.pathname.indexOf('/api/')
    if (url.origin !== location.origin || apiAt < 0) return realFetch(input, init)
    var method = ((init && init.method) || 'GET').toUpperCase()
    var body = init && init.body ? JSON.parse(init.body) : {}
    return route(method, url.pathname.slice(apiAt + 4), url.searchParams, body)
  }
})()
