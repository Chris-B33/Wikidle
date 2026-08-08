import {
  loadWikipediaPage
} from "./wikipedia.js";

import {
  createNavigation,
  addPage,
  goBack,
  goForward,
  updatePathDisplay,
  updateNavigationButtons,
  Navigation
} from "./navigation.js";

let startTime = 0;
let timerInterval: number | null = null;
let clicks = 0;
let navigation: Navigation;

const startScreen = document.querySelector<HTMLElement>("#start-screen");
const gameScreen = document.querySelector<HTMLElement>("#game-screen");

const wikipediaContainer = document.querySelector<HTMLElement>("#wikipedia-container");
const pathContainer = document.querySelector<HTMLElement>("#path");

const gameContent = document.querySelector<HTMLElement>("#game-content");

const stepCount = document.querySelector<HTMLElement>("#step-count");

const backButton = document.querySelector<HTMLButtonElement>("#back-button");
const forwardButton = document.querySelector<HTMLButtonElement>("#forward-button");

const clickCount = document.querySelector<HTMLElement>("#click-count");
const timer = document.querySelector<HTMLElement>("#timer");

const startPageElement = document.querySelector<HTMLElement>("#start-page");
const endPageElement = document.querySelector<HTMLElement>("#end-page");

const completionScreen = document.querySelector<HTMLElement>("#completion-screen");
const completionPathLength = document.querySelector<HTMLElement>( "#completion-path-length" ); 
const completionClicks = document.querySelector<HTMLElement>( "#completion-clicks" ); 
const completionTime = document.querySelector<HTMLElement>( "#completion-time" ); 
const completionPathList = document.querySelector<HTMLElement>( "#completion-path-list" );

export function startGame(): void {
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

function handleNewPage(title: string): void {
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


function updatePath(): void {
    if (!navigation || !pathContainer || !stepCount || !backButton || !forwardButton) {
        return;
    }
    updatePathDisplay(navigation, pathContainer, stepCount);
    updateNavigationButtons(navigation, backButton, forwardButton);
}

function startTimer(): void {
    stopTimer();
    startTime = Date.now();
    updateTimer();
    timerInterval = window.setInterval(updateTimer, 1000);
}

function stopTimer(): void {
    if (timerInterval !== null) {
        window.clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimer(): void { 
    if (!timer) { return; } 
    timer.textContent = formatTime(getElapsedTime()); 
}

function navigateBack(): void {
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

function navigateForward(): void {
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

function completeGame(): void {
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

function getElapsedTime(): number {
  if (!startTime) {
    return 0;
  }
  return Date.now() - startTime;
}

function formatTime(milliseconds: number): string {
  const totalSeconds =Math.floor(milliseconds / 1000);
  const minutes =Math.floor(totalSeconds / 60);
  const seconds =totalSeconds % 60;

  return (
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`
  );
}

backButton?.addEventListener("click", navigateBack);
forwardButton?.addEventListener("click", navigateForward);
