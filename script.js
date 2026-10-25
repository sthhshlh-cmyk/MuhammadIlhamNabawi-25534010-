"use strict";

/* ===== Data kata: kategori -> daftar [kata, petunjuk] ===== */
const WORDS = {
  "Hewan": [
    ["HARIMAU", "Kucing besar bergaris, hidup di hutan Sumatra"],
    ["KELINCI", "Hewan bertelinga panjang yang suka wortel"],
    ["BURUNG", "Hewan berbulu yang bisa terbang dan berkicau"],
    ["GAJAH", "Hewan darat terbesar, berbelalai panjang"],
    ["KUDA", "Hewan tunggangan yang berlari kencang"],
    ["BUAYA", "Reptil bergigi tajam yang hidup di sungai"],
    ["KUPU", "Serangga bersayap indah, dulunya ulat"],
    ["ORANGUTAN", "Kera berbulu oranye dari Kalimantan"],
    ["KOMODO", "Kadal raksasa dari Nusa Tenggara Timur"],
    ["PENYU", "Reptil bercangkang yang bertelur di pantai"]
  ],
  "Buah": [
    ["MANGGA", "Buah tropis berwarna kuning, daging manis"],
    ["PISANG", "Buah panjang berkulit kuning, favorit monyet"],
    ["JERUK", "Buah bulat penuh vitamin C"],
    ["SEMANGKA", "Buah besar berkulit hijau, daging merah berair"],
    ["NANAS", "Buah berkulit duri dengan mahkota daun"],
    ["DURIAN", "Raja buah dengan aroma yang tajam"],
    ["RAMBUTAN", "Buah merah berbulu halus"],
    ["PEPAYA", "Buah oranye yang baik untuk pencernaan"],
    ["APEL", "Buah merah atau hijau, kata pepatah sehari satu"],
    ["ANGGUR", "Buah kecil bergerombol, bahan utama kismis"]
  ],
  "Kota di Indonesia": [
    ["JAKARTA", "Ibu kota negara yang sangat padat"],
    ["BANDUNG", "Kota kembang di Jawa Barat"],
    ["SURABAYA", "Kota Pahlawan di Jawa Timur"],
    ["MEDAN", "Kota terbesar di Sumatra Utara"],
    ["MAKASSAR", "Kota pelabuhan di Sulawesi Selatan"],
    ["YOGYAKARTA", "Kota pelajar dengan keraton dan Malioboro"],
    ["SEMARANG", "Ibu kota Jawa Tengah dengan Lawang Sewu"],
    ["PALEMBANG", "Kota empek-empek di tepi Sungai Musi"],
    ["DENPASAR", "Ibu kota Pulau Dewata"],
    ["MANADO", "Kota di ujung utara Sulawesi, terkenal bubur"]
  ],
  "Benda Sehari-hari": [
    ["KURSI", "Tempat duduk yang punya sandaran"],
    ["PAYUNG", "Pelindung saat hujan turun"],
    ["SENDOK", "Alat makan untuk menyuap nasi"],
    ["BANTAL", "Alas empuk untuk kepala saat tidur"],
    ["KACAMATA", "Alat bantu penglihatan di depan mata"],
    ["JENDELA", "Lubang berkaca di dinding untuk melihat keluar"],
    ["LEMARI", "Perabot untuk menyimpan pakaian"],
    ["KOMPOR", "Alat memasak dengan api"],
    ["SEPATU", "Alas kaki yang dipakai dengan kaus kaki"],
    ["TELEPON", "Alat untuk berbicara dengan orang jauh"]
  ]
};

const ROUNDS = 10;      // jumlah kata per permainan
const MAX_LIVES = 3;
const HINT_COST = 5;
const BEST_KEY = "susun-kata-best";

/* ===== Elemen DOM ===== */
const $ = (id) => document.getElementById(id);
const el = {
  score: $("score"), lives: $("lives"), best: $("best"),
  start: $("screen-start"), game: $("screen-game"), end: $("screen-end"),
  category: $("category"), difficulty: $("difficulty"),
  round: $("round"), streak: $("streak"), bar: $("timer-bar"),
  clue: $("clue"), slots: $("slots"), tiles: $("tiles"), feedback: $("feedback"),
  btnStart: $("btn-start"), btnShuffle: $("btn-shuffle"), btnHint: $("btn-hint"),
  btnSkip: $("btn-skip"), btnCheck: $("btn-check"), btnRestart: $("btn-restart"),
  endTitle: $("end-title"), endText: $("end-text")
};

/* ===== Status permainan ===== */
let state;
let timerId = null;

function newState() {
  return {
    queue: [], index: 0, word: "", clue: "",
    tiles: [],        // [{ ch, used }]
    picked: [],       // indeks ubin yang dipilih, berurutan
    hints: 0, score: 0, lives: MAX_LIVES, streak: 0, correct: 0,
    total: 30, timeLeft: 30, locked: false
  };
}

/* ===== Fungsi bantu ===== */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scramble(word) {
  let letters = word.split("");
  // pastikan hasil acak berbeda dari kata asli
  for (let t = 0; t < 20; t++) {
    letters = shuffleArray(letters);
    if (letters.join("") !== word) break;
  }
  return letters;
}

function getBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* abaikan */ }
}

function show(screen) {
  [el.start, el.game, el.end].forEach((s) => (s.hidden = s !== screen));
}

function setFeedback(text, type) {
  el.feedback.textContent = text;
  el.feedback.className = "feedback" + (type ? " " + type : "");
}

function updateStats() {
  el.score.textContent = state.score;
  el.lives.textContent = state.lives;
  el.best.textContent = getBest();
  el.streak.textContent = "Beruntun: " + state.streak;
}

/* ===== Alur permainan ===== */
function startGame() {
  state = newState();
  state.total = Number(el.difficulty.value);
  const pool = WORDS[el.category.value];
  state.queue = shuffleArray(pool).slice(0, ROUNDS);
  show(el.game);
  updateStats();
  loadWord();
}

function loadWord() {
  const [word, clue] = state.queue[state.index];
  state.word = word;
  state.clue = clue;
  state.tiles = scramble(word).map((ch) => ({ ch, used: false }));
  state.picked = [];
  state.hints = 0;
  state.locked = false;
  state.timeLeft = state.total;
  el.round.textContent = `Kata ${state.index + 1} dari ${state.queue.length}`;
  el.clue.textContent = `Petunjuk: ${clue} (${word.length} huruf)`;
  setFeedback("");
  render();
  startTimer();
}

function startTimer() {
  stopTimer();
  const tick = 100;
  timerId = setInterval(() => {
    state.timeLeft -= tick / 1000;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      stopTimer();
      timeUp();
    }
    renderTimer();
  }, tick);
}

function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}

function renderTimer() {
  const pct = (state.timeLeft / state.total) * 100;
  el.bar.style.width = pct + "%";
  el.bar.classList.toggle("low", pct < 25);
  el.bar.parentElement.setAttribute("aria-valuenow", Math.round(pct));
}

/* ===== Tampilan ubin dan kotak ===== */
function render() {
  // kotak jawaban
  el.slots.innerHTML = "";
  for (let i = 0; i < state.word.length; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "slot";
    const tileIdx = state.picked[i];
    if (tileIdx !== undefined) {
      b.textContent = state.tiles[tileIdx].ch;
      b.classList.add("filled");
      b.setAttribute("aria-label", `Huruf ${state.tiles[tileIdx].ch}, klik untuk mengembalikan`);
      b.addEventListener("click", () => unpickAt(i));
    } else {
      b.setAttribute("aria-label", "Kotak kosong");
      b.disabled = true;
    }
    el.slots.appendChild(b);
  }

  // ubin huruf
  el.tiles.innerHTML = "";
  state.tiles.forEach((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tile";
    b.textContent = t.ch;
    b.disabled = t.used || state.locked;
    b.addEventListener("click", () => pick(i));
    el.tiles.appendChild(b);
  });

  const busy = state.locked;
  el.btnShuffle.disabled = busy;
  el.btnSkip.disabled = busy;
  el.btnCheck.disabled = busy || state.picked.length !== state.word.length;
  el.btnHint.disabled = busy || state.hints >= state.word.length - 1;
  renderTimer();
  updateStats();
}

/* ===== Aksi pemain ===== */
function pick(tileIdx) {
  if (state.locked || state.tiles[tileIdx].used) return;
  if (state.picked.length >= state.word.length) return;
  state.tiles[tileIdx].used = true;
  state.picked.push(tileIdx);
  render();
  if (state.picked.length === state.word.length) checkAnswer();
}

function unpickAt(pos) {
  if (state.locked) return;
  // kembalikan huruf pada posisi itu dan semua huruf sesudahnya
  const removed = state.picked.splice(pos);
  removed.forEach((i) => (state.tiles[i].used = false));
  setFeedback("");
  render();
}

function currentGuess() {
  return state.picked.map((i) => state.tiles[i].ch).join("");
}

function checkAnswer() {
  if (state.locked || state.picked.length !== state.word.length) return;
  if (currentGuess() === state.word) {
    onCorrect();
  } else {
    onWrong();
  }
}

function onCorrect() {
  stopTimer();
  state.locked = true;
  state.streak++;
  state.correct++;
  const timeBonus = Math.ceil(state.timeLeft);
  const streakBonus = (state.streak - 1) * 2;
  const gained = Math.max(0, 10 + timeBonus + streakBonus - state.hints * HINT_COST);
  state.score += gained;
  render();
  markSlots("ok");
  setFeedback(`Benar! +${gained} skor`, "ok");
  setTimeout(nextWord, 1300);
}

function onWrong() {
  state.locked = true;
  state.streak = 0;
  render();
  markSlots("bad");
  el.slots.classList.add("shake");
  setFeedback("Belum tepat, coba susun lagi.", "bad");
  setTimeout(() => {
    el.slots.classList.remove("shake");
    // kosongkan semua pilihan, pertahankan huruf hasil petunjuk
    const keep = state.hints;
    const removed = state.picked.splice(keep);
    removed.forEach((i) => (state.tiles[i].used = false));
    state.locked = false;
    setFeedback("");
    render();
  }, 700);
}

function markSlots(cls) {
  el.slots.querySelectorAll(".slot").forEach((s) => s.classList.add(cls));
}

function useHint() {
  if (state.locked || state.hints >= state.word.length - 1) return;
  // kembalikan semua huruf, lalu isi otomatis sebanyak petunjuk + 1
  state.picked.forEach((i) => (state.tiles[i].used = false));
  state.picked = [];
  state.hints++;
  for (let k = 0; k < state.hints; k++) {
    const idx = state.tiles.findIndex((t) => !t.used && t.ch === state.word[k]);
    state.tiles[idx].used = true;
    state.picked.push(idx);
  }
  state.score = Math.max(0, state.score - HINT_COST);
  setFeedback(`Petunjuk dipakai: -${HINT_COST} skor`, "");
  render();
}

function reshuffle() {
  if (state.locked) return;
  state.picked.forEach((i) => (state.tiles[i].used = false));
  state.picked = [];
  state.hints = 0;
  state.tiles = scramble(state.word).map((ch) => ({ ch, used: false }));
  setFeedback("");
  render();
}

function skipWord() {
  if (state.locked) return;
  stopTimer();
  state.locked = true;
  state.streak = 0;
  render();
  setFeedback(`Dilewati. Jawabannya: ${state.word}`, "bad");
  setTimeout(nextWord, 1500);
}

function timeUp() {
  state.locked = true;
  state.streak = 0;
  state.lives--;
  render();
  setFeedback(`Waktu habis! Jawabannya: ${state.word}`, "bad");
  setTimeout(nextWord, 1600);
}

function nextWord() {
  if (state.lives <= 0) return endGame(false);
  state.index++;
  if (state.index >= state.queue.length) return endGame(true);
  loadWord();
}

function endGame(finished) {
  stopTimer();
  const best = getBest();
  const isRecord = state.score > best;
  if (isRecord) saveBest(state.score);
  updateStats();
  el.endTitle.textContent = finished ? "Permainan selesai" : "Nyawa habis";
  el.endText.textContent =
    `Kamu menjawab ${state.correct} dari ${state.queue.length} kata dengan skor ${state.score}.` +
    (isRecord ? " Ini rekor baru!" : ` Rekor tertinggi: ${Math.max(best, state.score)}.`);
  show(el.end);
}

/* ===== Keyboard ===== */
document.addEventListener("keydown", (e) => {
  if (el.game.hidden || state.locked || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.tagName === "SELECT") return;
  if (e.key === "Backspace") {
    e.preventDefault();
    if (state.picked.length > state.hints) unpickAt(state.picked.length - 1);
  } else if (e.key === "Enter") {
    if (e.target.tagName !== "BUTTON") checkAnswer();
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    const ch = e.key.toUpperCase();
    const idx = state.tiles.findIndex((t) => !t.used && t.ch === ch);
    if (idx !== -1) pick(idx);
  }
});

/* ===== Inisialisasi ===== */
Object.keys(WORDS).forEach((name) => {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  el.category.appendChild(opt);
});

state = newState();
updateStats();

el.btnStart.addEventListener("click", startGame);
el.btnRestart.addEventListener("click", () => { show(el.start); state = newState(); updateStats(); });
el.btnShuffle.addEventListener("click", reshuffle);
el.btnHint.addEventListener("click", useHint);
el.btnSkip.addEventListener("click", skipWord);
el.btnCheck.addEventListener("click", checkAnswer);
