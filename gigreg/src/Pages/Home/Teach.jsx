import React, { useCallback, useEffect, useState } from "react";
import {
  X,
  SlidersHorizontal,
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
import FilterModal from "./Components/FilterModal";
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

  const [isOnlineSelected, setIsOnlineSelected] = useState(true);
  const [isInPersonSelected, setIsInPersonSelected] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [searchInput, setSearchInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100000);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [locationFilter, setLocationFilter] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [debouncedMin, setDebouncedMin] = useState(min);
  const [debouncedMax, setDebouncedMax] = useState(100000);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showListingPopup, setShowListingPopup] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const handleCategoryToggle = (categoryInput) => {
    if (!categoryInput) {
      setSelectedCategories([]);
    } else if (typeof categoryInput === "string" && categoryInput.includes(",")) {
      setSelectedCategories(categoryInput.split(",").map((c) => c.trim()).filter(Boolean));
    } else if (Array.isArray(categoryInput)) {
      setSelectedCategories(categoryInput.filter(Boolean));
    } else {
      setSelectedCategories((prev) =>
        prev.includes(categoryInput)
          ? prev.filter((c) => c !== categoryInput)
          : [...prev, categoryInput]
      );
    }
    setPage(1);
  };

  const clearAll = () => {
    setMin(0);
    setMax(100000);
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

  const handleModeChange = (value) => {
    if (value === "online") {
      setIsOnlineSelected((prev) => !prev);
      setPage(1);
    } else if (value === "in-person") {
      setIsInPersonSelected((prev) => !prev);
      setPage(1);
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

  const breadcrumbNav = (
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
  );

  return (
    <MainLayout 
      width="1920px"
      breadcrumbs={breadcrumbNav}
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
        setPage(1);
      }}
      onLocationSelect={({ description }) => {
        setLocationFilter(description || "");
        setPage(1);
      }}
      onFilterClick={() => setShowFilter(true)}
      searchPlaceholder="What request are you looking for?"
      searchCardTitle="Search Users Requests"
      isOnlineSelected={isOnlineSelected}
      isInPersonSelected={isInPersonSelected}
      onModeChange={handleModeChange}
      minPrice={min}
      maxPrice={max}
      onMinPriceChange={(val) => {
        setMin(val !== "" && val !== undefined ? Number(val) : 0);
        setPage(1);
      }}
      onMaxPriceChange={(val) => {
        setMax(val !== "" && val !== undefined ? Number(val) : 100000);
        setPage(1);
      }}
      sortOrder={sortOrder}
      onSortChange={(val) => {
        setSortOrder(val);
        setPage(1);
      }}
    >

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

      {/* Filter Modal */}
      <FilterModal
        open={showFilter}
        onClose={() => setShowFilter(false)}
        isOnlineSelected={isOnlineSelected}
        isInPersonSelected={isInPersonSelected}
        onModeChange={handleModeChange}
        min={min}
        max={max}
        onMinChange={(val) => {
          setMin(val);
          setPage(1);
        }}
        onMaxChange={(val) => {
          setMax(val);
          setPage(1);
        }}
        onClear={clearAll}
        onApply={() => setShowFilter(false)}
      />
    </MainLayout>
  );
};

export default Teach;
