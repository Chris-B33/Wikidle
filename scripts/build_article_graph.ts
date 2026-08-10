import {
    readFile,
    writeFile,
    rename
} from "node:fs/promises";

const WIKIPEDIA_API =
    "https://en.wikipedia.org/w/api.php";

const INPUT_FILE =
    "data/article-pool.json";

const GRAPH_FILE =
    "data/article-graph.json";

const PREVIEW_FILE =
    "data/article-previews.json";

const REQUEST_DELAY = 500;
const MAX_RETRIES = 6;

type ArticleGraph = Record<string, string[]>;
type ArticlePreviews = Record<string, string>;

/* -------------------------------------------------------
Delay
------------------------------------------------------- */

function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve =>
        setTimeout(resolve, milliseconds)
    );
}

/* -------------------------------------------------------
Wikipedia request
------------------------------------------------------- */

async function wikipediaRequest(
    params: Record<string, string>
): Promise<any> {
    const searchParams = new URLSearchParams({
        ...params,
        format: "json",
        formatversion: "2",
        origin: "*"
    });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const response = await fetch(
            `${WIKIPEDIA_API}?${searchParams}`
        );

        if (response.ok) {
            return response.json();
        }

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

function isUsableArticle(title: string): boolean {
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
Clean Wikipedia HTML
------------------------------------------------------- */

function cleanWikipediaHTML(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "");
}

/* -------------------------------------------------------
Extract article preview
------------------------------------------------------- */

function extractPreview(html: string): string {
    const cleaned = cleanWikipediaHTML(html);

    const paragraphMatches =
        cleaned.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [];

    for (const paragraph of paragraphMatches) {
        const text = paragraph
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&quot;/gi, "\"")
            .replace(/&#39;/gi, "'")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/\s+/g, " ")
            .trim();

        if (
            text.length >= 40 &&
            !text.startsWith("Coordinates:")
        ) {
            if (text.length <= 300) {
                return text;
            }

            return `${text.substring(0, 297).trim()}...`;
        }
    }

    return "";
}

/* -------------------------------------------------------
Get preview for one article
------------------------------------------------------- */

async function getPreview(
    title: string
): Promise<string> {
    const data = await wikipediaRequest({
        action: "parse",
        page: title,
        prop: "text"
    });

    const html = data.parse?.text;

    if (!html) {
        throw new Error(
            `Wikipedia page not found: ${title}`
        );
    }

    return extractPreview(html);
}

/* -------------------------------------------------------
Get links for one article
------------------------------------------------------- */

async function getLinks(
    title: string
): Promise<string[]> {
    const links: string[] = [];

    let continuation: string | undefined;

    do {
        const params: Record<string, string> = {
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
            await wikipediaRequest(params);

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
Load JSON object
------------------------------------------------------- */

async function loadJsonObject<T>(
    filename: string
): Promise<T> {
    try {
        const raw =
            await readFile(
                filename,
                "utf8"
            );

        const data =
            JSON.parse(raw);

        if (
            typeof data !== "object" ||
            data === null ||
            Array.isArray(data)
        ) {
            throw new Error(
                `${filename} is not a valid object.`
            );
        }

        return data as T;
    } catch (error: any) {
        if (
            error?.code === "ENOENT"
        ) {
            return {} as T;
        }

        throw error;
    }
}

/* -------------------------------------------------------
Load article pool
------------------------------------------------------- */

async function loadArticlePool(): Promise<string[]> {
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
Save JSON safely
------------------------------------------------------- */

async function saveJson(
    filename: string,
    data: object
): Promise<void> {
    const temporaryFile =
        `${filename}.tmp`;

    await writeFile(
        temporaryFile,
        JSON.stringify(
            data,
            null,
            2
        ) + "\n",
        "utf8"
    );

    await rename(
        temporaryFile,
        filename
    );
}

/* -------------------------------------------------------
Build missing previews
------------------------------------------------------- */

async function buildPreviews(
    articles: string[],
    previews: ArticlePreviews
): Promise<void> {
    const remaining =
        articles.filter(
            article =>
                !Object.prototype.hasOwnProperty.call(
                    previews,
                    article
                )
        );

    console.log("");
    console.log(
        "================================"
    );
    console.log(
        " PREVIEW GENERATION"
    );
    console.log(
        "================================"
    );
    console.log(
        `Already cached: ${Object.keys(previews).length}`
    );
    console.log(
        `Remaining: ${remaining.length}`
    );

    if (
        remaining.length === 0
    ) {
        console.log(
            "All previews are already cached."
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
            `[Preview ${i + 1}/${remaining.length}] ${article}`
        );

        try {
            const preview =
                await getPreview(
                    article
                );

            previews[article] =
                preview;

            console.log(
                preview
                    ? `  Preview created (${preview.length} chars).`
                    : "  No preview found."
            );

            await saveJson(
                PREVIEW_FILE,
                previews
            );

            console.log(
                `  Saved to ${PREVIEW_FILE}`
            );
        } catch (error) {
            console.error(
                `  Failed to create preview for "${article}".`
            );

            console.error(error);

            console.log(
                "  Continuing..."
            );
        }

        if (
            i < remaining.length - 1
        ) {
            await sleep(
                REQUEST_DELAY
            );
        }
    }
}

/* -------------------------------------------------------
Build missing graph entries
------------------------------------------------------- */

async function buildGraph(
    articles: string[],
    graph: ArticleGraph
): Promise<void> {
    const completed =
        new Set(
            Object.keys(graph)
        );

    const remaining =
        articles.filter(
            article =>
                !completed.has(article)
        );

    console.log("");
    console.log(
        "================================"
    );
    console.log(
        " GRAPH GENERATION"
    );
    console.log(
        "================================"
    );
    console.log(
        `Already cached: ${completed.size}`
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
            `[Graph ${i + 1}/${remaining.length}] ${article}`
        );

        try {
            const links =
                await getLinks(
                    article
                );

            graph[article] =
                links;

            console.log(
                `  Found ${links.length} links.`
            );

            await saveJson(
                GRAPH_FILE,
                graph
            );

            console.log(
                `  Saved to ${GRAPH_FILE}`
            );
        } catch (error) {
            console.error(
                `  Failed to process "${article}".`
            );

            console.error(error);

            console.log(
                "  Continuing..."
            );
        }

        if (
            i < remaining.length - 1
        ) {
            await sleep(
                REQUEST_DELAY
            );
        }
    }
}

/* -------------------------------------------------------
Build everything
------------------------------------------------------- */

async function buildEverything(): Promise<void> {
    console.log(
        "Loading article pool..."
    );

    const articles =
        await loadArticlePool();

    console.log(
        `Found ${articles.length} articles.`
    );

    console.log(
        "Loading existing previews..."
    );

    const previews =
        await loadJsonObject<ArticlePreviews>(
            PREVIEW_FILE
        );

    console.log(
        "Loading existing graph..."
    );

    const graph =
        await loadJsonObject<ArticleGraph>(
            GRAPH_FILE
        );

    /*
     * Previews are generated first.
     * Existing previews are never requested again.
     */
    await buildPreviews(
        articles,
        previews
    );

    /*
     * Graph generation happens after previews.
     * Existing graph entries are never requested again.
     */
    await buildGraph(
        articles,
        graph
    );

    console.log("");
    console.log(
        "================================"
    );
    console.log(
        " BUILD COMPLETE"
    );
    console.log(
        "================================"
    );
    console.log(
        `Articles: ${articles.length}`
    );
    console.log(
        `Previews: ${Object.keys(previews).length}`
    );
    console.log(
        `Graph entries: ${Object.keys(graph).length}`
    );
    console.log(
        `Preview output: ${PREVIEW_FILE}`
    );
    console.log(
        `Graph output: ${GRAPH_FILE}`
    );
    console.log(
        "================================"
    );
}

/* -------------------------------------------------------
Run
------------------------------------------------------- */

buildEverything()
    .then(() => {
        console.log(
            "Generation finished."
        );
    })
    .catch(error => {
        console.error(
            "Generation failed:"
        );

        console.error(error);

        throw error;
    });