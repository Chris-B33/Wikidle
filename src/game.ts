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

import { 
    buildTableOfContents
} from "./toc.js";

let startTime = 0;
let timerInterval: number | null = null;
let clicks = 0;
let navigation: Navigation;
let loading = false;

const startScreen = document.querySelector<HTMLElement>("#start-screen");
const gameScreen = document.querySelector<HTMLElement>("#game-screen");

const tableOfContents = document.querySelector<HTMLElement>("#table-of-contents");
const wikipediaContainer = document.querySelector<HTMLElement>("#wikipedia-container");
const pathContainer = document.querySelector<HTMLElement>("#path");

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

export async function startGame(): Promise<void> {
    if (!startScreen || !gameScreen || !wikipediaContainer || !tableOfContents || !pathContainer || !stepCount || !backButton || !forwardButton) {
    return;
    }

    const startPage = startPageElement?.textContent?.trim() || "Albert Einstein";

    navigation = createNavigation(startPage);
    clicks = 0;

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


async function handleNewPage(title: string): Promise<void> {
    if (!wikipediaContainer || !tableOfContents || !backButton || !forwardButton) {
        return;
    }

    addPage(navigation, title);
    clicks++;
    updatePath();

    const cur = title.trim().toLowerCase();
    const goal = endPageElement?.textContent?.trim().toLowerCase();

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
}


function updatePath(): void {
    if (!navigation || !pathContainer || !stepCount || !backButton || !forwardButton) {
        return;
    }
    updatePathDisplay(navigation, pathContainer, stepCount);
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
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

async function navigateBack(): Promise<void> {
    if (!navigation || !wikipediaContainer || !tableOfContents || !backButton || !forwardButton) {
        return;
    }
    clicks++;
    const page = goBack(navigation);
    if (!page) {
        return;
    }

    updatePath();

    loading = true;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
    await loadWikipediaPage(page, wikipediaContainer, handleNewPage);
    buildTableOfContents(wikipediaContainer, tableOfContents);
    loading = false;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
}

async function navigateForward(): Promise<void> {
    if (!navigation || !wikipediaContainer || !tableOfContents || !backButton || !forwardButton) {
        return;
    }
    clicks++;
    const page = goForward(navigation);
    if (!page) {
        return;
    }

    updatePath();
    
    loading = true;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
    await loadWikipediaPage(page, wikipediaContainer, handleNewPage);
    buildTableOfContents(wikipediaContainer, tableOfContents);
    loading = false;
    updateNavigationButtons(navigation, backButton, forwardButton, loading);
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
