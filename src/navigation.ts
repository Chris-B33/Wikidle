export interface Navigation {
  history: string[];
  currentIndex: number;
}

export function createNavigation(startPage: string): Navigation {
  return {
    history: [startPage],
    currentIndex: 0
  };
}

export function addPage(navigation: Navigation, page: string): void {
  // Remove anything that was ahead of us.
  navigation.history = navigation.history.slice(0, navigation.currentIndex + 1);
  navigation.history.push(page);
  navigation.currentIndex =navigation.history.length - 1;
}

export function canGoBack(navigation: Navigation): boolean {
  return navigation.currentIndex > 0;
}

export function canGoForward(navigation: Navigation): boolean {
  return (navigation.currentIndex < navigation.history.length - 1);
}

export function goBack(navigation: Navigation): string | null {
  if (!canGoBack(navigation)) { return null; }
  navigation.currentIndex--;
  return navigation.history[navigation.currentIndex];
}

export function goForward(navigation: Navigation): string | null {
  if (!canGoForward(navigation)) { return null; }
  navigation.currentIndex++;
  return navigation.history[navigation.currentIndex];
}

export function updatePathDisplay(navigation: Navigation, pathContainer: HTMLElement, stepCount: HTMLElement): void {
  pathContainer.innerHTML = "";
  navigation.history.forEach((page, index) => {
    const pathItem = document.createElement("div");
    pathItem.className = "path-item";
    if (
      index === navigation.currentIndex
    ) {
      pathItem.classList.add("current");
    }

    const number =document.createElement("span");
    number.className = "path-number";
    number.textContent = String(index + 1);

    const pageName =document.createElement("span");
    pageName.className = "path-page";
    pageName.textContent = page;

    pathItem.append(number, pageName);
    pathContainer.appendChild(pathItem);
  });

  const steps = navigation.currentIndex;

  stepCount.textContent =`${steps} ${steps === 1 ? "step" : "steps"}`;
}

export function updateNavigationButtons(navigation: Navigation,backButton: HTMLButtonElement,forwardButton: HTMLButtonElement, loading: boolean): void {
  backButton.disabled = loading || !canGoBack(navigation);
  forwardButton.disabled = loading || !canGoForward(navigation);
}
