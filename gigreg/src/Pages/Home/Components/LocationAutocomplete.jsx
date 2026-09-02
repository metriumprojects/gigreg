import React, { useState, useEffect, useRef } from "react";
import { CiLocationOn } from "react-icons/ci";
import api from "../../../redux/api";

const LocationAutocomplete = ({
  value,
  onChange,
  onSelectDetails,
  placeholder,
  className,
  variant = "default",
  leadingIcon = null,
  positionRelative = true,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

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

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const { data } = await api.get("/places-autocomplete", {
          params: { input: value },
        });
        if (data.predictions && Array.isArray(data.predictions)) {
          setSuggestions(data.predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        setSuggestions([]);
        setShowSuggestions(false);
        console.error(
          "Error fetching location suggestions:",
          error.response?.data?.error || error.message,
        );
      }
    };

    const timeoutId = setTimeout(() => {
      fetchSuggestions();
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleSelect = async (suggestion) => {
    onChange(suggestion.description);
    setShowSuggestions(false);

    if (onSelectDetails) {
      try {
        const { data } = await api.get("/places-details", {
          params: { placeId: suggestion.place_id },
        });

        onSelectDetails({
          description: suggestion.description,
          lat: data?.lat ?? null,
          lng: data?.lng ?? null,
          placeId: suggestion.place_id,
        });
      } catch {
        onSelectDetails({
          description: suggestion.description,
          lat: null,
          lng: null,
          placeId: suggestion.place_id,
        });
      }
    }
  };

  return (
    <div
      className={`${positionRelative ? "relative" : ""} w-full min-w-0 ${className || ""}`}
      ref={wrapperRef}
    >
      <div className="flex w-full items-center gap-2">
        {leadingIcon ? <span className="shrink-0">{leadingIcon}</span> : null}
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          className="w-full min-w-0 bg-transparent text-inherit outline-none placeholder:text-inherit"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul
          className={
            variant === "type"
              ? "absolute inset-x-0 top-full z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-lg hide-scrollbar"
              : "absolute inset-x-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg hide-scrollbar"
          }
        >
          {suggestions.map((suggestion) => {
            const main = suggestion.structured_formatting?.main_text || suggestion.description;
            const secondary = suggestion.structured_formatting?.secondary_text;
            return (
              <li
                key={suggestion.place_id}
                onClick={() => handleSelect(suggestion)}
                className={
                  variant === "type"
                    ? "flex cursor-pointer items-start gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-black hover:bg-primary hover:text-white group"
                    : "flex cursor-pointer items-start gap-2 border-b border-gray-100 px-4 py-2 text-sm text-gray-700 last:border-none hover:bg-primary hover:text-white"
                }
              >
                <CiLocationOn className="mt-1 shrink-0 group-hover:text-white" />
                <span>
                  <span className="font-medium">{main}</span>
                  {secondary && <span className="block text-xs text-gray-500 group-hover:text-white">{secondary}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LocationAutocomplete;
