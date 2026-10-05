import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Edit, ImageIcon, Images, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  clearError,
  clearSuccessMessage,
  createHomeSlider,
  deleteHomeSlider,
  getHomeSliders,
  updateHomeSlider,
} from "../store/Reducer/HomeSliderReducer";
import HomeSliderModal from "../components/HomeSliderModal";

const HomeSlider = () => {
  const dispatch = useDispatch();
  const { slides, loading, error, successMessage } = useSelector(
    (state) => state.homeSlider
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState(null);

  useEffect(() => {
    dispatch(getHomeSliders());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      dispatch(clearSuccessMessage());
      setIsModalOpen(false);
      setSelectedSlide(null);
    }
    if (error) {
      toast.error(error.message || "An error occurred");
      dispatch(clearError());
    }
  }, [successMessage, error, dispatch]);

  const handleCreate = (formData) => {
    dispatch(createHomeSlider(formData));
  };

  const handleUpdate = (formData) => {
    if (!selectedSlide) return;
    dispatch(updateHomeSlider({ id: selectedSlide._id, formData }));
  };

  const handleDelete = (id) => {
    if (window.confirm("Remove this listing from the home slider?")) {
      dispatch(deleteHomeSlider(id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Images className="text-primary" />
            Home Slider
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose which listings appear on the guest home slider and upload the slide image.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedSlide(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-dark"
        >
          <Plus size={20} className="mr-2" />
          Add slide
        </button>
      </div>

      {loading && slides.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : slides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
          <Images size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No slider items yet</p>
          <p className="mt-1 text-sm">Add a listing and upload an image to show on the homepage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {slides.map((slide) => (
            <div
              key={slide._id}
              className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative h-44 bg-gray-100">
                {slide.image?.url ? (
                  <img
                    src={slide.image.url}
                    alt={slide.listing?.title || "Slider"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <ImageIcon size={40} />
                  </div>
                )}
                <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                  Order {slide.order ?? 0}
                </div>
                <div
                  className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${
                    slide.isActive
                      ? "bg-green-500 text-white"
                      : "bg-gray-500 text-white"
                  }`}
                >
                  {slide.isActive ? "Active" : "Hidden"}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="truncate text-lg font-semibold text-gray-800">
                    {slide.listing?.title || "Listing removed"}
                  </h3>
                  <p className="truncate text-sm text-gray-500">
                    {slide.listing?.createdBy?.name || "Unknown teacher"}
                    {slide.listing?.location ? ` · ${slide.listing.location}` : ""}
                  </p>
                </div>
                {slide.quote ? (
                  <p className="line-clamp-2 text-sm text-gray-600">“{slide.quote}”</p>
                ) : (
                  <p className="text-sm text-gray-400">No custom quote — listing title will be used</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedSlide(slide);
                      setIsModalOpen(true);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(slide._id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <HomeSliderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSlide(null);
        }}
        slide={selectedSlide}
        onSave={selectedSlide ? handleUpdate : handleCreate}
        isLoading={loading}
      />
    </div>
  );
};

export default HomeSlider;
