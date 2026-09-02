import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { GoogleloginUser } from "../../redux/reducers/AuthReducer";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { FcGoogle } from "react-icons/fc";
import { auth, googleProvider } from "../../firebase";

const GOOGLE_CLIENT_ID =
  "192141687455-hg0udlcpo4s0akkhrnobhkmut80pg6lk.apps.googleusercontent.com";

const waitForGoogle = () =>
  new Promise((resolve) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.google?.accounts?.id || Date.now() - started > 10000) {
        clearInterval(timer);
        resolve();
      }
    }, 50);
  });

const GoogleLoginButton = ({
  variant = "default",
  loginAs = "buyer",
  onNeedsSellerSetup,
  onSuccess,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const isNative = Capacitor.isNativePlatform();
  const [loading, setLoading] = useState(false);
  const loginAsRef = useRef(loginAs);

  useEffect(() => {
    loginAsRef.current = loginAs;
  }, [loginAs]);

  const finishLogin = useCallback(
    (idToken) => {
      return dispatch(
        GoogleloginUser({
          id_token: idToken,
          loginAs: loginAsRef.current,
        })
      ).then((res) => {
        if (res?.payload?.needsSellerSetup) {
          if (onNeedsSellerSetup) {
            onNeedsSellerSetup({
              idToken,
              buyerName: res.payload.buyerName || "",
            });
          } else {
            toast.info("Complete seller details to continue");
          }
          return res;
        }

        if (res?.payload?.status) {
          toast.success("Logged in with Google successfully");
          if (onSuccess) {
            onSuccess(res.payload);
          } else {
            navigate("/");
          }
        } else {
          toast.error(res?.payload?.message || "Google login failed");
        }
        return res;
      });
    },
    [dispatch, navigate, onNeedsSellerSetup, onSuccess]
  );

  const handleGoogleCredential = useCallback(
    (credentialResponse) => {
      if (credentialResponse?.credential) {
        finishLogin(credentialResponse.credential);
      }
    },
    [finishLogin]
  );

  useEffect(() => {
    if (isNative) {
      try {
        GoogleAuth.initialize({
          clientId: GOOGLE_CLIENT_ID,
          scopes: ["profile", "email"],
          grantOfflineAccess: true,
        });
      } catch (error) {
        console.error("Google Auth Init Error:", error);
      }
      return;
    }

    // Official GIS button is only used for the default (non-custom) variant
    if (variant !== "default") return;

    let cancelled = false;

    const renderOfficialButton = async () => {
      await waitForGoogle();
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 300,
        text: "continue_with",
        shape: "rectangular",
      });
    };

    renderOfficialButton();
    return () => {
      cancelled = true;
    };
  }, [handleGoogleCredential, isNative, variant]);

  const handleNativeLogin = async () => {
    try {
      setLoading(true);
      const response = await GoogleAuth.signIn();
      if (response?.authentication?.idToken) {
        await finishLogin(response.authentication.idToken);
      } else {
        toast.error("Google login failed");
      }
    } catch (error) {
      console.error("Native Google Login Error:", error);
      toast.error("Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWebCustomLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken =
        credential?.idToken ||
        result?._tokenResponse?.oauthIdToken ||
        result?._tokenResponse?.idToken;

      if (!idToken) {
        toast.error("Unable to get Google token");
        return;
      }

      await finishLogin(idToken);
    } catch (error) {
      if (error?.code === "auth/popup-closed-by-user") return;
      if (error?.code === "auth/cancelled-popup-request") return;
      console.error("Google Login Error:", error);
      toast.error(error?.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "custom") {
    return (
      <div className="w-full max-w-sm">
        <button
          type="button"
          disabled={loading}
          onClick={isNative ? handleNativeLogin : handleWebCustomLogin}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#F0F0F0] px-4 py-[12px] text-[16px] font-medium text-black transition-colors hover:bg-[#E8E8E8] disabled:opacity-60"
        >
          <FcGoogle className="text-2xl" />
          {loading ? "Connecting..." : "Continue with Google"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-7 flex justify-center">
      {isNative ? (
        <button
          type="button"
          disabled={loading}
          onClick={handleNativeLogin}
          className="flex w-[300px] items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-[12px] text-[16px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <FcGoogle className="text-2xl" />
          {loading ? "Connecting..." : "Continue with Google"}
        </button>
      ) : (
        <div ref={googleButtonRef} />
      )}
    </div>
  );
};

export default GoogleLoginButton;
