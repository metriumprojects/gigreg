import { useEffect, useMemo, useRef, useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  ConnectNotificationBanner,
  ConnectPayouts,
} from "@stripe/react-connect-js";
import { FaExternalLinkAlt } from "react-icons/fa";
import api from "../../redux/api";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

export function useStripeConnectInstance({ sessionKey, mode = "all", country }) {
  return useMemo(() => {
    if (!publishableKey || !sessionKey) return null;

    return loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret: async () => {
        const { data } = await api.post(
          "/stripe-connect/account-session",
          { mode, country },
          { withCredentials: true }
        );

        if (!data?.clientSecret) {
          throw new Error(data?.message || "Unable to start Stripe session");
        }

        return data.clientSecret;
      },
      fonts: [
        {
          cssSrc: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
        },
      ],
      appearance: {
        overlays: "dialog",
        variables: {
          fontFamily: "'DM Sans', sans-serif",
          colorPrimary: "#1034a6",
          colorText: "#000000",
          colorSecondaryText: "#52525B",
          colorBackground: "#ffffff",
          offsetBackgroundColor: "#F5F5F5",
          colorBorder: "#E5E7EB",
          formBackgroundColor: "#F4F4F4",
          formHighlightColorBorder: "#1034a6",
          formAccentColor: "#1034a6",
          formPlaceholderTextColor: "#71717A",
          formBorderRadius: "16px",
          inputFieldPaddingX: "16px",
          inputFieldPaddingY: "12px",
          buttonPrimaryColorBackground: "#1034a6",
          buttonPrimaryColorText: "#ffffff",
          buttonSecondaryColorBackground: "#F4F4F4",
          buttonSecondaryColorBorder: "#E5E7EB",
          buttonSecondaryColorText: "#000000",
          buttonPaddingX: "18px",
          buttonPaddingY: "10px",
          buttonBorderRadius: "24px",
          badgeBorderRadius: "24px",
          overlayBorderRadius: "24px",
          borderRadius: "16px",
        },
      },
    });
    // Keyed strictly on sessionKey so refreshing account data does not tear down the active iframe session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);
}

export function StripeConnectProvider({ connectInstance, children }) {
  if (!publishableKey) {
    return <p className="text-sm text-red-600">Stripe publishable key is not configured.</p>;
  }
  if (!connectInstance) {
    return <>{children}</>;
  }
  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      {children}
    </ConnectComponentsProvider>
  );
}

export function StripeConnectSlot({
  mode = "onboarding",
  onExit,
  onFallbackClick,
  fallbackLoading = false,
  onNotificationsChange,
  className = "",
}) {
  const containerRef = useRef(null);
  const renderedRef = useRef(false);
  const [isRendered, setIsRendered] = useState(false);
  const [loadIssue, setLoadIssue] = useState(null);

  useEffect(() => {
    renderedRef.current = false;
    setIsRendered(false);
    setLoadIssue(null);
  }, [mode]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const markRendered = () => {
      if (!renderedRef.current) {
        renderedRef.current = true;
        setIsRendered(true);
      }
      setLoadIssue(null);
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 40) {
          markRendered();
          break;
        }
      }
    });

    observer.observe(node);
    if (node.getBoundingClientRect().height > 40) {
      markRendered();
    }

    return () => observer.disconnect();
  }, [mode]);

  const handleLoaderStart = () => {
    renderedRef.current = true;
    setIsRendered(true);
    setLoadIssue(null);
  };

  const handleLoadError = ({ error }) => {
    if (renderedRef.current) return;
    const rawMessage = error?.message || "";
    const isTimeout = /20000ms|timeout|did not render/i.test(rawMessage);
    setLoadIssue({
      isTimeout,
      message: isTimeout
        ? "Stripe is taking longer than usual to respond on this connection — still loading..."
        : rawMessage || "Unable to load embedded Stripe form in this browser.",
    });
  };

  const renderConnectElement = () => {
    if (mode === "notification_banner") {
      return (
        <ConnectNotificationBanner
          onNotificationsChange={onNotificationsChange}
          onLoaderStart={handleLoaderStart}
          onLoadError={handleLoadError}
        />
      );
    }
    if (mode === "management") {
      return (
        <ConnectAccountManagement
          onLoaderStart={handleLoaderStart}
          onLoadError={handleLoadError}
        />
      );
    }
    if (mode === "payouts") {
      return (
        <ConnectPayouts
          onLoaderStart={handleLoaderStart}
          onLoadError={handleLoadError}
        />
      );
    }
    return (
      <ConnectAccountOnboarding
        onExit={onExit}
        onLoaderStart={handleLoaderStart}
        onLoadError={handleLoadError}
      />
    );
  };

  if (mode === "notification_banner") {
    return (
      <div ref={containerRef} className={className}>
        {renderConnectElement()}
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border border-gray-200/80 bg-white p-5 sm:p-7 min-h-[360px] shadow-[0_2px_12px_rgba(26,43,73,0.04)] ${className}`}>
      {loadIssue && (
        <div
          className={`mb-4 rounded-2xl border p-3.5 text-xs flex flex-wrap items-center justify-between gap-3 ${
            loadIssue.isTimeout
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{loadIssue.message}</span>
          {onFallbackClick && (
            <button
              type="button"
              onClick={onFallbackClick}
              disabled={fallbackLoading}
              className="inline-flex items-center gap-1.5 font-semibold rounded-full bg-primary hover:bg-primary/90 text-white px-4 py-1.5 transition disabled:opacity-50"
            >
              {fallbackLoading ? "Opening..." : "Open Stripe in browser"}
              <FaExternalLinkAlt className="text-[10px]" />
            </button>
          )}
        </div>
      )}

      {!isRendered && (
        <div className="space-y-4 py-2" aria-busy="true">
          <div className="flex items-center gap-2.5 text-xs font-medium text-gray-600">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading secure Stripe interface...</span>
          </div>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-100 rounded-lg w-1/3" />
            <div className="h-12 bg-gray-100 rounded-xl w-full" />
            <div className="h-12 bg-gray-100 rounded-xl w-full" />
            <div className="h-12 bg-gray-100 rounded-xl w-2/3" />
          </div>
        </div>
      )}

      <div ref={containerRef}>{renderConnectElement()}</div>
    </div>
  );
}

export default function StripeConnectEmbed({
  mode = "onboarding",
  country,
  onExit,
  onFallbackClick,
  fallbackLoading = false,
  onNotificationsChange,
  className = "",
}) {
  const connectInstance = useStripeConnectInstance({
    sessionKey: `standalone:${mode}:${country || "US"}`,
    mode,
    country,
  });

  if (!publishableKey) {
    return <p className="text-sm text-red-600">Stripe publishable key is not configured.</p>;
  }

  if (!connectInstance) {
    return <p className="text-sm text-gray-600">Loading secure Stripe form…</p>;
  }

  return (
    <StripeConnectProvider connectInstance={connectInstance}>
      <StripeConnectSlot
        mode={mode}
        onExit={onExit}
        onFallbackClick={onFallbackClick}
        fallbackLoading={fallbackLoading}
        onNotificationsChange={onNotificationsChange}
        className={className}
      />
    </StripeConnectProvider>
  );
}
