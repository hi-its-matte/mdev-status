
  // 🔹 Config Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyAEFrPo6tw8DP7K-4a0jq5Pv6xY4bQCiv8",
    authDomain: "mdev-status.firebaseapp.com",
    databaseURL: "https://mdev-status-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "mdev-status",
    storageBucket: "mdev-status.firebasestorage.app",
    messagingSenderId: "1040765806508",
    appId: "1:1040765806508:web:ea6993488f24e69e6ffc09"
  };

  // 🔹 INIT
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  // 🔹 CONTAINER
  const container = document.getElementById("apps-container");

  // 🔄 READ ONLY (REALTIME)
  db.ref("/nomeapp").on("value", (snapshot) => {
    const data = snapshot.val() || {}; // evita errori se DB vuoto

    container.innerHTML = "";

    Object.keys(data).forEach(appName => {
      const app = data[appName];
      const isWorking = app.working;

      const card = document.createElement("div");
      card.classList.add("project");

      card.innerHTML = `
        <h3>${appName}</h3>
        <p>Stato attuale dell'applicazione</p>

        <div class="status-badge ${isWorking ? "online" : "offline"}">
          ${isWorking ? "ONLINE" : "OFFLINE"}
        </div>
      `;

      container.appendChild(card);
    });
  });
