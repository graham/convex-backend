/**
 * Example Convex functions demonstrating plaintext authentication features
 */

import { query } from "./_generated/server";

// Example query that returns different data based on authentication type
export const getAuthInfo = query(async ({ auth }) => {
  // Get regular user identity (works for JWT users)
  const userIdentity = await auth.getUserIdentity();

  // Get plaintext token (only works for PlaintextUser identities)
  const plaintextToken = await auth.getUserIdentityInsecure();

  return {
    hasUserIdentity: !!userIdentity,
    userTokenIdentifier: userIdentity?.tokenIdentifier,
    userName: userIdentity?.name,
    plaintextToken: plaintextToken, // Will be null for JWT users
    authType: plaintextToken ? "plaintext" : userIdentity ? "jwt" : "none",
  };
});

// Example query that only works with plaintext authentication
export const getPlaintextDebugInfo = query(async ({ auth }) => {
  const plaintextToken = await auth.getUserIdentityInsecure();

  if (!plaintextToken) {
    throw new Error("This function requires plaintext authentication for debugging");
  }

  return {
    message: "Debug info access granted",
    token: plaintextToken,
    timestamp: Date.now(),
    debugData: {
      // Example debug information that might be useful during development
      environment: "development",
      session: "debug-session",
    },
  };
});

// Example query demonstrating mixed authentication support
export const getFlexibleAuthData = query(async ({ auth }) => {
  const userIdentity = await auth.getUserIdentity();
  const plaintextToken = await auth.getUserIdentityInsecure();

  if (userIdentity) {
    // Standard JWT authentication path
    return {
      type: "jwt_user",
      data: {
        id: userIdentity.tokenIdentifier,
        name: userIdentity.name,
        email: userIdentity.email,
      },
    };
  } else if (plaintextToken) {
    // Plaintext authentication path (for debugging)
    return {
      type: "plaintext_user",
      data: {
        debugToken: plaintextToken,
        message: "Authenticated with plaintext token for debugging",
      },
    };
  } else {
    // No authentication
    return {
      type: "anonymous",
      data: {
        message: "No authentication provided",
      },
    };
  }
});