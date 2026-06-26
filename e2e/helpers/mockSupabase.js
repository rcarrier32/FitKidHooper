import { supabaseAuthStorageKey } from "./athleteStorage.js";

const TEST_USER_ID = "3644131e-feed-4c8f-a825-0a0433b40308";
const TEST_USERNAME = "braylen";

function sessionPayload() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: "smoke-test-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: "smoke-test-refresh-token",
    user: {
      id: TEST_USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "braylen@example.com",
      user_metadata: { username: TEST_USERNAME },
    },
  };
}

/** Mock signed-in Supabase + squad notification counts (CountBadge path). */
export async function mockSignedInAthlete(page) {
  const authKey = supabaseAuthStorageKey();
  if (!authKey) {
    throw new Error("VITE_SUPABASE_URL is required for signed-in smoke tests");
  }

  const session = sessionPayload();
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: authKey, value: session });

  await page.route("**/*supabase.co/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes("/auth/v1/")) {
      if (url.includes("/token") && method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(session),
        });
      }
      if (url.includes("/user")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(session.user),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    }

    if (url.includes("/rest/v1/rpc/unread_message_count")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(2),
      });
    }

    if (url.includes("/rest/v1/rpc/list_friend_requests")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "req-1" }]),
      });
    }

    if (url.includes("/rest/v1/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (url.includes("/storage/v1/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ Key: "avatar.jpg" }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}
