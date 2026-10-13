// 頁面切換：Welcome 圓形展開，其餘頁面滑入
const pages = document.querySelectorAll(
  "#welcome, #tasks, #english, #listening, #writing, #english-summary, #japanese, #japanese-practice, #japanese-summary, #power-reveal, #fitness, #fitness-home, #fitness-bjj, #fitness-gym"
);

let currentPage = document.querySelector("#welcome");
let isChanging = false;

pages.forEach(function(page) {
  page.hidden = page !== currentPage;
});

const pageLinks = document.querySelectorAll(
  'a[href="#tasks"], a[href="#welcome"], [data-page]'
);

pageLinks.forEach(function(link) {
  link.addEventListener("click", async function(event) {
    event.preventDefault();

    if (isChanging) return;

    const destination =
      link.dataset.page || link.getAttribute("href");

    const nextPage = document.querySelector(destination);

    if (!nextPage || nextPage === currentPage) return;

    if (
  nextPage.id === "power-reveal" &&
  link.dataset.category === "fitness"
) {
  const ready = getFitnessCompletion().every(function(section) {
    return section.done;
  });

  if (!ready) {
    updateFitnessProgress();
    return;
  }
}

    isChanging = true;

    clearTimeout(powerScoreTimeout);

// 如果下一頁係角色揭曉頁，先準備內容
if (nextPage.id === "power-reveal") {
  preparePowerReveal(
  link.dataset.summary,
  link.dataset.category
);
}

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // 只有 Welcome → 柱狀圖用圓形展開
    const useCircle =
      currentPage.id === "welcome" &&
      nextPage.id === "tasks";

    try {
      if (useCircle && !reduceMotion) {
        const button = link.getBoundingClientRect();
        const x = button.left + button.width / 2;
        const y = button.top + button.height / 2;

        const radius = Math.hypot(
          window.innerWidth,
          window.innerHeight
        );

        nextPage.classList.add("page-entering");
        document.body.classList.add("is-transitioning");
        nextPage.hidden = false;
        nextPage.scrollTop = 0;

        await nextPage.animate(
          [
            { clipPath: `circle(0px at ${x}px ${y}px)` },
            { clipPath: `circle(${radius}px at ${x}px ${y}px)` }
          ],
          {
            duration: 900,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)"
          }
        ).finished;

      } else {
        // 其他切換：先收起舊頁，再滑入新頁
        currentPage.hidden = true;
        nextPage.hidden = false;

        window.scrollTo({ top: 0, behavior: "instant" });

        if (!reduceMotion && nextPage.id !== "power-reveal") {
  const startPosition =
  [
  "english",
  "listening",
  "writing",
  "english-summary",
  "japanese",
  "japanese-practice",
  "japanese-summary"
]
    .includes(nextPage.id)
      ? "100%"
      : "-100%";

          await nextPage.animate(
            [
              { transform: `translateX(${startPosition})` },
              { transform: "translateX(0)" }
            ],
            {
              duration: 220,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)"
            }
          ).finished;
        }
      }
    } finally {
      currentPage.hidden = true;
      nextPage.hidden = false;

      nextPage.classList.remove("page-entering");
      document.body.classList.remove("is-transitioning");

      currentPage = nextPage;
updateScoreViews();

// 揭曉頁已經顯示，可以開始動畫
if (currentPage.id === "power-reveal") {
  playPowerReveal();
}

      window.scrollTo({ top: 0, behavior: "instant" });

      nextPage.tabIndex = -1;
      nextPage.focus({ preventScroll: true });

      isChanging = false;
    }
  });
});
// ===== 每日 English 努力紀錄 =====
const minutesFor100Points = 180;
const activities = ["reading", "listening", "writing"];

let storageAvailable = true;
const temporaryRecords = {};

// 用電腦本地日期，將每日紀錄分開
function todayKey(category = "english") {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `daybeat-${category}-${year}-${month}-${day}`;
}

function getTodayMinutes(category = "english") {
  const key = todayKey(category);
  let saved = temporaryRecords[key] || {};

  if (storageAvailable) {
    try {
      saved = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      storageAvailable = false;
    }
  }

  // 確保讀返嚟嘅資料係有效數字
  const result = {};

  const selectedActivities =
  category === "japanese"
    ? ["vocabulary", "practice"]
    : activities; 

selectedActivities.forEach(function(activity)  {
    const value = saved?.[activity];

    result[activity] =
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
        ? value
        : 0;
  });

  return result;
}

// 完成一次活動，加入今日累積時間
function recordCompletedSession(activity, minutes) {
  const category =
  ["vocabulary", "practice"].includes(activity)
    ? "japanese"
    : "english";

  const totals = getTodayMinutes(category);
  totals[activity] += minutes;

  const key = todayKey(category);
  temporaryRecords[key] = totals;

  if (storageAvailable) {
    try {
      localStorage.setItem(key, JSON.stringify(totals));
    } catch {
      storageAvailable = false;
    }
  }
}

function calculateScore(minutes) {
  return Math.round(minutes / minutesFor100Points * 100);
}

// ===== 數字慢慢增加 =====
const numberAnimations = new WeakMap();

function animateNumber(element, target, decimalPlaces = 0) {
  cancelAnimationFrame(numberAnimations.get(element));

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const from = Number(element.textContent) || 0;

  function display(value) {
    element.textContent = Number(value.toFixed(decimalPlaces));
  }

  if (reduceMotion || from === target) {
    display(target);
    return;
  }

  const startedAt = performance.now();
  const duration = 1000;

  function frame(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    display(from + (target - from) * eased);

    if (progress < 1) {
      numberAnimations.set(
        element,
        requestAnimationFrame(frame)
      );
    }
  }

  numberAnimations.set(element, requestAnimationFrame(frame));
}
 

// ===== 更新總結頁／柱狀圖 =====
function updateScoreViews() {
  const totals = getTodayMinutes();

  const totalMinutes =
    totals.reading + totals.listening + totals.writing;

  const totalScore = calculateScore(totalMinutes);

  if (currentPage.id === "fitness-home") {
  loadHomeWorkout();
}

  if (currentPage.id === "japanese-summary") {
  updateJapaneseSummary();
}

if (currentPage.id === "fitness-bjj") {
  loadBjj();
}

if (currentPage.id === "fitness-gym") {
  loadGym();
}

if (currentPage.id === "fitness") {
  updateFitnessProgress();
}


  if (currentPage.id === "english-summary") {
    activities.forEach(function(activity) {
      document.querySelector(`#${activity}-total`)
        .textContent = totals[activity];

      animateNumber(
        document.querySelector(`#${activity}-score`),
        calculateScore(totals[activity])
      );
    });

    document.querySelector("#english-total-time")
      .textContent = `${totalMinutes} minutes today`;

    animateNumber(
      document.querySelector("#english-final-score"),
      totalScore
    );

    const pie = document.querySelector("#english-pie");

    if (totalMinutes === 0) {
      pie.style.background = "#383838";
      pie.setAttribute("aria-label", "No English study recorded today");
    } else {
      const readingEnd = totals.reading / totalMinutes * 100;
      const listeningEnd =
        (totals.reading + totals.listening) / totalMinutes * 100;

      pie.style.background = `conic-gradient(
        #ceff45 0% ${readingEnd}%,
        #8bd8ed ${readingEnd}% ${listeningEnd}%,
        #f8a8e6 ${listeningEnd}% 100%
      )`;

      pie.setAttribute(
        "aria-label",
        `Reading ${totals.reading} minutes, ` +
        `Listening ${totals.listening} minutes, ` +
        `Writing ${totals.writing} minutes`
      );
    }

    document.querySelector("#summary-message").textContent =
      storageAvailable
        ? "Every minute counts."
        : "Storage is unavailable. Keep this page open to retain today's records.";
  }

  if (currentPage.id === "tasks") {
  // 讀取兩項日文活動嘅分鐘
  const japaneseTotals = getTodayMinutes("japanese");

  const japaneseMinutes =
    japaneseTotals.vocabulary + japaneseTotals.practice;

  const japaneseScore = calculateScore(japaneseMinutes);

  // 更新 English 柱
  const englishColumn = document.querySelector(
    "#tasks .category-english"
  );

  animateNumber(
    englishColumn.querySelector(".bar-value"),
    totalScore
  );

  englishColumn.style.setProperty(
    "--bar-height",
    `${Math.min(totalScore, 100) * 0.85}%`
  );

  // 更新 Japanese 柱
  const japaneseColumn = document.querySelector(
    "#tasks .category-japanese"
  );

  animateNumber(
    japaneseColumn.querySelector(".bar-value"),
    japaneseScore
  );

  japaneseColumn.style.setProperty(
    "--bar-height",
    `${Math.min(japaneseScore, 100) * 0.85}%`
  );

    // 圖表上方總分
  // Fitness 分數
const fitnessScore = getTodayFitnessScore();

const fitnessColumn = document.querySelector(
  "#tasks .category-fitness"
);

animateNumber(
  fitnessColumn.querySelector(".bar-value"),
  fitnessScore,
  2
);

fitnessColumn.style.setProperty(
  "--bar-height",
  `${Math.min(fitnessScore, 100) * 0.85}%`
);

// 圖表上方總分：English + Japanese + Fitness
animateNumber(
  document.querySelector("#tasks .daily-score strong"),
  totalScore + japaneseScore + fitnessScore,
  2
);

  } // 結束 if (currentPage.id === "tasks")
}   // 結束 updateScoreViews()
// ===== English 閱讀計時器 =====
// Reading、Listening、Writing 共用一套計時功能
function setupTimer(activity, statusId) {
  const input = document.querySelector(`#${activity}-minutes`);
  const display = document.querySelector(`#${activity}-timer`);
  const start = document.querySelector(`#start-${activity}`);
  const reset = document.querySelector(`#reset-${activity}`);
  const status = document.querySelector(`#${statusId}`);
  const complete = document.querySelector(`#${activity}-complete`);

  let remainingMs = 0;
  let endTime = 0;
  let interval = null;
  let hasStarted = false;
  let sessionMinutes = 0;
  let sessionRecorded = false;

  function showTime() {
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    display.textContent =
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0");
  }

  function previewTime() {
    if (hasStarted) return;

    remainingMs = input.validity.valid
      ? Number(input.value) * 60 * 1000
      : 0;

    showTime();
  }

  function updateTimer() {
    remainingMs = Math.max(0, endTime - Date.now());
    showTime();

    if (remainingMs === 0) {

      if (!sessionRecorded) {
        sessionRecorded = true;
        recordCompletedSession(activity, sessionMinutes);
      }
      clearInterval(interval);
      interval = null;

      start.textContent = "Completed!";
      start.disabled = true;
      status.textContent = "Session complete. Nice work!";

      // 倒數完，顯示下一步選項
      complete.hidden = false;
    }
  }

  input.addEventListener("input", previewTime);

  start.addEventListener("click", function() {
    // 正在倒數 → 暫停
    if (interval !== null) {
      updateTimer();
      if (remainingMs === 0) return;

      clearInterval(interval);
      interval = null;

      start.textContent = "Resume";
      status.textContent = "Paused. Take your time.";
      return;
    }

    // 第一次開始，讀取輸入時間
    if (!hasStarted) {
      if (!input.reportValidity()) return;

      sessionMinutes = Number(input.value);
      remainingMs = sessionMinutes * 60 * 1000;
      sessionRecorded = false;
      hasStarted = true;
      input.disabled = true;
    }

    endTime = Date.now() + remainingMs;
    interval = setInterval(updateTimer, 250);

    start.textContent = "Pause";
    status.textContent = "Every minute counts.";

    updateTimer();
  });

  reset.addEventListener("click", function() {
    clearInterval(interval);
    interval = null;
    hasStarted = false;

    input.disabled = false;
    start.disabled = false;
    start.textContent = `Start ${activity}`;
    status.textContent = "Ready for a fresh start.";

    // 重設後，收起完成選項
    complete.hidden = true;

    previewTime();
  });

  document.addEventListener("visibilitychange", function() {
    if (!document.hidden && interval !== null) {
      updateTimer();
    }
  });

  previewTime();
}


function updateJapaneseSummary() {
  // 1. 讀取今日兩項活動嘅分鐘
  const totals = getTodayMinutes("japanese");

  const vocabularyMinutes = totals.vocabulary;
  const practiceMinutes = totals.practice;

  const totalMinutes = vocabularyMinutes + practiceMinutes;

  // 2. 顯示各項分鐘
  document.querySelector("#jp-vocabulary-total")
    .textContent = vocabularyMinutes;

  document.querySelector("#jp-practice-total")
    .textContent = practiceMinutes;

  document.querySelector("#jp-total-time")
    .textContent = `${totalMinutes} minutes today`;

  // 3. 分數用現有動畫慢慢增加
  animateNumber(
    document.querySelector("#jp-vocabulary-score"),
    calculateScore(vocabularyMinutes)
  );

  animateNumber(
    document.querySelector("#jp-practice-score"),
    calculateScore(practiceMinutes)
  );

  animateNumber(
    document.querySelector("#jp-final-score"),
    calculateScore(totalMinutes)
  );

  // 4. 計算圓餅圖比例
  const pie = document.querySelector("#japanese-pie");

  if (totalMinutes === 0) {
    pie.style.background = "#494039";

    pie.setAttribute(
      "aria-label",
      "No Japanese study recorded today"
    );
  } else {
    const vocabularyPercent =
      vocabularyMinutes / totalMinutes * 100;

    pie.style.background = `conic-gradient(
      #f0bd90 0% ${vocabularyPercent}%,
      #8bd8ed ${vocabularyPercent}% 100%
    )`;

    pie.setAttribute(
      "aria-label",
      `Vocabulary ${vocabularyMinutes} minutes; ` +
      `Listening and Grammar ${practiceMinutes} minutes`
    );
  }

  // 5. 顯示提示
  document.querySelector("#jp-summary-message").textContent =
    !storageAvailable
      ? "Storage is unavailable. Keep this page open to retain today's records."
      : totalMinutes === 0
        ? "Your next small step starts here."
        : "Every minute is a little progress.";
}

// 分別啟用三個計時器
setupTimer("reading", "timer-status");
setupTimer("listening", "listening-status");
setupTimer("writing", "writing-status");
setupTimer("vocabulary", "vocabulary-status");
setupTimer("practice", "practice-status");



// ===== 每日角色揭曉 =====

// 記住等待中的分數動畫
let powerScoreTimeout = null;

// 如果瀏覽器無法儲存，至少在今次開啟期間保留角色
const powerCharacterCache = {};

// 由最高級排到最低級
// 每個角色：[畫面顯示名稱, GIF 檔案名稱]
const powerRanks = [
  {
    min: 100,
    grade: "特級",
    characters: [
      ["YUTA", "YUTA.gif"],
      ["GOJO", "Gojo.gif"],
      ["SUKUNA", "Sukana.gif"],
      ["YUJI", "Yuji.gif"]
    ]
  },
  {
    min: 75,
    grade: "一級",
    characters: [
      ["NANAMI", "NANAMI.gif"],
      ["TODO", "TODO.gif"],
      ["NAOTO", "NAOTO.gif"]
    ]
  },
  {
    min: 50,
    grade: "準一級",
    characters: [
      ["HIROMI", "HIROMI.gif"]
    ]
  },
  {
    min: 25,
    grade: "二級",
    characters: [
      ["TOGE", "TOGE.gif"],
      ["NOBARA", "NOBARA.gif"],
      ["PANDA", "PANDA.gif"]
    ]
  },
  {
    min: 10,
    grade: "三級",
    characters: [
      ["MAI", "MAI.gif"],
      ["JUNPEI", "JUNPEI.gif"]
    ]
  },
  {
    min: 1,
    grade: "四級",
    characters: [
      ["MIWA", "MIWA.gif"],
      ["四級術師", "MOMO.gif"]
    ]
  }
];

// ===== 計算今日總分 =====

function getDailyPowerScore(category) {
  if (category === "fitness") {
    return getTodayFitnessScore();
  }

  const totals = getTodayMinutes(category);

  const totalMinutes =
    category === "japanese"
      ? totals.vocabulary + totals.practice
      : totals.reading + totals.listening + totals.writing;

  return calculateScore(totalMinutes);
}

// ===== 同一天、同一等級，保持同一個角色 =====

function getDailyPowerCharacter(rank, category) {
  const key = todayKey("power-" + category + "-" + rank.min);

  let savedFile = powerCharacterCache[key];

  // 記憶中未有，就試吓讀取瀏覽器儲存
  if (!savedFile) {
    try {
      savedFile = localStorage.getItem(key);
    } catch {
      // 無法讀取時，下面會抽新角色
    }
  }

  // 檢查儲存的角色是否仍然屬於這個等級
  let character = rank.characters.find(function(item) {
    return item[1] === savedFile;
  });

  // 未抽過角色，先隨機抽一個
  if (!character) {
    const index = Math.floor(
      Math.random() * rank.characters.length
    );

    character = rank.characters[index];

    try {
      localStorage.setItem(key, character[1]);
    } catch {
      // 儲存失敗仍然可以使用下方的記憶暫存
    }
  }

  powerCharacterCache[key] = character[1];

  return character;
}

// ===== 進場前準備文字、GIF、Next 目的地 =====

function preparePowerReveal(summaryPage, requestedCategory) {
  const page = document.querySelector("#power-reveal");
  const scoreElement = document.querySelector("#power-score");
  const gradeElement = document.querySelector("#power-grade");
  const nameElement = document.querySelector("#power-character");
  const gif = document.querySelector("#power-gif");
  const message = document.querySelector("#power-message");
  const nextButton = document.querySelector("#power-next");
  const intro = page.querySelector(".power-intro");

  const category =
    requestedCategory === "fitness"
      ? "fitness"
      : summaryPage === "#japanese-summary"
        ? "japanese"
        : "english";

  const score = getDailyPowerScore(category);

  page.classList.remove("is-revealed");
  cancelAnimationFrame(numberAnimations.get(scoreElement));
  scoreElement.textContent = "0";

  page.dataset.score = String(score);
  page.dataset.category = category;

  page.querySelector(".power-eyebrow").textContent =
    `YOUR ${category.toUpperCase()} · REVEALED`;

  page.querySelector(".power-score-label").textContent =
    `TODAY'S ${category.toUpperCase()} SCORE`;

  const destination =
    category === "fitness"
      ? "#tasks"
      : category === "japanese"
        ? "#japanese-summary"
        : "#english-summary";

  nextButton.href = destination;
  nextButton.dataset.page = destination;

  nextButton.textContent =
    category === "fitness" ? "Next → Histogram" : "Next →";

  gif.onerror = null;
  gif.hidden = true;
  gif.removeAttribute("src");
  gif.alt = "";

  if (score === 0) {
    gradeElement.textContent = "未有積分";
    nameElement.textContent = "A FRESH START";

    intro.textContent =
      category === "fitness"
        ? "Today's movement is recorded."
        : "Your next small step starts today.";

    message.textContent =
      category === "fitness"
        ? "No character unlocked today. Rest days count too."
        : "Complete a session to reveal your character.";

    return;
  }

  // 有分但少於 1 分時，都歸入最低級
  const rank =
    powerRanks.find(function(item) {
      return score >= item.min;
    }) || powerRanks[powerRanks.length - 1];



const character = getDailyPowerCharacter(rank, category);

  gradeElement.textContent = rank.grade;
  nameElement.textContent = character[0];

  intro.textContent = "Today, your power takes the form of…";
  message.textContent = "Every minute of effort counts.";

  // 找不到 GIF 時，仍保留角色名稱和分數
  gif.onerror = function() {
    gif.hidden = true;
    message.textContent =
      "GIF unavailable — your effort still counts.";
  };

  gif.alt = character[0] + " · " + rank.grade;
  gif.src = character[1];
  gif.hidden = false;
}

// ===== 打開幕簾，播放分數動畫 =====

function playPowerReveal() {
  const page = document.querySelector("#power-reveal");
  const scoreElement = document.querySelector("#power-score");
  const targetScore = Number(page.dataset.score) || 0;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // 先讓瀏覽器確認「幕簾關閉」的樣式
  void page.offsetWidth;

  // 觸發上一個步驟寫好的 CSS 動畫
  page.classList.add("is-revealed");

  // 幕簾開始打開後，再讓分數增加
  powerScoreTimeout = setTimeout(function() {
    if (currentPage !== page) return;

    animateNumber(
  scoreElement,
  targetScore,
  page.dataset.category === "fitness" ? 2 : 0
);
  }, reduceMotion ? 0 : 400);
}

// ===== Home Workout =====

// 每一個輸入框，以及它的計分比例
const homeWorkoutFields = [
  { key: "pushups", id: "home-pushups", rate: 0.05 },
  { key: "squats", id: "home-squats", rate: 0.05 },
  { key: "situps", id: "home-situps", rate: 0.05 },
  { key: "stretching", id: "home-stretching", rate: 1 / 6 }
];

// 顯示最多兩位小數，例如 2、2.5、2.67
function formatWorkoutPoints(value) {
  return Number(value.toFixed(2));
}

// 讀取今日已儲存的數量
function getTodayHomeWorkout() {
  const key = todayKey("fitness-home");
  let saved = temporaryRecords[key] || {};

  if (storageAvailable) {
    try {
      saved = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      storageAvailable = false;
    }
  }

  const result = {};

  homeWorkoutFields.forEach(function(field) {
    const value = saved?.[field.key];

    const validValue =
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
        ? value
        : 0;

    // 運動次數用整數，伸展分鐘可以有小數
    result[field.key] =
      field.key === "stretching"
        ? validValue
        : Math.floor(validValue);
  });

  result.completed = saved?.completed === true;

temporaryRecords[key] = result;

return result;
}

// 計算四個項目的分數，每項最多 5 分
function calculateHomeWorkoutScore(values) {
  let total = 0;

  homeWorkoutFields.forEach(function(field) {
    const points = Math.min(values[field.key] * field.rate, 5);
    total += points;
  });

  // 加完先四捨五入，避免逐項取整造成誤差
  return formatWorkoutPoints(total);
}

// Fitness 目前先計 Home Workout
function getTodayFitnessScore() {
  const homeScore =
    calculateHomeWorkoutScore(getTodayHomeWorkout());

  const bjjScore = getTodayBjj() === true ? 40 : 0;

  const gymMinutes = getTodayGymMinutes();
  const gymScore = calculateGymScore(gymMinutes ?? 0);

  return formatWorkoutPoints(
    homeScore + bjjScore + gymScore
  );
}

// 讀取表格；空白、負數等無效輸入會回傳 null
function readHomeWorkoutInputs() {
  const values = {};

  for (const field of homeWorkoutFields) {
    const input = document.getElementById(field.id);
    const value = Number(input.value);

    if (!input.validity.valid || !Number.isFinite(value)) {
      return null;
    }

    values[field.key] = value;
  }

  return values;
}

// 輸入時，即時更新每項分數及總分
function previewHomeWorkoutScore() {
  const values = readHomeWorkoutInputs();

  homeWorkoutFields.forEach(function(field) {
    const scoreElement = document.getElementById(
      field.id + "-score"
    );

    scoreElement.textContent = values
      ? formatWorkoutPoints(
          Math.min(values[field.key] * field.rate, 5)
        )
      : "—";
  });

  document.querySelector("#home-workout-score").textContent =
    values ? calculateHomeWorkoutScore(values) : "—";
}

// 進入頁面時，填回今日已儲存的數量
function loadHomeWorkout() {
  const values = getTodayHomeWorkout();

  homeWorkoutFields.forEach(function(field) {
    document.getElementById(field.id).value = values[field.key];
  });

  previewHomeWorkoutScore();

  document.querySelector("#home-workout-status").textContent =
    "Enter today's totals, then save your changes.";
}

// 連接輸入框和 Save 按鈕
function setupHomeWorkout() {
  const status = document.querySelector("#home-workout-status");

  homeWorkoutFields.forEach(function(field) {
    const input = document.getElementById(field.id);

    input.addEventListener("input", function() {
      previewHomeWorkoutScore();
      status.textContent = "Unsaved changes — remember to save.";
    });
  });

  document.querySelector("#save-home-workout")
    .addEventListener("click", function() {
      // 先檢查每個輸入框
      for (const field of homeWorkoutFields) {
        const input = document.getElementById(field.id);

        if (!input.reportValidity()) return;
      }

      const values = readHomeWorkoutInputs();

      if (!values) {
        status.textContent = "Please enter valid numbers.";
        return;
      }

      const key = todayKey("fitness-home");

// 記住今日已確認過答案，包括全部填 0
values.completed = true;

temporaryRecords[key] = values;

      if (storageAvailable) {
        try {
          localStorage.setItem(key, JSON.stringify(values));
        } catch {
          storageAvailable = false;
        }
      }

      const score = calculateHomeWorkoutScore(values);

      status.textContent = storageAvailable
        ? `Saved! Today's home workout: ${score} / 20 points.`
        : `Saved for this session: ${score} / 20 points. Keep this page open.`;
    });

  loadHomeWorkout();
}

// 啟用 Home Workout 表格
setupHomeWorkout();

// ===== BJJ 每日紀錄 =====

// 回傳 true（去過）、false（冇去）、null（未填）
function getTodayBjj() {
  const key = todayKey("fitness-bjj");
  let saved = temporaryRecords[key] || {};

  if (storageAvailable) {
    try {
      saved = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      storageAvailable = false;
    }
  }

  const attended =
    typeof saved?.attended === "boolean"
      ? saved.attended
      : null;

  temporaryRecords[key] = { attended };

  return attended;
}

// 進入 BJJ 頁時，還原今日已儲存的選擇
function loadBjj() {
  const attended = getTodayBjj();

  const options = document.querySelectorAll(
    '#fitness-bjj input[name="bjj-attended"]'
  );

  options.forEach(function(option) {
    option.checked =
      attended !== null &&
      option.value === (attended ? "yes" : "no");
  });

  document.querySelector("#bjj-status").textContent =
    attended === null
      ? "Choose an answer, then save."
      : `Today's saved BJJ score: ${attended ? 40 : 0} points.`;
}

// 連接選項與 Save 按鈕
function setupBjj() {
  const status = document.querySelector("#bjj-status");

  const options = document.querySelectorAll(
    '#fitness-bjj input[name="bjj-attended"]'
  );

  // 揀完先提示，未按 Save 唔會改分數
  options.forEach(function(option) {
    option.addEventListener("change", function() {
      const points = option.value === "yes" ? 40 : 0;

      status.textContent =
        `${points} points selected — press Save to confirm.`;
    });
  });

  document.querySelector("#save-bjj")
    .addEventListener("click", function() {
      const selected = document.querySelector(
        '#fitness-bjj input[name="bjj-attended"]:checked'
      );

      if (!selected) {
        status.textContent = "Please choose Yes or No first.";
        options[0].focus();
        return;
      }

      const attended = selected.value === "yes";
      const record = { attended };
      const key = todayKey("fitness-bjj");

      // 取代今日答案，不會重複累加 40 分
      temporaryRecords[key] = record;

      if (storageAvailable) {
        try {
          localStorage.setItem(key, JSON.stringify(record));
        } catch {
          storageAvailable = false;
        }
      }

      const points = attended ? 40 : 0;

      status.textContent = storageAvailable
        ? `Saved! Today's BJJ score: ${points} points.`
        : `Saved for this session: ${points} points. Keep this page open.`;
    });

  loadBjj();
}

// 啟用 BJJ 功能
setupBjj();

// ===== Gym：60 分鐘 = 40 分 =====

function calculateGymScore(minutes) {
  return formatWorkoutPoints(
    Math.min(minutes / 60 * 40, 40)
  );
}

// null 代表今日未填，0 代表已填「冇去」
function getTodayGymMinutes() {
  const key = todayKey("fitness-gym");
  let saved = temporaryRecords[key] || {};

  if (storageAvailable) {
    try {
      saved = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      storageAvailable = false;
    }
  }

  const minutes =
    typeof saved?.minutes === "number" &&
    Number.isFinite(saved.minutes) &&
    saved.minutes >= 0
      ? saved.minutes
      : null;

  temporaryRecords[key] = { minutes };

  return minutes;
}

function previewGymScore() {
  const input = document.querySelector("#gym-minutes");
  const minutes = Number(input.value);

  const valid =
    input.validity.valid && Number.isFinite(minutes);

  document.querySelector("#gym-score").textContent =
    valid ? calculateGymScore(minutes) : "—";
}

function loadGym() {
  const minutes = getTodayGymMinutes();

  document.querySelector("#gym-minutes").value =
    minutes ?? "";

  previewGymScore();

  document.querySelector("#gym-status").textContent =
    minutes === null
      ? "Enter your time, then save."
      : `Today's saved gym score: ${calculateGymScore(minutes)} points.`;
}

function setupGym() {
  const input = document.querySelector("#gym-minutes");
  const status = document.querySelector("#gym-status");

  input.addEventListener("input", function() {
    previewGymScore();
    status.textContent = "Unsaved changes — remember to save.";
  });

  document.querySelector("#save-gym")
    .addEventListener("click", function() {
      if (!input.reportValidity()) return;

      const minutes = Number(input.value);

      if (!Number.isFinite(minutes)) {
        status.textContent = "Please enter valid minutes.";
        return;
      }

      const key = todayKey("fitness-gym");
      const record = { minutes };

      // 取代今日分鐘，不會重複累加
      temporaryRecords[key] = record;

      if (storageAvailable) {
        try {
          localStorage.setItem(key, JSON.stringify(record));
        } catch {
          storageAvailable = false;
        }
      }

      status.textContent = storageAvailable
        ? `Saved! Today's gym score: ${calculateGymScore(minutes)} points.`
        : "Saved for this session. Keep this page open.";
    });

  loadGym();
}

setupGym();


function getFitnessCompletion() {
  return [
    {
      name: "Home Workout",
      done: getTodayHomeWorkout().completed === true
    },
    {
      name: "BJJ",
      done: getTodayBjj() !== null
    },
    {
      name: "Gym",
      done: getTodayGymMinutes() !== null
    }
  ];
}

function updateFitnessProgress() {
  const sections = getFitnessCompletion();
  const missing = sections.filter(function(section) {
    return !section.done;
  });

  document.querySelector("#reveal-fitness").disabled =
    missing.length > 0;

  document.querySelector("#fitness-progress").textContent =
    missing.length === 0
      ? "3 / 3 saved. Your character is ready!"
      : "Still to save: " +
        missing.map(function(section) {
          return section.name;
        }).join(", ");
}