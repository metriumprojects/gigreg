import React, { useState, useEffect, useRef } from "react";
import { CiLocationOn } from "react-icons/ci";
import { ChevronDown } from "lucide-react";

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
  "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini (fmr. 'Swaziland')", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Holy See", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan",
  "Vanuatu", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

const CountryAutocomplete = ({
  value,
  onChange,
  placeholder = "Select country",
  label = "Country",
  variant = "default",
  className = "",
  inputClassName = "",
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  useEffect(() => {
    if (!value) {
      setSuggestions(countries);
      return;
    }

    const filtered = countries.filter((country) =>
      country.toLowerCase().startsWith(value.toLowerCase())
    );
    setSuggestions(filtered);
  }, [value]);

  const handleSelect = (country) => {
    onChange(country);
    setShowSuggestions(false);
  };

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
              onChange={(e) => {
                onChange(e.target.value);
                setShowSuggestions(true);
              }}
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
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowSuggestions(true);
            }}
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
              key={index}
              onClick={() => handleSelect(country)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 border-b border-gray-100 last:border-none flex items-start gap-2"
            >
              <CiLocationOn className="mt-1 shrink-0" />
              <span>{country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CountryAutocomplete;
