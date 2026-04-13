import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import { apiClient } from "./api";

export type OIDCSetup =
  | { configured: false; userManager: null }
  | { configured: true; userManager: UserManager };

export async function loadOIDCSetup(): Promise<OIDCSetup> {
  const { data } = await apiClient.GET("/api/oidc-config");
  if (!data?.enabled || !data.issuer || !data.client_id) {
    return { configured: false, userManager: null };
  }

  const mgr = new UserManager({
    authority: data.issuer,
    client_id: data.client_id,
    redirect_uri: window.location.origin,
    scope: "openid profile email",
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    ...(data.audience ? { extraQueryParams: { audience: data.audience } } : {}),
  });

  return { configured: true, userManager: mgr };
}

export async function getAccessToken(userManager: UserManager | null): Promise<string | null> {
  if (!userManager) return null;
  const user = await userManager.getUser();
  return user?.access_token ?? null;
}
