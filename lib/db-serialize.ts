// pg is deprecating overlapping client.query() calls on one connection
// (removed in pg@9). Inside a Prisma interactive transaction every query shares
// one pooled connection, and both Prisma's nested `include` loading and
// Promise.all on `tx` issue queries concurrently. Chaining each connection's
// queries keeps the exact same behaviour (pg already ran them one at a time)
// without relying on pg's internal queue.

type QueryFn = (...args: unknown[]) => unknown;
type Queryable = { query: QueryFn };

const SERIALIZED = Symbol.for("hlusca.serializedQueries");

function isSubmittable(value: unknown) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { submit?: unknown }).submit === "function"
  );
}

export function serializeClientQueries<T extends Queryable>(client: T): T {
  const marked = client as T & { [SERIALIZED]?: boolean };
  if (marked[SERIALIZED]) return client;
  marked[SERIALIZED] = true;

  const query = client.query.bind(client) as QueryFn;
  let tail: Promise<unknown> = Promise.resolve();

  function enqueue<R>(run: () => Promise<R>) {
    const next = tail.then(run);
    tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  client.query = ((...args: unknown[]) => {
    // Streams/cursors manage their own lifecycle; pass them straight through.
    if (isSubmittable(args[0])) return query(...args);

    const callback = args[args.length - 1];
    if (typeof callback === "function") {
      // Callback style (used by pg.Pool#query): release the chain on completion.
      void enqueue(
        () =>
          new Promise<void>((resolve) => {
            query(...args.slice(0, -1), (error: unknown, result: unknown) => {
              resolve();
              (callback as (error: unknown, result: unknown) => void)(error, result);
            });
          }),
      );
      return undefined;
    }

    return enqueue(() => query(...args) as Promise<unknown>);
  }) as T["query"];

  return client;
}
