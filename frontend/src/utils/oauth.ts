"use client";

/**
 * Google Identity Services (GSI) & X OAuth 유틸리티
 */

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID 
  || process.env.NEXT_PUBLIC_GOOGLE_OAUTH_KEY
  || "342362769960-nbnmi3nrnfqknplgbi1ci57kqaltth1q.apps.googleusercontent.com";

const X_CLIENT_ID = process.env.NEXT_PUBLIC_X_OAUTH_CLIENT_ID || "";

// ============================================================================
// Google GSI
// ============================================================================

let googleScriptLoaded = false;
let googleScriptLoading = false;

export function loadGoogleScript(): Promise<void> {
  if (googleScriptLoaded) return Promise.resolve();
  if (googleScriptLoading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (googleScriptLoaded) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  googleScriptLoading = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleScriptLoaded = true;
      googleScriptLoading = false;
      resolve();
    };
    script.onerror = () => {
      googleScriptLoading = false;
      reject(new Error("Failed to load Google GSI script"));
    };
    document.head.appendChild(script);
  });
}

export function initGoogleLogin(
  onCredential: (credential: string) => void,
  onError?: (error: string) => void
): void {
  const google = (window as any).google;
  if (!google?.accounts?.id) {
    onError?.("Google SDK not loaded");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response: any) => {
      if (response.credential) {
        onCredential(response.credential);
      } else {
        onError?.("No credential received from Google");
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

export function triggerGoogleLogin(): void {
  const google = (window as any).google;
  if (!google?.accounts?.id) return;

  google.accounts.id.prompt((notification: any) => {
    if (notification.isNotDisplayed()) {
      // 팝업이 표시되지 않으면 One Tap 대신 직접 버튼 팝업
      console.log("One Tap not displayed, using popup");
    }
  });
}

// ============================================================================
// X (Twitter) OAuth 2.0 with PKCE
// ============================================================================

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function initiateXLogin(): Promise<void> {
  if (!X_CLIENT_ID) {
    alert("X OAuth is not configured");
    return;
  }

  // PKCE: code_verifier 생성 및 저장
  const codeVerifier = generateRandomString(64);
  sessionStorage.setItem("x_code_verifier", codeVerifier);

  // code_challenge 생성
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64urlEncode(hashed);

  // Redirect URI 결정
  const redirectUri = `${window.location.origin}/auth/callback/x`;
  sessionStorage.setItem("x_redirect_uri", redirectUri);

  // State (CSRF 방지)
  const state = generateRandomString(32);
  sessionStorage.setItem("x_oauth_state", state);

  // X 인증 페이지로 리다이렉트
  const params = new URLSearchParams({
    response_type: "code",
    client_id: X_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "tweet.read users.read offline.access",
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  window.location.href = `https://x.com/i/oauth2/authorize?${params.toString()}`;
}

export function getXCallbackData(): {
  code: string;
  redirectUri: string;
  codeVerifier: string;
} | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = sessionStorage.getItem("x_oauth_state");
  const codeVerifier = sessionStorage.getItem("x_code_verifier") || "";
  const redirectUri = sessionStorage.getItem("x_redirect_uri") || "";

  // CSRF 검증
  if (!code || !state || state !== savedState) {
    return null;
  }

  // 사용 후 삭제
  sessionStorage.removeItem("x_oauth_state");
  sessionStorage.removeItem("x_code_verifier");
  sessionStorage.removeItem("x_redirect_uri");

  return { code, redirectUri, codeVerifier };
}
