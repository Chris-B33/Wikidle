import {
  readFile,
  writeFile,
  rename
} from "node:fs/promises";

const WIKIPEDIA_API =
  "https://en.wikipedia.org/w/api.php";

const INPUT_FILE =
  "data/article-pool.json";

const OUTPUT_FILE =
  "data/article-graph.json";

const REQUEST_DELAY = 500;
const MAX_RETRIES = 6;

type ArticleGraph =
  Record<string, string[]>;

/* -------------------------------------------------------
   Delay
------------------------------------------------------- */

function sleep(
  milliseconds: number
): Promise<void> {
  return new Promise(resolve =>
    setTimeout(
      resolve,
      milliseconds
    )
  );
}

/* -------------------------------------------------------
   Wikipedia request
------------------------------------------------------- */

async function wikipediaRequest(
  params: Record<string, string>
): Promise<any> {
  const searchParams =
    new URLSearchParams({
      ...params,
      format: "json",
      formatversion: "2",
      origin: "*"
    });

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    const response =
      await fetch(
        `${WIKIPEDIA_API}?${searchParams}`
      );

    if (response.ok) {
      return response.json();
    }

    /*
     * Wikipedia is telling us to slow down.
     */
    if (
      response.status === 429 ||
      response.status === 503
    ) {
      const delay =
        REQUEST_DELAY *
        Math.pow(2, attempt);

      console.log(
        `  Rate limited (${response.status}).`
      );

      console.log(
        `  Waiting ${delay}ms before retry ${attempt}/${MAX_RETRIES}...`
      );

      await sleep(delay);

      continue;
    }

    throw new Error(
      `Wikipedia request failed: ${response.status}`
    );
  }

  throw new Error(
    "Wikipedia request failed after maximum retries."
  );
}

/* -------------------------------------------------------
   Same filtering as wikipedia.ts
------------------------------------------------------- */

function isUsableArticle(
  title: string
): boolean {
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

  return !blockedNamespaces.some(
    namespace =>
      title.startsWith(namespace)
  );
}

/* -------------------------------------------------------
   Get links for one article
------------------------------------------------------- */

async function getLinks(
  title: string
): Promise<string[]> {
  const links: string[] = [];

  let continuation:
    string | undefined;

  do {
    const params:
      Record<string, string> = {
        action: "query",
        prop: "links",
        titles: title,
        plnamespace: "0",
        pllimit: "max"
      };

    if (continuation) {
      params.plcontinue =
        continuation;
    }

    const data =
      await wikipediaRequest(
        params
      );

    const pages =
      data.query?.pages ?? {};

    for (
      const page of Object.values(
        pages
      ) as Array<{
        links?: Array<{
          title: string;
        }>;
      }>
    ) {
      for (
        const link of
          page.links ?? []
      ) {
        if (
          isUsableArticle(
            link.title
          )
        ) {
          links.push(
            link.title
          );
        }
      }
    }

    continuation =
      data.continue?.plcontinue;

    /*
     * Don't immediately make another
     * request to Wikipedia.
     */
    if (continuation) {
      await sleep(
        REQUEST_DELAY
      );
    }

  } while (continuation);

  return [
    ...new Set(links)
  ];
}

/* -------------------------------------------------------
   Load existing graph
------------------------------------------------------- */

async function loadExistingGraph():
  Promise<ArticleGraph> {
  try {
    const raw =
      await readFile(
        OUTPUT_FILE,
        "utf8"
      );

    const graph =
      JSON.parse(raw);

    if (
      typeof graph !== "object" ||
      graph === null ||
      Array.isArray(graph)
    ) {
      throw new Error(
        `${OUTPUT_FILE} is not a valid graph.`
      );
    }

    return graph as ArticleGraph;

  } catch (error: any) {

    /*
     * File doesn't exist yet.
     */
    if (
      error?.code === "ENOENT"
    ) {
      return {};
    }

    throw error;
  }
}

/* -------------------------------------------------------
   Load article pool
------------------------------------------------------- */

async function loadArticlePool():
  Promise<string[]> {
  const raw =
    await readFile(
      INPUT_FILE,
      "utf8"
    );

  const pool =
    JSON.parse(raw);

  if (!Array.isArray(pool)) {
    throw new Error(
      `${INPUT_FILE} must contain an array.`
    );
  }

  return [
    ...new Set(
      pool.filter(
        (title): title is string =>
          typeof title === "string" &&
          title.trim().length > 0
      )
    )
  ];
}

/* -------------------------------------------------------
   Save graph safely
------------------------------------------------------- */

async function saveGraph(
  graph: ArticleGraph
): Promise<void> {
  const temporaryFile =
    `${OUTPUT_FILE}.tmp`;

  await writeFile(
    temporaryFile,
    JSON.stringify(
      graph,
      null,
      2
    ) + "\n",
    "utf8"
  );

  await rename(
    temporaryFile,
    OUTPUT_FILE
  );
}

/* -------------------------------------------------------
   Build graph
------------------------------------------------------- */

async function buildGraph():
  Promise<void> {
  console.log(
    "Loading article pool..."
  );

  const articles =
    await loadArticlePool();

  console.log(
    `Found ${articles.length} articles.`
  );

  console.log(
    "Loading existing graph..."
  );

  const graph =
    await loadExistingGraph();

  const completed =
    new Set(
      Object.keys(graph)
    );

  console.log(
    `Already cached: ${completed.size}`
  );

  const remaining =
    articles.filter(
      article =>
        !completed.has(article)
    );

  console.log(
    `Remaining: ${remaining.length}`
  );

  if (
    remaining.length === 0
  ) {
    console.log(
      "Everything is already cached."
    );

    return;
  }

  for (
    let i = 0;
    i < remaining.length;
    i++
  ) {
    const article =
      remaining[i];

    console.log("");
    console.log(
      `[${i + 1}/${remaining.length}] ${article}`
    );

    try {
      const links =
        await getLinks(article);

      graph[article] =
        links;

      console.log(
        `  Found ${links.length} links.`
      );

      /*
       * Save after EVERY article.
       *
       * If the script crashes, everything
       * completed before the crash remains.
       */
      await saveGraph(graph);

      console.log(
        `  Saved to ${OUTPUT_FILE}`
      );

    } catch (error) {
      console.error(
        `  Failed to process "${article}".`
      );

      console.error(error);

      /*
       * Don't add a broken article to
       * the graph. It will be retried
       * the next time the script runs.
       */
      console.log(
        "  Continuing..."
      );
    }

    /*
     * Delay before the next article.
     */
    if (
      i < remaining.length - 1
    ) {
      await sleep(
        REQUEST_DELAY
      );
    }
  }

  console.log("");
  console.log(
    "================================"
  );
  console.log(
    " GRAPH BUILD COMPLETE"
  );
  console.log(
    "================================"
  );
  console.log(
    `Articles cached: ${Object.keys(graph).length}`
  );
  console.log(
    `Output: ${OUTPUT_FILE}`
  );
  console.log(
    "================================"
  );
}

/* -------------------------------------------------------
   Run
------------------------------------------------------- */

buildGraph()
  .then(() => {
    console.log(
      "Graph generation finished."
    );
  })
  .catch(error => {
    console.error(
      "Graph generation failed:"
    );

    console.error(error);

    throw error;
  });
