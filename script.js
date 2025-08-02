window.showTab = function(tabId) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  
  if (tabId === 'history') {
    viewTitleHistory();
  } else if (tabId === 'calendar') {
    // renderWeeklyCalendar(); // Removed
  }
};

let roster = [];
let titles = [];
let venues = [];
let matchCard = [];
let budget = 12000;
let currentWeek = 1;
let titleHistory = [];
let showHistory = [];
let currentDate = new Date();
let scheduledShows = {};

// --- Show type to image mapping ---
const showTypeImages = {
  tnt: 'assets/shows/thurs.png',
  ss: 'assets/shows/sat.png',
  sns: 'assets/shows/sun.png',
  house: 'assets/shows/house.png',
  ppv: 'assets/shows/ppv.png'
};

// Initialize wrestler records
function initializeWrestlerRecords() {
  roster.forEach(wrestler => {
    if (!wrestler.record) {
      wrestler.record = { wins: 0, losses: 0, draws: 0 };
    }
    if (typeof wrestler.momentum !== 'number') {
      wrestler.momentum = 0;
    }
    if (typeof wrestler.pop !== 'number') {
      wrestler.pop = 50;
    }
    if (typeof wrestler.heat !== 'number') {
      wrestler.heat = 50;
    }
    if (typeof wrestler.popularity !== 'number') {
      wrestler.popularity = 50;
    }
    if (typeof wrestler.earnings !== 'number') {
      wrestler.earnings = 0;
    }
    if (typeof wrestler.draw_rating !== 'number') {
      wrestler.draw_rating = 50;
    }
    if (!wrestler.injury) {
      wrestler.injury = 'active';
      wrestler.injury_weeks = 0;
    }
  });
}

// --- Stat Management & Manual Override ---

// Try to load roster from localStorage first
function loadRosterFromStorage() {
  const saved = localStorage.getItem('ccwRoster');
  if (saved) {
    try {
      roster = JSON.parse(saved);
      initializeWrestlerRecords();
      populateRosterTable();
      renderEditableRosterTable();
      populateWrestlerDropdowns();
      return true;
    } catch (e) {
      console.error('Failed to parse saved roster:', e);
      localStorage.removeItem('ccwRoster');
      loadRoster(); // fallback to JSON
    }
  }
  return false;
}

function saveRosterToStorage() {
  localStorage.setItem('ccwRoster', JSON.stringify(roster));
}

// Override loadRoster to use localStorage if available
function loadRoster() {
  if (loadRosterFromStorage()) return;
  fetch('data/roster.json')
    .then(res => res.json())
    .then(data => {
      roster = data;
      initializeWrestlerRecords();
      populateRosterTable();
      renderEditableRosterTable();
      populateWrestlerDropdowns();
    });
}

// Render editable roster table for manual override
function renderEditableRosterTable() {
  const container = document.getElementById('editable-roster-table');
  if (!container) return;
  let html = '<table><thead><tr>' +
    '<th>Name</th><th>Pop</th><th>Heat</th><th>Momentum</th><th>Popularity</th><th>Earnings</th><th>Draw Rating</th><th>Injury</th>' +
    '</tr></thead><tbody>';
  roster.forEach((w, i) => {
    html += `<tr>
      <td>${w.name}</td>
      <td><input type="number" min="0" max="100" value="${w.pop ?? ''}" data-field="pop" data-idx="${i}" style="width:60px"></td>
      <td><input type="number" min="0" max="100" value="${w.heat ?? ''}" data-field="heat" data-idx="${i}" style="width:60px"></td>
      <td><input type="number" min="-10" max="10" value="${w.momentum ?? 0}" data-field="momentum" data-idx="${i}" style="width:60px"></td>
      <td><input type="number" min="0" max="100" value="${w.popularity ?? ''}" data-field="popularity" data-idx="${i}" style="width:60px"></td>
      <td><input type="number" min="0" value="${w.earnings ?? 0}" data-field="earnings" data-idx="${i}" style="width:80px"></td>
      <td><input type="number" min="0" max="100" value="${w.draw_rating ?? ''}" data-field="draw_rating" data-idx="${i}" style="width:60px"></td>
      <td><input type="text" value="${w.injury ?? ''}" data-field="injury" data-idx="${i}" style="width:100px"></td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

// Simulate stat update (random fluctuation)
function simulateStatUpdate() {
  roster.forEach(w => {
    // Pop, Heat, Popularity: -3 to +3
    w.pop = clamp((w.pop ?? 0) + randInt(-3, 3), 0, 100);
    w.heat = clamp((w.heat ?? 0) + randInt(-3, 3), 0, 100);
    w.popularity = clamp((w.popularity ?? 0) + randInt(-2, 2), 0, 100);
    // Momentum: -1 to +1
    w.momentum = clamp((w.momentum ?? 0) + randInt(-1, 1), -10, 10);
    // Earnings: +$500 to +$2500 based on draw_rating
    let draw = w.draw_rating ?? Math.round(((w.popularity ?? 0) + (w.pop ?? 0) + (w.heat ?? 0)) / 3);
    w.draw_rating = draw;
    let earning = 500 + Math.round(draw * Math.random() * 20);
    w.earnings = (w.earnings ?? 0) + earning;
    // Injury: 5% chance
    if (!w.injury || w.injury === '' || w.injury === 'active') {
      if (Math.random() < 0.05) {
        let weeks = randInt(1, 8);
        w.injury = `injured (${weeks}w)`;
        w.injury_weeks = weeks;
      } else {
        w.injury = 'active';
        w.injury_weeks = 0;
      }
    } else if (w.injury.startsWith('injured')) {
      // Decrement injury weeks
      w.injury_weeks = (w.injury_weeks ?? 1) - 1;
      if (w.injury_weeks <= 0) {
        w.injury = 'active';
        w.injury_weeks = 0;
      } else {
        w.injury = `injured (${w.injury_weeks}w)`;
      }
    }
  });
  saveRosterToStorage();
  renderEditableRosterTable();
      populateRosterTable();
  populateWrestlerDropdowns();
  alert('Stats updated!');
}

// Save manual changes from editable table
function saveManualChanges() {
  const inputs = document.querySelectorAll('#editable-roster-table input');
  inputs.forEach(input => {
    const idx = parseInt(input.dataset.idx);
    const field = input.dataset.field;
    let value = input.value;
    if (["pop","heat","momentum","popularity","earnings","draw_rating"].includes(field)) {
      value = Number(value);
    }
    roster[idx][field] = value;
    if (field === 'injury' && value === 'active') {
      roster[idx].injury_weeks = 0;
    }
  });
  saveRosterToStorage();
  renderEditableRosterTable();
  populateRosterTable();
  populateWrestlerDropdowns();
  alert('Manual changes saved!');
}

// Export roster as JSON
function exportRoster() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(roster, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', 'ccw_roster_export.json');
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  document.body.removeChild(dlAnchor);
}

// Import roster from JSON
function importRoster(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        roster = data;
        saveRosterToStorage();
        renderEditableRosterTable();
        populateRosterTable();
        populateWrestlerDropdowns();
        alert('Roster imported!');
      } else {
        alert('Invalid roster file.');
      }
    } catch (err) {
      alert('Failed to import roster: ' + err);
    }
  };
  reader.readAsText(file);
}

// Utility functions
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// --- Enhanced Weekly Calendar System ---
// Remove calendar and week logic
// Remove: let calendarStartDate, currentWeekIndex, weeks, buildWeeks, getWeekStartDate, getCurrentWeek, renderWeeklyCalendar, and all code referencing them
// Remove: onShowTypeChange, selectShowForBooking, selectShowForManagement, and any calendar-grid or current-month-display logic
// Remove: weekIndex from show objects
// Remove: week progression logic from simulateSelectedShow
// Remove: any code that disables booking based on week or calendar

// --- Unified Show Booking and Management ---
let allShows = []; // { id, type, date, venue, matchCard, status }
let selectedShowId = null;

window.bookSelectedShow = function() {
  const showType = document.getElementById('show-type-select').value;
  const showDate = new Date(document.getElementById('show-date-picker').value);
  if (isNaN(showDate)) {
    alert('Please select a valid date for the show.');
    return;
  }
  const venue = document.getElementById('venue-select').value;
  const id = 'show_' + Date.now();
  const show = {
    id,
    type: showType,
    date: showDate,
    venue,
    matchCard: [],
    status: 'booked'
  };
  allShows.push(show);
  selectedShowId = id;
  showMatchManagementUI(show);
  renderBookedShowsTable();
  saveGameState();
};

function renderBookedShowsTable() {
  const tableDiv = document.getElementById('booked-shows-table');
  if (!tableDiv) return;
  if (allShows.length === 0) {
    tableDiv.innerHTML = '<em>No shows booked yet.</em>';
    return;
  }
  let html = '<table><thead><tr><th>Show</th><th>Date</th><th>Type</th><th>Venue</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  allShows.forEach(show => {
    const showImg = showTypeImages[show.type] ? `<img src="${showTypeImages[show.type]}" alt="${show.type}" style="width:80px;height:70px;vertical-align:middle;margin-right:8px;">` : '';
    html += `<tr>
      <td>${showImg}</td>
      <td>${show.date.toLocaleDateString ? show.date.toLocaleDateString() : new Date(show.date).toLocaleDateString()}</td>
      <td>${getShowTypeName(show.type)}</td>
      <td>${show.venue}</td>
      <td>${show.status.charAt(0).toUpperCase() + show.status.slice(1)}</td>
      <td>
        <button onclick="manageShow('${show.id}')">Manage</button>
        ${show.status === 'booked' ? `<button onclick="simulateShowFromList('${show.id}')">Simulate</button>` : ''}
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  tableDiv.innerHTML = html;
}

window.manageShow = function(showId) {
  selectedShowId = showId;
  const show = allShows.find(s => s.id === showId);
  if (show) showMatchManagementUI(show);
};

window.simulateShowFromList = function(showId) {
  selectedShowId = showId;
  const show = allShows.find(s => s.id === showId);
  if (!show || !show.matchCard || show.matchCard.length === 0) {
    alert('No matches booked for this show!');
    return;
  }
  if (show.status === 'completed') {
    alert('This show has already been simulated.');
    return;
  }
  let index = 0;
  let totalQuality = 0;
  let showResults = [];
  // --- Real-time UI update: clear and initialize match list ---
  const listDiv = document.getElementById('show-match-list');
  if (listDiv) {
    listDiv.innerHTML = '<ul id="live-match-results"></ul>';
  }
  function runNextMatch() {
    if (index >= show.matchCard.length) {
      finishBookedShow(show, showResults, totalQuality);
      return;
    }
    const match = show.matchCard[index];
    const a = roster.find(w => w.id === match.wrestlerA);
    const b = roster.find(w => w.id === match.wrestlerB);
    if (!a || !b) {
      index++;
      runNextMatch();
      return;
    }
    const result = simulateMatch(a, b, match.stipulation);
    totalQuality += result.quality;
    // Update records
    updateWrestlerRecord(result.winner, 'win');
    updateWrestlerRecord(result.loser, 'loss');
    // Handle title changes
    let titleChange = null;
    if (match.titleId) {
      const title = titles.find(t => t.id === match.titleId);
      if (title && title.holderId !== result.winner.id) {
        const oldHolder = roster.find(w => w.id === title.holderId);
        title.holderId = result.winner.id;
        addTitleHistoryEntry(match.titleId, oldHolder, result.winner, currentWeek);
        titleChange = title;
      }
    }
    showResults.push({
      match: match,
      result: result,
      titleChange: titleChange
    });
    // --- Real-time UI update: append result with winner and belt images ---
    const liveUl = document.getElementById('live-match-results');
    if (liveUl) {
      const li = document.createElement('li');
      const winnerImg = result.winner.photo ? `<img src='${result.winner.photo}' alt='${result.winner.name}' style='width:40px;height:40px;object-fit:cover;vertical-align:middle;margin-right:8px;border-radius:6px;'>` : '';
      const beltImg = titleChange && titleChange.image ? `<img src='${titleChange.image}' alt='${titleChange.name}' style='width:40px;height:24px;vertical-align:middle;margin-left:8px;'>` : '';
      li.innerHTML = `${winnerImg}<strong>${a.name} vs. ${b.name} (${match.stipulation})</strong><br>
        <span style=\"color: #F6AA29;\">Winner: ${result.winner.name} via ${result.method}</span> ${beltImg}<br>
        <span style=\"color: #CD3E23;\">Match Rating: ${result.quality}/100</span>
        ${titleChange ? `<br><span style='color: #ffdd57;'>🏆 NEW ${titleChange.name} CHAMPION!</span>` : ''}`;
      liveUl.appendChild(li);
    }
    index++;
    setTimeout(runNextMatch, Math.random() * 1000 + 800);
  }
  runNextMatch();
};

// Update showMatchManagementUI to hide/show as needed
function showMatchManagementUI(show) {
  document.getElementById('show-match-management').style.display = '';
  document.getElementById('show-match-title').textContent = getShowTypeName(show.type);
  document.getElementById('show-match-date').textContent = show.date.toLocaleDateString ? show.date.toLocaleDateString() : new Date(show.date).toLocaleDateString();
  if (show.status === 'completed') {
    showMatchResultsUI(show);
    // Hide add match form and simulate button
    document.getElementById('add-match-form')?.remove();
  } else {
    renderShowMatchList(show);
    renderAddMatchForm(show);
  }
}

window.closeMatchManagement = function() {
  document.getElementById('show-match-management').style.display = 'none';
  selectedShowId = null;
};

// Add match booking UI to showMatchManagementUI
function renderAddMatchForm(show) {
  const listDiv = document.getElementById('show-match-list');
  if (!listDiv) return;
  // Always render the match list and form together, replacing the whole innerHTML
  let html = '';
  if (show.matchCard.length === 0) {
    html = '<em>No matches booked yet.</em>';
  } else {
    html = '<ul>' + show.matchCard.map((m, i) => {
      const a = roster.find(w => w.id === m.wrestlerA)?.name || '?';
      const b = roster.find(w => w.id === m.wrestlerB)?.name || '?';
      const t = titles.find(t => t.id === m.titleId)?.name || '';
      return `<li>${a} vs. ${b} (${m.stipulation}${t ? ', Title: ' + t : ''}) <button onclick='removeMatchFromShow(${i})' title='Remove' style='color:red;font-weight:bold;'>🗑️</button></li>`;
    }).join('') + '</ul>';
  }
  html += `<div id='add-match-form' style='margin-top:10px;'>
    <label>Wrestler A: <select id='add-match-a'></select></label>
    <label>Wrestler B: <select id='add-match-b'></select></label>
    <label>Stipulation: <select id='add-match-stip'>
      <option value='Standard'>Standard</option>
      <option value='No DQ'>No DQ</option>
      <option value='Tag Team'>Tag Team</option>
    </select></label>
    <label>Title Match: <select id='add-match-title'><option value=''>None</option></select></label>
  </div>`;
  // Add the shared action row with all three buttons
  html += `<div class="show-match-actions" style="margin-top:16px; display:flex; gap:12px;">
    <button onclick="confirmAddMatchToShow()">Add Match</button>
    <button onclick="simulateShowFromList(selectedShowId)">Simulate Show</button>
    <button onclick="closeMatchManagement()">Close</button>
  </div>`;
  listDiv.innerHTML = html;
  // Populate wrestler and title dropdowns
  const aSel = document.getElementById('add-match-a');
  const bSel = document.getElementById('add-match-b');
  aSel.innerHTML = '';
  bSel.innerHTML = '';
  roster.forEach(w => {
    aSel.add(new Option(w.name, w.id));
    bSel.add(new Option(w.name, w.id));
  });
  const titleSel = document.getElementById('add-match-title');
  titleSel.innerHTML = '<option value="">None</option>';
  titles.forEach(t => {
    titleSel.add(new Option(t.name, t.id));
  });
}

window.confirmAddMatchToShow = function() {
  if (!selectedShowId) return;
  const show = allShows.find(s => s.id === selectedShowId);
  if (!show) return;
  
  const wrestlerA = document.getElementById('add-match-a').value;
  const wrestlerB = document.getElementById('add-match-b').value;
  // Validation to ensure wrestlers are not the same and both are selected
  if (!wrestlerA || !wrestlerB || wrestlerA === wrestlerB) {
    alert("Please select two different wrestlers.");
    return;
  }
  
  const stip = document.getElementById('add-match-stip').value;
  const titleId = document.getElementById('add-match-title').value;
  
  show.matchCard.push({ wrestlerA, wrestlerB, stipulation: stip, titleId });
  console.log('Match added to show:', show.id, show.matchCard); // Debug log
  renderAddMatchForm(show);
  saveGameState();
};

window.removeMatchFromShow = function(matchIdx) {
  if (!selectedShowId) return;
  const show = allShows.find(s => s.id === selectedShowId);
  if (!show) return;
  show.matchCard.splice(matchIdx, 1);
  renderAddMatchForm(show);
  saveGameState();
};

function renderShowMatchList(show) {
  const listDiv = document.getElementById('show-match-list');
  if (!listDiv) return;
  let html = '';
  if (show.matchCard.length === 0) {
    html = '<em>No matches booked yet.</em>';
  } else {
    html = '<ul>' + show.matchCard.map((m, i) => {
      const a = roster.find(w => w.id === m.wrestlerA)?.name || '?';
      const b = roster.find(w => w.id === m.wrestlerB)?.name || '?';
      const t = titles.find(t => t.id === m.titleId)?.name || '';
      return `<li>${a} vs. ${b} (${m.stipulation}${t ? ', Title: ' + t : ''}) <button onclick='removeMatchFromShow(${i})' title='Remove' style='color:red;font-weight:bold;'>🗑️</button></li>`;
    }).join('') + '</ul>';
  }
  listDiv.innerHTML = html;
}

window.addMatchToShow = function() {
  if (!selectedShowId) return;
  const show = allShows.find(s => s.id === selectedShowId);
  if (!show) return;
  // For demo, just add a placeholder match
  show.matchCard.push('Match ' + (show.matchCard.length + 1));
  renderShowMatchList(show);
  saveGameState();
};

function getShowTypeName(type) {
  switch(type) {
    case 'tnt': return 'Thursday Night Throwdown (TNT)';
    case 'ss': return 'Saturday Slamfest (SS)';
    case 'sns': return 'Sunday Night Stampede (SNS)';
    case 'house': return 'House Show';
    case 'ppv': return 'PPV';
    default: return type;
  }
}

// --- Game State Save/Load ---
function saveGameState() {
  const gameState = {
    roster: roster,
    titles: titles,
    budget: budget,
    currentWeek: currentWeek,
    currentDate: currentDate.toISOString(),
    scheduledShows: scheduledShows,
    titleHistory: titleHistory,
    showHistory: showHistory,
    matchCard: matchCard,
    saveDate: new Date().toISOString(),
    allShows: allShows, // Save allShows
    selectedShowId: selectedShowId // Save selectedShowId
  };
  
  localStorage.setItem('ccwGameState', JSON.stringify(gameState));
  alert('Game saved successfully!');
}

function loadGameState() {
  const saved = localStorage.getItem('ccwGameState');
  if (!saved) {
    alert('No saved game found.');
    return;
  }
  
  try {
    const gameState = JSON.parse(saved);
    
    roster = gameState.roster || [];
    titles = gameState.titles || [];
    budget = gameState.budget || 12000;
    currentWeek = gameState.currentWeek || 1;
    currentDate = new Date(gameState.currentDate || '1978-01-01');
    scheduledShows = gameState.scheduledShows || {};
    titleHistory = gameState.titleHistory || [];
    showHistory = gameState.showHistory || [];
    matchCard = gameState.matchCard || [];
    allShows = gameState.allShows || []; // Load allShows
    selectedShowId = gameState.selectedShowId || null; // Load selectedShowId
    
    // Update UI
    initializeWrestlerRecords();
    populateRosterTable();
    renderEditableRosterTable();
    populateWrestlerDropdowns();
    renderBookedShowsTable(); // Update to render booked shows
    updateCurrentWeek();
    updateCurrentChampions();
    setCurrentBudget(budget);
    
    alert('Game loaded successfully!');
  } catch (e) {
    console.error('Failed to load game state:', e);
    alert('Failed to load game state. The save file may be corrupted.');
  }
}

function exportGameState() {
  const gameState = {
    roster: roster,
    titles: titles,
    budget: budget,
    currentWeek: currentWeek,
    currentDate: currentDate.toISOString(),
    scheduledShows: scheduledShows,
    titleHistory: titleHistory,
    showHistory: showHistory,
    matchCard: matchCard,
    saveDate: new Date().toISOString(),
    allShows: allShows, // Save allShows
    selectedShowId: selectedShowId // Save selectedShowId
  };
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `ccw_save_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  document.body.removeChild(dlAnchor);
}

// Import game state from file
window.addEventListener('DOMContentLoaded', () => {
  const importInput = document.getElementById('import-game-state');
  if (importInput) {
    importInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const gameState = JSON.parse(e.target.result);
            
            roster = gameState.roster || [];
            titles = gameState.titles || [];
            budget = gameState.budget || 12000;
            currentWeek = gameState.currentWeek || 1;
            currentDate = new Date(gameState.currentDate || '1978-01-01');
            scheduledShows = gameState.scheduledShows || {};
            titleHistory = gameState.titleHistory || [];
            showHistory = gameState.showHistory || [];
            matchCard = gameState.matchCard || [];
            allShows = gameState.allShows || []; // Load allShows
            selectedShowId = gameState.selectedShowId || null; // Load selectedShowId
            
            // Update UI
            initializeWrestlerRecords();
            populateRosterTable();
            renderEditableRosterTable();
            populateWrestlerDropdowns();
            renderBookedShowsTable(); // Update to render booked shows
            updateCurrentWeek();
            updateCurrentChampions();
            setCurrentBudget(budget);
            
            alert('Game imported successfully!');
          } catch (err) {
            alert('Failed to import game: ' + err);
          }
        };
        reader.readAsText(e.target.files[0]);
      }
    };
  }
  
  // Initialize calendar
  // renderWeeklyCalendar(); // Removed
});

// Attach event listeners after DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  const statBtn = document.getElementById('simulate-stat-update');
  if (statBtn) statBtn.onclick = simulateStatUpdate;
  const saveBtn = document.getElementById('save-manual-changes');
  if (saveBtn) saveBtn.onclick = saveManualChanges;
  const exportBtn = document.getElementById('export-roster');
  if (exportBtn) exportBtn.onclick = exportRoster;
  const importBtn = document.getElementById('import-roster-btn');
  const importInput = document.getElementById('import-roster');
  if (importBtn && importInput) {
    importBtn.onclick = () => importInput.click();
    importInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        importRoster(e.target.files[0]);
      }
    };
  }
  renderEditableRosterTable();
  loadTitles();
  loadVenues();
  loadTitleHistory();
  updateCurrentWeek();
  updateCurrentChampions();
  renderBookedShowsTable();
  document.getElementById('show-match-management').style.display = 'none';

  // Stat Management toggle logic
  const statToggle = document.getElementById('toggle-stat-management');
  const statCard = document.getElementById('stat-management-card');
  if (statToggle && statCard) {
    statToggle.onclick = function() {
      if (statCard.style.display === 'none' || statCard.style.display === '') {
        statCard.style.display = 'block';
        statToggle.textContent = 'Hide Stat Management & Manual Override';
      } else {
        statCard.style.display = 'none';
        statToggle.textContent = 'Show Stat Management & Manual Override';
      }
    };
    // Start hidden
    statCard.style.display = 'none';
    statToggle.textContent = 'Show Stat Management & Manual Override';
  }
});

function loadTitles() {
  fetch('data/titles.json')
    .then(res => res.json())
    .then(data => {
      titles = data;
      const titleSelect = document.getElementById('title-select');
      if (titleSelect) {
        data.forEach(title => {
          const opt = new Option(title.name, title.id);
          titleSelect.add(opt);
        });
      }
    });
}

function loadVenues() {
  fetch('data/venues.json')
    .then(res => res.json())
    .then(data => {
      venues = data;
      const select = document.getElementById('venue-select');
      select.innerHTML = '';
      venues.forEach(venue => {
        const opt = new Option(venue.name, venue.name);
        select.add(opt);
      });
      // Show info for the first venue
      if (venues.length > 0) {
        updateVenueInfo(venues[0].name);
        select.value = venues[0].name;
      }
      select.onchange = function() {
        updateVenueInfo(this.value);
      };
    });
}

function updateVenueInfo(venueName) {
  const venue = venues.find(v => v.name === venueName);
  const infoDiv = document.getElementById('venue-info');
  if (!venue || !infoDiv) {
    if (infoDiv) infoDiv.innerHTML = '';
    return;
  }
  infoDiv.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:18px;">
      <img src="${venue.image}" alt="${venue.name}" style="width:500px;height:250px;object-fit:cover;border-radius:8px;border:2px solid #F6AA29;box-shadow:0 2px 12px #053452;">
      <div>
        <h4 style='margin:0 0 8px 0;'>${venue.name}</h4>
        <div><strong>City:</strong> ${venue.city}, ${venue.state}</div>
        <div><strong>Region:</strong> ${venue.region}</div>
        <div><strong>Capacity:</strong> ${venue.capacity.toLocaleString()}</div>
        <div><strong>Prestige:</strong> ${venue.prestige}</div>
        <div><strong>Cost:</strong> $${venue.cost.toLocaleString()}</div>
        <div><strong>Sponsor:</strong> ${venue.sponsors || 'N/A'}</div>
        <div><strong>Unlock Year:</strong> ${venue.unlockYear || 'N/A'}</div>
      </div>
    </div>
  `;
}

function loadTitleHistory() {
  const saved = localStorage.getItem('ccwTitleHistory');
  if (saved) {
    titleHistory = JSON.parse(saved);
  }
}

function saveTitleHistory() {
  localStorage.setItem('ccwTitleHistory', JSON.stringify(titleHistory));
}

function addTitleHistoryEntry(titleId, oldHolder, newHolder, week) {
  const title = titles.find(t => t.id === titleId);
  if (!title) return;
  
  titleHistory.push({
    titleId: titleId,
    titleName: title.name,
    oldHolder: oldHolder ? oldHolder.name : 'Vacant',
    newHolder: newHolder.name,
    week: week,
    date: new Date().toLocaleDateString()
  });
  saveTitleHistory();
}

// Enhanced match simulation based on wrestler stats
function simulateMatch(wrestlerA, wrestlerB, stipulation) {
  // Calculate match rating based on wrestler stats
  const aOverall = calculateOverall(wrestlerA);
  const bOverall = calculateOverall(wrestlerB);
  
  // Add momentum bonus
  const aMomentumBonus = wrestlerA.momentum * 0.1;
  const bMomentumBonus = wrestlerB.momentum * 0.1;
  
  // Add popularity bonus
  const aPopBonus = wrestlerA.pop * 0.05;
  const bPopBonus = wrestlerB.pop * 0.05;
  
  // Add stipulation effects
  const stipBonus = getStipulationBonus(stipulation, wrestlerA, wrestlerB);
  
  const aFinal = aOverall + aMomentumBonus + aPopBonus + stipBonus.a;
  const bFinal = bOverall + bMomentumBonus + bPopBonus + stipBonus.b;
  
  // Add some randomness
  const aRandom = (Math.random() - 0.5) * 20;
  const bRandom = (Math.random() - 0.5) * 20;
  
  const aTotal = aFinal + aRandom;
  const bTotal = bFinal + bRandom;
  
  // Determine winner
  let winner, loser;
  if (aTotal > bTotal) {
    winner = wrestlerA;
    loser = wrestlerB;
  } else {
    winner = wrestlerB;
    loser = wrestlerA;
  }
  
  // Calculate match quality
  const matchQuality = Math.min(100, Math.max(0, (aOverall + bOverall) / 2 + Math.random() * 20));
  
  return {
    winner: winner,
    loser: loser,
    quality: Math.round(matchQuality),
    method: determineFinishMethod(winner, loser, stipulation)
  };
}

function calculateOverall(wrestler) {
  const stats = wrestler.stats;
  return (stats.strength + stats.speed + stats.stamina + stats.charisma + stats.technical) / 5;
}

function getStipulationBonus(stipulation, wrestlerA, wrestlerB) {
  switch (stipulation) {
    case 'No DQ':
      // Heels get bonus in No DQ matches
      return {
        a: wrestlerA.alignment === 'Heel' ? 10 : 0,
        b: wrestlerB.alignment === 'Heel' ? 10 : 0
      };
    case 'Tag Team':
      // Tag team specialists get bonus
      return {
        a: wrestlerA.type === 'Tag Team' ? 15 : 0,
        b: wrestlerB.type === 'Tag Team' ? 15 : 0
      };
    default:
      return { a: 0, b: 0 };
  }
}

function determineFinishMethod(winner, loser, stipulation) {
  const methods = [
    `${winner.finisher}`,
    'Pinfall',
    'Submission',
    'Countout',
    'Disqualification'
  ];
  
  if (stipulation === 'No DQ') {
    methods.splice(3, 2); // Remove countout and DQ
  }
  
  // Finisher has higher chance
  const weights = [0.4, 0.3, 0.2, 0.05, 0.05];
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return methods[i];
    }
  }
  
  return methods[0];
}

function updateWrestlerRecord(wrestler, result) {
  if (!wrestler.record) {
    wrestler.record = { wins: 0, losses: 0, draws: 0 };
  }
  
  switch (result) {
    case 'win':
      wrestler.record.wins++;
      wrestler.momentum = Math.min(100, wrestler.momentum + 5);
      break;
    case 'loss':
      wrestler.record.losses++;
      wrestler.momentum = Math.max(-50, wrestler.momentum - 3);
      break;
    case 'draw':
      wrestler.record.draws++;
      break;
  }
}

window.addMatch = function() {
  const wrestlerA = document.getElementById('wrestler-a').value;
  const wrestlerB = document.getElementById('wrestler-b').value;
  const stip = document.getElementById('stipulation').value;
  const titleId = document.getElementById('title-select').value;
  const match = { wrestlerA, wrestlerB, stipulation: stip, titleId };
  matchCard.push(match);

  const ul = document.getElementById('match-card-list');
  const li = document.createElement('li');
  const nameA = roster.find(w => w.id === wrestlerA)?.name || '?';
  const nameB = roster.find(w => w.id === wrestlerB)?.name || '?';
  const titleText = titleId ? ` for ${titles.find(t => t.id === titleId)?.name}` : '';
  li.textContent = `${nameA} vs. ${nameB} (${stip})${titleText}`;
  ul.appendChild(li);
};

function setCurrentBudget(amount) {
  budget = amount;
  const budgetElement = document.getElementById("budget-display");
  if (budgetElement) {
    budgetElement.textContent = `💰 Budget: $${budget.toLocaleString()}`;
  }
}

function updateCurrentWeek() {
  const weekElement = document.getElementById("current-week");
  if (weekElement) {
    weekElement.textContent = currentWeek;
  }
}

function updateCurrentChampions() {
  const championsDiv = document.getElementById("current-champions");
  if (!championsDiv) return;
  
  championsDiv.innerHTML = '';
  
  titles.forEach(title => {
    const holder = roster.find(w => w.id === title.holderId);
    if (holder) {
      const championDiv = document.createElement('div');
      championDiv.style.marginBottom = '10px';
      championDiv.innerHTML = `
        <img src="${title.image}" alt="${title.name}" style="width: 30px; height: 20px; vertical-align: middle; margin-right: 10px;">
        <strong>${title.name}:</strong> ${holder.name}
      `;
      championsDiv.appendChild(championDiv);
    }
  });
}

function finishBookedShow(show, showResults, totalQuality) {
  const avgQuality = Math.round(totalQuality / showResults.length);
  const profit = calculateShowProfit(avgQuality, showResults.length);
  budget += profit;
  setCurrentBudget(budget);
  
  // Update current week
  currentWeek++;
  updateCurrentWeek();
  updateCurrentChampions();
  
  // Save show to history
  showHistory.push({
    week: currentWeek - 1,
    matches: showResults,
    quality: avgQuality,
    profit: profit,
    date: new Date().toLocaleDateString()
  });
  
  // Clear match card
  show.matchCard = [];
  
  document.getElementById("show-summary").innerHTML = `
    <div class="card">
      <h3>Show Results</h3>
      <p>📊 Average Match Rating: ${avgQuality}/100</p>
      <p>💰 ${profit >= 0 ? "Earned" : "Lost"}: $${Math.abs(profit).toLocaleString()}</p>
      <p>💰 New Budget: $${budget.toLocaleString()}</p>
      <p>📅 Week: ${currentWeek}</p>
    </div>
  `;
  
  // Update roster table to show new records
  populateRosterTable();
}

function calculateShowProfit(avgQuality, matchCount) {
  const baseProfit = (avgQuality - 50) * 100; // Quality affects profit
  const matchBonus = matchCount * 500; // More matches = more profit potential
  const randomFactor = (Math.random() - 0.5) * 2000; // Some randomness
  
  return Math.floor(baseProfit + matchBonus + randomFactor);
}

// --- Roster Table Sorting ---
let currentSortColumn = null;
let currentSortDirection = 'asc';

window.sortRosterTable = function(column) {
  if (currentSortColumn === column) {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortColumn = column;
    currentSortDirection = 'asc';
  }
  roster.sort((a, b) => {
    let aVal, bVal;
    switch (column) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'type':
        aVal = (a.type || '').toLowerCase();
        bVal = (b.type || '').toLowerCase();
        break;
      case 'pop':
        aVal = a.pop || a.popularity || 0;
        bVal = b.pop || b.popularity || 0;
        break;
      case 'momentum':
        aVal = a.momentum || 0;
        bVal = b.momentum || 0;
        break;
      default:
        aVal = a[column];
        bVal = b[column];
    }
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      if (aVal < bVal) return currentSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return currentSortDirection === 'asc' ? 1 : -1;
      return 0;
    } else {
      return currentSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
  });
  populateRosterTable();
};

function updateSortIndicators() {
  const columns = ['name', 'type', 'pop', 'momentum'];
  columns.forEach(col => {
    const el = document.getElementById('sort-indicator-' + col);
    if (el) {
      if (currentSortColumn === col) {
        el.textContent = currentSortDirection === 'asc' ? '▲' : '▼';
      } else {
        el.textContent = '';
      }
    }
  });
}

// Update populateRosterTable to call updateSortIndicators
function populateRosterTable() {
  const tbody = document.getElementById('roster-table-body');
  tbody.innerHTML = '';
  roster.forEach(wrestler => {
    const row = document.createElement('tr');
    const record = wrestler.record || { wins: 0, losses: 0, draws: 0 };
    const momentumColor = wrestler.momentum > 0 ? '#4CAF50' : wrestler.momentum < 0 ? '#f44336' : '#F6AA29';
    row.innerHTML = `
      <td><img src="${wrestler.photo}" alt="${wrestler.name}" style="width: 75px; height: 70px;"></td>
      <td>${wrestler.name}</td>
      <td>${wrestler.type}</td>
      <td>${wrestler.pop || wrestler.popularity || 0}</td>
      <td>${wrestler.finisher || 'N/A'}</td>
      <td>${wrestler.alignment}</td>
      <td>${record.wins}-${record.losses}-${record.draws}</td>
      <td style="color: ${momentumColor};">${wrestler.momentum > 0 ? '+' : ''}${wrestler.momentum}</td>
      <td><button onclick="viewWrestler('${wrestler.id}')">View</button></td>
    `;
    tbody.appendChild(row);
  });
  window._wrestlerData = roster;
  updateSortIndicators();
}

window.viewWrestler = function(id) {
  const wrestler = roster.find(w => w.id === id);
  if (!wrestler) return;

  document.getElementById('detail-name').textContent = wrestler.name;
  document.getElementById('detail-photo').src = wrestler.photo;
  document.getElementById('detail-type').textContent = wrestler.type;
  document.getElementById('detail-manager').textContent = wrestler.manager || 'N/A';
  document.getElementById('detail-alignment').textContent = wrestler.alignment;
  document.getElementById('detail-finisher').textContent = wrestler.finisher || 'N/A';
  document.getElementById('detail-moveset').textContent = wrestler.moveset || 'Unknown';

  // Record
  const record = wrestler.record || { wins: 0, losses: 0, draws: 0 };
  document.getElementById('detail-record').textContent = `${record.wins}-${record.losses}-${record.draws}`;

  // Stats
  const statsList = document.getElementById('detail-stats');
  statsList.innerHTML = '';
  Object.entries(wrestler.stats || {}).forEach(([key, value]) => {
    const li = document.createElement('li');
    li.textContent = `${key.toUpperCase()}: ${value}`;
    statsList.appendChild(li);
  });

  // Titles held
  let heldTitles = [];
  let heldTitleObjs = [];
  if (typeof titles !== 'undefined' && Array.isArray(titles)) {
    heldTitleObjs = titles.filter(t => t.holderId === wrestler.id);
    heldTitles = heldTitleObjs.map(t => t.name);
  }
  document.getElementById('detail-titles').textContent = heldTitles.length ? heldTitles.join(', ') : 'None';

  // Belt images
  const titleImagesDiv = document.getElementById('detail-title-images');
  titleImagesDiv.innerHTML = '';
  if (heldTitleObjs.length) {
    heldTitleObjs.forEach(t => {
      const img = document.createElement('img');
      img.src = t.image;
      img.alt = t.name + ' belt';
      img.title = t.name;
      img.style.width = '200px';
      img.style.height = 'auto';
      img.style.marginRight = '10px';
      img.style.verticalAlign = 'middle';
      titleImagesDiv.appendChild(img);
    });
  }

  document.getElementById('wrestler-details').style.display = 'block';
};

// Title history viewer
window.viewTitleHistory = function() {
  const historyDiv = document.getElementById('title-history');
  if (!historyDiv) return;
  
  historyDiv.innerHTML = '<h3>Title History</h3>';
  
  if (titleHistory.length === 0) {
    historyDiv.innerHTML += '<p>No title changes recorded yet.</p>';
    return;
  }
  
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Title</th>
        <th>Previous Champion</th>
        <th>New Champion</th>
        <th>Week</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  
  const tbody = table.querySelector('tbody');
  titleHistory.slice().reverse().forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.titleName}</td>
      <td>${entry.oldHolder}</td>
      <td>${entry.newHolder}</td>
      <td>${entry.week}</td>
    `;
    tbody.appendChild(row);
  });
  
  historyDiv.appendChild(table);
};

// Populate Wrestler A and B dropdowns
function populateWrestlerDropdowns() {
  const aSelect = document.getElementById('wrestler-a');
  const bSelect = document.getElementById('wrestler-b');
  if (!aSelect || !bSelect) return;
  aSelect.innerHTML = '';
  bSelect.innerHTML = '';
  roster.forEach(wrestler => {
    const optA = new Option(wrestler.name, wrestler.id);
    const optB = new Option(wrestler.name, wrestler.id);
    aSelect.add(optA);
    bSelect.add(optB);
  });
}
