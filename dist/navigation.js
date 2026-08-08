export function createNavigation(startPage) {
    return {
        history: [startPage],
        currentIndex: 0
    };
}
export function addPage(navigation, page) {
    // Remove anything that was ahead of us.
    navigation.history = navigation.history.slice(0, navigation.currentIndex + 1);
    navigation.history.push(page);
    navigation.currentIndex = navigation.history.length - 1;
}
export function canGoBack(navigation) {
    return navigation.currentIndex > 0;
}
export function canGoForward(navigation) {
    return (navigation.currentIndex < navigation.history.length - 1);
}
export function goBack(navigation) {
    if (!canGoBack(navigation)) {
        return null;
    }
    navigation.currentIndex--;
    return navigation.history[navigation.currentIndex];
}
export function goForward(navigation) {
    if (!canGoForward(navigation)) {
        return null;
    }
    navigation.currentIndex++;
    return navigation.history[navigation.currentIndex];
}
export function updatePathDisplay(navigation, pathContainer, stepCount) {
    pathContainer.innerHTML = "";
    navigation.history.forEach((page, index) => {
        const pathItem = document.createElement("div");
        pathItem.className = "path-item";
        if (index === navigation.currentIndex) {
            pathItem.classList.add("current");
        }
        const number = document.createElement("span");
        number.className = "path-number";
        number.textContent = String(index + 1);
        const pageName = document.createElement("span");
        pageName.className = "path-page";
        pageName.textContent = page;
        pathItem.append(number, pageName);
        pathContainer.appendChild(pathItem);
    });
    const steps = navigation.currentIndex;
    stepCount.textContent = `${steps} ${steps === 1 ? "step" : "steps"}`;
}
export function updateNavigationButtons(navigation, backButton, forwardButton) {
    backButton.disabled = !canGoBack(navigation);
    forwardButton.disabled = !canGoForward(navigation);
}
