import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  SlidersHorizontal,
  ListFilter,
  Check,
  Home,
  ChevronRight,
} from "lucide-react";
import MainLayout from "../../components/MainLayout";
import { useDispatch, useSelector } from "react-redux";
import { getUserFavorites } from "../../redux/reducers/FavoriteReducer";
import Request from "./Components/Request";
import CreateRequestPopup from "./Components/CreateRequestPopup";
import Info from "./Components/Info";
import ListingProposalPopup from "./Components/SendLesson";
import { getAllProposes } from "../../redux/reducers/ProposeReducer";
import { motion } from "framer-motion";
import { getCategories } from "../../redux/reducers/CategoryReducer";
import CategoryMobile from "./Components/CategoryMobile";
import SearchCategoryToolbar from "./Components/SearchCategoryToolbar";
import { useCurrency } from "../../currency/CurrencyContext";
import { Link, useNavigate } from "react-router-dom";
import { createListingProposalUrl, saveProposalRequest } from "../../utils/proposalRequest";

const Teach = () => {
  const { currency } = useCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { categories } = useSelector((state) => state.category);
  const { proposes } = useSelector((state) => state.propose);
  const sortMenuRef = useRef(null);

  const [isOnlineSelected, setIsOnlineSelected] = useState(true);
  const [isInPersonSelected, setIsInPersonSelected] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [searchInput, setSearchInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [locationFilter, setLocationFilter] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [debouncedMin, setDebouncedMin] = useState(min);
  const [debouncedMax, setDebouncedMax] = useState(max);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showListingPopup, setShowListingPopup] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const handleCategoryToggle = (categoryName) => {
    if (!categoryName) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories((prev) =>
        prev.includes(categoryName)
          ? prev.filter((c) => c !== categoryName)
          : [...prev, categoryName]
      );
    }
    setPage(1);
  };

  const clearAll = () => {
    setMin(0);
    setMax(100);
    setSearchInput("");
    setSearchFilter("");
    setSelectedCategories([]);
    setLimit(12);
    setPage(1);
  };

  const handleTrendingSelect = () => {
    setSelectedCategories([]);
    setSearchFilter("");
    setSearchInput("");
    setPage(1);
  };

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchFilter);
      setPage(1); // Reset page
    }, 500);

    return () => clearTimeout(handler);
  }, [searchFilter]);

  // Debounce location
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLocation(locationFilter);
    }, 500);
    return () => clearTimeout(handler);
  }, [locationFilter]);

  // Debounce price range
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMin(min);
    }, 400);
    return () => clearTimeout(handler);
  }, [min]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMax(max);
    }, 400);
    return () => clearTimeout(handler);
  }, [max]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleModeChange = (value) => {
    if (value === "online") {
      // Toggle online checkbox - if becoming true, uncheck in-person; if becoming false, check online
      if (!isOnlineSelected) {
        setIsOnlineSelected(true);
        setIsInPersonSelected(false);
      } else {
        setIsOnlineSelected(false);
      }
    } else if (value === "in-person") {
      // Toggle in-person checkbox - if becoming true, uncheck online; if becoming false, check in-person
      if (!isInPersonSelected) {
        setIsInPersonSelected(true);
        setIsOnlineSelected(false);
        setLocationFilter("");
      } else {
        setIsInPersonSelected(false);
        setLocationFilter("");
        setDebouncedLocation("");
      }
    }
  };

  const fetchProposes = useCallback(() => {
    let isOnlineFilter = null;
    let supportsInPersonFilter = null;
    let locationParam = "";

    // Handle different filter combinations
    if (isOnlineSelected && isInPersonSelected) {
      // Both selected - show all requests
      isOnlineFilter = null;
      supportsInPersonFilter = null;
    } else if (isOnlineSelected && !isInPersonSelected) {
      // Only online selected - show online requests (includes mixed)
      isOnlineFilter = true;
      supportsInPersonFilter = null;
    } else if (!isOnlineSelected && isInPersonSelected) {
      // Only in-person selected - show in-person requests (includes mixed)
      isOnlineFilter = null;
      supportsInPersonFilter = true;
      locationParam = debouncedLocation.trim();
    } else {
      // Neither selected - default to online
      isOnlineFilter = true;
      supportsInPersonFilter = null;
    }

    dispatch(
      getAllProposes({
        page,
        limit,
        search: debouncedSearch,
        category: selectedCategories.join(","),
        minPrice: debouncedMin,
        maxPrice: debouncedMax,
        currency,
        isOnline: isOnlineFilter,
        supportsInPerson: supportsInPersonFilter,
        location: locationParam,
        sort: sortOrder,
      })
    );
  }, [
    dispatch,
    page,
    limit,
    debouncedSearch,
    selectedCategories,
    debouncedMin,
    debouncedMax,
    currency,
    isOnlineSelected,
    isInPersonSelected,
    debouncedLocation,
    sortOrder,
  ]);

  useEffect(() => {
    dispatch(getCategories());
    dispatch(getUserFavorites());
  }, [dispatch]);

  // Fetch lessons when filters change
  useEffect(() => {
    fetchProposes();
  }, [fetchProposes]);

  return (
    <MainLayout 
      width="1920px"
      categories={categories}
      selectedCategory={selectedCategories.join(",")}
      onSelectCategory={handleCategoryToggle}
      searchInput={searchInput}
      onSearchChange={(value) => {
        setSearchInput(value);
        setSearchFilter(value);
        setPage(1);
      }}
      locationFilter={locationFilter}
      onLocationChange={(value) => {
        setLocationFilter(value);
        if (value?.trim()) {
          setIsInPersonSelected(true);
          setIsOnlineSelected(false);
        }
        setPage(1);
      }}
      onLocationSelect={({ description }) => {
        setLocationFilter(description || "");
        if (description?.trim()) {
          setIsInPersonSelected(true);
          setIsOnlineSelected(false);
        }
        setPage(1);
      }}
      onFilterClick={() => setShowFilter(true)}
      searchPlaceholder="Search"
    >
      {/* Mobile controls */}
      <div className="mb-4 mt-2 flex items-center justify-center gap-4 font-medium md:hidden">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isOnlineSelected}
            onChange={() => handleModeChange("online")}
            className="accent-primary h-4 w-4"
          />
          <span className="text-sm">Online</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 py-2">
          <input
            type="checkbox"
            checked={isInPersonSelected}
            onChange={() => handleModeChange("in-person")}
            className="accent-primary h-4 w-4"
          />
          <span className="text-sm">In-Person</span>
        </label>
        <button
          onClick={() => setShowFilter(true)}
          className="flex items-center gap-1 md:hidden"
        >
          <SlidersHorizontal size={16} className="rotate-90" /> Filter
        </button>
      </div>

      <div className="mb-5 mt-4 flex items-center justify-between md:hidden">
        <h3 className="text-2xl font-bold">Requests</h3>
        <button
          onClick={() => setShowCreateRequest(true)}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white"
        >
          Generate Request
        </button>
      </div>

      {/* Breadcrumb Navigation in Grey Bubble Style - Right after search row */}
      <div className="my-[20px]">
        <nav
          aria-label="Breadcrumb"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F5] px-3.5 py-1.5 text-xs sm:text-sm text-black select-none"
        >
          <Link
            to="/"
            className="flex items-center gap-1.5 font-medium text-black hover:text-primary transition-colors"
          >
            <Home size={14} className="text-black shrink-0" />
            <span>Home</span>
          </Link>
          <ChevronRight size={13} className="text-gray-400 shrink-0" />
          {selectedCategories.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategories([]);
                  setPage(1);
                }}
                className="font-medium text-black hover:text-primary transition-colors cursor-pointer"
              >
                Open requests
              </button>
              <ChevronRight size={13} className="text-gray-400 shrink-0" />
              <span className="font-medium text-black truncate max-w-[180px] sm:max-w-none">
                {selectedCategories.length === 1
                  ? selectedCategories[0]
                  : `${selectedCategories.length} Categories`}
              </span>
            </>
          ) : (
            <span className="font-medium text-black">Open requests</span>
          )}
        </nav>
      </div>

      <SearchCategoryToolbar
        variant="pills"
        categories={categories}
        selectedCategories={selectedCategories}
        onSelectCategory={handleCategoryToggle}
      />

      <div className="hidden">
        <CategoryMobile
          categories={categories}
          selectedCategory={selectedCategories.join(",")}
          onSelectCategory={handleCategoryToggle}
          setShowFilter={() => setShowFilter(true)}
        />
      </div>

      <div className="mb-[10px] flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 md:text-2xl">Open requests</h2>
        <div className="relative" ref={sortMenuRef}>
          <button
            type="button"
            onClick={() => setShowSortMenu((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-black transition-colors hover:bg-gray-100"
            aria-label="Sort requests"
          >
            <ListFilter size={22} />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-11 z-50 min-w-[140px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSortOrder(option.value);
                    setPage(1);
                    setShowSortMenu(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                >
                  <span>{option.label}</span>
                  {sortOrder === option.value && <Check size={16} className="text-black" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Requests / Propose listings */}
      <Request
        proposes={proposes}
        openCreateLesson={(req) => {
          saveProposalRequest(req);
          navigate(createListingProposalUrl(req?._id));
        }}
        onSendExistingLesson={(req) => {
          setSelectedRequest(req);
          setShowListingPopup(true);
        }}
      />

      <ListingProposalPopup
        open={showListingPopup}
        request={selectedRequest}
        onClose={() => {
          setShowListingPopup(false);
          setSelectedRequest(null);
        }}
      />

      <CreateRequestPopup
        open={showCreateRequest}
        onClose={() => setShowCreateRequest(false)}
      />
      <Info open={showInfo} onClose={() => setShowInfo(false)} />

      {/* Filter Popup */}
      {showFilter && (
        <div className="fixed top-0 left-0 bg-black/20 inset-0 flex items-center justify-center z-50">
          <motion.div initial={{ opacity: 0, y: -20, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeOut" }} className="bg-white w-[90%] md:w-[520px] rounded-xl p-6 shadow-xl relative">
            <div className="grid grid-cols-3 items-center mb-6 w-full">
              <span></span>
              <h2 className="text-lg text-center">Filter</h2>
              <button
                onClick={() => setShowFilter(false)}
                className=" text-gray-500 hover:text-gray-700 h-full flex justify-end"
              >
                <X size={20} />
              </button>
            </div>

            {/* Price Slider */}
            <p className="text-sm font-semibold mb-2">Price range</p>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-600">$0</span>
              <div className="relative w-full h-6 flex items-center">
                {/* Track */}
                <div className="absolute w-full h-1 bg-gray-300 rounded-full"></div>
                
                {/* Active Range */}
                <div 
                  className="absolute h-1 bg-gray-500 rounded-full"
                  style={{
                    left: `${(min / 100) * 100}%`,
                    width: `${((max - min) / 100) * 100}%`
                  }}
                ></div>
                
                {/* Min Thumb */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={min}
                  onChange={(e) => {
                    const val = Math.min(Number(e.target.value), max - 1);
                    setMin(val);
                  }}
                  className="absolute w-full h-full opacity-0 cursor-pointer z-10 pointer-events-none appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:appearance-none"
                />
                
                {/* Max Thumb */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={max}
                  onChange={(e) => {
                    const val = Math.max(Number(e.target.value), min + 1);
                    setMax(val);
                  }}
                  className="absolute w-full h-full opacity-0 cursor-pointer z-10 pointer-events-none appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:appearance-none"
                />
                
                {/* Custom Thumbs */}
                <div 
                  className="absolute w-4 h-4 bg-gray-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 z-0 pointer-events-none"
                  style={{ left: `${(min / 100) * 100}%` }}
                ></div>
                <div 
                  className="absolute w-4 h-4 bg-gray-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 z-0 pointer-events-none"
                  style={{ left: `${(max / 100) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-600">$100+</span>
            </div>

            {/* Min & Max Inputs */}
            <div className="flex justify-start gap-4 mb-6">
              <div className="flex flex-col">
                <span className="text-sm text-gray-600">Minimum</span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={min}
                  onChange={(e) => {
                    const val = Math.min(Math.max(0, Number(e.target.value)), max - 1);
                    setMin(val);
                  }}
                  className="border border-[#ddd] rounded-lg px-3 py-2 w-[100px] mt-1 text-center"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-600">Maximum</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={max}
                  onChange={(e) => {
                    const val = Math.max(Math.min(100, Number(e.target.value)), min + 1);
                    setMax(val);
                  }}
                  className="border border-[#ddd] rounded-lg px-3 py-2 w-[100px] mt-1 text-center"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={clearAll}
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-medium"
              >
                Clear all
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="px-6 py-2 rounded-lg bg-blue-900 text-white font-medium"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </MainLayout>
  );
};

export default Teach;
