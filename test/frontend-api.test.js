import { test } from "node:test";
import assert from "node:assert/strict";

import { createSessionActions } from "../public/js/actions/session-actions.js";
import {
  ApiUnavailableError,
  fetchSessionStatus,
} from "../public/js/api.js";
import { state } from "../public/js/state.js";

function htmlResponse() {
  return new Response("<!doctype html><html><body>GitHub Pages fallback</body></html>", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
    status: 200,
  });
}

test("front-end API reports non-JSON static Pages responses as backend unavailable", async () => {
  const previousFetch = global.fetch;
  const requestedUrls = [];
  global.fetch = async (url) => {
    requestedUrls.push(String(url));
    return htmlResponse();
  };

  try {
    await assert.rejects(
      fetchSessionStatus(),
      (error) =>
        error instanceof ApiUnavailableError &&
        error.code === "API_UNAVAILABLE" &&
        /Node\.js 后端/.test(error.message)
    );

    assert.deepEqual(requestedUrls, ["/api/session/status"]);
  } finally {
    global.fetch = previousFetch;
  }
});

test("session startup keeps the GitHub Pages login screen clean when API is static HTML", async () => {
  const previousFetch = global.fetch;
  let loadZonesCalled = false;
  let renderCount = 0;
  global.fetch = async () => htmlResponse();

  state.connected = false;
  state.checkingSession = false;
  state.sessionError = "stale error";
  state.sessionHasServerCredentials = false;
  state.sessionEmail = "";
  state.sessionExpiresAt = "";
  state.sessionSource = "";

  const actions = createSessionActions({
    async loadZones() {
      loadZonesCalled = true;
    },
    renderApp() {
      renderCount += 1;
    },
  });

  try {
    await actions.checkSession();

    assert.equal(state.checkingSession, false);
    assert.equal(state.connected, false);
    assert.equal(state.sessionError, "");
    assert.equal(loadZonesCalled, false);
    assert.equal(renderCount, 2);
  } finally {
    global.fetch = previousFetch;
  }
});

test("manual login still tells static Pages users that the Node backend is missing", async () => {
  const previousDocument = global.document;
  const previousFetch = global.fetch;
  const previousFormData = global.FormData;
  let renderCount = 0;
  global.fetch = async () => htmlResponse();
  global.FormData = class TestFormData {
    constructor(form) {
      this.form = form;
    }

    get(name) {
      return this.form.values[name];
    }
  };
  global.document = {
    querySelector(selector) {
      assert.equal(selector, "#cloudflare-connect-form");
      return {
        values: {
          email: "operator@example.com",
          globalApiKey: "runtime-key",
        },
      };
    },
  };

  const actions = createSessionActions({
    async loadZones() {
      throw new Error("loadZones should not run");
    },
    renderApp() {
      renderCount += 1;
    },
  });

  try {
    state.connected = false;
    state.connectingSession = false;
    state.sessionError = "";
    state.sessionHasServerCredentials = false;
    state.sessionEmail = "";
    state.sessionExpiresAt = "";
    state.sessionSource = "";

    await actions.connectSession({ preventDefault() {} });

    assert.equal(state.connected, false);
    assert.match(state.sessionError, /Node\.js 后端/);
    assert.equal(renderCount, 2);
  } finally {
    global.document = previousDocument;
    global.fetch = previousFetch;
    global.FormData = previousFormData;
  }
});
