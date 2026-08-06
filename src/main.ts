const startScreen = document.querySelector<HTMLElement>("#start-screen");
const gameScreen = document.querySelector<HTMLElement>("#game-screen");
const startButton = document.querySelector<HTMLButtonElement>("#start-button");
const timerElement = document.querySelector<HTMLElement>("#timer");

let startTime: number | null = null;
let timerInterval: number | null = null;

function startGame(): void {
  if (!startScreen || !gameScreen) {
    return;
  }

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  startTime = Date.now();
  timerInterval = window.setInterval(updateTimer, 1000);
  updateTimer();
}

function updateTimer(): void {
  if (!timerElement || startTime === null) {
    return;
  }

  const elapsedMilliseconds = Date.now() - startTime;
  const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  timerElement.textContent =
    `${minutes.toString().padStart(2, "0")}:` +
    `${seconds.toString().padStart(2, "0")}`;
}

startButton?.addEventListener("click", startGame);
