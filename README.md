# Wikidle

A daily Wikipedia navigation game.

Navigate from one Wikipedia article to another using only links within the articles. Your goal is to reach the target in as few links as possible.

## How It Works

Each day gives you:

* A starting article
* A target article
* A shortest possible path

You navigate Wikipedia normally, clicking links to move between articles.

The game tracks your:

* Path length
* Shortest path
* Clicks
* Time
* Full path taken

## Daily Games

A GitHub Actions workflow generates a new puzzle each day.

The generated puzzle is stored in:

```text
data/daily-game.json
```

The website fetches this file when the game starts, so the frontend doesn't need to generate or know the daily puzzle itself.

## Article Graph

Wikipedia links are collected ahead of time into:

```text
data/article-graph.json
```

The graph uses the same filtering rules as the game, removing things such as files, categories, templates, special pages, and other non-article links.

The daily generator uses this local graph to find suitable article pairs and calculate their shortest path without repeatedly querying Wikipedia.

## Development

Install dependencies:

```bash
npm install
```

Build TypeScript:

```bash
npm run build
```

Rebuild the article graph:

```bash
npx tsx scripts/build_graph.ts
```

Generate today's game:

```bash
npx tsx scripts/generate_game.ts
```

The game is then available through:

```text
data/daily-game.json
```

## Goal

Wikidle is designed to be a simple daily challenge: two Wikipedia articles, one shortest path, and a new puzzle every day.