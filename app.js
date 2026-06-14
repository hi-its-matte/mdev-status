// ============================================
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyAEFrPo6tw8DP7K-4a0jq5Pv6xY4bQCiv8",
  authDomain: "mdev-status.firebaseapp.com",
  databaseURL: "https://mdev-status-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mdev-status",
  storageBucket: "mdev-status.firebasestorage.app",
  messagingSenderId: "1040765806508",
  appId: "1:1040765806508:web:ea6993488f24e69e6ffc09"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ============================================
// DOM ELEMENTS (will be initialized in init())
// ============================================
let appsContainer;
let serverStatusElement;
let aiStatusElement;
let serverPulse;
let aiPulse;
let serverLastCheck;
let serverUptime;
let aiLastCheck;
let lastUpdateElement;
let totalAppsElement;
let onlineAppsElement;
let offlineAppsElement;

// ============================================
// STATE MANAGEMENT
// ============================================
let serverIsOnline = false;
let aiIsOnline = false;
let allApps = {};
let serverHealthCheckCount = 0;
let serverHealthCheckSuccess = 0;
// AI health is derived from server state; no independent counters

// ============================================
// HEALTH CHECK - SERVER
// ============================================
async function checkServerHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://health-api.mattedev.com', {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    serverIsOnline = response.ok;
    if (serverIsOnline) serverHealthCheckSuccess++;
  } catch (error) {
    serverIsOnline = false;
    console.log('Server offline:', error.message);
  }
  
  serverHealthCheckCount++;
  updateServerStatus();
  // AI depends on the server: se il server è online, anche l'AI è considerata online
  updateAIStatus();
}

// NOTE: AI health is derived from the server state. No independent health check is
// executed client-side to avoid inconsistent UX when the AI is known to depend
// on the main API server.

// Update della UI per lo stato del server
function updateServerStatus() {
  const timestamp = new Date().toLocaleTimeString('it-IT', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
  
  if (serverIsOnline) {
    if (serverStatusElement) serverStatusElement.innerHTML = '<span class="status-badge online">✓ ONLINE</span>';
    if (serverPulse) { serverPulse.classList.add('online'); serverPulse.classList.remove('offline'); }
  } else {
    if (serverStatusElement) serverStatusElement.innerHTML = '<span class="status-badge offline">✗ OFFLINE</span>';
    if (serverPulse) { serverPulse.classList.remove('online'); serverPulse.classList.add('offline'); }
  }
  
  if (serverLastCheck) serverLastCheck.textContent = timestamp;
  
  // Calcola uptime
  if (serverHealthCheckCount > 0 && serverUptime) {
    const uptime = Math.round((serverHealthCheckSuccess / serverHealthCheckCount) * 100);
    serverUptime.textContent = uptime + '%';
  }
  
  updateLastUpdate();
}

// Update della UI per lo stato dell'AI
function updateAIStatus() {
  // L'AI dipende dallo stato del server: se il server è online, l'AI è considerata
  // online. Usiamo lo stesso timestamp dell'ultimo check del server.
  const timestamp = serverLastCheck ? serverLastCheck.textContent : new Date().toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  aiIsOnline = !!serverIsOnline;

  if (aiIsOnline) {
    if (aiStatusElement) aiStatusElement.innerHTML = '<span class="status-badge online">✓ ONLINE</span>';
    if (aiPulse) { aiPulse.classList.add('online'); aiPulse.classList.remove('offline'); }
    document.getElementById('ai-status-card')?.classList.remove('disabled');
  } else {
    if (aiStatusElement) aiStatusElement.innerHTML = '<span class="status-badge offline">✗ OFFLINE</span>';
    if (aiPulse) { aiPulse.classList.remove('online'); aiPulse.classList.add('offline'); }
    document.getElementById('ai-status-card')?.classList.add('disabled');
  }

  if (aiLastCheck) aiLastCheck.textContent = timestamp;
  updateLastUpdate();
}

// ============================================
// FIREBASE - LOAD APPLICATIONS
// ============================================
function loadApplications() {
  db.ref("/nomeapp").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    allApps = data;
    
    // Calcola statistiche
    const apps = Object.entries(data);
    const totalApps = apps.length;
    const onlineCount = apps.filter(([_, app]) => app.working).length;
    const offlineCount = totalApps - onlineCount;
    
    // Aggiorna statistiche nella hero section
    if (totalAppsElement) totalAppsElement.textContent = totalApps;
    if (onlineAppsElement) onlineAppsElement.textContent = onlineCount;
    if (offlineAppsElement) offlineAppsElement.textContent = offlineCount;
    
    // Renderizza le card
    renderApplicationCards(data);
    updateLastUpdate();
  });
}

// Render delle application cards
function renderApplicationCards(data) {
  if (!appsContainer) return;
  appsContainer.innerHTML = "";

  const apps = Object.entries(data);
  
  if (apps.length === 0) {
    appsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-tertiary);">Nessuna applicazione monitorata</div>';
    return;
  }

  apps.forEach(([appName, appData]) => {
    const isWorking = appData.working;
    
    const card = document.createElement("div");
    card.classList.add("app-card");
    card.classList.add(isWorking ? "online" : "offline");

    card.innerHTML = `
      <div class="app-header">
        <h3>${escapeHtml(appName)}</h3>
        <div class="app-indicator ${isWorking ? 'online' : 'offline'}"></div>
      </div>
      <p class="app-description">Stato attuale dell'applicazione</p>
      <div class="app-status-badge ${isWorking ? 'online' : 'offline'}">
        ${isWorking ? '✓ ONLINE' : '✗ OFFLINE'}
      </div>
    `;

    appsContainer.appendChild(card);
  });
}

// Utility per escapare HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// UPDATE TIMESTAMP
// ============================================
function updateLastUpdate() {
  const now = new Date().toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  if (lastUpdateElement) lastUpdateElement.textContent = now;
}

// ============================================
// MAIN INITIALIZATION
// ============================================
function init() {
  // Initialize DOM references (do this here to ensure elements exist)
  appsContainer = document.getElementById('apps-container');
  serverStatusElement = document.getElementById('server-status');
  aiStatusElement = document.getElementById('ai-status');
  serverPulse = document.getElementById('server-pulse');
  aiPulse = document.getElementById('ai-pulse');
  serverLastCheck = document.getElementById('server-last-check');
  serverUptime = document.getElementById('server-uptime');
  aiLastCheck = document.getElementById('ai-last-check');
  lastUpdateElement = document.getElementById('last-update');
  totalAppsElement = document.getElementById('total-apps');
  onlineAppsElement = document.getElementById('online-apps');
  offlineAppsElement = document.getElementById('offline-apps');
  // Carica le applicazioni da Firebase
  loadApplications();
  
  // Primo health check
  checkServerHealth();

  // Aggiorna lo stato del server (e quindi dell'AI) ogni 30 secondi
  setInterval(checkServerHealth, 30000);
  
  // Aggiorna il timestamp ogni 1 secondo
  setInterval(updateLastUpdate, 1000);
  
  // Log iniziale
  console.log('MatteDev Status Monitor initialized');
}

// Avvia quando il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
