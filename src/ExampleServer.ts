/**
 * The `exampleServer` function generates a `Server` implementation based
 * on an instance of `Api`. The listening server will perform all the
 * request and response validations similarly to a real implementation.
 *
 * Responses returned from the server are generated randomly using the
 * response `Schema`.
 *
 * @since 1.0.0
 */
import * as OpenApi from "schema-openapi";

import { Effect, ReadonlyArray, pipe } from "effect";
import type { Api, Endpoint } from "effect-http/Api";
import { ServerBuilder, handle, server } from "effect-http/ServerBuilder";
import { internalServerError } from "effect-http/ServerError";
import { createResponseSchema } from "effect-http/internal/utils";

/**
 * Generate an example Server implementation.
 *
 * @category constructors
 * @since 1.0.0
 */
export const exampleServer = <A extends Api>(
  api: A,
): ServerBuilder<never, [], A> => {
  const _server = server(api);

  return pipe(
    _server.unimplementedEndpoints,
    ReadonlyArray.reduce(_server, (server, endpoint) =>
      pipe(server, handle(endpoint.id, createExampleHandler(endpoint)) as any),
    ),
  ) as any;
};

/** @internal */
const createExampleHandler = ({ schemas }: Endpoint) => {
  const responseSchema = createResponseSchema(schemas.response);

  return () =>
    pipe(
      OpenApi.randomExample(responseSchema),
      Effect.mapError((error) =>
        internalServerError(
          `Sorry, I don't have any example response. ${JSON.stringify(error)}`,
        ),
      ),
    );
};
