import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { updatePropose, getProposeByUser } from "../../../redux/reducers/ProposeReducer";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { getCategories } from "../../../redux/reducers/CategoryReducer";
import LocationAutocomplete from "../../Home/Components/LocationAutocomplete";

export default function UpdateRequest({ open, onClose, id }) {
  const dispatch = useDispatch();
  const { categories } = useSelector((state) => state.category);
  const { userProposes } = useSelector((state) => state.propose);
  
  const [isOnlineChecked, setIsOnlineChecked] = useState(true);
  const [isInPersonChecked, setIsInPersonChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    location: "",
    isOnline: true,
    supportsInPerson: false,
    status: "Active"
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  // Fetch the propose data when modal opens
  useEffect(() => {
    if (open && id) {
      setDataLoading(true);
      const propose = userProposes?.find((p) => p._id === id);
      if (propose) {
        setFormData({
          title: propose.title,
          description: propose.description,
          price: propose.price,
          category: propose.category,
          location: propose.location || "",
          isOnline: propose.isOnline,
          supportsInPerson: propose.supportsInPerson || false,
          status: propose.status || "Active"
        });
        setIsOnlineChecked(propose.isOnline || false);
        setIsInPersonChecked(propose.supportsInPerson || false);
        setExistingImages(propose.images || []);
        setSelectedFiles([]);
      }
      setDataLoading(false);
    }
  }, [open, id, userProposes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types
    const validFiles = files.filter(file => 
      file.type.startsWith('image/')
    );
    
    if (validFiles.length !== files.length) {
      toast.error("Only image files are allowed");
    }
    
    setSelectedFiles(validFiles);
  };

  const handleCategorySelect = (categoryName) => {
    setFormData({ ...formData, category: categoryName });
  };

  const handleLocationModeChange = (e) => {
    const value = e.target.value;
    const online = value === "online" || value === "both";
    const inPerson = value === "inPerson" || value === "both";
    setIsOnlineChecked(online);
    setIsInPersonChecked(inPerson);
    setFormData({
      ...formData,
      isOnline: online,
      supportsInPerson: inPerson,
      ...(inPerson ? {} : { location: "" }),
    });
  };

  const handleRemoveExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title || !formData.description || !formData.price || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isOnlineChecked && !isInPersonChecked) {
      toast.error("Please select at least one lesson location (Online or In-Person)");
      return;
    }

    if (isInPersonChecked && !formData.location) {
      toast.error("Please enter your location for in-person lessons");
      return;
    }

    // Check if there are enough images (existing + new)
    const totalImages = existingImages.length + selectedFiles.length;
    if (totalImages < 2) {
      toast.error("Minimum 2 images are required");
      return;
    }

    setLoading(true);

    // Create FormData object
    const submitData = new FormData();
    
    // Append text fields
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    submitData.append('price', formData.price);
    submitData.append('category', formData.category);
    submitData.append('location', formData.location || '');
    submitData.append('isOnline', isOnlineChecked.toString());
    submitData.append('supportsInPerson', isInPersonChecked.toString());
    submitData.append('status', formData.status);
    
    // Append existing images that weren't removed
    if (existingImages.length > 0) {
      submitData.append('existingImages', JSON.stringify(existingImages));
    }
    
    // Append new files
    selectedFiles.forEach((file) => {
      submitData.append('images', file);
    });

    dispatch(updatePropose({ id, data: submitData }))
      .then((res) => {
        if (res.payload?.status) {
          toast.success("Request updated successfully");
          // Refresh the list
          dispatch(getProposeByUser());
          onClose();
          // Reset form
          setFormData({
            title: "",
            description: "",
            price: "",
            category: "",
            location: "",
            isOnline: true,
            status: "Active"
          });
          setSelectedFiles([]);
          setExistingImages([]);
          setIsOnlineChecked(true);
          setIsInPersonChecked(false);
        } else {
          toast.error(res.payload?.message || "Failed to update request");
          setLoading(false);
        }
      })
      .catch((error) => {
        toast.error("Error updating request");
        setLoading(false);
      })
      .finally(() => {
        if (loading) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    dispatch(getCategories());
  }, [dispatch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[#00000079] flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-xl p-6 md:p-7 relative max-h-[95vh] overflow-y-auto hide-scrollbar w-full max-w-4xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Update request</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading request...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Title Input */}
            <div className="bg-gray-50 rounded-2xl p-4 md:p-5 border border-gray-100 mb-4">
              <label className="block mb-2 text-sm font-semibold text-gray-900">Title</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                type="text"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-0"
                required
                disabled={loading}
              />
            </div>

            {/* Description Box */}
            <div className="bg-gray-50 rounded-2xl p-4 md:p-5 border border-gray-100 mb-4">
              <label className="block mb-2 text-sm font-semibold text-gray-900">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 h-28 text-sm outline-none focus:ring-0"
                required
                disabled={loading}
              ></textarea>
            </div>

            {/* Images */}
            <div className="bg-gray-50 rounded-2xl p-4 md:p-5 border border-gray-100 mb-4">
              <label className="block mb-2 text-sm font-semibold text-gray-900">Images</label>
              
              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-2">Current images:</p>
                  <div className="flex gap-3 flex-wrap">
                    {existingImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.url}
                          alt="existing"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Input */}
              <label className="flex items-center justify-center bg-white border border-gray-200 rounded-xl h-16 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  name="images"
                  multiple
                  onChange={handleFileChange}
                  type="file"
                  className="hidden"
                  disabled={loading}
                  accept="image/*"
                />
                <span className="text-gray-500 text-sm">Upload</span>
              </label>
              <div className="mt-2 text-xs text-gray-500">Add new images or keep existing ones</div>
              {selectedFiles.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  {selectedFiles.length} new file(s) selected
                  {(existingImages.length + selectedFiles.length) < 2 && (
                    <span className="text-red-500 ml-2"> - Minimum 2 required total</span>
                  )}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="bg-gray-50 rounded-2xl p-4 md:p-5 border border-gray-100 mb-4">
              <label className="block mb-2 text-sm font-semibold text-gray-900">Location</label>
              <select
                value={
                  isOnlineChecked && isInPersonChecked
                    ? "both"
                    : isOnlineChecked
                    ? "online"
                    : "inPerson"
                }
                onChange={handleLocationModeChange}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-0"
                disabled={loading}
              >
                <option value="both">Online and in person</option>
                <option value="online">Online</option>
                <option value="inPerson">In person</option>
              </select>

              {isInPersonChecked && (
                <div className="mt-3">
                  <label className="block mb-2 text-xs font-semibold text-gray-700">
                    Enter Location
                  </label>
                  <LocationAutocomplete
                    value={formData.location}
                    onChange={(val) => setFormData({ ...formData, location: val })}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-0 disabled:bg-gray-100 disabled:opacity-50"
                    disabled={loading}
                    required={isInPersonChecked}
                  />
                </div>
              )}
            </div>

            {/* Budget */}
            <div className="bg-gray-50 rounded-2xl p-4 md:p-5 border border-gray-100 mb-4">
              <label className="block mb-2 text-sm font-semibold text-gray-900">Budget</label>
              <select
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-0"
                required
                disabled={loading}
              >
                <option value="">Select price</option>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((item, index) => (
                  <option key={index} value={item}>{`$${item}`}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="bg-gray-50 rounded-2xl p-4 md:p-5 border border-gray-100 mb-4">
              <label className="block mb-2 text-sm font-semibold text-gray-900">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-0"
                required
                disabled={loading}
              >
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Category Buttons */}
            <div className="bg-gray-50 rounded-2xl p-4 md:p-5 border border-gray-100 mb-4">
              <p className="text-sm font-semibold mb-3 text-gray-900">Select the category</p>
              {categories?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categories?.map((cat, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCategorySelect(cat.name)}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-all disabled:opacity-50 ${
                        formData.category === cat.name
                          ? "bg-white text-gray-900 border-gray-900"
                          : "border-gray-200 text-gray-600 hover:bg-white"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Loading categories...</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-black/90 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (existingImages.length + selectedFiles.length < 2)}
                className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}