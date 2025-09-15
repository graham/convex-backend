/**
 * Example demonstrating plaintext authentication with Convex
 *
 * WARNING: This is for development/debugging only. Never use plaintext
 * authentication in production applications.
 */

import { ConvexReactClient } from "convex/react";

// Example usage of setAuthInsecure for plaintext authentication
function setupPlaintextAuth() {
  const client = new ConvexReactClient("https://your-deployment.convex.cloud");

  // Set up plaintext authentication
  client.setAuthInsecure(
    async () => {
      // Return a plaintext token for debugging purposes
      // In a real scenario, this might come from a test user input
      return "debug-user-12345";
    },
    (isAuthenticated) => {
      console.log("Plaintext auth status changed:", isAuthenticated);
    }
  );

  return client;
}

// Example query that would use getUserIdentityInsecure
async function demonstrateUserIdentityInsecure(client: ConvexReactClient) {
  // This would be a query that calls ctx.auth.getUserIdentityInsecure()
  const plaintextToken = await client.query("auth:getUserIdentityInsecure" as any);

  if (plaintextToken) {
    console.log("Current plaintext token:", plaintextToken);
  } else {
    console.log("No plaintext token found (user not authenticated with plaintext)");
  }
}

// Example switching between auth modes
function demonstrateAuthSwitching() {
  const client = new ConvexReactClient("https://your-deployment.convex.cloud");

  // Start with JWT authentication
  client.setAuth(
    async ({ forceRefreshToken }) => {
      // Normally would fetch JWT from auth provider
      return "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...";
    },
    (isAuthenticated) => console.log("JWT auth:", isAuthenticated)
  );

  // Switch to plaintext authentication for debugging
  setTimeout(() => {
    client.setAuthInsecure(
      async () => "debug-session-token",
      (isAuthenticated) => console.log("Plaintext auth:", isAuthenticated)
    );
  }, 5000);

  // Clear authentication
  setTimeout(() => {
    client.clearAuth();
    console.log("Authentication cleared");
  }, 10000);
}

export {
  setupPlaintextAuth,
  demonstrateUserIdentityInsecure,
  demonstrateAuthSwitching,
};