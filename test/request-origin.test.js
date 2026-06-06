import { test } from "node:test";
import assert from "node:assert/strict";

import { expectedRequestOrigin, sameOriginRequest } from "../src/lib/request-origin.js";

test("same origin checks do not trust forwarded proto unless explicitly enabled", () => {
  const request = {
    headers: {
      host: "panel.example.com",
      origin: "https://panel.example.com",
      "x-forwarded-proto": "https",
    },
  };

  assert.equal(expectedRequestOrigin(request), "http://panel.example.com");
  assert.equal(sameOriginRequest(request), false);
  assert.equal(
    sameOriginRequest(request, {
      trustProxyHeaders: true,
    }),
    true
  );
});

test("same origin checks prefer an explicit public origin in production", () => {
  const request = {
    headers: {
      host: "internal:3000",
      origin: "https://panel.example.com",
      "x-forwarded-proto": "http",
    },
  };

  assert.equal(
    sameOriginRequest(request, {
      publicOrigin: "https://panel.example.com",
    }),
    true
  );
  assert.equal(
    sameOriginRequest({
      headers: {
        ...request.headers,
        origin: "https://evil.example.com",
      },
    }, {
      publicOrigin: "https://panel.example.com",
    }),
    false
  );
});
