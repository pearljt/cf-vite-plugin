import type { Env } from "../env.js";
import { app } from "../app.js";

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