import { Search, X, ListFilter } from "lucide-react";
import { CiLocationOn } from "react-icons/ci";
import LocationAutocomplete from "./LocationAutocomplete";

export default function SearchBar({
  searchInput,
  onSearchInputChange,
  isOnlineSelected,
  isInPersonSelected,
  onModeChange,
  locationFilter,
  onLocationChange,
  onLocationSelect,
  onClose,
  onFilterOpen,
  showMobileLocation = false,
}) {
  return (
    <>
    <div>
           {/* Online/In-Person Checkboxes */}
    
    </div>
      {/* Desktop/Tablet Search Bar */}
      <div className="flex items-center gap-4 rounded-[8px] w-full h-fit mx-auto  bg-white ">
        {/* Search Input */}
        <div className="flex items-center justify-between w-full">
        <div className="relative flex-1">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-black w-4 h-4" />
          <input
            type="text"
            placeholder="Search skillslide.com"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            className="w-full outline-none pl-[28px] pr-2 text-black text-base lg:text-lg placeholder-black font-semibold hidden md:block"
            autoFocus
          />
          <input
            type="text"
            placeholder="Search"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            className="w-full outline-none pl-[28px] pr-2 text-black text-base lg:text-base placeholder-black font-semibold block md:hidden"
            autoFocus
          />
        </div>
              {/* <div className="flex justify-end items-center gap-4 font-semibold">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOnlineSelected}
              onChange={() => onModeChange("online")}
              className="w-4 h-4 accent-black border border-gray-400 rounded bg-white cursor-pointer"
            />
            <span className="text-base text-black">Online</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInPersonSelected}
              onChange={() => onModeChange("in-person")}
              className="w-4 h-4 accent-black border border-gray-400 rounded bg-white cursor-pointer "
            />
            <span className="text-base text-black">Offline</span>
          </label>

        </div> */}
        </div>

   

        {/* Location Input */}
        {/* {isInPersonSelected && ( */}
          {/* <div className="flex items-center gap-1 border-l border-gray-300 px-2 w-full md:w-auto relative">
            <CiLocationOn className="h-4 w-4 shrink-0 hidden md:block" />
            <LocationAutocomplete
              placeholder="Enter a location"
              value={locationFilter}
              onChange={onLocationChange}
              onSelectDetails={onLocationSelect}
              className="px-0 text-sm hidden md:block w-full min-w-[300px]"
            />
          </div> */}
        {/* )} */}

      </div>

      {/* Mobile Location Bar */}
      {showMobileLocation && isInPersonSelected && (
        <div className="flex md:hidden items-center gap-4 rounded-[8px] px-4 py-2 w-full h-[48px] md:h-[56px] max-w-4xl mx-auto border border-gray-200 bg-white mb-[20px] relative z-20">
          <LocationAutocomplete
            placeholder="Enter a location"
            value={locationFilter}
            onChange={onLocationChange}
            onSelectDetails={onLocationSelect}
            className="w-full px-0 py-2 text-sm block"
          />
        </div>
      )}
    </>
  );
}
