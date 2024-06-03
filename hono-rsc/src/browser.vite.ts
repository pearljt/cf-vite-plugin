import type { Child } from "hono/jsx";
import { render } from "hono/jsx/dom";

import { decode } from "@jacob-ebey/hono-server-components/runtime";
import clientModules from "virtual:client-modules";

import { rscStream } from "@jacob-ebey/hono-server-components/browser";

const rootDecodePromise = decode(rscStream, {
  loadClientModule(id) {
    if (import.meta.env.PROD) {
      return clientModules[id]();
    }
    return import(/* @vite-ignore */ id);
  },
});
rootDecodePromise.then((decoded) => decoded.done).catch(() => {});

export function hydrateDocument(
  { signal }: { signal?: AbortSignal } = {},
  decodePromise: Promise<{
    done: Promise<undefined>;
    value: unknown;
  }> = rootDecodePromise
) {
  return decodePromise.then(async (decoded) => {
    let run = true;
    while (run && !signal?.aborted) {
      run = false;
      try {
        render(
          decoded.value as Child,
          {
            replaceChildren: (documentFragment: DocumentFragment) => {
              let viteStyles;
              if (import.meta.env.DEV) {
                viteStyles = document.head.querySelectorAll(
                  "style[data-vite-dev-id]"
                );
              }

              // copy over the <html> attributes to the current document
              const html = documentFragment.querySelector("html");
              if (html) {
                for (const attr of Array.from(
                  document.documentElement.attributes
                )) {
                  document.documentElement.removeAttribute(attr.name);
                }
                for (const attr of Array.from(html.attributes)) {
                  document.documentElement.setAttribute(attr.name, attr.value);
                }
              }

              // copy over the <head> attributes to the current document
              const head = documentFragment.querySelector("head");
              if (head) {
                for (const attr of Array.from(document.head.attributes)) {
                  document.head.removeAttribute(attr.name);
                }
                for (const attr of Array.from(head.attributes)) {
                  document.head.setAttribute(attr.name, attr.value);
                }
              }
              // copy over the <head> children to the current document
              if (document.head.innerHTML !== head?.innerHTML) {
                for (const child of Array.from(document.head.children)) {
                  document.head.removeChild(child);
                }
                for (const child of Array.from(head?.children || [])) {
                  document.head.appendChild(child);
                }
              }

              if (import.meta.env.DEV) {
                for (const style of Array.from(viteStyles!)) {
                  const id = style.getAttribute("data-vite-dev-id");
                  const existingStyle = document.head.querySelector(
                    `style[data-vite-dev-id="${id}"]`
                  );
                  if (!existingStyle) {
                    document.head.appendChild(style);
                  }
                }
              }

              // copy over the <body> attributes to the current document
              const body = documentFragment.querySelector("body");
              if (body) {
                for (const attr of Array.from(document.body.attributes)) {
                  document.body.removeAttribute(attr.name);
                }
                for (const attr of Array.from(body.attributes)) {
                  document.body.setAttribute(attr.name, attr.value);
                }
              }

              // copy over the <body> children to the current document
              for (const child of Array.from(document.body.children)) {
                document.body.removeChild(child);
              }
              for (const child of Array.from(body?.children || [])) {
                document.body.appendChild(child);
              }
            },
          } as any
        );
      } catch (reason) {
        if (
          typeof reason === "object" &&
          reason &&
          "then" in reason &&
          typeof reason.then === "function"
        ) {
          await Promise.resolve(reason).catch(() => {});
          run = true;
          continue;
        }

        throw reason;
      }
    }
  });
}
