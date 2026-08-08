import { loadWikipediaPage } from "./wikipedia.js";
import { createNavigation, addPage, goBack, goForward, updatePathDisplay, updateNavigationButtons } from "./navigation.js";
let startTime = 0;
let timerInterval = null;
let clicks = 0;
let navigation;
const startScreen = document.querySelector("#start-screen");
const gameScreen = document.querySelector("#game-screen");
const wikipediaContainer = document.querySelector("#wikipedia-container");
const pathContainer = document.querySelector("#path");
const gameContent = document.querySelector("#game-content");
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
const completionPathList = document.querySelector("#completion-path-list");
export function startGame() {
    if (!startScreen || !gameScreen || !wikipediaContainer || !pathContainer || !stepCount || !backButton || !forwardButton) {
        return;
    }
    const startPage = startPageElement?.textContent?.trim() || "Albert Einstein";
    navigation = createNavigation(startPage);
    clicks = 0;
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    updatePath();
    startTimer();
    loadWikipediaPage(startPage, wikipediaContainer, handleNewPage);
}
function handleNewPage(title) {
    if (!wikipediaContainer) {
        return;
    }
    addPage(navigation, title);
    clicks++;
    updatePath();
    const cur = title.trim().toLowerCase();
    const goal = endPageElement?.textContent?.trim().toLowerCase();
    console.log(cur + " | " + goal);
    if (cur === goal) {
        completeGame();
        return;
    }
    loadWikipediaPage(title, wikipediaContainer, handleNewPage);
}
function updatePath() {
    if (!navigation || !pathContainer || !stepCount || !backButton || !forwardButton) {
        return;
    }
    updatePathDisplay(navigation, pathContainer, stepCount);
    updateNavigationButtons(navigation, backButton, forwardButton);
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
function navigateBack() {
    if (!navigation || !wikipediaContainer) {
        return;
    }
    clicks++;
    const page = goBack(navigation);
    if (!page) {
        return;
    }
    updatePath();
    loadWikipediaPage(page, wikipediaContainer, handleNewPage);
}
function navigateForward() {
    if (!navigation || !wikipediaContainer) {
        return;
    }
    clicks++;
    const page = goForward(navigation);
    if (!page) {
        return;
    }
    updatePath();
    loadWikipediaPage(page, wikipediaContainer, handleNewPage);
}
function completeGame() {
    console.log("game completed.");
    stopTimer();
    if (!completionScreen || !completionPathLength || !completionClicks || !completionTime || !completionPathList) {
        console.log("completion elements missing");
        return;
    }
    const pathLength = navigation.history.length - 1;
    const finalTime = getElapsedTime();
    completionPathLength.textContent = String(pathLength);
    completionClicks.textContent = String(clicks);
    completionTime.textContent = formatTime(finalTime);
    completionPathList.innerHTML = "";
    navigation.history.forEach((page, index) => {
        const item = document.createElement("div");
        item.className = "completion-path-item";
        item.textContent = `${index + 1}. ${page}`;
        completionPathList.appendChild(item);
    });
    completionScreen.classList.remove("hidden");
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
backButton?.addEventListener("click", navigateBack);
forwardButton?.addEventListener("click", navigateForward);
