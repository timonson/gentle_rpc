import { extname, posix } from "https://deno.land/std@0.75.0/path/mod.ts";
import {
  HTTPSOptions,
  Response,
  ServerRequest,
} from "https://deno.land/std@0.75.0/http/server.ts";
import { assert } from "https://deno.land/std@0.75.0/_util/assert.ts";

const encoder = new TextEncoder();

const MEDIA_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".html": "text/html",
  ".htm": "text/html",
  ".json": "application/json",
  ".map": "application/json",
  ".txt": "text/plain",
  ".ts": "text/typescript",
  ".tsx": "text/tsx",
  ".js": "application/javascript",
  ".jsx": "text/jsx",
  ".gz": "application/gzip",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".mjs": "application/javascript",
};

/** Returns the content-type based on the extension of a path. */
function contentType(path: string): string | undefined {
  return MEDIA_TYPES[extname(path)];
}

export async function serveFile(
  req: ServerRequest,
  filePath: string,
): Promise<Response> {
  const [file, fileInfo] = await Promise.all([
    Deno.open(filePath),
    Deno.stat(filePath),
  ]);
  const headers = new Headers();
  headers.set("content-length", fileInfo.size.toString());
  const contentTypeValue = contentType(filePath);
  if (contentTypeValue) {
    headers.set("content-type", contentTypeValue);
  }
  req.done.then(() => {
    file.close();
  });
  return {
    status: 200,
    body: file,
    headers,
  };
}

function serveFallback(req: ServerRequest, e: Error): Response {
  if (e instanceof Deno.errors.NotFound) {
    return {
      status: 404,
      body: encoder.encode("Not found"),
    };
  } else {
    return {
      status: 500,
      body: encoder.encode("Internal server error"),
    };
  }
}

function serverLog(req: ServerRequest, res: Response): void {
  const d = new Date().toISOString();
  const dateFmt = `[${d.slice(0, 10)} ${d.slice(11, 19)}]`;
  const s = `${dateFmt} "${req.method} ${req.url} ${req.proto}" ${res.status}`;
  console.log(s);
}

function setCORS(res: Response): void {
  if (!res.headers) {
    res.headers = new Headers();
  }
  res.headers.append("access-control-allow-origin", "*");
  res.headers.append(
    "access-control-allow-headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range",
  );
}

export async function fileHandler(
  req: ServerRequest,
  {
    root = "",
    hasCorseEnabled = false,
    createErrorHtml,
  }: {
    root?: string;
    hasCorseEnabled?: boolean;
    createErrorHtml?: () => string;
  } = {},
) {
  let normalizedUrl = posix.normalize(req.url);
  try {
    normalizedUrl = decodeURIComponent(normalizedUrl);
  } catch (e) {
    if (!(e instanceof URIError)) {
      throw e;
    }
  }

  const fsPath = normalizedUrl.slice(-1) === "/"
    ? posix.join(".", root, normalizedUrl, "index.html")
    : posix.join(".", root, normalizedUrl);

  let response: Response | undefined;
  try {
    if (!(await Deno.stat(fsPath))) {
      throw new Deno.errors.NotFound();
    } else {
      response = await serveFile(req, fsPath);
    }
  } catch (e) {
    console.error(e.message);
    response = serveFallback(req, e);
  } finally {
    if (hasCorseEnabled) {
      assert(response);
      setCORS(response);
    }
    serverLog(req, response!);
    try {
      await req.respond(response!);
    } catch (e) {
      console.error(e.message);
    }
  }
}
