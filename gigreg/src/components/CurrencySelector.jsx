import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Coins,
  DollarSign,
  Euro,
  IndianRupee,
  JapaneseYen,
  PoundSterling,
} from "lucide-react";
import { toast } from "react-toastify";
import { useCurrency } from "../currency/CurrencyContext";

function getCurrencyIcon(code, { size = 16, strokeWidth = 1.8, className = "" } = {}) {
  switch (code) {
    case "USD":
    case "AUD":
    case "CAD":
    case "NZD":
    case "SGD":
      return <DollarSign size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
    case "EUR":
      return <Euro size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
    case "GBP":
      return <PoundSterling size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
    case "INR":
      return <IndianRupee size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
    case "JPY":
      return <JapaneseYen size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
    default:
      return <Coins size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
  }
}

export default function CurrencySelector({ className = "", buttonClassName = "", hideIcon = false }) {
  const { currency, setCurrency, supportedCurrencies, rateMeta } = useCurrency();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef(null);

  const updatePosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const menuWidth = 144; // w-36 is 144px
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - menuWidth - 12);
      }
      setDropdownPos({
        top: rect.bottom + 6,
        left: Math.max(8, left),
      });
    }
  };

  const handleMouseEnter = () => {
    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      updatePosition();
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, 180);
    }
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
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
    <div
      ref={wrapperRef}
      className={`relative shrink-0 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        aria-label="Currency"
        aria-expanded={open}
        disabled={saving || rateMeta.loading}
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
        className={`flex ${buttonClassName || "h-11"} items-center justify-center gap-1.5 rounded-full border-[1.5px] border-black bg-white px-3.5 text-sm font-semibold text-black transition-colors hover:bg-gray-50 disabled:opacity-60 cursor-pointer`}
      >
        {getCurrencyIcon(currency, { size: 16, strokeWidth: 1.8 })}
        <span className="font-semibold uppercase">{currency}</span>
        {!hideIcon && (
          <ChevronDown
            size={14}
            className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open &&
        createPortal(
          <ul
            ref={dropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: "fixed",
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
            }}
            className="z-[9999] flex max-h-60 w-36 flex-col gap-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-2xl hide-scrollbar before:absolute before:-top-2.5 before:left-0 before:w-full before:h-2.5 before:content-['']"
          >
            {supportedCurrencies.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => handleSelect(code)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    currency === code
                      ? "bg-primary text-white"
                      : "text-black hover:bg-gray-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {getCurrencyIcon(code, { size: 14, strokeWidth: 1.8 })}
                    <span>{code}</span>
                  </span>
                  {currency === code && <span className="text-xs">✓</span>}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
