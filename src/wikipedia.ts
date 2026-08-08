const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

export async function fetchWikipediaPage(title: string): Promise<string> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "text",
    format: "json",
    formatversion: "2",
    origin: "*"
  });

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

function cleanWikipediaHTML(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");

  document.querySelectorAll("a.image").forEach(link => {
    const image = link.querySelector("img");

    if (image) {
      link.replaceWith(image);
    } else {
      link.remove();
    }
  });

  return document.body.innerHTML;
}

function isValidWikipediaLink(link: HTMLAnchorElement): boolean {
  const href = link.getAttribute("href");

  if (!href || !href.startsWith("/wiki/")) {
    return false;
  }

  if (href.includes("#") || href.includes("?")) {
    return false;
  }

  const title = decodeURIComponent(href.substring("/wiki/".length)).replace(/_/g, " ");

  if (!title) {
    return false;
  }

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

  return !blockedNamespaces.some(namespace => title.startsWith(namespace));
}

function processWikipediaLinks(container: HTMLElement, onPageSelected: (title: string) => void): void {
  const links = container.querySelectorAll<HTMLAnchorElement>("a[href]");

  links.forEach(link => {
    const href = link.getAttribute("href");

    if (!href) {
      return;
    }

    if (link.querySelector("img")) {
      const image = link.querySelector("img");

      if (image) {
        link.replaceWith(image);
      }

      return;
    }

    if (isValidWikipediaLink(link)) {
      const title = decodeURIComponent(href.substring("/wiki/".length)).replace(/_/g, " ");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "wiki-link";
      button.textContent = link.textContent || title;

      button.addEventListener("click", () => {
        onPageSelected(title);
      });

      link.replaceWith(button);
      return;
    }

    link.replaceWith(document.createTextNode(link.textContent || ""));
  });
}


export async function loadWikipediaPage(
  title: string,
  container: HTMLElement,
  onPageSelected: (title: string) => void
): Promise<void> {
  container.innerHTML = "Loading...";

  try {
    const html = await fetchWikipediaPage(title);

    container.innerHTML = html;
    processWikipediaLinks(container, onPageSelected);
  } catch (error) {
    console.error(error);
    container.innerHTML = "Unable to load this Wikipedia page.";
  }
}
