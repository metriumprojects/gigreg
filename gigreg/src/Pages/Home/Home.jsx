import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowRight,
  ListFilter,
  Check,
} from "lucide-react";
import "swiper/css";
import "swiper/css/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import MainLayout from "../../components/MainLayout";
import Card from "./Components/Card";
import { IoIosArrowDown } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getAllLessons, getDiscoverFeed } from "../../redux/reducers/LessonReducer";
import { getCategories } from "../../redux/reducers/CategoryReducer";
import CurriculumCard from "./Components/CurriculumCard";
import { getUserFavorites } from "../../redux/reducers/FavoriteReducer";
import { ListingCard } from "./Listing";
import Loading from "../../components/Loading";
import { motion as Motion } from "framer-motion";
import LessonCardSkeleton from "./Components/LessonCardSkeleton";
import CurriculumCardSkeleton from "./Components/CurriculumCardSkeleton";
import CategoryCardSkeleton from "./Components/CategoryCardSkeleton";
import CategoriesBar from "./Components/Categories";
import CategoryMobile from "./Components/CategoryMobile";
import SearchBar from "./Components/SearchBar";
import SearchCategoryToolbar from "./Components/SearchCategoryToolbar";
import HighlightSlider from "./Components/HighlightSlider";
import FilterModal from "./Components/FilterModal";
import { useCurrency } from "../../currency/CurrencyContext";


const Home = () => {
  const { currency } = useCurrency();
  const dispatch = useDispatch();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const {
    lessons,
    curriculum,
    discoverFeed,
    discoverTotalPages,
    lessonPage,
    loading,
  } = useSelector((state) => state.lesson);
  const { categories } = useSelector(
    (state) => state.category,
  );
  const { favorites } = useSelector((state) => state.favorite);
  const { userInfo } = useSelector((state) => state.auth);

  const [showFilter, setShowFilter] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100000); // Default to 100000
  const [page, setPage] = useState(1);
  const [locationFilter, setLocationFilter] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [debouncedMin, setDebouncedMin] = useState(min);
  const [debouncedMax, setDebouncedMax] = useState(max);
  const [selectedSearchLocation, setSelectedSearchLocation] = useState(null); // User's searched location for distance calc
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isOnlineSelected, setIsOnlineSelected] = useState(true);
  const [isInPersonSelected, setIsInPersonSelected] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const moreMenuRef = useRef(null);
  const loadMoreRef = useRef(null);
  const currentSection = searchParams.get("section");
  const isDiscoverSection = currentSection !== "learn";


  // Calculate limit based on screen resolution
  const calculateLimit = useCallback(() => {
    if (typeof window === "undefined") return 20;
    
    const width = window.innerWidth;
    if (width >= 1920) {
      return 49; // 7 columns
    } else if (width >= 1600) {
      return 49; // 7 columns
    } else if (width >= 1024) {
      return 35; // 5 columns
    } else if (width >= 768) {
      return 12; // 3 columns
    } else {
      return 12; // 1 column
    }
  }, []);

  // Set limit on mount and on window resize
  useEffect(() => {
    const handleResize = () => {
      setPage(1);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculateLimit]);

  // const swiperRef = useRef(null); // Removed unused variable
  const prevFiltersRef = useRef({});

  // Dynamic categories display limit based on screen width
  const [categoryDisplayLimit, setCategoryDisplayLimit] = useState(5);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const ITEM_WIDTH = 155; // adjust to your actual card width + gap
      const limit = Math.floor(width / ITEM_WIDTH);
      setCategoryDisplayLimit(limit);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userInfo]);

  const visibleCategories = categories?.slice(0, categoryDisplayLimit) || [];
  const hiddenCategories = categories?.slice(categoryDisplayLimit) || [];

  const handleSelect = (categoryName) => {
    setSelectedCategory(categoryName);
    setSearchInput("");
    setSearchFilter("");
    setPage(1);
  };

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMore(false);
      }
    };
    if (showMore) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMore]);

  const parseCoordinate = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const clearAll = () => {
    setMin(0);
    setMax(100000);
    setSearchInput("");
    setSearchFilter("");
    setLocationFilter("");
    setDebouncedLocation("");
    setSelectedSearchLocation(null);
    setIsOnlineSelected(true);
    setIsInPersonSelected(true);
    setSelectedCategory("");
    setSelectedType("");
    setPage(1);
  };

  // Handle search bar visibility from navigation state
  useEffect(() => {
    if (location.state?.showSearch) {
      setShowSearchBar(true);
      // Clear the state so it doesn't persist on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.showSearch]);

  // Handle category selection from query parameter
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      setSearchFilter(categoryParam);
      setSearchInput("");
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [currentSection]);

  // Debounce search input/filter
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchFilter);
      setPage(1); // Reset page
    }, 500);

    return () => clearTimeout(handler);
  }, [searchFilter]);

  // Debounce location input (lat/lng provided by autocomplete selection)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLocation(locationFilter);
      setPage(1);
      // Only clear selectedSearchLocation if in-person is NOT selected
      if (!isInPersonSelected) {
        setSelectedSearchLocation(null);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [locationFilter, isInPersonSelected]);

  // Debounce price range
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMin(min);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [min]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMax(max);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [max]);

  const handleModeChange = (value) => {
    setPage(1);
    if (value === "online") {
      setIsOnlineSelected(!isOnlineSelected);
    } else if (value === "in-person") {
      setIsInPersonSelected(!isInPersonSelected);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [currency]);

  const handleLocationChange = useCallback((value) => {
    setLocationFilter(value);
    if (value?.trim() && !isInPersonSelected) {
      setIsInPersonSelected(true);
    }
  }, [isInPersonSelected]);

  const handleLocationSelect = ({ description, lat, lng }) => {
    const parsedLat = parseCoordinate(lat);
    const parsedLng = parseCoordinate(lng);

    setLocationFilter(description || "");
    setDebouncedLocation(description || "");
    if (description?.trim() && !isInPersonSelected) {
      setIsInPersonSelected(true);
    }
    if (parsedLat !== null && parsedLng !== null) {
      setSelectedSearchLocation({ lat: parsedLat, lng: parsedLng });
    } else {
      setSelectedSearchLocation(null);
    }
  };

  const fetchLessons = useCallback(() => {
    if (isDiscoverSection) return;
    if (!isOnlineSelected && !isInPersonSelected) return;

    const locationParam = isInPersonSelected ? debouncedLocation.trim() : "";
    const isFilteringOnlineOnly = isOnlineSelected && !isInPersonSelected;
    const isFilteringInPerson = isInPersonSelected && (!isOnlineSelected || Boolean(locationParam));
    const radiusKm = isFilteringInPerson ? 50 : undefined;
    const effectiveLimit = calculateLimit(); // Calculate limit dynamically instead of using state

    dispatch(
      getAllLessons({
        page,
        limit: effectiveLimit,
        search: debouncedSearch,
        category: selectedCategory,
        minPrice: debouncedMin,
        maxPrice: debouncedMax,
        currency,
        isOnline: isFilteringOnlineOnly ? true : undefined,
        supportsInPerson: isFilteringInPerson ? true : undefined,
        location: locationParam,
        lat:
          isFilteringInPerson && selectedSearchLocation
            ? Number(selectedSearchLocation.lat)
            : undefined,
        lng:
          isFilteringInPerson && selectedSearchLocation
            ? Number(selectedSearchLocation.lng)
            : undefined,
        radiusKm,
        type: selectedType || undefined,
      }),
    );
  }, [isDiscoverSection, page, debouncedLocation, isInPersonSelected, calculateLimit, debouncedSearch, selectedCategory, debouncedMin, debouncedMax, currency, isOnlineSelected, selectedSearchLocation, dispatch]);

  const fetchDiscover = useCallback(() => {
    if (!isDiscoverSection) return;
    if (!isOnlineSelected && !isInPersonSelected) return;

    const locationParam = isInPersonSelected ? debouncedLocation.trim() : "";
    const isFilteringOnlineOnly = isOnlineSelected && !isInPersonSelected;
    const isFilteringInPerson = isInPersonSelected && (!isOnlineSelected || Boolean(locationParam));
    const radiusKm = isFilteringInPerson ? 50 : undefined;
    const effectiveLimit = calculateLimit();

    dispatch(
      getDiscoverFeed({
        page,
        limit: effectiveLimit,
        search: debouncedSearch,
        category: selectedCategory,
        minPrice: debouncedMin,
        maxPrice: debouncedMax,
        currency,
        isOnline: isFilteringOnlineOnly ? true : undefined,
        supportsInPerson: isFilteringInPerson ? true : undefined,
        location: locationParam,
        lat:
          isFilteringInPerson && selectedSearchLocation
            ? Number(selectedSearchLocation.lat)
            : undefined,
        lng:
          isFilteringInPerson && selectedSearchLocation
            ? Number(selectedSearchLocation.lng)
            : undefined,
        radiusKm,
      }),
    );
  }, [
    isDiscoverSection,
    page,
    isInPersonSelected,
    debouncedLocation,
    isOnlineSelected,
    calculateLimit,
    dispatch,
    debouncedSearch,
    selectedCategory,
    debouncedMin,
    debouncedMax,
    currency,
    selectedSearchLocation,
    selectedType,
  ]);

  // Combine and sort lessons and curriculum by createdAt
  const combinedCourses = React.useMemo(() => {
    if (!isOnlineSelected && !isInPersonSelected) return [];

    if (isDiscoverSection) {
      return (discoverFeed || [])
        .map((item) => ({ ...item, type: item.feedType || item.type }))
        .sort((a, b) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });
    }

    const allCourses = [
      ...(lessons || []).map((lesson) => ({ ...lesson, type: "lesson" })),
      ...(curriculum || []).map((course) => ({
        ...course,
        type: "curriculum",
      })),
    ];

    return allCourses.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [curriculum, discoverFeed, isDiscoverSection, lessons]);

  const totalPages = isDiscoverSection ? discoverTotalPages : lessonPage;
  const isInitialLoading = loading;
  const isLoadingMore = page > 1 && loading;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || isInitialLoading || page >= totalPages) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setPage((currentPage) => Math.min(currentPage + 1, totalPages));
      },
      { rootMargin: "400px 0px", threshold: 0.01 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isInitialLoading, page, totalPages]);

  useEffect(() => {
    dispatch(getCategories());
    dispatch(getUserFavorites());
  }, [dispatch]);

  // Fetch lessons when filters change
  useEffect(() => {
    const currentFilters = {
      page,
      debouncedSearch,
      selectedCategory,
      debouncedMin,
      debouncedMax,
      currency,
      isOnlineSelected,
      isInPersonSelected,
      debouncedLocation,
      searchLat: selectedSearchLocation?.lat ?? null,
      searchLng: selectedSearchLocation?.lng ?? null,
      isDiscoverSection,
      selectedType,
    };

    // Check if filters actually changed
    const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(prevFiltersRef.current);

    if (filtersChanged) {
      prevFiltersRef.current = currentFilters;
      fetchLessons();
      fetchDiscover();
    }
  }, [
    page,
    debouncedSearch,
    selectedCategory,
    debouncedMin,
    debouncedMax,
    currency,
    isOnlineSelected,
    isInPersonSelected,
    debouncedLocation,
    selectedSearchLocation,
    isDiscoverSection,
    selectedType,
    fetchLessons,
    fetchDiscover,
  ]);

  return (
    <MainLayout 
      className="mx-auto" 
      width="3080px"
      categories={categories}
      selectedCategory={selectedCategory}
      onSelectCategory={(categoryName) => {
        setSelectedCategory(categoryName);
        setSearchInput("");
        setSearchFilter("");
        setPage(1);
      }}
      onSearchToggle={() => setShowFilter(true)}
      searchInput={searchInput}
      onSearchChange={(value) => {
        setSearchInput(value);
        setSearchFilter(value);
      }}
      locationFilter={locationFilter}
      onLocationChange={handleLocationChange}
      onLocationSelect={handleLocationSelect}
      onFilterClick={() => setShowFilter(true)}
      isOnlineSelected={isOnlineSelected}
      isInPersonSelected={isInPersonSelected}
      onModeChange={handleModeChange}
    >
    

      <SearchCategoryToolbar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelect}
        searchInput={searchInput}
        onSearchChange={(value) => { setSearchInput(value); setSearchFilter(value); }}
        locationFilter={locationFilter}
        onLocationChange={handleLocationChange}
        onLocationSelect={handleLocationSelect}
        minPrice={min}
        maxPrice={max}
        onMinPriceChange={setMin}
        onMaxPriceChange={setMax}
        showTypeFilter={isDiscoverSection}
        selectedType={selectedType}
        onTypeChange={(value) => {
          setSelectedType(value);
          setPage(1);
        }}
      />

      {!userInfo && <HighlightSlider />}

      {/* Legacy desktop category row retained for state compatibility. */}
        <div className="hidden">
     <div className="hidden lg:flex items-center flex-nowrap min-w-0 gap-4">
       <div
          onClick={() => handleSelect("")}
          className={`cursor-pointer flex items-center gap-1 whitespace-nowrap ${
            !selectedCategory
              ? "text-black py-2 border-b-2 border-black"
              : "text-black py-2 border-b-2 border-transparent"
          }`}
        >
          <span className="text-sm font-semibold">Trending</span>
        </div>

        {/* First 7 Categories */}
        {visibleCategories&&visibleCategories?.map((cat, index) => (
          <div
            key={index}
            onClick={() => handleSelect(cat.name)}
            className={`cursor-pointer flex font-semibold items-center gap-1 whitespace-nowrap ${
              selectedCategory === cat.name
                ? "text-black  py-2 border-b-2 border-black"
                : "text-black  py-2 border-b-2 border-transparent"
            }`}
          >
            <span className="text-sm">{cat.name}</span>
          </div>
        ))}

        {/* More Button - Only show if there are hidden categories */}
        {hiddenCategories.length > 0 && (
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMore(!showMore)}
              className={`cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                showMore
                  ? "text-black  px-2 py-3 rounded-4xl"
                  : "text-black  px-2 py-3"
              }`}
            >
              <span className="text-sm font-semibold">More</span>
              <IoIosArrowDown className={`transition-transform ${showMore ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {showMore && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-md shadow-lg z-50 min-w-max">
                {hiddenCategories.map((cat, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      handleSelect(cat.name);
                      setShowMore(false);
                    }}
                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm ${
                      selectedCategory === cat.name ? "underline underline-offset-4 decoration-2" : ""
                    }`}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
     </div>
          <button
            onClick={() => setShowFilter(true)}
            className="hidden lg:flex items-center justify-center p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ListFilter size={20} className="" />
          </button>
        </div>

      {/* Search Bar Popup */}
      {showSearchBar && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-start justify-center pt-24" onClick={() => setShowSearchBar(false)}>
          <Motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-2xl w-[90%] md:max-w-6xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <SearchBar
              searchInput={searchInput}
              onSearchInputChange={(value) => {
                setSearchInput(value);
                setSearchFilter(value);
              }}
              isOnlineSelected={isOnlineSelected}
              isInPersonSelected={isInPersonSelected}
              onModeChange={handleModeChange}
              locationFilter={locationFilter}
              onLocationChange={handleLocationChange}
              onLocationSelect={handleLocationSelect}
              onClose={() => setShowSearchBar(false)}
              onFilterOpen={() => setShowFilter(true)}
              showMobileLocation={true}
            />
          </Motion.div>
        </div>
      )}


      {/* Categories Swiper */}
     <div className="hidden"><CategoryMobile
        categories={categories} 
        selectedCategory={selectedCategory}
        onSelectCategory={(categoryName) => {
          setSelectedCategory(categoryName);
          setSearchInput("");
          setPage(1);
        }}
        setShowFilter={() => setShowFilter(true)}
      /></div>


      {/* Lessons Grid */}
      <div className="md:pb-4 w-full m-auto">
        {!isOnlineSelected && !isInPersonSelected ? (
          <div className="py-20 text-center">
            <p className="text-base font-semibold text-gray-700">No services selected</p>
            <p className="mt-1 text-sm text-gray-500">Please select Online or In-person to view available services.</p>
          </div>
        ) : isInitialLoading && page === 1 ? (
          <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-7 gap-4">
            {/* Show 8 skeleton cards while loading */}
            {[...Array(21)].map((_, index) =>
              index % 3 === 0 ? (
                <CurriculumCardSkeleton key={index} />
              ) : (
                <LessonCardSkeleton key={index} />
              ),
            )}
          </div>
        ) : (
          <>
            {combinedCourses.length === 0 && (
              <p className="text-center text-gray-500 mt-10">
                {/* No courses found matching your criteria. */}
              </p>
            )}
            <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-7 gap-4">
              {combinedCourses?.map((course) =>
                course.type === "listing" ? (
                  <ListingCard
                    key={`listing-${course._id}`}
                    listing={course}
                    favorites={favorites}
                  />
                ) : course.type === "lesson" ? (
                  <Card
                    key={`lesson-${course._id}`}
                    course={course}
                    favorites={favorites}
                    searchLocation={
                      isInPersonSelected && selectedSearchLocation
                        ? selectedSearchLocation
                        : null
                    }
                  />
                ) : (
                  <CurriculumCard
                    key={`curriculum-${course._id}`}
                    course={course}
                    favorites={favorites}
                  />
                ),
              )}
            </div>
            <div ref={loadMoreRef} className="flex min-h-20 items-center justify-center py-6" aria-live="polite">
              {isLoadingMore ? (
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
                  Loading more courses...
                </div>
              ) : page >= totalPages && combinedCourses.length > 0 ? (
                <span className="text-sm text-gray-400">You have reached the end.</span>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* <Ads /> */}

      {/* Filter Modal */}
      <FilterModal
        open={showFilter}
        onClose={() => setShowFilter(false)}
        isOnlineSelected={isOnlineSelected}
        isInPersonSelected={isInPersonSelected}
        onModeChange={handleModeChange}
        min={min}
        max={max}
        onMinChange={setMin}
        onMaxChange={setMax}
        onClear={clearAll}
        onApply={() => setShowFilter(false)}
      />
    </MainLayout>
  );
};

export default Home;
