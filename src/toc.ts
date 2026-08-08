export function buildTableOfContents(wikipediaContainer: HTMLElement, tableOfContents: HTMLElement): void {
  console.log("Building TOC...");
  tableOfContents.innerHTML = "";

  const headings = wikipediaContainer.querySelectorAll<HTMLHeadingElement>("h2, h3, h4");
  const counts = [0, 0, 0];

  console.log("Wikipedia container:", wikipediaContainer);
  console.log("HTML length:", wikipediaContainer.innerHTML.length);
  console.log("Headings found:", headings.length);

  headings.forEach((heading, index) => {
    const level = Number(heading.tagName.substring(1));
    const levelIndex = level - 2;

    counts[levelIndex]++;
    counts.fill(0, levelIndex + 1);

    const number = counts.slice(0, levelIndex + 1).join(".");
    const id = `wiki-section-${index}`;

    heading.id = id;

    const button = document.createElement("button");
    button.type = "button";
    button.className = `toc-item toc-level-${level}`;
    button.textContent = `${number}. ${heading.textContent?.trim() || "Untitled section"}`;

    button.addEventListener("click", () => {
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    tableOfContents.appendChild(button);

    console.log("Added TOC item:", button.textContent);
  });

  console.log("TOC children:", tableOfContents.children.length);

  if (headings.length === 0) {
    console.warn("No h2, h3 or h4 headings found in Wikipedia content.");
  }

  setupTableOfContentsObserver(wikipediaContainer, tableOfContents);
}

function setupTableOfContentsObserver(wikipediaContainer: HTMLElement, tableOfContents: HTMLElement): void {
  const headings = wikipediaContainer.querySelectorAll<HTMLHeadingElement>("h2, h3, h4");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      tableOfContents.querySelectorAll(".toc-item").forEach((item) => {
        item.classList.toggle("active", item.getAttribute("data-target") === entry.target.id);
      });
    });
  }, {
    root: wikipediaContainer,
    rootMargin: "-10% 0px -70% 0px"
  });

  headings.forEach((heading) => observer.observe(heading));
}
