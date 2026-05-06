// Ganti dengan API Key Google Maps Anda
const GOOGLE_MAPS_API_KEY = 'AIzaSyCSSvbZkADfSSplx6nVWj6s5h1fogrcaA4'; // Dapatkan di https://console.cloud.google.com

let map, adminMap;
let playerLocation, gameCenter;
let treasures = [];
let foundTreasures = new Set();
let currentQuiz = null;
let playerId = '';
let isAdminMode = false;
let gameActive = false;
let watchId;

// Soal-soal kuis (bisa ditambah/disesuaikan)
const quizBank = [
    {
        question: "Ibukota Indonesia adalah?",
        options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
        correct: 0
    },
    {
        question: "Planet terdekat dengan matahari?",
        options: ["Venus", "Merkurius", "Mars", "Bumi"],
        correct: 1
    },
    {
        question: "1 + 1 = ?",
        options: ["2", "3", "1", "0"],
        correct: 0
    },
    {
        question: "Air terdiri dari unsur?",
        options: ["H2O", "CO2", "NaCl", "O2"],
        correct: 0
    },
    {
        question: "Siapa presiden pertama Indonesia?",
        options: ["Soekarno", "Hatta", "Suharto", "Megawati"],
        correct: 0
    },
    {
        question: "Berapa jumlah hari dalam seminggu?",
        options: ["5", "6", "7", "8"],
        correct: 2
    },
    {
        question: "Warna bendera Indonesia?",
        options: ["Merah Putih", "Biru Putih", "Merah Biru", "Putih Hitam"],
        correct: 0
    },
    {
        question: "2 x 3 = ?",
        options: ["5", "6", "7", "8"],
        correct: 1
    },
    {
        question: "Gunung tertinggi di Indonesia?",
        options: ["Rinjani", "Merapi", "Mahameru", "Slamet"],
        correct: 2
    },
    {
        question: "Ibu kota provinsi Jawa Barat?",
        options: ["Jakarta", "Bandung", "Semarang", "Yogyakarta"],
        correct: 1
    }
];

function initMaps() {
    // Map utama pemain (radius 10m tidak bisa zoom)
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -6.2088, lng: 106.8456 }, // Default Jakarta
        zoom: 18,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: false,
        scrollwheel: false,
        draggable: false,
        gestureHandling: 'none',
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });

    // Map admin
    adminMap = new google.maps.Map(document.getElementById('adminMap'), {
        center: { lat: -6.2088, lng: 106.8456 },
        zoom: 16,
        disableDefaultUI: true
    });

    // Circle radius 10m untuk map utama
    new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.1,
        map: map,
        center: map.getCenter(),
        radius: 10 // 10 meter
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Login mode toggle
    document.getElementById('playerBtn').addEventListener('click', () => {
        document.getElementById('playerBtn').classList.add('active');
        document.getElementById('adminBtn').classList.remove('active');
        document.getElementById('playerId').style.display = 'block';
    });

    document.getElementById('adminBtn').addEventListener('click', () => {
        document.getElementById('adminBtn').classList.add('active');
        document.getElementById('playerBtn').classList.remove('active');
        document.getElementById('playerId').style.display = 'none';
    });

    // Start game
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('backBtn').addEventListener('click', () => showScreen('login'));
    document.getElementById('adminBackBtn').addEventListener('click', () => showScreen('login'));

    // Admin functions
    document.getElementById('setCenterBtn').addEventListener('click', setGameCenter);
    document.getElementById('generateTreasures').addEventListener('click', generateTreasures);
    document.getElementById('startGameAdmin').addEventListener('click', activateGame);

    // Game modals
    document.getElementById('quizSubmit').addEventListener('click', submitQuiz);
    document.getElementById('continueBtn').addEventListener('click', closeFoundModal);
    document.getElementById('restartBtn').addEventListener('click', restartGame);

    initGame();
});

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (screen === 'game') {
        document.getElementById('gameScreen').classList.add('active');
        startLocationTracking();
    } else if (screen === 'admin') {
        document.getElementById('adminScreen').classList.add('active');
    } else {
        document.getElementById('loginScreen').classList.add('active');
        stopLocationTracking();
    }
}

function startGame() {
    playerId = document.getElementById('playerId').value.trim() || 'Player';
    isAdminMode = document.getElementById('adminBtn').classList.contains('active');
    
    if (isAdminMode) {
        showScreen('admin');
    } else if (playerId) {
        showScreen('game');
    } else {
        alert('Masukkan ID pemain!');
    }
}

function initGame() {
    // Load saved game data
    loadGameData();
    
    if (gameActive) {
        document.getElementById('gameStatus').textContent = '✅ Permainan Aktif';
        document.getElementById('gameStatus').className = 'status-active';
    }
}

function startLocationTracking() {
    if (!navigator.geolocation) {
        alert('Geolocation tidak didukung!');
        return;
    }

    watchId = navigator.geolocation.watchPosition(
        updatePlayerLocation,
        handleLocationError,
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 1000
        }
    );
}

function stopLocationTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
}

function updatePlayerLocation(position) {
    playerLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
    };

    // Update map center (tetap radius 10m)
    map.setCenter(playerLocation);
    
    document.getElementById('accuracy').textContent = `Akurasi: ${Math.round(playerLocation.accuracy)}m`;
    
    // Check nearby treasures
    checkNearbyTreasures();
    
    // Update distance to nearest treasure
    updateNearestTreasureDistance();
}

function checkNearbyTreasures() {
    if (!playerLocation || !gameActive) return;

    treasures.forEach((treasure, index) => {
        if (foundTreasures.has(index)) return;

        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(playerLocation),
            new google.maps.LatLng(treasure.lat, treasure.lng)
        );

        // Kotak ditemukan jika < 3 meter
        if (distance <= 3) {
            showQuiz(index);
        }
    });
}

function updateNearestTreasureDistance() {
    if (!playerLocation || !gameActive || foundTreasures.size >= 10) {
        document.getElementById('distance').textContent = 'Semua kotak ditemukan!';
        return;
    }

    let nearestDistance = Infinity;
    let nearestIndex = -1;

    treasures.forEach((treasure, index) => {
        if (foundTreasures.has(index)) return;

        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(playerLocation),
            new google.maps.LatLng(treasure.lat, treasure.lng)
        );

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
        }
    });

    if (nearestIndex !== -1) {
        const distanceText = nearestDistance < 1000 ? 
            `${Math.round(nearestDistance)}m` : 
            `${(nearestDistance/1000).toFixed(1)}km`;
        document.getElementById('distance').textContent = 
            `Kotak terdekat: ${distanceText}`;
    }
}

function showQuiz(treasureIndex) {
    currentQuiz = {
        treasureIndex: treasureIndex,
        quiz: quizBank[Math.floor(Math.random() * quizBank.length)]
    };

    const modal = document.getElementById('quizModal');
    const content = document.getElementById('quizContent');
    
    content.innerHTML = `
        <div class="quiz-question">${currentQuiz.quiz.question}</div>
        <div class="quiz-options">
            ${currentQuiz.quiz.options.map((option, i) => 
                `<div class="quiz-option" data-index="${i}">${option}</div>`
            ).join('')}
        </div>
    `;

    // Quiz option handlers
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    modal.classList.add('active');
}

function submitQuiz() {
    const selected = document.querySelector('.quiz-option.selected');
    if (!selected) {
        alert('Pilih jawaban!');
        return;
    }

    const answerIndex = parseInt(selected.dataset.index);
    const isCorrect = answerIndex === currentQuiz.quiz.correct;

    document.getElementById('quizModal').classList.remove('active');

    if (isCorrect) {
        foundTreasures.add(currentQuiz.treasureIndex);
        document.getElementById('foundCount').textContent = foundTreasures.size;
        showFoundModal(currentQuiz.treasureIndex);
        saveGameData();
    } else {
        showFoundModal(currentQuiz.treasureIndex, false);
    }
}

function showFoundModal(treasureIndex, success = true) {
    const modal = document.getElementById('foundModal');
    const message = document.getElementById('foundMessage');
    
    if (success) {
        message.innerHTML = `Kotak ${treasureIndex + 1} berhasil dibuka!<br>📦 Harta karun didapat!`;
    } else {
        message.innerHTML = `Jawaban salah!<br>Kotak ${treasureIndex + 1} masih terkunci 🔒`;
    }
    
    modal.classList.add('active');
    
    if (foundTreasures.size >= 10) {
        setTimeout(() => {
            document.getElementById('foundModal').classList.remove('active');
            document.getElementById('completeModal').classList.add('active');
        }, 2000);
    }
}

function closeFoundModal() {
    document.getElementById('foundModal').classList.remove('active');
}

function restartGame() {
    foundTreasures.clear();
    document.getElementById('foundCount').textContent = '0';
    document.getElementById('completeModal').classList.remove('active');
    showScreen('login');
}

// Admin Functions
function setGameCenter() {
    gameCenter = adminMap.getCenter();
    alert(`Area permainan diset di:\nLat: ${gameCenter.lat().toFixed(6)}\nLng: ${gameCenter.lng().toFixed(6)}`);
}

function generateTreasures() {
    if (!gameCenter) {
        alert('Set area permainan terlebih dahulu!');
        return;
    }

    const count = parseInt(document.getElementById('treasureCount').value) || 10;
    treasures = [];

    for (let i = 0; i < count; i++) {
        // Generate random location dalam radius 500m dari center
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 500; // max 500m
        const lat = gameCenter.lat() + (radius / 111111) * Math.cos(angle);
        const lng = gameCenter.lng() + (radius / 111111) * Math.cos(angle) / Math.cos(gameCenter.lat() * Math.PI / 180);

        treasures.push({ lat, lng });
    }

    displayTreasureList();
    saveGameData();
}

function displayTreasureList() {
    const list = document.getElementById('treasureList');
    list.innerHTML = treasures.map((t, i) => `
        <div class="treasure-item">
            <span>Kotak ${i + 1}: ${t.lat.toFixed(6)}, ${t.lng.toFixed(6)}</span>
            <button onclick="removeTreasure(${i})">Hapus</button>
        </div>
    `).join('');
}

function removeTreasure(index) {
    treasures.splice(index, 1);
    displayTreasureList();
    saveGameData();
}

function activateGame() {
    if (treasures.length === 0) {
        alert('Buat kotak harta karun terlebih dahulu!');
        return;
    }

    gameActive = true;
    document.getElementById('gameStatus').textContent = '✅ Permainan Aktif - Pemain bisa mulai bermain!';
    document.getElementById('gameStatus').className = 'status-active';
    saveGameData();
}

// Data Persistence
function saveGameData() {
    const data = {
        treasures: treasures,
        gameActive: gameActive,
        gameCenter: gameCenter ? { lat: gameCenter.lat(), lng: gameCenter.lng() } : null
    };
    localStorage.setItem('treasureHuntData', JSON.stringify(data));
}

function loadGameData() {
    const data = localStorage.getItem('treasureHuntData');
    if (data) {
        const parsed = JSON.parse(data);
        treasures = parsed.treasures || [];
        gameActive = parsed.gameActive || false;
        if (parsed.gameCenter) {
            gameCenter = parsed.gameCenter;
        }
    }
}

function handleLocationError(error) {
    let message;
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = "Lokasi ditolak. Izinkan akses lokasi untuk bermain.";
            break;
        case error.POSITION_UNAVAILABLE:
            message = "Informasi lokasi tidak tersedia.";
            break;
        case error.TIMEOUT:
            message = "Timeout mencari lokasi.";
            break;
        default:
            message = "Error tidak diketahui.";
    }
    document.getElementById('accuracy').textContent = message;
}

// Inisialisasi maps saat API loaded
window.initMaps = initMaps;
