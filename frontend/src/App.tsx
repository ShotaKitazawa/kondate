import { useState, useEffect } from "react";
import { apiClient } from "./api";
import { loadOIDCSetup, getAccessToken } from "./oidc";
import type { OIDCSetup } from "./oidc";
import { MainPage } from "./components/MainPage";

type AuthState = "loading" | "authenticated" | "unauthenticated";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [oidc, setOidc] = useState<OIDCSetup | null>(null);

  useEffect(() => {
    async function init() {
      const setup = await loadOIDCSetup();
      setOidc(setup);

      const mgr = setup.configured ? setup.userManager : null;

      // Handle OIDC redirect callback
      if (mgr && window.location.search.includes("code=")) {
        try {
          await mgr.signinRedirectCallback();
          window.history.replaceState({}, "", window.location.pathname);
        } catch {
          setAuthState("unauthenticated");
          return;
        }
      }

      const token = await getAccessToken(mgr);
      const { response } = await apiClient.GET("/api/userinfo", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        setAuthState("authenticated");
      } else {
        setAuthState("unauthenticated");
      }
    }

    init();
  }, []);

  if (authState === "loading") return <div className="loading-screen">読み込み中...</div>;

  const mgr = oidc?.configured ? oidc.userManager : null;

  if (authState === "unauthenticated") {
    return (
      <div className="login-screen">
        <h1>献立メモ</h1>
        <button onClick={() => mgr?.signinRedirect()}>ログイン</button>
      </div>
    );
  }

  return <MainPage getToken={mgr ? () => getAccessToken(mgr) : undefined} />;
}
