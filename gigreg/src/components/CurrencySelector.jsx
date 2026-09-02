import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "react-toastify";
import { useCurrency } from "../currency/CurrencyContext";

export default function CurrencySelector({ className = "w-[88px]", hideIcon = false }) {
  const { currency, setCurrency, supportedCurrencies, rateMeta } = useCurrency();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = async (code) => {
    if (code === currency || saving || rateMeta.loading) return;
    setSaving(true);
    setOpen(false);
    try {
      await setCurrency(code);
    } catch (error) {
      toast.error(error.message || "Unable to change currency");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Currency"
        aria-expanded={open}
        disabled={saving || rateMeta.loading}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-full items-center rounded-full border-[1.5px] border-black bg-white px-3 text-sm font-semibold text-black disabled:opacity-60 ${
          hideIcon ? "justify-center text-center" : "justify-between gap-1"
        }`}
      >
        <span className={hideIcon ? "w-full text-center" : ""}>{currency}</span>
        {!hideIcon && (
          <ChevronDown
            size={16}
            className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <ul className="absolute inset-x-0 top-full z-50 mt-2 flex max-h-60 w-full flex-col gap-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-lg hide-scrollbar">
          {supportedCurrencies.map((code) => (
            <li key={code}>
              <button
                type="button"
                onClick={() => handleSelect(code)}
                className={`block w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium ${
                  currency === code
                    ? "bg-primary text-white"
                    : "text-black hover:bg-gray-100"
                }`}
              >
                {code}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
