import { describe, expect, it } from "vitest";

import { serializeClientQueries } from "@/lib/db-serialize";

function fakeClient() {
  let active = 0;
  let maxActive = 0;
  const order: string[] = [];
  const client = {
    query: (...args: unknown[]) => {
      const text = String(args[0]);
      const callback = typeof args[args.length - 1] === "function"
        ? (args[args.length - 1] as (error: unknown, result: unknown) => void)
        : null;
      active += 1;
      maxActive = Math.max(maxActive, active);
      order.push(`start ${text}`);
      const done = new Promise<{ text: string }>((resolve, reject) =>
        setTimeout(() => {
          active -= 1;
          order.push(`end ${text}`);
          if (text === "fail") reject(new Error("boom"));
          else resolve({ text });
        }, 5),
      );
      if (callback) {
        done.then((result) => callback(null, result), (error) => callback(error, null));
        return undefined;
      }
      return done;
    },
  };
  return { client, stats: () => ({ maxActive, order }) };
}

describe("serializeClientQueries", () => {
  it("never lets two queries overlap on one connection", async () => {
    const { client, stats } = fakeClient();
    serializeClientQueries(client);

    const results = await Promise.all([
      client.query("a"),
      client.query("b"),
      client.query("c"),
    ]);

    expect(results).toEqual([{ text: "a" }, { text: "b" }, { text: "c" }]);
    expect(stats().maxActive).toBe(1);
    expect(stats().order).toEqual(["start a", "end a", "start b", "end b", "start c", "end c"]);
  });

  it("keeps going after a failed query and still reports the failure", async () => {
    const { client } = fakeClient();
    serializeClientQueries(client);

    const failed = client.query("fail");
    const next = client.query("after");

    await expect(failed).rejects.toThrow("boom");
    await expect(next).resolves.toEqual({ text: "after" });
  });

  it("serializes callback-style queries too", async () => {
    const { client, stats } = fakeClient();
    serializeClientQueries(client);

    await new Promise<void>((resolve) => {
      let pending = 2;
      const done = () => (--pending === 0 ? resolve() : undefined);
      client.query("x", done);
      client.query("y", done);
    });

    expect(stats().maxActive).toBe(1);
  });

  it("wraps a connection only once", async () => {
    const { client, stats } = fakeClient();
    serializeClientQueries(serializeClientQueries(client));

    await Promise.all([client.query("a"), client.query("b")]);
    expect(stats().order).toHaveLength(4);
  });
});
