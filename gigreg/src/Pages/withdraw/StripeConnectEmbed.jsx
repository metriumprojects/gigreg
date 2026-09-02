import { useMemo } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import api from "../../redux/api";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

export default function StripeConnectEmbed({ mode = "onboarding", country, onExit }) {
  const connectInstance = useMemo(() => {
    if (!publishableKey) return null;

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
      appearance: {
        overlays: "dialog",
        variables: {
          colorPrimary: "#000000",
        },
      },
    });
  }, [mode, country]);

  if (!publishableKey) {
    return <p className="text-sm text-red-600">Stripe publishable key is not configured.</p>;
  }

  if (!connectInstance) {
    return <p className="text-sm text-gray-600">Loading secure Stripe form…</p>;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <ConnectComponentsProvider connectInstance={connectInstance}>
        {mode === "management" ? (
          <ConnectAccountManagement onExit={onExit} />
        ) : (
          <ConnectAccountOnboarding onExit={onExit} />
        )}
      </ConnectComponentsProvider>
    </div>
  );
}
