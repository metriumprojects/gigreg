import React, { useEffect, useState } from "react";
import { ArrowRight, MapPin, Upload, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { createPropose, getAllProposes } from "../../../redux/reducers/ProposeReducer";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { getCategories } from "../../../redux/reducers/CategoryReducer";
import LocationAutocomplete from "./LocationAutocomplete";

const DRAFT_KEY = "gigreg_request_draft";

const SegmentedControl = ({ options, value, onChange, disabled }) => (
  <div className="flex w-fit rounded-full bg-[#E8E8E8] p-1">
    {options.map((option) => {
      const active = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`w-fit rounded-full px-10 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            active ? "bg-white text-black" : "bg-transparent text-black"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const inputClass =
  "w-full rounded-lg border border-gray-900 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400";

export default function CreateRequestPopup({ open, onClose }) {
  const dispatch = useDispatch();
  const { categories } = useSelector((state) => state.category);

  const [serviceType, setServiceType] = useState("both");
  const [pricingType, setPricingType] = useState("fixed");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    location: "",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);

  const isOnline = serviceType === "online" || serviceType === "both";
  const isInPerson = serviceType === "location" || serviceType === "both";

  useEffect(() => {
    dispatch(getCategories());
  }, [dispatch]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setServiceType(draft.serviceType || "both");
      setPricingType(draft.pricingType || "fixed");
      setFormData({
        title: draft.title || "",
        description: draft.description || "",
        price: draft.price || "",
        category: draft.category || "",
        location: draft.location || "",
      });
    } catch {
      // ignore invalid draft
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price: "",
      category: "",
      location: "",
    });
    setSelectedFiles([]);
    setServiceType("both");
    setPricingType("fixed");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length !== files.length) {
      toast.error("Only image files are allowed");
    }
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    e.target.value = "";
  };

  const handleSaveDraft = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        ...formData,
        serviceType,
        pricingType,
      })
    );
    toast.success("Draft saved");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.price || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isInPerson && !formData.location) {
      toast.error("Please enter a location");
      return;
    }

    if (selectedFiles.length < 2) {
      toast.error("Minimum 2 images are required");
      return;
    }

    setLoading(true);
    const submitData = new FormData();
    submitData.append("title", formData.title);
    submitData.append("description", formData.description);
    submitData.append("price", formData.price);
    submitData.append("category", formData.category);
    submitData.append("location", formData.location || "");
    submitData.append("isOnline", String(isOnline));
    submitData.append("supportsInPerson", String(isInPerson));
    submitData.append("pricingType", pricingType);
    selectedFiles.forEach((file) => {
      submitData.append("images", file);
    });

    dispatch(createPropose(submitData))
      .then((res) => {
        if (res.payload?.status) {
          toast.success("Request posted successfully");
          localStorage.removeItem(DRAFT_KEY);
          resetForm();
          onClose();
          dispatch(getAllProposes({ page: 1, limit: 10 }));
        } else {
          toast.error(res.payload?.message || "Failed to create request");
        }
      })
      .catch(() => {
        toast.error("Error creating request");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -24, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl hide-scrollbar md:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">Post a request</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-black"
            disabled={loading}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SegmentedControl
            disabled={loading}
            value={serviceType}
            onChange={(value) => {
              setServiceType(value);
              if (value === "online") {
                setFormData((prev) => ({ ...prev, location: "" }));
              }
            }}
            options={[
              { value: "online", label: "Online" },
              { value: "location", label: "At a location" },
              { value: "both", label: "Both" },
            ]}
          />

          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            type="text"
            placeholder="Title"
            className={inputClass}
            disabled={loading}
          />

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Description"
            rows={4}
            className={`${inputClass} resize-none`}
            disabled={loading}
          />

          <div className="min-w-0 w-full">
            <div className="w-full overflow-hidden rounded-lg border border-gray-800 p-3">
              <p className="mb-2 text-sm text-gray-400">Upload images</p>
              <label className="flex h-20 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#F7F7F7] hover:bg-gray-100">
                <input
                  name="images"
                  multiple
                  onChange={handleFileChange}
                  type="file"
                  className="hidden"
                  disabled={loading}
                  accept="image/*"
                />
                <Upload size={28} className="shrink-0 text-gray-500" />
              </label>
            </div>
            {selectedFiles.length > 0 && (
              <div className="mt-3 grid min-w-0 grid-cols-3 gap-2 sm:grid-cols-4">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="relative min-w-0 overflow-hidden rounded-lg"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="h-20 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="absolute right-1 top-1 rounded-full bg-black p-0.5 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isInPerson && (
            <LocationAutocomplete
              value={formData.location}
              onChange={(val) => setFormData({ ...formData, location: val })}
              placeholder="Enter location"
              leadingIcon={<MapPin size={18} className="text-gray-500" />}
              className={inputClass}
              disabled={loading}
            />
          )}

          <SegmentedControl
            disabled={loading}
            value={pricingType}
            onChange={setPricingType}
            options={[
              { value: "hourly", label: "Per hour price" },
              { value: "fixed", label: "Fixed budget" },
            ]}
          />

          <input
            name="price"
            value={formData.price}
            onChange={handleChange}
            type="number"
            min="1"
            placeholder="Budget"
            className={inputClass}
            disabled={loading}
          />

          <div className="flex flex-wrap gap-2">
            {categories?.length > 0 ? (
              categories.map((cat) => {
                const selected = formData.category === cat.name;
                return (
                  <button
                    key={cat._id || cat.name}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        category: selected ? "" : cat.name,
                      }))
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? "border-gray-400 bg-white text-black"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {cat.name}
                    {selected && <X size={12} />}
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">Loading categories...</p>
            )}
          </div>

          <div className="flex items-center justify-start gap-2 pt-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading}
              className="rounded-full bg-[#EFEFEF] w-[170px] flex items-center justify-center py-2.5 text-sm font-medium text-black disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-black w-[170px] flex items-center justify-center py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Posting..." : "Post request"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
