import { vi, describe, test, expect } from "vitest";
import { ConvexReactClient } from "./client";
import { withInMemoryWebSocket } from "./test/server";

function testReactClient(address: string, options: any = {}) {
  return new ConvexReactClient(address, {
    logger: false,
    ...options,
  });
}

function assertAuthenticateMessage(message: any, expected: any) {
  expect(message.type).toEqual("Authenticate");
  expect(message.tokenType).toEqual(expected.tokenType);
  if (expected.value) {
    expect(message.value).toEqual(expected.value);
  }
  if (expected.baseVersion !== undefined) {
    expect(message.baseVersion).toEqual(expected.baseVersion);
  }
}

async function assertReconnectWithAuth(receive: any, expected: any) {
  expect((await receive()).type).toEqual("Connect");
  assertAuthenticateMessage(await receive(), expected);
}

describe("setAuthInsecure functionality", () => {
  test("setAuthInsecure establishes plaintext authentication", async () => {
    await withInMemoryWebSocket(async ({ address, receive, send }) => {
      const client = testReactClient(address);

      const plaintextToken = "my-plaintext-token-12345";
      const tokenFetcher = vi.fn(async () => plaintextToken);
      const onAuthChange = vi.fn();

      client.setAuthInsecure(tokenFetcher, onAuthChange);

      expect((await receive()).type).toEqual("Connect");
      expect((await receive()).type).toEqual("Authenticate");

      const authMessage = await receive();
      assertAuthenticateMessage(authMessage, {
        tokenType: "PlaintextUser",
        value: plaintextToken,
        baseVersion: 0,
      });

      expect(tokenFetcher).toHaveBeenCalledTimes(1);
      expect(onAuthChange).not.toHaveBeenCalled(); // Not called until server confirms

      // Server confirms authentication
      send({
        type: "Transition",
        startVersion: { identity: 0, ts: 0, querySet: 0 },
        endVersion: { identity: 1, ts: 1, querySet: 0 },
        modifications: [],
      });

      expect(onAuthChange).toHaveBeenCalledWith(true);
    });
  });

  test("switching from setAuth to setAuthInsecure", async () => {
    await withInMemoryWebSocket(async ({ address, receive, send }) => {
      const client = testReactClient(address);

      // First, set regular JWT auth
      const jwtToken = "jwt.token.here";
      const jwtTokenFetcher = vi.fn(async () => jwtToken);
      const jwtOnAuthChange = vi.fn();

      client.setAuth(jwtTokenFetcher, jwtOnAuthChange);

      expect((await receive()).type).toEqual("Connect");
      assertAuthenticateMessage(await receive(), {
        tokenType: "User",
        value: jwtToken,
      });

      // Now switch to plaintext auth
      const plaintextToken = "plaintext-token-67890";
      const plaintextTokenFetcher = vi.fn(async () => plaintextToken);
      const plaintextOnAuthChange = vi.fn();

      client.setAuthInsecure(plaintextTokenFetcher, plaintextOnAuthChange);

      // Should receive Authenticate message with plaintext token
      assertAuthenticateMessage(await receive(), {
        tokenType: "PlaintextUser",
        value: plaintextToken,
      });

      expect(plaintextTokenFetcher).toHaveBeenCalledTimes(1);
    });
  });

  test("clearAuth after setAuthInsecure", async () => {
    await withInMemoryWebSocket(async ({ address, receive, send }) => {
      const client = testReactClient(address);

      const plaintextToken = "plaintext-token-clear-test";
      const tokenFetcher = vi.fn(async () => plaintextToken);
      const onAuthChange = vi.fn();

      client.setAuthInsecure(tokenFetcher, onAuthChange);

      expect((await receive()).type).toEqual("Connect");
      assertAuthenticateMessage(await receive(), {
        tokenType: "PlaintextUser",
        value: plaintextToken,
      });

      // Clear auth
      client.clearAuth();

      const clearMessage = await receive();
      expect(clearMessage.type).toEqual("Authenticate");
      expect(clearMessage.tokenType).toEqual("None");
    });
  });

  test("setAuthInsecure handles token refresh", async () => {
    await withInMemoryWebSocket(async ({ address, receive, send, close }) => {
      const client = testReactClient(address);

      let tokenCount = 0;
      const tokenFetcher = vi.fn(async () => `plaintext-token-${++tokenCount}`);
      const onAuthChange = vi.fn();

      client.setAuthInsecure(tokenFetcher, onAuthChange);

      await assertReconnectWithAuth(receive, {
        baseVersion: 0,
        tokenType: "PlaintextUser",
        value: "plaintext-token-1",
      });

      // Simulate connection drop and reconnect
      close();

      await assertReconnectWithAuth(receive, {
        baseVersion: 1,
        tokenType: "PlaintextUser",
        value: "plaintext-token-2",
      });

      expect(tokenFetcher).toHaveBeenCalledTimes(2);
    });
  });

  test("setAuthInsecure fails when tokens cannot be fetched", async () => {
    await withInMemoryWebSocket(async ({ address, receive }) => {
      const client = testReactClient(address);
      const tokenFetcher = vi.fn(async () => null);
      const onAuthChange = vi.fn();

      client.setAuthInsecure(tokenFetcher, onAuthChange);

      expect((await receive()).type).toEqual("Connect");
      expect((await receive()).type).toEqual("ModifyQuerySet");

      expect(onAuthChange).toHaveBeenCalledWith(false);
    });
  });
});