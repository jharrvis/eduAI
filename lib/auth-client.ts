import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Use same-origin by default to avoid host/port mismatch in local setups.
  plugins: [adminClient()],
});
