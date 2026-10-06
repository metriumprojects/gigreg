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
  onModeChange = null,
}) => {
  const maxWidth = width || '1400px'
  
  return (
    <div className='w-full mx-auto' >
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
        onModeChange={onModeChange}
      />
    )}
      <div className={`relative min-h-[98vh] lg:mx-0 2xl:mx-0 overflow-x-hidden w-full mx-auto ${contentClassName}`}>
      <main className='mx-auto px-3 lg:px-10  py-0 pb-[32px]' style={{ maxWidth: maxWidth }}>
        {children}
      </main>
      </div>
      {!hideFooter && <Footer />}
      {!hideMobileMenu && <MobileMenu />}
    </div>
  )
}

export default MainLayout
