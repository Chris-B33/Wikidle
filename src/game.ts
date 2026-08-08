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
const stepCount = document.querySelector<HTMLElement>("#step-count");
const backButton = document.querySelector<HTMLButtonElement>("#back-button");
const forwardButton = document.querySelector<HTMLButtonElement>("#forward-button");
const clickCount = document.querySelector<HTMLElement>("#click-count");
const timer = document.querySelector<HTMLElement>("#timer");
const startPageElement = document.querySelector<HTMLElement>("#start-page");
const endPageElement = document.querySelector<HTMLElement>("#end-page");

export function startGame(): void {
  if (!startScreen || !gameScreen || !wikipediaContainer || !pathContainer || !stepCount || !backButton || !forwardButton) {
    return;
  }

  const startPage =startPageElement?.textContent?.trim() || "Albert Einstein";

  navigation = createNavigation(startPage);
  clicks = 0;
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  updateClickCount();
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
  updateClickCount();
  updatePath();
  loadWikipediaPage(title, wikipediaContainer, handleNewPage);
}


function updatePath(): void {
  if (!navigation || !pathContainer || !stepCount || !backButton || !forwardButton) {
    return;
  }
  updatePathDisplay(navigation, pathContainer, stepCount);
  updateNavigationButtons(navigation, backButton, forwardButton);
}

function updateClickCount(): void {
  if (!clickCount) {
    return;
  }
  clickCount.textContent = `${clicks} ${clicks === 1 ? "click" : "clicks"}`;
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
  if (!timer) {
    return;
  }
  const elapsed = Date.now() - startTime;
  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timer.textContent =`${String(minutes).padStart(2, "0")}:` + `${String(seconds).padStart(2, "0")}`;
}

function navigateBack(): void {
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

function navigateForward(): void {
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
