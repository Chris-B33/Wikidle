import {
  readFile,
  writeFile
} from "node:fs/promises";

const GRAPH_FILE =
  "data/article-graph.json";

const POOL_FILE =
  "data/article-pool.json";

const OUTPUT_FILE =
  "data/daily-game.json";

const MIN_DISTANCE = 4;
const MAX_DISTANCE = 8;
const MAX_ATTEMPTS = 1000;

interface DailyGame {
  date: string;
  start: string;
  goal: string;
  distance: number;
}

type ArticleGraph = Record<string, string[]>;

/* -------------------------------------------------------
   Date
------------------------------------------------------- */

function getToday(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

/* -------------------------------------------------------
   Seeded random
------------------------------------------------------- */

function seededRandom(
  seed: string
): () => number {
  let value = 0;

  for (let i = 0; i < seed.length; i++) {
    value =
      (value * 31 +
        seed.charCodeAt(i)) >>>
      0;
  }

  return () => {
    value =
      (value * 1664525 +
        1013904223) >>>
      0;

    return value / 4294967296;
  };
}

/* -------------------------------------------------------
   Shuffle
------------------------------------------------------- */

function shuffle<T>(
  items: T[],
  random: () => number
): T[] {
  const result = [...items];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        random() * (i + 1)
      );

    [
      result[i],
      result[j]
    ] = [
      result[j],
      result[i]
    ];
  }

  return result;
}

/* -------------------------------------------------------
   Load graph
------------------------------------------------------- */

async function loadGraph(): Promise<ArticleGraph> {
  const raw =
    await readFile(
      GRAPH_FILE,
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
      `${GRAPH_FILE} must contain an object.`
    );
  }

  return graph as ArticleGraph;
}

/* -------------------------------------------------------
   Load article pool
------------------------------------------------------- */

async function loadPool(): Promise<string[]> {
  const raw =
    await readFile(
      POOL_FILE,
      "utf8"
    );

  const pool =
    JSON.parse(raw);

  if (!Array.isArray(pool)) {
    throw new Error(
      `${POOL_FILE} must contain an array.`
    );
  }

  return [
    ...new Set(
      pool.filter(
        (article): article is string =>
          typeof article === "string" &&
          article.trim().length > 0
      )
    )
  ];
}

/* -------------------------------------------------------
   Shortest path
------------------------------------------------------- */

function findShortestPath(
  graph: ArticleGraph,
  start: string,
  goal: string
): string[] | null {
  if (start === goal) {
    return [start];
  }

  const queue: string[] = [start];

  const distances =
    new Map<string, number>();

  const parents =
    new Map<
      string,
      string | null
    >();

  distances.set(start, 0);
  parents.set(start, null);

  while (queue.length > 0) {
    const current =
      queue.shift()!;

    const distance =
      distances.get(current)!;

    /*
     * There is no reason to search
     * beyond the maximum game distance.
     */
    if (
      distance >= MAX_DISTANCE
    ) {
      continue;
    }

    const links =
      graph[current] ?? [];

    for (const next of links) {
      if (
        distances.has(next)
      ) {
        continue;
      }

      const nextDistance =
        distance + 1;

      distances.set(
        next,
        nextDistance
      );

      parents.set(
        next,
        current
      );

      if (next === goal) {
        const path: string[] = [];

        let page:
          string | null =
          goal;

        while (
          page !== null
        ) {
          path.unshift(page);

          page =
            parents.get(
              page
            ) ?? null;
        }

        return path;
      }

      queue.push(next);
    }
  }

  return null;
}

/* -------------------------------------------------------
   Generate game
------------------------------------------------------- */

async function generateGame(): Promise<void> {
  const date =
    getToday();

  const random =
    seededRandom(date);

  console.log(
    `Generating Wikidle for ${date}...`
  );

  const graph =
    await loadGraph();

  const pool =
    await loadPool();

  console.log(
    `Loaded ${Object.keys(graph).length} graph articles.`
  );

  console.log(
    `Loaded ${pool.length} candidate articles.`
  );

  /*
   * Only use articles that actually
   * exist as nodes in the graph.
   */
  const usablePool =
    pool.filter(
      article =>
        Array.isArray(
          graph[article]
        )
    );

  console.log(
    `Using ${usablePool.length} articles from the graph.`
  );

  if (
    usablePool.length < 2
  ) {
    throw new Error(
      "Not enough usable articles."
    );
  }

  /*
   * Shuffle the pool using today's
   * date so the same day always
   * produces the same game.
   */
  const starts =
    shuffle(
      usablePool,
      random
    );

  let attempts = 0;

  for (
    const start of starts
  ) {
    const possibleGoals =
      shuffle(
        usablePool.filter(
          article =>
            article !== start
        ),
        random
      );

    for (
      const goal of possibleGoals
    ) {
      if (
        attempts >=
        MAX_ATTEMPTS
      ) {
        break;
      }

      attempts++;

      console.log("");
      console.log(
        `Attempt ${attempts}:`
      );

      console.log(
        `  ${start} → ${goal}`
      );

      const path =
        findShortestPath(
          graph,
          start,
          goal
        );

      if (!path) {
        console.log(
          "  No path within 6 links."
        );

        continue;
      }

      const distance =
        path.length - 1;

      console.log(
        `  Shortest path: ${distance} links`
      );

      /*
       * Wikidle games must be
       * between 2 and 6 clicks.
       */
      if (
        distance <
          MIN_DISTANCE ||
        distance >
          MAX_DISTANCE
      ) {
        console.log(
          "  Rejected."
        );

        continue;
      }

      const game:
        DailyGame = {
          date,
          start,
          goal,
          distance
        };

      await writeFile(
        OUTPUT_FILE,
        JSON.stringify(
          game,
          null,
          2
        ) + "\n",
        "utf8"
      );

      console.log("");
      console.log(
        "================================"
      );
      console.log(
        " DAILY GAME GENERATED"
      );
      console.log(
        "================================"
      );
      console.log(
        `Date:     ${game.date}`
      );
      console.log(
        `Start:    ${game.start}`
      );
      console.log(
        `Goal:     ${game.goal}`
      );
      console.log(
        `Distance: ${game.distance} links`
      );
      console.log(
        `Written:  ${OUTPUT_FILE}`
      );
      console.log(
        "================================"
      );

      return;
    }
  }

  throw new Error(
    `Could not find a valid ${MIN_DISTANCE}-${MAX_DISTANCE} link game after ${attempts} attempts.`
  );
}

/* -------------------------------------------------------
   Run
------------------------------------------------------- */

generateGame()
  .then(() => {
    console.log(
      "Game generation finished."
    );
  })
  .catch(error => {
    console.error(
      "Game generation failed:"
    );

    console.error(error);

    throw error;
  });
