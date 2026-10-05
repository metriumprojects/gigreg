import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Edit, Trash2, Search, Layers } from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  clearSuccessMessage,
  clearError
} from '../store/Reducer/CategoryReducer';
import CategoryModal from '../components/CategoryModal';

const Categories = () => {
  const dispatch = useDispatch();
  const { categories, loading, error, successMessage } = useSelector((state) => state.category);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    dispatch(getCategories());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      dispatch(clearSuccessMessage());
      setIsModalOpen(false);
      setSelectedCategory(null);
    }
    if (error) {
      toast.error(error.message || 'An error occurred');
      dispatch(clearError());
    }
  }, [successMessage, error, dispatch]);

  const handleCreate = (formData) => {
    dispatch(createCategory(formData));
  };

  const handleUpdate = (formData) => {
    if (selectedCategory) {
      dispatch(updateCategory({ categoryId: selectedCategory._id, formData }));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      dispatch(deleteCategory(id));
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Layers className="text-primary" />
          Categories
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none w-full sm:w-64"
            />
          </div>
          
          <button
            onClick={() => {
              setSelectedCategory(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading && categories.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <div key={category._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  {category.image ? (
                    <img 
                      src={category.image.url} 
                      alt={category.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <ImageIcon size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsModalOpen(true);
                      }}
                      className="p-2 bg-white text-primary rounded-full hover:bg-gray-100 transition-colors"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(category._id)}
                      className="p-2 bg-white text-red-500 rounded-full hover:bg-gray-100 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 text-lg truncate" title={category.name}>
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {/* You can add more details here like course count if available */}
                    Category ID: {category._id.slice(-6)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
              <Layers size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No categories found</p>
              <p className="text-sm mt-1">Try adjusting your search or create a new category.</p>
            </div>
          )}
        </div>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={selectedCategory}
        onSave={selectedCategory ? handleUpdate : handleCreate}
        isLoading={loading}
      />
    </div>
  );
};

export default Categories;
