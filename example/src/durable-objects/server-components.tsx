"use server";

import { rscRenderer } from "@jacob-ebey/hono-server-components";
import { Hono } from "hono";

import { durableObjectsMiddleware } from "../durable-objects.js";
import type { Env } from "../env.js";

import browserEntry from "bridge:../browser.js";
import stylesEntry from "bridge:../global.css";
import { Suspense } from "hono/jsx";

import { Counter } from "../components/counter/client.js";

function Entry({ entry }: { entry: string }) {
  const baseId = entry.replace(/\?.*$/, "");
  if (import.meta.env.PROD && baseId.endsWith(".css")) {
    return <link rel="stylesheet" href={entry} />;
  }
  return <script async type="module" src={entry} />;
}

async function AsyncHello() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <p>Hello, World!</p>;
}

const app = new Hono<{ Bindings: Env & { state: DurableObjectState } }>()
  .use(durableObjectsMiddleware)
  .use(
    rscRenderer(({ children }) => (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <title>Counter</title>
          <Entry entry={stylesEntry} />
        </head>
        <body>
          {children}
          <Entry entry={browserEntry} />
        </body>
      </html>
    ))
  )
  .get("/", async ({ get, render, req }) => {
    const id =
      (
        req.raw as {
          cf?: IncomingRequestCfProperties;
        }
      ).cf?.country || "global";

    const count = await get("counter")
      .value.$get()
      .then((res) => res.json());

    return render(
      <main>
        <div class="py-24 flex flex-col items-center">
          <h1 class="text-4xl font-bold">Hello, World!!</h1>
          {/* <Counter initialCount={count} /> */}
          {/* <Suspense fallback={<p>Suspended...</p>}>
            <AsyncHello />
          </Suspense> */}
        </div>
      </main>
    );
  });

export class ServerComponents implements DurableObject {
  #env: Env;
  #state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    this.#state = state;
    this.#env = env;
  }

  async fetch(request: Request) {
    const res = await app.fetch(request, {
      ...this.#env,
      state: this.#state,
    });
    return res;
  }
}
