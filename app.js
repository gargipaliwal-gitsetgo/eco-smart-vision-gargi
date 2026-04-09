/* Data Structures - Tamil Nadu Dummy Data */
const LOCATIONS = [
    { id: "BIN-001", lat: 13.0827, lng: 80.2707, location: "Chennai Central", type: "Dry" },
    { id: "BIN-002", lat: 11.0168, lng: 76.9558, location: "Coimbatore Junction", type: "Wet" },
    { id: "BIN-003", lat: 9.9252, lng: 78.1198, location: "Madurai Temple", type: "Mixed" },
    { id: "BIN-004", lat: 10.7905, lng: 78.7047, location: "Trichy Rockfort", type: "Dry" },
    { id: "BIN-005", lat: 11.6643, lng: 78.1460, location: "Salem Stand", type: "Wet" },
    { id: "BIN-006", lat: 8.7139, lng: 77.7567, location: "Tirunelveli Town", type: "Metal" },
    { id: "BIN-007", lat: 11.3410, lng: 77.7172, location: "Erode Market", type: "Dry" },
    { id: "BIN-008", lat: 12.9165, lng: 79.1325, location: "Vellore Fort", type: "Mixed" },
    { id: "BIN-009", lat: 10.3624, lng: 77.9695, location: "Dindigul Bypass", type: "Wet" },
    { id: "BIN-010", lat: 11.1085, lng: 77.3411, location: "Tiruppur Park", type: "Dry" }
];

let bins = LOCATIONS.map(loc => ({
    ...loc,
    fillLevel: Math.floor(Math.random() * 100),
    lastUpdated: new Date()
}));

let alerts = [];
let fullFilterActive = false;
let heatmapActive = false;
let searchQuery = "";
let role = "admin";

// Citizen Engagement
let citTotal = 54;
let citPending = 12;
let citResolved = 42;

/* Map & Layers */
let map;
let markers = {};
let heatLayer = null;
let routeLine = null;
let truckMarker = null;
let truckInterval = null;

/* Charts */
let fillTrendChart, wasteTypeChart, efficiencyChart;
let efficiencyData = [12, 19, 15, 22, 14, 18, 25];

function init() {
    checkAuth();
    initTheme();
    initLiveClock();
    
    // Simulate loading
    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.add('hidden');
        initMap();
        initCharts();
        updateDashboard();
        updateCitizenPanel();
        setInterval(simulateBackendUpdate, 5000); 
    }, 1200);
    
    // Core UI Responders
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('clear-alerts').addEventListener('click', clearAlerts);
    
    // Profile Dropdown
    document.getElementById('profile-container').addEventListener('click', () => {
        document.getElementById('profile-dropdown').classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
        if(!e.target.closest('#profile-container')) {
            document.getElementById('profile-dropdown').classList.remove('active');
        }
    });

    // Inputs
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        updateDashboard();
    });
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') performSearchAction();
    });

    // Buttons
    document.getElementById('filterFullBtn').addEventListener('click', (e) => {
        fullFilterActive = !fullFilterActive;
        e.target.classList.toggle('btn-primary', fullFilterActive);
        e.target.classList.toggle('btn-outline', !fullFilterActive);
        updateDashboard();
    });

    const hmBtn = document.getElementById('heatmapToggleBtn');
    if(hmBtn) hmBtn.addEventListener('click', toggleHeatmap);
    
    const optBtn = document.getElementById('optimizeRouteBtn');
    if(optBtn) optBtn.addEventListener('click', optimizeRoute);
}

function checkAuth() {
    const sessionRole = localStorage.getItem('role') || 'admin';
    role = sessionRole;
    
    const avatar = document.getElementById('nav-avatar');
    const dName = document.getElementById('dropdown-name');
    const dEmail = document.getElementById('dropdown-email');
    const dRole = document.getElementById('dropdown-role');

    if (role === 'user') {
        const msg = document.getElementById('role-msg-panel');
        if(msg) {
            msg.style.display = 'block';
            msg.innerHTML = '<i class="ph ph-info"></i> Citizen Mode Active. Advanced algorithms restricted.';
        }
        let oBtn = document.getElementById('optimizeRouteBtn'); if(oBtn) oBtn.style.display = 'none';
        let hmBtn = document.getElementById('heatmapToggleBtn'); if(hmBtn) hmBtn.style.display = 'none';
        
        avatar.innerText = "U";
        avatar.style.backgroundColor = "var(--blue)";
        dName.innerText = "Citizen User";
        dEmail.innerText = "user@smartcity.gov";
        dRole.innerText = "Citizen";
        dRole.style.background = "var(--blue-bg)";
        dRole.style.color = "var(--blue)";
    } else {
        avatar.innerText = "A";
        avatar.style.backgroundColor = "var(--primary-dark)";
        dName.innerText = "Admin Console";
        dEmail.innerText = "admin@smartcity.gov";
        dRole.innerText = "Administrator";
    }
}

window.logout = function() {
    localStorage.removeItem('role');
    window.location.href = 'index.html';
}

function initLiveClock() {
    function updateClock() {
        const now = new Date();
        document.getElementById('live-time').innerText = now.toLocaleTimeString('en-US', { hour12: false });
        document.getElementById('live-date').innerText = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    updateClock();
    setInterval(updateClock, 1000);
}

function initMap() {
    map = L.map('map').setView([11.1271, 78.6569], 6); 
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    setTimeout(() => { map.invalidateSize(); updateMapMarkers(); }, 400);
}

function getMarkerColor(fillLevel) {
    if (fillLevel >= 80) return '#f43f5e'; 
    if (fillLevel >= 40) return '#eab308'; 
    return '#10b981';
}

function updateMapMarkers() {
    if(heatmapActive) return; // Managed by heatmap logic

    const visBins = getFilteredBins();

    bins.forEach(bin => {
        const isVisible = visBins.some(vb => vb.id === bin.id);

        if(!isVisible && markers[bin.id]) {
            map.removeLayer(markers[bin.id]); delete markers[bin.id]; return;
        }
        if(!isVisible) return; 

        const color = getMarkerColor(bin.fillLevel);
        const svgIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); transition: transform 0.3s; pointer-events: none;"></div>`,
            iconSize: [24, 24], iconAnchor: [12, 12]
        });

        if (markers[bin.id]) {
            markers[bin.id].setIcon(svgIcon);
            markers[bin.id].getPopup().setContent(generatePopupContent(bin));
        } else {
            const marker = L.marker([bin.lat, bin.lng], { icon: svgIcon }).addTo(map);
            marker.bindPopup(generatePopupContent(bin));
            markers[bin.id] = marker;
        }
    });
}

function generatePopupContent(bin) {
    return `<div style="font-family: 'Inter', sans-serif;">
        <strong style="margin-bottom:5px; display:block; font-size:1.1em;">${bin.id}</strong>
        <div style="display:flex; justify-content:space-between; width: 130px; margin-bottom: 2px;">
            <span>Fill Level:</span><b>${bin.fillLevel}%</b>
        </div>
        <div style="font-size: 0.85em; color: gray; margin-top: 5px;">
            ${bin.location} <br>Type: ${bin.type}
        </div>
    </div>`;
}

// === Heatmap Logic ===
function toggleHeatmap(e) {
    heatmapActive = !heatmapActive;
    e.currentTarget.classList.toggle('btn-primary', heatmapActive);
    e.currentTarget.classList.toggle('text-btn', !heatmapActive);
    
    if (heatmapActive) {
        // Clear normal markers
        Object.values(markers).forEach(m => map.removeLayer(m));
        markers = {};
        
        const heatPoints = bins.map(b => [b.lat, b.lng, b.fillLevel / 100]);
        heatLayer = L.heatLayer(heatPoints, { radius: 35, blur: 25, gradient: {0.3: 'green', 0.6: 'yellow', 1.0: 'red'} }).addTo(map);
    } else {
        if(heatLayer) map.removeLayer(heatLayer);
        updateMapMarkers();
    }
}

// === Route & Truck Logic ===
window.optimizeRoute = function() {
    if(heatmapActive) toggleHeatmap({currentTarget: document.getElementById('heatmapToggleBtn')}); // Force off
    
    const fullBins = bins.filter(b => b.fillLevel >= 80);
    if(fullBins.length === 0) {
        addAlert("No critical bins available for routing.", "warning");
        return;
    }
    
    // Clear old elements
    if(routeLine) map.removeLayer(routeLine);
    if(truckMarker) { map.removeLayer(truckMarker); truckMarker = null; }
    clearInterval(truckInterval);

    // Simplistic 'Nearest' coordinate mock (sort by longitude for visuals)
    const sorted = fullBins.sort((a,b) => a.lng - b.lng);
    const coords = sorted.map(b => [b.lat, b.lng]);

    // Draw Polyline
    routeLine = L.polyline(coords, {color: 'var(--red)', weight: 4, dashArray: '10, 10'}).addTo(map);
    map.fitBounds(routeLine.getBounds());

    addAlert(`Optimized Route via AI. Launching Virtual Collector Truck...`, 'critical');
    
    // Spawn Truck
    const tIcon = L.divIcon({
        className: 'truck-icon',
        html: `<div style="font-size: 2rem; transform: scaleX(-1); text-shadow: 0 4px 6px rgba(0,0,0,0.5);">🚛</div>`,
        iconSize: [40, 40], iconAnchor: [20, 20]
    });
    
    truckMarker = L.marker(coords[0], {icon: tIcon}).addTo(map);
    animateTruck(coords);
}

function animateTruck(points) {
    if(points.length < 2) return;
    let targetIdx = 1;
    let currentLat = points[0][0]; let currentLng = points[0][1];
    
    truckInterval = setInterval(() => {
        let tLat = points[targetIdx][0]; let tLng = points[targetIdx][1];
        
        // Simple linear interpolation
        currentLat += (tLat - currentLat) * 0.05;
        currentLng += (tLng - currentLng) * 0.05;
        
        truckMarker.setLatLng([currentLat, currentLng]);

        if(Math.abs(tLat - currentLat) < 0.01 && Math.abs(tLng - currentLng) < 0.01) {
            // Emptied bin arrival mockup
            let bin = bins.find(b => b.lat === tLat && b.lng === tLng);
            if(bin) bin.fillLevel = 0;

            targetIdx++;
            if(targetIdx >= points.length) {
                clearInterval(truckInterval);
                addAlert(`Truck finished collection route. Routes cleared.`, "warning");
                setTimeout(() => { 
                    if(routeLine) map.removeLayer(routeLine); 
                    if(truckMarker) map.removeLayer(truckMarker); 
                    updateDashboard(); 
                }, 3000);
            }
        }
    }, 50);
}

/* Charts & Analytics */
function getGlobalAvgFill() { return Math.floor(bins.reduce((a, b) => a + b.fillLevel, 0) / bins.length); }

function initCharts() {
    Chart.defaults.color = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#5e7a6d';
    Chart.defaults.font.family = "'Inter', sans-serif";

    fillTrendChart = new Chart(document.getElementById('fillTrendChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: ['10m', '8m', '6m', '4m', '2m', 'Now'],
            datasets: [{
                label: 'Avg Fill %', data: [35, 38, 42, 45, 48, getGlobalAvgFill()],
                borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 100, border: {display: false} }, x: { border: {display: false}, grid: { display: false } } } }
    });

    wasteTypeChart = new Chart(document.getElementById('wasteTypeChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Dry', 'Wet', 'Metal', 'Mixed'],
            datasets: [{ data: [3, 3, 1, 3], backgroundColor: ['#eab308', '#3b82f6', '#94a3b8', '#8b5cf6'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }
    });

    efficiencyChart = new Chart(document.getElementById('efficiencyChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{ label: 'Collections', data: efficiencyData, backgroundColor: '#3b82f6', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { y: { border: {display: false}}, x: { border: {display: false}, grid: { display: false } } } }
    });
}

// Prediction updating
function updatePredictivePanel() {
    const box = document.getElementById('predictive-box');
    if(!box) return;
    const sorted = [...bins].sort((a,b)=> b.fillLevel - a.fillLevel).filter(b => b.fillLevel >= 50 && b.fillLevel < 100);
    
    if(sorted.length > 0) {
        const top = sorted[0];
        // completely mock formula for UI logic
        const hoursLeft = (100 - top.fillLevel) / 10;
        box.innerHTML = `
            <div style="background: var(--glass-bg); padding: 0.75rem; border-radius: 8px; border-left: 3px solid var(--purple); animation: slideIn 0.5s;">
                <strong style="color:var(--text-main);">${top.id} (${top.location})</strong>
                <p style="margin-top: 0.25rem;">Predicted to reach critical capacity in <b>${hoursLeft.toFixed(1)} hours</b>.</p>
            </div>
        `;
    } else {
        box.innerHTML = `<p style="color:var(--text-muted); text-align:center;">All systems under control.</p>`;
    }
}

function updateCharts() {
    const data = fillTrendChart.data.datasets[0].data;
    data.shift(); data.push(getGlobalAvgFill());
    fillTrendChart.update();
    
    wasteTypeChart.data.datasets[0].data = [
        bins.filter(b=>b.type==='Dry').length, bins.filter(b=>b.type==='Wet').length,
        bins.filter(b=>b.type==='Metal').length, bins.filter(b=>b.type==='Mixed').length
    ];
    wasteTypeChart.update();

    if(Math.random() > 0.8) { efficiencyData[6] += 1; efficiencyChart.update(); }
    updatePredictivePanel();
}

function updateDashboard() {
    let full = 0; let medium = 0; let empty = 0;
    const visBins = getFilteredBins();

    visBins.forEach(bin => {
        if (bin.fillLevel >= 80) full++; else if (bin.fillLevel >= 40) medium++; else empty++;
    });

    document.getElementById('stat-total').innerText = bins.length;
    document.getElementById('stat-full').innerText = full;
    document.getElementById('stat-half').innerText = medium;
    document.getElementById('stat-empty').innerText = empty;
    document.getElementById('stat-alerts').innerText = alerts.length;
    document.getElementById('nav-badge').innerText = alerts.length;
    
    updateTable();
    if(heatmapActive) {
        if(heatLayer) map.removeLayer(heatLayer);
        heatLayer = L.heatLayer(bins.map(b => [b.lat, b.lng, b.fillLevel / 100]), { radius: 35, blur: 25, gradient: {0.4: 'green', 0.7: 'yellow', 1.0: 'red'} }).addTo(map);
    } else {
        updateMapMarkers();
    }
}

// Search and Table Filters
function getFilteredBins() {
    return bins.filter(bin => {
        const matchesSearch = bin.id.toLowerCase().includes(searchQuery) || bin.location.toLowerCase().includes(searchQuery);
        return matchesSearch && (fullFilterActive ? bin.fillLevel >= 80 : true);
    });
}

function performSearchAction() {
    if (!searchQuery) return;
    if(heatmapActive) toggleHeatmap({currentTarget: document.getElementById('heatmapToggleBtn')});
    
    const targets = getFilteredBins();
    if (targets.length === 1 && markers[targets[0].id] && role !== 'user') {
        const t = targets[0];
        map.flyTo([t.lat, t.lng], 16, { animate: true, duration: 1.5 });
        markers[t.id].openPopup();
        const tr = document.getElementById(`row-${t.id}`);
        if(tr) {
            tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
            tr.classList.remove('row-highlight'); void tr.offsetWidth; tr.classList.add('row-highlight');
        }
    }
}

function updateTable() {
    const tbody = document.querySelector('#bin-table tbody');
    tbody.innerHTML = '';
    const sortedBins = [...getFilteredBins()].sort((a, b) => b.fillLevel - a.fillLevel);

    if(sortedBins.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem;"><i class="ph ph-x-circle" style="font-size: 2rem; color: var(--red); display:block;"></i> No results.</td></tr>`;
        return;
    }

    sortedBins.forEach(bin => {
        const tr = document.createElement('tr'); tr.id = `row-${bin.id}`;
        let status = { label: 'Empty', class: 'tag-empty', icon: 'ph-check-circle' };
        if(bin.fillLevel >= 80) status = { label: 'Full', class: 'tag-full', icon: 'ph-warning-circle' };
        else if(bin.fillLevel >= 40) status = { label: 'Medium', class: 'tag-medium', icon: 'ph-battery-medium' };

        tr.innerHTML = `
            <td><strong>${bin.id}</strong></td><td>${bin.location}</td>
            <td>
                <div style="display:flex; align-items:center; gap:0.5rem; min-width: 100px;">
                    <div style="flex:1; height:6px; background:var(--table-border); border-radius:3px; overflow:hidden;">
                        <div style="width:${bin.fillLevel}%; height:100%; background:var(--${status.class.split('-')[1]});"></div>
                    </div>
                    <span style="font-size:0.8rem; font-weight:600;">${bin.fillLevel}%</span>
                </div>
            </td>
            <td>${bin.type}</td>
            <td><span class="status-tag ${status.class}"><i class="ph ${status.icon}"></i> ${status.label}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateCitizenPanel() {
    const t = document.getElementById('stat-reports-total');
    const p = document.getElementById('stat-reports-pending');
    const r = document.getElementById('stat-reports-resolved');
    if(t) t.innerText = citTotal; 
    if(p) p.innerText = citPending; 
    if(r) r.innerText = citResolved;
}

window.toggleReportModal = function() { document.getElementById('reportModal').classList.toggle('hidden'); }

window.submitReport = function() {
    const loc = document.getElementById('reportLocation').value || 'Unknown Hub';
    const status = document.getElementById('reportStatus').value;
    
    addAlert(`Citizen logged Bin at ${loc} is ${status}`, status === 'Full' ? 'critical' : 'warning');
    if(status === 'Full') {
        if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`New Citizen Report: Bin at ${loc} requires emptying.`));
    }
    
    // Impact Citizen Counters
    citTotal++; citPending++;
    updateCitizenPanel();

    toggleReportModal();
    document.getElementById('reportLocation').value = '';
}

function addAlert(message, type) {
    const newAlert = { id: Date.now(), message, type, time: new Date() };
    alerts.unshift(newAlert);
    if(alerts.length > 20) alerts.pop();
    renderAlerts(); updateDashboard();
}

function renderAlerts() {
    const ul = document.getElementById('alerts-list');
    ul.innerHTML = '';
    if (alerts.length === 0) {
        ul.innerHTML = '<li style="text-align:center; color:var(--text-muted); padding: 1.5rem; font-size: 0.9rem;">No active alerts</li>'; return;
    }
    alerts.forEach(alert => {
        const li = document.createElement('li'); li.className = `alert-item ${alert.type}`;
        const icon = alert.type === 'critical' ? 'ph-warning-octagon' : 'ph-bell-ringing';
        const timeStr = alert.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        li.innerHTML = `
            <div class="alert-icon"><i class="ph ${icon}"></i></div>
            <div class="alert-content alert-text-wrapper">
                <p>${alert.message}</p> <div class="alert-time">${timeStr}</div>
            </div>
            <button class="icon-btn-sm" style="margin-left:auto;" onclick="removeAlert(${alert.id})"><i class="ph ph-x"></i></button>
        `;
        ul.appendChild(li);
    });
}
window.removeAlert = function(id) { alerts = alerts.filter(a => a.id !== id); renderAlerts(); updateDashboard(); }
window.clearAlerts = function() { alerts = []; renderAlerts(); updateDashboard(); }

window.exportToCSV = function() {
    let csvData = 'Bin ID,Location,Fill Level,Type,Last Updated\n';
    bins.forEach(b => csvData += `${b.id},"${b.location}",${b.fillLevel}%,${b.type},${b.lastUpdated.toLocaleString()}\n`);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.setAttribute('hidden', ''); a.setAttribute('href', url);
    a.setAttribute('download', 'smart_waste_ai_report.csv');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function simulateBackendUpdate() {
    bins.forEach(bin => {
        const rand = Math.random();
        if (rand > 0.95 && bin.fillLevel > 50) {
            bin.fillLevel = 0;
            if(Math.random() > 0.5) { citPending--; citResolved++; updateCitizenPanel(); }
            addAlert(`Collector cleared ${bin.id}`, 'warning');
            efficiencyData[6] += 1;
        } else if (rand > 0.3) {
            bin.fillLevel = Math.min(100, bin.fillLevel + Math.floor(Math.random() * 8));
            if (bin.fillLevel >= 80 && bin.fillLevel - 8 < 80) {
                addAlert(`Critical Request: ${bin.id} is full`, 'critical');
            }
        }
        bin.lastUpdated = new Date();
    });
    updateDashboard(); updateCharts();
}

function initTheme() {
    document.body.className = localStorage.getItem('theme') || 'theme-light';
    const btn = document.getElementById('theme-toggle');
    if(btn) btn.innerHTML = document.body.classList.contains('theme-dark') ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
}
function toggleTheme() {
    document.body.className = document.body.classList.contains('theme-dark') ? 'theme-light' : 'theme-dark';
    localStorage.setItem('theme', document.body.className);
    initTheme();
    if(fillTrendChart) { Chart.defaults.color = getComputedStyle(document.body).getPropertyValue('--text-muted').trim(); fillTrendChart.update(); wasteTypeChart.update(); efficiencyChart.update(); }
}
document.addEventListener('DOMContentLoaded', init);
