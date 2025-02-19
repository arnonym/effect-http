import * as Schema from "@effect/schema/Schema";
import {
  Context,
  Duration,
  Effect,
  LogLevel,
  Logger,
  ReadonlyArray,
  Request,
  RequestResolver,
  pipe,
} from "effect";
import * as Http from "effect-http";

import { FileNotFoundError, readFile } from "./_utils";

interface GetValue extends Request.Request<FileNotFoundError, string> {
  readonly _tag: "GetValue";
}
const GetValue = Request.tagged<GetValue>("GetValue");

const GetValueCache = Context.Tag<Request.Cache>();

const GetValueResolver = RequestResolver.fromFunctionEffect((_: GetValue) =>
  pipe(
    readFile("test-file"),
    Effect.tap(() => Effect.logDebug("Value read from file")),
  ),
);

const requestMyValue = Effect.flatMap(GetValueCache, (getValueCache) =>
  pipe(
    Effect.request(GetValue({}), GetValueResolver),
    Effect.withRequestCache(getValueCache),
    Effect.withRequestCaching(true),
  ),
);

const api = pipe(
  Http.api(),
  Http.get("getValue", "/value", { response: Schema.string }),
);

const server = pipe(
  Http.server(api),
  Http.handle("getValue", () =>
    Effect.flatMap(GetValueCache, (getValueCache) =>
      pipe(
        Effect.all(ReadonlyArray.replicate(requestMyValue, 10), {
          concurrency: 10,
        }),
        Effect.mapError(() => Http.notFoundError("File not found")),
        Effect.withRequestCache(getValueCache),
        Effect.withRequestCaching(true),
        Effect.map((values) => values.join(", ")),
      ),
    ),
  ),
);

pipe(
  server,
  Http.listen({ port: 3000 }),
  Logger.withMinimumLogLevel(LogLevel.All),
  Effect.provideServiceEffect(
    GetValueCache,
    Request.makeCache({ capacity: 100, timeToLive: Duration.seconds(5) }),
  ),
  Effect.runPromise,
);
