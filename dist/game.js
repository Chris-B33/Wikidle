import { loadWikipediaPage } from "./wikipedia.js";
import { createNavigation, addPage, goBack, goForward, updatePathDisplay, updateNavigationButtons } from "./navigation.js";
import { buildTableOfContents } from "./toc.js";
let startTime = 0;
let timerInterval = null;
let clicks = 0;
let navigation;
let loading = false;
let dailyGame = null;
const startScreen = document.querySelector("#start-screen");
const gameScreen = document.querySelector("#game-screen");
const tableOfContents = document.querySelector("#table-of-contents");
const wikipediaContainer = document.querySelector("#wikipedia-container");
const pathContainer = document.querySelector("#path");
const stepCount = document.querySelector("#step-count");
const backButton = document.querySelector("#back-button");
const forwardButton = document.querySelector("#forward-button");
const clickCount = document.querySelector("#click-count");
const timer = document.querySelector("#timer");
const startPageElement = document.querySelector("#start-page");
const endPageElement = document.querySelector("#end-page");
const completionScreen = document.querySelector("#completion-screen");
const completionPathLength = document.querySelector("#completion-path-length");
const completionClicks = document.querySelector("#completion-clicks");
const completionTime = document.querySelector("#completion-time");
const completionShortestPath = document.querySelector("#completion-shortest-path");
const completionPathList = document.querySelector("#completion-path-list");
async function loadDailyGame() {
    const response = await fetch("./data/daily-game.json", {
        cache: "no-cache"
    });
    if (!response.ok) {
        throw new Error(`Failed to load daily game: ${response.status}`);
    }
    const game = await response.json();
    if (typeof game.date !== "string" ||
        typeof game.start !== "string" ||
        typeof game.goal !== "string" ||
        typeof game.distance !== "number") {
        throw new Error("Invalid daily-game.json");
    }
    return game;
}
async function initializeDailyGame() {
    try {
        dailyGame = await loadDailyGame();
        if (startPageElement) {
            startPageElement.textContent = dailyGame.start;
        }
        if (endPageElement) {
            endPageElement.textContent = dailyGame.goal;
        }
        console.log(`Daily game loaded: ${dailyGame.start} → ${dailyGame.goal}`);
    }
    catch (error) {
        console.error("Failed to load daily game:", error);
        if (startPageElement) {
            startPageElement.textContent = "Unable to load";
        }
        if (endPageElement) {
            endPageElement.textContent = "today's game";
        }
    }
}
function saveGame(completed = false) {
    if (!dailyGame || !navigation) {
        return;
    }
    const game = {
        date: dailyGame.date,
        completed,
        pathLength: navigation.history.length - 1,
        shortestPath: dailyGame.distance,
        clicks,
        time: completed ? getElapsedTime() : getElapsedTime(),
        path: [...navigation.history]
    };
    localStorage.setItem(`wikidle-game-${dailyGame.date}`, JSON.stringify(game));
}
export async function startGame() {
    if (!startScreen || !gameScreen || !wikipediaContainer || !tableOfContents || !pathContainer || !stepCount || !backButton || !forwardButton) {
        return;
    }
    if (!dailyGame) {
        await initializeDailyGame();
    }
    if (!dailyGame) {
        console.error("Cannot start game: daily game unavailable.");
        return;
    }
    const startPage = dailyGame.start;
    navigation = createNavigation(startPage);
    clicks = 0;
    if (clickCount) {
        clickCount.textContent = "0";
    }
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    updatePath();
    startTimer();
    loading = true;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
    await loadWikipediaPage(startPage, wikipediaContainer, handleNewPage);
    buildTableOfContents(wikipediaContainer, tableOfContents);
    loading = false;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
}
async function handleNewPage(title) {
    if (!wikipediaContainer || !tableOfContents || !backButton || !forwardButton) {
        return;
    }
    addPage(navigation, title);
    clicks++;
    if (clickCount) {
        clickCount.textContent = String(clicks);
    }
    updatePath();
    const cur = title.trim().toLowerCase();
    const goal = dailyGame?.goal.trim().toLowerCase();
    if (cur === goal) {
        completeGame();
        return;
    }
    loading = true;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
    await loadWikipediaPage(title, wikipediaContainer, handleNewPage);
    buildTableOfContents(wikipediaContainer, tableOfContents);
    loading = false;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
    saveGame();
}
function updatePath() {
    if (!navigation || !pathContainer || !stepCount || !backButton || !forwardButton) {
        return;
    }
    updatePathDisplay(navigation, pathContainer, stepCount);
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
}
function startTimer() {
    stopTimer();
    startTime = Date.now();
    updateTimer();
    timerInterval = window.setInterval(updateTimer, 1000);
}
function stopTimer() {
    if (timerInterval !== null) {
        window.clearInterval(timerInterval);
        timerInterval = null;
    }
}
function updateTimer() {
    if (!timer) {
        return;
    }
    timer.textContent = formatTime(getElapsedTime());
}
async function navigateBack() {
    if (!navigation || !wikipediaContainer || !tableOfContents || !backButton || !forwardButton || loading) {
        return;
    }
    const page = goBack(navigation);
    if (!page) {
        return;
    }
    clicks++;
    if (clickCount) {
        clickCount.textContent = String(clicks);
    }
    updatePath();
    loading = true;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
    await loadWikipediaPage(page, wikipediaContainer, handleNewPage);
    buildTableOfContents(wikipediaContainer, tableOfContents);
    loading = false;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
    saveGame();
}
async function navigateForward() {
    if (!navigation || !wikipediaContainer || !tableOfContents || !backButton || !forwardButton || loading) {
        return;
    }
    const page = goForward(navigation);
    if (!page) {
        return;
    }
    clicks++;
    if (clickCount) {
        clickCount.textContent = String(clicks);
    }
    updatePath();
    loading = true;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
    await loadWikipediaPage(page, wikipediaContainer, handleNewPage);
    buildTableOfContents(wikipediaContainer, tableOfContents);
    loading = false;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
    saveGame();
}
function completeGame() {
    console.log("game completed.");
    stopTimer();
    if (!completionScreen || !completionPathLength || !completionClicks || !completionTime || !completionPathList || !completionShortestPath || !dailyGame) {
        console.log("completion elements missing");
        return;
    }
    const pathLength = navigation.history.length - 1;
    const finalTime = getElapsedTime();
    completionPathLength.textContent = String(pathLength);
    completionClicks.textContent = String(clicks);
    completionTime.textContent = formatTime(finalTime);
    completionShortestPath.textContent = String(dailyGame?.distance ?? "?");
    completionPathList.innerHTML = "";
    navigation.history.forEach((page, index) => {
        const item = document.createElement("div");
        item.className = "completion-path-item";
        item.textContent = `${index + 1}. ${page}`;
        completionPathList.appendChild(item);
    });
    completionScreen.classList.remove("hidden");
    saveGame(true);
}
function getElapsedTime() {
    if (!startTime) {
        return 0;
    }
    return Date.now() - startTime;
}
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return (`${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`);
}
function showPreviousResult(result) {
    if (!completionScreen || !completionPathLength || !completionClicks || !completionTime || !completionPathList || !completionShortestPath) {
        return;
    }
    completionPathLength.textContent = String(result.pathLength);
    completionShortestPath.textContent = String(result.shortestPath);
    completionClicks.textContent = String(result.clicks);
    completionTime.textContent = formatTime(result.time);
    completionPathList.innerHTML = "";
    result.path.forEach((page, index) => {
        const item = document.createElement("div");
        item.className = "completion-path-item";
        item.textContent = `${index + 1}. ${page}`;
        completionPathList.appendChild(item);
    });
    completionScreen.classList.remove("hidden");
}
async function loadGame() {
    await initializeDailyGame();
    if (!dailyGame) {
        console.error("Cannot load game: daily game unavailable.");
        return;
    }
    const saved = localStorage.getItem(`wikidle-game-${dailyGame.date}`);
    if (!saved) {
        return;
    }
    try {
        const result = JSON.parse(saved);
        if (result.completed) {
            startScreen?.classList.add("hidden");
            gameScreen?.classList.add("hidden");
            showPreviousResult(result);
            return;
        }
        console.log("Restoring unfinished game...");
        startScreen?.classList.add("hidden");
        gameScreen?.classList.remove("hidden");
        await restoreGame(result);
    }
    catch (error) {
        console.error("Failed to restore saved game:", error);
        localStorage.removeItem(`wikidle-game-${dailyGame.date}`);
    }
}
async function restoreGame(saved) {
    if (!dailyGame || !wikipediaContainer || !tableOfContents || !backButton || !forwardButton) {
        return;
    }
    navigation = createNavigation(saved.path[0]);
    clicks = saved.clicks;
    for (let i = 1; i < saved.path.length; i++) {
        addPage(navigation, saved.path[i]);
    }
    if (clickCount) {
        clickCount.textContent = String(clicks);
    }
    updatePath();
    startTime = Date.now() - saved.time;
    updateTimer();
    timerInterval = window.setInterval(updateTimer, 1000);
    const currentPage = navigation.history[navigation.history.length - 1];
    loading = true;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
    await loadWikipediaPage(currentPage, wikipediaContainer, handleNewPage);
    buildTableOfContents(wikipediaContainer, tableOfContents);
    loading = false;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
}
loadGame();
backButton?.addEventListener("click", navigateBack);
forwardButton?.addEventListener("click", navigateForward);
