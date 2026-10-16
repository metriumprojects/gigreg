import Header from './Header'
import MobileMenu from './MobileMenu'
import Footer from './Footer'

const MainLayout = ({
  children,
  width,
  categories = [],
  selectedCategory = "",
  onSelectCategory = null,
  onSearchToggle = null,
  searchInput = "",
  onSearchChange = null,
  locationFilter = "",
  onLocationChange = null,
  onLocationSelect = null,
  onFilterClick = null,
  searchPlaceholder = "Search",
  contentClassName = "",
  hideHeader = false,
  hideFooter = false,
  hideMobileMenu = false,
  breadcrumbs = null,
  isOnlineSelected = true,
  isInPersonSelected = true,
  isOnDemandSelected = true,
  isFixedPriceSelected = true,
  onModeChange = null,
  minPrice,
  maxPrice,
  onMinPriceChange = null,
  onMaxPriceChange = null,
  sortOrder = "best_match",
  onSortChange = null,
  hideSearchCard = false,
  searchCardTitle = "",
  mainClassName = "",
}) => {
  const maxWidth = width || '1400px'
  
  return (
    <div
      className='w-full mx-auto bg-white min-h-screen'
      style={hideHeader ? { paddingTop: 'max(16px, calc(env(safe-area-inset-top, 0px) + 8px))' } : undefined}
    >
    {!hideHeader && (
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        onSearchToggle={onSearchToggle}
        searchInput={searchInput}
        onSearchChange={onSearchChange}
        locationFilter={locationFilter}
        onLocationChange={onLocationChange}
        onLocationSelect={onLocationSelect}
        onFilterClick={onFilterClick}
        searchPlaceholder={searchPlaceholder}
        breadcrumbs={breadcrumbs}
        isOnlineSelected={isOnlineSelected}
        isInPersonSelected={isInPersonSelected}
        isOnDemandSelected={isOnDemandSelected}
        isFixedPriceSelected={isFixedPriceSelected}
        onModeChange={onModeChange}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={onMinPriceChange}
        onMaxPriceChange={onMaxPriceChange}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        hideSearchCard={hideSearchCard}
        searchCardTitle={searchCardTitle}
      />
    )}
      <div className={`relative min-h-0 lg:min-h-[98vh] lg:mx-0 2xl:mx-0 overflow-x-hidden w-full mx-auto ${contentClassName}`}>
      <main
        className={`mx-auto px-3 lg:px-10 py-0 ${mainClassName}`}
        style={{
          maxWidth: maxWidth,
          paddingBottom: hideMobileMenu
            ? 'max(16px, env(safe-area-inset-bottom, 0px))'
            : 'calc(76px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {children}
      </main>
      </div>
      {!hideFooter && <Footer />}
      {!hideMobileMenu && (
        <MobileMenu
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
        />
      )}
    </div>
  )
}

export default MainLayout
