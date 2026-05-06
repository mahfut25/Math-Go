// GANTI INI DENGAN API KEY ANDA!
const GOOGLE_MAPS_API_KEY = 'AIzaSyCSSvbZkADfSSplx6nVWj6s5h1fogrcaA4'; 

let map, adminMap, playerLocation, gameCenter, treasures=[], foundTreasures=new Set(), currentQuiz, playerId='', isAdminMode=false, gameActive=false, watchId;
const quizBank=[{question:"Ibukota Indonesia?",options:["Jakarta","Bandung","Surabaya","Medan"],correct:0},{question:"Planet terdekat matahari?",options:["Venus","Merkurius","Mars","Bumi"],correct:1},{question:"1+1=?",options:["2","3","1","0"],correct:0},{question:"Air=?",options:["H2O","CO2","NaCl","O2"],correct:0},{question:"Presiden 1 RI?",options:["Soekarno","Hatta","Suharto","Megawati"],correct:0},{question:"Hari dalam seminggu?",options:["5","6","7","8"],correct:2},{question:"Bendera RI?",options:["Merah Putih","Biru Putih","Merah Biru","Putih Hitam"],correct:0},{question:"2x3=?",options:["5","6","7","8"],correct:1},{question:"Gunung tertinggi RI?",options:["Rinjani","Merapi","Mahameru","Slamet"],correct:2},{question:"Ibu kota Jabar?",options:["Jakarta","Bandung","Semarang","Yogyakarta"],correct:1}];

function initMaps(){map=new google.maps.Map(document.getElementById('map'),{center:{lat:-6.2088,lng:106.8456},zoom:19,disableDefaultUI:true,zoomControl:false,scrollwheel:false,draggable:false,gestureHandling:'none'});adminMap=new google.maps.Map(document.getElementById('adminMap'),{center:{lat:-6.2088,lng:106.8456},zoom:16,disableDefaultUI:true});new google.maps.Circle({strokeColor:'#FF0000',strokeOpacity:.8,strokeWeight:2,fillColor:'#FF0000',fillOpacity:.1,map:map,center:map.getCenter(),radius:10});}

document.addEventListener('DOMContentLoaded',()=>{document.getElementById('playerBtn').onclick=()=>{document.getElementById('playerBtn').classList.add('active');document.getElementById('adminBtn').classList.remove('active')};document.getElementById('adminBtn').onclick=()=>{document.getElementById('adminBtn').classList.add('active');document.getElementById('playerBtn').classList.remove('active')};document.getElementById('startBtn').onclick=startGame;document.getElementById('backBtn').onclick=()=>showScreen('login');document.getElementById('adminBackBtn').onclick=()=>showScreen('login');document.getElementById('setCenterBtn').onclick=setGameCenter;document.getElementById('generateTreasures').onclick=generateTreasures;document.getElementById('startGameAdmin').onclick=activateGame;document.getElementById('quizSubmit').onclick=submitQuiz;document.getElementById('continueBtn').onclick=closeFoundModal;document.getElementById('restartBtn').onclick=restartGame;initGame();});

function showScreen(s){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));s==='game'?document.getElementById('gameScreen').classList.add('active')&&startLocationTracking():s==='admin'?document.getElementById('adminScreen').classList.add('active'):document.getElementById('loginScreen').classList.add('active')&&stopLocationTracking();}

function startGame(){playerId=document.getElementById('playerId').value||'Player';isAdminMode=document.getElementById('adminBtn').classList.contains('active');isAdminMode?showScreen('admin'):playerId&&showScreen('game');}

function initGame(){const d=localStorage.getItem('treasureHuntData');if(d){const p=JSON.parse(d);treasures=p.treasures||[];gameActive=p.gameActive||false;if(p.gameCenter)gameCenter=p.gameCenter;}if(gameActive){document.getElementById('gameStatus').textContent='✅ Game Aktif';document.getElementById('gameStatus').className='status-active';}}

function startLocationTracking(){navigator.geolocation.watchPosition(updatePlayerLocation,handleLocationError,{enableHighAccuracy:true,timeout:5000,maximumAge:1000});}

function stopLocationTracking(){if(watchId)navigator.geolocation.clearWatch(watchId);}

function updatePlayerLocation(p){playerLocation={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};map.setCenter(playerLocation);document.getElementById('accuracy').textContent=`Akurasi: ${Math.round(playerLocation.accuracy)}m`;checkNearbyTreasures();updateNearestTreasureDistance();}

function checkNearbyTreasures(){if(!playerLocation||!gameActive)return;treasures.forEach((t,i)=>{if(foundTreasures.has(i))return;const d=google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(playerLocation),new google.maps.LatLng(t.lat,t.lng));if(d<=3)showQuiz(i);});}

function updateNearestTreasureDistance(){if(!playerLocation||!gameActive||foundTreasures.size>=10){document.getElementById('distance').textContent='Semua ditemukan!';return;}let n=Infinity,i=-1;treasures.forEach((t,x)=>{if(foundTreasures.has(x))return;const d=google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(playerLocation),new google.maps.LatLng(t.lat,t.lng));if(d<n){n=d;i=x;}});if(i!==-1){const t=n<1000?`${Math.round(n)}m`:`${(n/1000).toFixed(1)}km`;document.getElementById('distance').textContent=`Ter dekat: ${t}`;}}

function showQuiz(i){currentQuiz={treasureIndex:i,quiz:quizBank[Math.floor(Math.random()*quizBank.length)]};const m=document.getElementById('quizModal'),c=document.getElementById('quizContent');c.innerHTML=`<div class="quiz-question">${currentQuiz.quiz.question}</div><div class="quiz-options">${currentQuiz.quiz.options.map((o,x)=`<div class="quiz-option" data-index="${x}">${o}</div>`).join('')}</div>`;document.querySelectorAll('.quiz-option').forEach(o=>o.onclick=function(){document.querySelectorAll('.quiz-option').forEach(x=>x.classList.remove('selected'));this.classList.add('selected');});m.classList.add('active');}

function submitQuiz(){const s=document.querySelector('.quiz-option.selected');if(!s){alert('Pilih jawaban!');return;}const a=parseInt(s.dataset.index),c=currentQuiz.quiz.correct===a;document.getElementById('quizModal').classList.remove('active');c?(foundTreasures.add(currentQuiz.treasureIndex),document.getElementById('foundCount').textContent=foundTreasures.size,showFoundModal(currentQuiz.treasureIndex),saveGameData()):showFoundModal(currentQuiz.treasureIndex,false);}

function showFoundModal(i,s=true){const m=document.getElementById('foundModal'),g=document.getElementById('foundMessage');g.innerHTML=s?`Kotak ${i+1} berhasil! 📦`:`Jawaban salah! 🔒`;m.classList.add('active');if(foundTreasures.size>=10)setTimeout(()=>{m.classList.remove('active');document.getElementById('completeModal').classList.add('active');},1500);}

function closeFoundModal(){document.getElementById('foundModal').classList.remove('active');}

function restartGame(){foundTreasures.clear();document.getElementById('foundCount').textContent='0';document.getElementById('completeModal').classList.remove('active');showScreen('login');}

function setGameCenter(){gameCenter=adminMap.getCenter();alert(`Area: ${gameCenter.lat().toFixed(6)}, ${gameCenter.lng().toFixed(6)}`);}

function generateTreasures(){if(!gameCenter){alert('Set area dulu!');return;}const c=parseInt(document.getElementById('treasureCount').value)||10;treasures=[];for(let i=0;i<c;i++){const a=Math.random()*Math.PI*2,r=Math.random()*500,l=gameCenter.lat()+(r/111111)*Math.cos(a),g=gameCenter.lng()+(r/111111)*Math.cos(a)/Math.cos(gameCenter.lat()*Math.PI/180);treasures.push({lat:l,lng:g});}displayTreasureList();saveGameData();}

function displayTreasureList(){document.getElementById('treasureList').innerHTML=treasures.map((t,i)=>`<div class="treasure-item"><span>Kotak ${i+1}: ${t.lat.toFixed(6)}, ${t.lng.toFixed(6)}</span></div>`).join('');}

function activateGame(){if(treasures.length===0){alert('Buat kotak dulu!');return;}gameActive=true;document.getElementById('gameStatus').textContent='✅ Game Aktif!';document.getElementById('gameStatus').className='status-active';saveGameData();}

function saveGameData(){localStorage.setItem('treasureHuntData',JSON.stringify({treasures,gameActive,gameCenter:gameCenter?{lat:gameCenter.lat(),lng:gameCenter.lng()}:null}));}

function handleLocationError(e){document.getElementById('accuracy').textContent='Error lokasi';}

window.initMaps=initMaps;
