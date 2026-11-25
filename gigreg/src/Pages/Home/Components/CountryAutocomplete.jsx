import React, { useEffect, useMemo, useRef, useState } from "react";
import { CiLocationOn } from "react-icons/ci";
import { ChevronDown } from "lucide-react";
import { COUNTRIES, resolveCountry } from "../../../utils/countries";

const CountryAutocomplete = ({
  value,
  onChange,
  placeholder = "Select country",
  label = "Country",
  variant = "default",
  className = "",
  inputClassName = "",
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const suggestions = useMemo(() => {
    const query = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (!query) return COUNTRIES;

    const startsWith = [];
    const contains = [];
    for (const country of COUNTRIES) {
      const lower = country.toLowerCase();
      if (lower.startsWith(query)) {
        startsWith.push(country);
      } else if (lower.includes(query)) {
        contains.push(country);
      }
    }
    return [...startsWith, ...contains];
  }, [value]);

  const safeActiveIndex = suggestions.length
    ? Math.min(activeIndex, suggestions.length - 1)
    : 0;

  const handleSelect = (country) => {
    onChange(country);
    setShowSuggestions(false);
    setActiveIndex(0);
  };

  const handleInputChange = (nextValue) => {
    onChange(nextValue);
    setActiveIndex(0);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setShowSuggestions(true);
      if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
      return;
    }

    if (e.key === "Escape") {
      setShowSuggestions(false);
      return;
    }

    if (e.key === "Enter" && !resolveCountry(value) && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      handleSelect(suggestions[safeActiveIndex] || suggestions[0]);
    }
  };

  const hasTypedQuery = Boolean(typeof value === "string" && value.trim());

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {variant === "pill" ? (
        <div
          onClick={() => {
            inputRef.current?.focus();
            setShowSuggestions(true);
          }}
          className="flex items-center justify-between gap-4 rounded-[20px] bg-[#F4F4F4] px-5 py-[16px] h-[68px] w-full cursor-text select-none"
        >
          <div className="flex flex-col justify-center gap-[4px] text-left flex-1 min-w-0">
            <label className="text-[14px] font-normal text-black select-none cursor-pointer">
              {label}
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={value}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              className="w-full text-[14px] font-normal text-zinc-900 bg-transparent outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-zinc-500"
            />
          </div>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setShowSuggestions((prev) => !prev);
              if (!showSuggestions) {
                inputRef.current?.focus();
              }
            }}
            className="text-black shrink-0 cursor-pointer p-1 -mr-1 hover:bg-black/5 rounded-full transition-colors"
            aria-label="Toggle countries dropdown"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${
                showSuggestions ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 w-full">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={value}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className={
              inputClassName ||
              "w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
            }
          />
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1 max-h-60 overflow-y-auto hide-scrollbar">
          {suggestions.map((country, index) => (
            <li
              key={country}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(country);
              }}
              className={`px-4 py-2 cursor-pointer text-sm border-b border-gray-100 last:border-none flex items-start gap-2 ${
                index === safeActiveIndex
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <CiLocationOn className="mt-1 shrink-0" />
              <span>{country}</span>
            </li>
          ))}
        </ul>
      )}

      {showSuggestions && hasTypedQuery && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1 px-4 py-2.5 text-sm text-gray-500">
          No matching country found
        </div>
      )}
    </div>
  );
};

export default CountryAutocomplete;
