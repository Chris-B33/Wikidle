const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

const startScreen = document.querySelector<HTMLElement>("#start-screen");
const gameScreen = document.querySelector<HTMLElement>("#game-screen");
const startButton = document.querySelector<HTMLButtonElement>("#start-button");
const timerElement = document.querySelector<HTMLElement>("#timer");
const wikipediaContainer = document.querySelector<HTMLElement>("#wikipedia-container");

let startTime: number | null = null;
let timerInterval: number | null = null;

function startGame(): void {
  if (!startScreen || !gameScreen) {
    return;
  }

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  loadWikipediaPage("Albert Einstein");

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

/** * Fetch the HTML content of a Wikipedia article. */ 
async function fetchWikipediaPage(title: string): Promise<string> { 
  const params = new URLSearchParams({ action: "parse", page: title, prop: "text", format: "json", formatversion: "2", origin: "*" }); 

  const response = await fetch(`${WIKIPEDIA_API}?${params}`); 
  if (!response.ok) { 
    throw new Error(`Wikipedia request failed: ${response.status}`); 
  } 

  const data = await response.json(); 
  if (!data.parse?.text) { 
    throw new Error(`Wikipedia page not found: ${title}`); 
  } 
  return cleanWikipediaHTML(data.parse.text); 
}

/** * Remove parts of the article that should not * be usable during the game. */ 
function cleanWikipediaHTML(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");

  // Remove references, notes, citations and other non-game content.
  document.querySelectorAll(
    ".mw-references-wrap, " +
    ".reflist, " +
    ".references, " +
    "ol.references, " +
    ".reference, " +
    ".citation, " +
    ".notelist, " +
    ".notelist-plain, " +
    ".sistersitebox, " +
    ".mbox-small"
  ).forEach(element => element.remove());

  // Remove unwanted sections and everything after their heading until the next h2.
  const unwantedSections = [
    "references",
    "notes",
    "notes and references",
    "citations",
    "sources",
    "further reading",
    "external links",
    "see also",
    "bibliography"
  ];

  document.querySelectorAll("h2").forEach(heading => {
    const text = heading.textContent?.trim().toLowerCase();
    if (!text || !unwantedSections.includes(text)) {
      return;
    }
    let element: Element | null = heading;

    while (element) {
      const nextElement: Element | null =element.nextElementSibling;
      element.remove();
      if (nextElement?.tagName.toLowerCase() === "h2") {
        break;
      }
      element = nextElement;
    }
  });

  // Remove citation markers inside the article.
  document.querySelectorAll(
    "sup.reference, " +
    "sup[role='doc-noteref'], " +
    "a[href^='#cite_note-'], " +
    "a[href^='#cite_ref-']"
  ).forEach(element => element.remove());

  // Remove navigation/shortcut information that isn't useful for the game.
  document.querySelectorAll(
    ".hatnote, " +
    ".dablink, " +
    ".rellink, " +
    ".shortdescription"
  ).forEach(element => element.remove());

  // Turn image links into plain images.
  document.querySelectorAll(
    "a.image, " +
    "a[href^='./File:'], " +
    "a[href^='/wiki/File:']"
  ).forEach(link => {
    const image = link.querySelector("img");
    if (image) {
      link.replaceWith(image);
    } else {
      link.remove();
    }
  });

  // Remove category links.
  document.querySelectorAll("#catlinks").forEach(
    element => element.remove()
  );

  // Remove edit links.
  document.querySelectorAll(".mw-editsection").forEach(
    element => element.remove()
  );

  return document.body.innerHTML;
}

/** * Convert Wikipedia article links into game buttons. */ 
function processWikipediaLinks(container: HTMLElement): void {
  const links = container.querySelectorAll<HTMLAnchorElement>("a[href]");
  links.forEach(link => {
    const href = link.getAttribute("href");
    if (!href) {
      return;
    }

    // Keep images, but remove their links.
    if (link.querySelector("img")) {
      const image = link.querySelector("img");
      if (image) {
        link.replaceWith(image);
      }
      return;
    }

    // Valid Wikipedia article → game button.
    if (isValidWikipediaLink(link)) {
      const title = decodeURIComponent(
        href.substring("/wiki/".length)
      ).replace(/_/g, " ");

      const button = document.createElement("button");

      button.type = "button";
      button.className = "wiki-link";
      button.textContent = link.textContent || title;

      button.addEventListener("click", () => {
        loadWikipediaPage(title);
      });

      link.replaceWith(button);
      return;
    }

    // Invalid link → keep its text, but remove the link.
    const text = document.createTextNode(
      link.textContent || ""
    );

    link.replaceWith(text);
  });
}

function isValidWikipediaLink(link: HTMLAnchorElement): boolean {
  const href = link.getAttribute("href");

  if (!href || !href.startsWith("/wiki/")) {
    return false;
  }

  // Don't allow links with fragments or query parameters.
  if (href.includes("#") || href.includes("?")) {
    return false;
  }

  const title = decodeURIComponent(
    href.substring("/wiki/".length)
  ).replace(/_/g, " ");

  if (!title) {
    return false;
  }

  // Only Wikipedia's main article namespace is playable.
  const blockedNamespaces = [
    "File:",
    "Media:",
    "Special:",
    "Category:",
    "Template:",
    "Help:",
    "Portal:",
    "Draft:",
    "Module:",
    "Talk:",
    "Wikipedia:",
    "Wikimedia:",
    "Wikibooks:",
    "Wikidata:",
    "Wikinews:",
    "Wikiquote:",
    "Wikisource:",
    "Wikiversity:",
    "Wikivoyage:",
    "Wiktionary:"
  ];

  return !blockedNamespaces.some(namespace =>
    title.startsWith(namespace)
  );
}


/** * Load a Wikipedia page into the game. */ 
async function loadWikipediaPage( title: string ): Promise<void> { 
  if (!wikipediaContainer) { return; } 
  wikipediaContainer.innerHTML = "<p>Loading...</p>"; 

  try { 
    const html = await fetchWikipediaPage(title); 
    wikipediaContainer.innerHTML = html; 
    processWikipediaLinks(wikipediaContainer); 
  } catch (error) { 
    console.error(error); 
    wikipediaContainer.innerHTML = ` <p> Unable to load this Wikipedia page. </p> `; 
  } 
}
