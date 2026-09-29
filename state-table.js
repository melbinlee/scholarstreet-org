/* ── State status table ───────────────────────────────────────────
   Renders every state in window.SS_STATES, alphabetically.
   The chips filter by status (one at a time; "All" clears it) and the
   search box narrows by name or postal code. The feed shows the newest
   updates among the rows currently showing. */
(function(){
  var states = window.SS_STATES;
  var body = document.getElementById('sl-body');
  var chips = document.getElementById('sl-chips');
  var search = document.getElementById('sl-search');
  var none = document.getElementById('sl-none');
  var feed = document.getElementById('sl-feed');
  if(!states || !body || !chips || !search || !none || !feed) return;

  var STATUSES = [
    ['opted-in', 'Opted In'],
    ['pending-warm', 'Pending — Warm'],
    ['pending-cold', 'Pending — Cold'],
    ['not-participating', 'Not Participating']
  ];
  var LABELS = {};
  STATUSES.forEach(function(s){ LABELS[s[0]] = s[1]; });
  var MONTHS = ['January','February','March','April','May','June','July',
    'August','September','October','November','December'];
  var FEED_MAX = 4;
  var filter = 'all';
  var withProgram = false; // only states running their own tax-credit scholarship
  var isolated = null;     // postal code of the one state shown, if any

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function niceDate(iso){
    var p = iso.split('-');
    return MONTHS[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0];
  }
  function statusOf(s){ return s.status || 'unverified'; }

  var sorted = states.slice().sort(function(a, b){ return a.name.localeCompare(b.name); });

  /* Postal code, then names starting with the query, then any word in the
     name starting with it. Each tier only applies when the one before it
     found nothing, so "virginia" is Virginia alone (not West Virginia),
     "va" is Virginia, and "carolina" still finds both Carolinas. */
  function matchesQuery(list, q){
    if(!q) return list;
    var code = list.filter(function(s){ return s.code.toLowerCase() === q; });
    if(code.length) return code;
    var starts = list.filter(function(s){ return s.name.toLowerCase().indexOf(q) === 0; });
    if(starts.length) return starts;
    return list.filter(function(s){
      return s.name.toLowerCase().split(' ').some(function(w){ return w.indexOf(q) === 0; });
    });
  }

  var NA = '<span class="sl-na">&mdash;</span>';
  function cell(label, content, cls){
    return '<td data-label="' + label + '"' + (cls ? ' class="' + cls + '"' : '') + '>' +
      '<span>' + content + '</span></td>';
  }
  // by: the date is the earliest one on record, so the event may be older.
  function dateCell(iso, by){
    return iso ? (by ? 'By ' : '') + '<time datetime="' + iso + '">' + niceDate(iso) + '</time>' : NA;
  }
  // A governor's name, linked to their official office website when we have one.
  var GOV_LINKS = window.SS_GOVERNOR_LINKS || {};
  function governor(name){
    var url = GOV_LINKS[name];
    return url
      ? '<a class="sl-gov" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(name) + '</a>'
      : esc(name);
  }
  // There's no opt-in governor column, so when someone other than the
  // current governor opted the state in, say so under the name.
  function govNote(s){
    if(s.optInVia) return '<small>Legislature opted in over a veto</small>';
    if(s.optInGovernor && s.optInGovernor !== s.currentGovernor)
      return '<small>Opted in under Gov. ' + esc(s.optInGovernor) + '</small>';
    return '';
  }
  function row(s){
    var st = statusOf(s);
    var badge = '<span class="sl-badge ' + st + '">' +
      (s.status ? LABELS[s.status] : 'Not yet verified') + '</span>';
    // No published opt-in date: it happened no later than the IRS listing.
    var optIn = s.optInDate ? dateCell(s.optInDate)
      : (s.status === 'opted-in' && s.irsListed ? dateCell(s.irsListed, true) : NA);
    // Program pages on other sites open in a new tab; our own (Virginia's
    // va-eistc.html) opens in place, a click from donating.
    var creditName = esc(s.credit ? s.credit.name : '');
    if(s.credit && s.credit.url){
      var external = /^https?:/.test(s.credit.url);
      creditName = '<a href="' + esc(s.credit.url) + '"' +
        (external ? ' target="_blank" rel="noopener"' : '') + '>' + creditName + '</a>';
    }
    var credit = s.credit
      ? '<strong>' + creditName + '</strong><small>' + esc(s.credit.detail) + '</small>'
      : NA;
    return '<tr>' +
      cell('State', '<button type="button" class="sl-pick" data-code="' + s.code + '" aria-pressed="' +
        (isolated === s.code) + '" title="Show only ' + esc(s.name) + '">' + esc(s.name) + '</button>', 'sl-state') +
      cell('&#167;25F status', badge) +
      cell('Opted in', optIn) +
      cell('Current governor', s.currentGovernor ? governor(s.currentGovernor) + govNote(s) : NA) +
      cell('On IRS list', dateCell(s.irsListed, s.irsListedBy)) +
      cell('State tax credit', credit) +
      '</tr>';
  }

  function hasProgram(s){ return !!s.credit; }

  // Status counts follow the program toggle, so each chip says how many
  // rows clicking it would show.
  function drawChips(){
    var base = withProgram ? states.filter(hasProgram) : states;
    var counts = {};
    base.forEach(function(s){ counts[statusOf(s)] = (counts[statusOf(s)] || 0) + 1; });
    chips.innerHTML =
      '<button type="button" class="sl-chip" data-f="all" aria-pressed="' + (filter === 'all') + '">' +
        'All states <span class="n">' + base.length + '</span></button>' +
      STATUSES.map(function(s){
        return '<button type="button" class="sl-chip ' + s[0] + '" data-f="' + s[0] + '" aria-pressed="' +
          (filter === s[0]) + '"><i></i>' + s[1] + ' <span class="n">' + (counts[s[0]] || 0) + '</span></button>';
      }).join('') +
      '<span class="sl-chip-sep" aria-hidden="true"></span>' +
      '<button type="button" class="sl-chip sl-toggle" data-toggle="program" aria-pressed="' + withProgram + '"' +
        ' title="States that also run their own tax-credit scholarship program">' +
        '<span class="sl-check" aria-hidden="true"></span>Has state program <span class="n">' +
        states.filter(hasProgram).length + '</span></button>';
  }

  function draw(){
    var q = search.value.trim().toLowerCase();
    var shown = matchesQuery(sorted.filter(function(s){
      return (filter === 'all' || s.status === filter) && (!withProgram || hasProgram(s));
    }), q);
    body.innerHTML = shown.map(row).join('');
    if(shown.length){
      none.hidden = true;
    } else {
      var scope = (filter !== 'all' ? LABELS[filter] : '') +
        (withProgram ? (filter !== 'all' ? ' with a state program' : 'with a state program') : '');
      none.hidden = false;
      none.textContent = q
        ? 'No state matches “' + search.value.trim() + '”' + (scope ? ' under ' + scope + '.' : '.')
        : 'No states are ' + scope + '.';
    }
    var updates = [];
    shown.forEach(function(s){
      s.updates.forEach(function(u){ updates.push({ state: s.name, date: u.date, text: u.text, url: u.url }); });
    });
    updates.sort(function(a, b){ return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    feed.innerHTML = updates.length
      ? updates.slice(0, FEED_MAX).map(function(u){
          // Outside sources open in a new tab so the table stays put.
          var text = u.url
            ? '<a href="' + esc(u.url) + '" target="_blank" rel="noopener">' + esc(u.text) + '</a>'
            : esc(u.text);
          return '<li><b>' + esc(u.state) + '</b><time datetime="' + u.date + '">' + niceDate(u.date) +
            '</time>' + text + '</li>';
        }).join('')
      : '<li>No updates for the states shown.</li>';
  }

  /* ── Isolating one state ──
     Clicking a state name shows only that row. It works through the search
     box (the postal code always matches exactly one state), so every other
     path -- the feed, the empty message -- behaves as for a search. The
     address becomes #states-va, a link that opens straight to that row.
     Filters are cleared on isolate so the row is always there, and any
     filter click or typed search ends the isolation. */
  var clearBtn = document.getElementById('sl-clear');
  var section = document.getElementById('states');
  var HASH = /^#states-([a-z]{2})$/i;

  /* ── Analytics ──
     GA4 events for how visitors use the table, so an ad that lands here can
     be judged by engagement, not just arrival. Mark state_select as a key
     event in GA4 if it should count toward Ads optimization.
       state_select  a state isolated: state_code, source (click | link)
       state_filter  a chip: filter (status or has_program), active (on/off)
       state_search  a typed search once the visitor pauses: search_term,
                     results (rows shown)
     Clicks through to program, governor and source sites are already
     counted by GA4's outbound-click measurement. */
  function track(name, params){
    if(typeof gtag === 'function') gtag('event', name, params);
  }
  var searchTimer = null, lastSearchSent = '';
  function trackSearchSoon(){
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function(){
      var term = search.value.trim();
      if(!term || term === lastSearchSent || isolated) return;
      lastSearchSent = term;
      track('state_search', { search_term: term.slice(0, 100), results: body.rows.length });
    }, 1200);
  }

  function setHash(code){
    var url = window.location.pathname + window.location.search + (code ? '#states-' + code.toLowerCase() : '');
    try { history.replaceState(null, '', url); } catch(e) {}
  }
  function isolate(code, scroll){
    var s = states.filter(function(x){ return x.code === code; })[0];
    if(!s) return;
    isolated = code;
    filter = 'all';
    withProgram = false;
    search.value = code;
    clearBtn.hidden = false;
    setHash(code);
    drawChips();
    draw();
    if(scroll) scrollToSection();
  }
  // A shared link isolates the state while the page is still loading; a
  // scroll then gets undone by the browser's own load-time positioning,
  // so wait for load. "instant" overrides the page's smooth scrolling,
  // which would otherwise animate down the whole page.
  function scrollToSection(){
    function go(){
      var nav = document.getElementById('mainNav');
      var top = section.getBoundingClientRect().top + window.pageYOffset - (nav ? nav.offsetHeight : 0);
      window.scrollTo({ top: top, behavior: 'instant' });
    }
    if(document.readyState === 'complete') go();
    else window.addEventListener('load', function(){ setTimeout(go, 0); }, { once: true });
  }
  function release(){
    if(!isolated) return;
    isolated = null;
    search.value = '';
    clearBtn.hidden = true;
    setHash(null);
    draw();
  }

  body.addEventListener('click', function(e){
    var b = e.target.closest('.sl-pick');
    if(!b) return;
    var code = b.getAttribute('data-code');
    if(isolated === code) release();
    else { isolate(code); track('state_select', { state_code: code, source: 'click' }); }
  });
  clearBtn.addEventListener('click', function(){ release(); search.focus(); });

  chips.addEventListener('click', function(e){
    var b = e.target.closest('.sl-chip');
    if(!b) return;
    if(isolated){ isolated = null; search.value = ''; clearBtn.hidden = true; setHash(null); }
    if(b.hasAttribute('data-toggle')){
      withProgram = !withProgram;
      track('state_filter', { filter: 'has_program', active: withProgram ? 'on' : 'off' });
    } else {
      filter = b.getAttribute('data-f');
      track('state_filter', { filter: filter, active: 'on' });
    }
    drawChips();
    draw();
  });
  search.addEventListener('input', function(){
    if(isolated){ isolated = null; clearBtn.hidden = true; setHash(null); }
    draw();
    trackSearchSoon();
  });
  search.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && isolated){ e.preventDefault(); release(); }
  });

  function fromHash(){
    var m = HASH.exec(window.location.hash);
    if(m){
      isolate(m[1].toUpperCase(), true);
      if(isolated) track('state_select', { state_code: isolated, source: 'link' });
    }
  }
  window.addEventListener('hashchange', fromHash);

  // "Updated <date> · Checked for changes every Monday and Thursday".
  // The date is when reviewed data last went live (SS_UPDATED), not when
  // the page was loaded, so it never claims more freshness than it has.
  var updatedEl = document.getElementById('sl-updated');
  if(updatedEl && /^\d{4}-\d{2}-\d{2}$/.test(window.SS_UPDATED || '')){
    updatedEl.innerHTML = '<span class="sl-updated-dot" aria-hidden="true"></span>' +
      '<strong>Updated <time datetime="' + window.SS_UPDATED + '">' + niceDate(window.SS_UPDATED) +
      '</time></strong> &middot; Checked for changes every Monday and Thursday';
    updatedEl.hidden = false;
  }

  drawChips();
  draw();
  fromHash();
})();
