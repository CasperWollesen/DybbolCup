let allGroups = [];
let currentFilter = 'now'; // 'now', 'day', 'all'
let selectedDay = null;
let selectedCourts = new Set(); // Track selected courts

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(theme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function setTheme(theme) {
    const root = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    
    if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
    } else {
        root.removeAttribute('data-theme');
        if (themeIcon) themeIcon.textContent = '🌙';
    }
    
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Time Display
function updateCurrentTime() {
    const now = new Date();
    const timeString = formatTime(now);
    const dateString = formatDate(now);
    
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = `${timeString} (${dateString})`;
    }
}

// Get today's date in the tournament format
function getTodayDate() {
    const now = new Date();
    return formatDate(now);
}

// Check if a date matches today
function isToday(dateStr) {
    return dateStr === getTodayDate();
}

// Court Filter Management
function getAvailableCourts(groups) {
    const courts = new Set();
    groups.forEach(group => {
        // Split multi-court entries like "Bane 1 & Bane 2"
        const courtParts = group.Court.split('&').map(c => c.trim());
        courtParts.forEach(court => courts.add(court));
    });
    return Array.from(courts).sort();
}

function updateCourtFilter(groups) {
    const courtFilter = document.getElementById('courtFilter');
    const courtButtons = document.getElementById('courtButtons');
    
    const availableCourts = getAvailableCourts(groups);
    
    if (availableCourts.length > 0) {
        courtFilter.style.display = 'flex';
        
        courtButtons.innerHTML = availableCourts.map(court => 
            `<button class="court-button" data-court="${court}">${court}</button>`
        ).join('');
        
        // Add click handlers
        courtButtons.querySelectorAll('.court-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const court = btn.getAttribute('data-court');
                toggleCourtSelection(court, btn);
            });
        });
    } else {
        courtFilter.style.display = 'none';
    }
}

function toggleCourtSelection(court, button) {
    if (selectedCourts.has(court)) {
        selectedCourts.delete(court);
        button.classList.remove('active');
    } else {
        selectedCourts.add(court);
        button.classList.add('active');
    }
    
    applyFilters();
}

// Filter Management
function setupFilters() {
    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter');
            setFilter(filter);
        });
    });
    
    // Day buttons
    const dayButtons = document.querySelectorAll('.day-button');
    dayButtons.forEach(button => {
        button.addEventListener('click', () => {
            const day = button.getAttribute('data-day');
            selectDay(day);
        });
    });
}

function setFilter(filter) {
    currentFilter = filter;
    selectedCourts.clear(); // Clear court selection when changing main filter
    
    // Update active tab
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        }
    });
    
    // Show/hide day selector
    const daySelector = document.getElementById('daySelector');
    if (filter === 'day') {
        daySelector.style.display = 'flex';
        
        // Smart day selection logic
        if (!selectedDay) {
            const availableDays = ['9.1.2026', '10.1.2026', '11.1.2026'];
            const today = getTodayDate();
            
            if (availableDays.includes(today)) {
                selectDay(today);
            } else {
                if (availableDays.length > 0) {
                    selectDay(availableDays[0]);
                } else {
                    setFilter('all');
                    return;
                }
            }
        } else {
            // Day already selected, just update
            applyFilters();
        }
    } else {
        daySelector.style.display = 'none';
        selectedDay = null;
        applyFilters();
    }
}

function selectDay(day) {
    selectedDay = day;
    selectedCourts.clear(); // Clear court selection when changing day
    
    // Update active day button
    document.querySelectorAll('.day-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-day') === day) {
            btn.classList.add('active');
        }
    });
    
    applyFilters();
}

function applyFilters() {
    let filtered = [...allGroups];
    
    if (currentFilter === 'now') {
        filtered = filterNow(filtered);
    } else if (currentFilter === 'day' && selectedDay) {
        filtered = filterByDay(filtered, selectedDay);
    }
    // 'all' shows everything, no filtering needed
    
    // Apply court filter if any courts are selected
    if (selectedCourts.size > 0) {
        filtered = filtered.filter(group => {
            // Check if any selected court matches this group's court(s)
            return Array.from(selectedCourts).some(court => 
                group.Court.includes(court)
            );
        });
    }
    
    // Update court filter buttons based on filtered results
    updateCourtFilter(filtered);
    
    renderGroups(filtered);
}

function filterNow(groups) {
    const now = new Date();
    const currentDate = formatDate(now);
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    return groups.filter(group => {
        if (group.ScheduleDate !== currentDate) {
            return false;
        }
        
        const [startHour, startMin] = group.StartTime.split(':').map(Number);
        const startTimeMinutes = startHour * 60 + startMin;
        
        const [endHour, endMin] = group.EndTime.split(':').map(Number);
        const endTimeMinutes = endHour * 60 + endMin;
        
        return currentTimeMinutes >= (startTimeMinutes - 30) && currentTimeMinutes <= endTimeMinutes;
    });
}

function getUpcomingGames() {
    const now = new Date();
    const currentDate = formatDate(now);
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    const upcomingToday = allGroups.filter(group => {
        if (group.ScheduleDate !== currentDate) {
            return false;
        }
        
        const [startHour, startMin] = group.StartTime.split(':').map(Number);
        const startTimeMinutes = startHour * 60 + startMin;
        
        return currentTimeMinutes < (startTimeMinutes - 30);
    });
    
    return upcomingToday.sort((a, b) => {
        const [aHour, aMin] = a.StartTime.split(':').map(Number);
        const [bHour, bMin] = b.StartTime.split(':').map(Number);
        return (aHour * 60 + aMin) - (bHour * 60 + bMin);
    }).slice(0, 3);
}

function isTournamentOver() {
    const now = new Date();
    const currentDate = formatDate(now);
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    const tournamentDays = ['9.1.2026', '10.1.2026', '11.1.2026'];
    const lastDay = '11.1.2026';
    
    if (currentDate !== lastDay) {
        const parseDateStr = (dateStr) => {
            const [day, month, year] = dateStr.split('.').map(Number);
            return new Date(year, month - 1, day);
        };
        
        const currentDateObj = parseDateStr(currentDate);
        const lastDayObj = parseDateStr(lastDay);
        
        if (currentDateObj > lastDayObj) {
            return true;
        }
        
        if (currentDateObj < parseDateStr(tournamentDays[0])) {
            return false;
        }
    }
    
    if (currentDate === lastDay) {
        const lastGame = allGroups
            .filter(g => g.ScheduleDate === lastDay)
            .sort((a, b) => {
                const [aHour, aMin] = a.EndTime.split(':').map(Number);
                const [bHour, bMin] = b.EndTime.split(':').map(Number);
                return (bHour * 60 + bMin) - (aHour * 60 + aMin);
            })[0];
        
        if (lastGame) {
            const [endHour, endMin] = lastGame.EndTime.split(':').map(Number);
            const endTimeMinutes = endHour * 60 + endMin;
            
            return currentTimeMinutes > endTimeMinutes;
        }
    }
    
    return false;
}

function filterByDay(groups, day) {
    return groups.filter(group => group.ScheduleDate === day);
}

function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Initialize the page
function init() {
    try {
        initTheme();
        updateCurrentTime();
        
        const dataScript = document.getElementById('presentation-data');
        const presentationData = JSON.parse(dataScript.textContent);
        
        allGroups = [...presentationData];
        
        setupFilters();
        setFilter('now'); // Start with "Nu" filter
    } catch (error) {
        console.error('Error loading presentation data:', error);
        document.getElementById('noResults').style.display = 'block';
        document.getElementById('noResults').textContent = 'Fejl ved indlæsning af data';
    }
}

// Render groups
function renderGroups(groups) {
    const container = document.getElementById('groupsContainer');
    const noResults = document.getElementById('noResults');

    if (groups.length === 0) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        
        if (currentFilter === 'now') {
            if (isTournamentOver()) {
                noResults.innerHTML = `
                    <div style="font-size: 1.3rem; margin-bottom: 10px;">🏆</div>
                    <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 10px;">Stævnet er slut!</div>
                    <div style="font-size: 0.95rem;">Tak for i år! Vi ses til næste Dybbøl Cup 🎉</div>
                `;
            } else {
                const upcomingGames = getUpcomingGames();
                
                if (upcomingGames.length > 0) {
                    noResults.innerHTML = `
                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 15px;">⏰ Ingen kampe i gang lige nu</div>
                            <div style="font-size: 1rem; margin-bottom: 10px; color: var(--text-secondary);">Næste kampe:</div>
                        </div>
                    `;
                    
                    container.innerHTML = upcomingGames.map(group => `
                        <div class="group-card upcoming-game" onclick="window.open('${group.PresentationLink}', '_blank')">
                            <h3>${group.Group}</h3>
                            <div class="group-info"><strong>📅 Dato:</strong> ${group.ScheduleDate}</div>
                            <div class="group-info"><strong>🕐 Tid:</strong> ${group.StartTime} - ${group.EndTime}</div>
                            <div class="group-info"><strong>🏟️ Bane:</strong> ${group.Court}</div>
                        </div>
                    `).join('');
                    
                    noResults.style.display = 'block';
                } else {
                    noResults.textContent = 'Ingen kampe i gang lige nu';
                }
            }
        } else {
            noResults.textContent = 'Ingen grupper fundet';
        }
        return;
    }

    noResults.style.display = 'none';
    container.innerHTML = groups.map(group => `
        <div class="group-card" onclick="window.open('${group.PresentationLink}', '_blank')">
            <h3>${group.Group}</h3>
            <div class="group-info"><strong>📅 Dato:</strong> ${group.ScheduleDate}</div>
            <div class="group-info"><strong>🕐 Tid:</strong> ${group.StartTime} - ${group.EndTime}</div>
            <div class="group-info"><strong>🏟️ Bane:</strong> ${group.Court}</div>
        </div>
    `).join('');
}

// Initialize when page loads
init();

// Auto-refresh "Nu" filter and time display every minute
setInterval(() => {
    updateCurrentTime();
    if (currentFilter === 'now') {
        applyFilters();
    }
}, 60000);

// Update time display every second for accuracy
setInterval(() => {
    updateCurrentTime();
}, 1000);
