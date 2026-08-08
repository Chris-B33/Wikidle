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
const stepCount = document.querySelector("#step-count");
const backButton = document.querySelector("#back-button");
const forwardButton = document.querySelector("#forward-button");
const clickCount = document.querySelector("#click-count");
const timer = document.querySelector("#timer");
const startPageElement = document.querySelector("#start-page");
const endPageElement = document.querySelector("#end-page");
export function startGame() {
    if (!startScreen || !gameScreen || !wikipediaContainer || !pathContainer || !stepCount || !backButton || !forwardButton) {
        return;
    }
    const startPage = startPageElement?.textContent?.trim() || "Albert Einstein";
    navigation = createNavigation(startPage);
    clicks = 0;
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    updateClickCount();
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
    updateClickCount();
    updatePath();
    loadWikipediaPage(title, wikipediaContainer, handleNewPage);
}
function updatePath() {
    if (!navigation || !pathContainer || !stepCount || !backButton || !forwardButton) {
        return;
    }
    updatePathDisplay(navigation, pathContainer, stepCount);
    updateNavigationButtons(navigation, backButton, forwardButton);
}
function updateClickCount() {
    if (!clickCount) {
        return;
    }
    clickCount.textContent = `${clicks} ${clicks === 1 ? "click" : "clicks"}`;
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
    const elapsed = Date.now() - startTime;
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timer.textContent = `${String(minutes).padStart(2, "0")}:` + `${String(seconds).padStart(2, "0")}`;
}
function navigateBack() {
    if (!navigation || !wikipediaContainer) {
        return;
    }
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
    const page = goForward(navigation);
    if (!page) {
        return;
    }
    updatePath();
    loadWikipediaPage(page, wikipediaContainer, handleNewPage);
}
backButton?.addEventListener("click", navigateBack);
forwardButton?.addEventListener("click", navigateForward);
