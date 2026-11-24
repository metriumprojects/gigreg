import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText, Loader, MapPin, Upload, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createPropose,
  getAllProposes,
  getProposeByUser,
  updatePropose,
} from "../../../redux/reducers/ProposeReducer";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { getCategories } from "../../../redux/reducers/CategoryReducer";
import { getLoginUrl } from "../../../utils/authRedirect";
import LocationAutocomplete from "./LocationAutocomplete";

const DRAFT_KEY = "gigreg_request_draft";

const SegmentedControl = ({ options, value, onChange, disabled }) => (
  <div className="inline-flex flex-wrap sm:flex-nowrap w-full sm:w-fit rounded-full bg-white border border-gray-200 p-1 gap-1">
    {options.map((option) => {
      const active = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`flex-1 sm:flex-initial rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer disabled:opacity-50 ${
            active
              ? "bg-black text-white shadow-xs"
              : "bg-transparent text-gray-700 hover:bg-gray-100"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const getCardClass = (hasError) =>
  `rounded-2xl bg-[#F7F7F7] p-4 border transition-colors ${
    hasError
      ? "border-red-500 ring-1 ring-red-500 bg-red-50/20"
      : "border-gray-100"
  }`;

const getInputClass = (hasError) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-colors disabled:bg-gray-100 disabled:opacity-50 ${
    hasError
      ? "border-red-400 focus:border-red-500"
      : "border-gray-200 focus:border-black"
  }`;

export default function CreateRequestPopup({
  open,
  onClose,
  initialDraft = null,
  onSaved = null,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { categories } = useSelector((state) => state.category);
  const { userInfo } = useSelector((state) => state.auth);
  const { userProposes = [] } = useSelector((state) => state.propose);

  const [serviceType, setServiceType] = useState("both");
  const [pricingType, setPricingType] = useState("fixed");
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    location: "",
  });
  const [existingImages, setExistingImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const isBusy = loading || savingDraft;
  const isEditingDraft = Boolean(initialDraft?._id);
  const isOnline = serviceType === "online" || serviceType === "both";
  const isInPerson = serviceType === "location" || serviceType === "both";

  const savedDraftsCount = useMemo(
    () =>
      Array.isArray(userProposes)
        ? userProposes.filter((item) => item?.status === "Draft").length
        : 0,
    [userProposes]
  );

  const filePreviews = useMemo(
    () =>
      selectedFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [selectedFiles]
  );

  useEffect(() => {
    return () => {
      filePreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [filePreviews]);

  useEffect(() => {
    dispatch(getCategories());
  }, [dispatch]);

  const resetForm = useCallback(() => {
    setFormData({
      title: "",
      description: "",
      price: "",
      category: "",
      location: "",
    });
    setExistingImages([]);
    setSelectedFiles([]);
    setServiceType("both");
    setPricingType("fixed");
    setErrors({});
  }, []);

  useEffect(() => {
    if (!open) {
      setErrors({});
      return;
    }

    if (!userInfo?._id) {
      toast.info("Please log in to post a request");
      onClose();
      navigate(getLoginUrl(location), {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    setErrors({});

    if (initialDraft?._id) {
      const draftOnline = Boolean(initialDraft.isOnline);
      const draftInPerson = Boolean(initialDraft.supportsInPerson);
      const derivedServiceType =
        draftOnline && draftInPerson
          ? "both"
          : draftInPerson
          ? "location"
          : draftOnline
          ? "online"
          : "both";

      setServiceType(derivedServiceType);
      setPricingType(initialDraft.pricingType === "hourly" ? "hourly" : "fixed");
      setFormData({
        title: initialDraft.title || "",
        description: initialDraft.description || "",
        price: initialDraft.price != null ? String(initialDraft.price) : "",
        category: initialDraft.category || "",
        location: initialDraft.location || "",
      });
      setExistingImages(
        Array.isArray(initialDraft.images) ? initialDraft.images : []
      );
      setSelectedFiles([]);
      return;
    }

    resetForm();
    if (userInfo?._id) {
      dispatch(getProposeByUser());
    }
  }, [open, initialDraft, userInfo?._id, dispatch, resetForm]);

  const handleClose = useCallback(() => {
    if (isBusy) return;
    setErrors({});
    onClose();
  }, [isBusy, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isBusy) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isBusy, handleClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length !== files.length) {
      toast.error("Only image files are allowed");
    }
    const remainingSlots = Math.max(
      0,
      5 - existingImages.length - selectedFiles.length
    );
    if (validFiles.length > remainingSlots) {
      toast.info("Maximum 5 images allowed per request");
    }
    if (remainingSlots > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles.slice(0, remainingSlots)]);
    }
    e.target.value = "";
  };

  const buildFormData = (targetStatus) => {
    const submitData = new FormData();
    submitData.append("title", formData.title || "");
    submitData.append("description", formData.description || "");
    submitData.append("price", formData.price !== undefined ? String(formData.price) : "");
    submitData.append("category", formData.category || "");
    submitData.append("location", isInPerson ? formData.location || "" : "");
    submitData.append("isOnline", String(isOnline));
    submitData.append("supportsInPerson", String(isInPerson));
    submitData.append("pricingType", pricingType);
    submitData.append("status", targetStatus);
    if (isEditingDraft) {
      submitData.append("existingImages", JSON.stringify(existingImages));
    }
    selectedFiles.forEach((file) => {
      submitData.append("images", file);
    });
    return submitData;
  };

  const handleSaveDraft = async () => {
    if (!userInfo?._id) {
      toast.error("Please log in to save a draft");
      return;
    }

    const hasAnyDetail = Boolean(
      formData.title?.trim() ||
        formData.description?.trim() ||
        formData.category?.trim() ||
        formData.location?.trim() ||
        (formData.price !== "" && formData.price !== undefined) ||
        selectedFiles.length > 0 ||
        existingImages.length > 0
    );

    if (!hasAnyDetail) {
      toast.error("Add at least a title or detail to save a draft");
      return;
    }

    if (formData.price !== "" && formData.price !== undefined && Number(formData.price) < 0) {
      setErrors((prev) => ({ ...prev, price: "Budget cannot be negative" }));
      toast.error("Budget cannot be negative");
      return;
    }

    setSavingDraft(true);
    try {
      const submitData = buildFormData("Draft");
      const res = await dispatch(
        isEditingDraft
          ? updatePropose({ id: initialDraft._id, data: submitData })
          : createPropose(submitData)
      ).unwrap();

      if (res?.status) {
        localStorage.removeItem(DRAFT_KEY);
        dispatch(getProposeByUser());
        toast.success("Draft saved in Profile → My Requests");
        onSaved?.("draft");
        resetForm();
        onClose();
      } else {
        toast.error(res?.message || "Failed to save draft");
      }
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.message || "Failed to save draft";
      toast.error(msg);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.title?.trim()) {
      newErrors.title = "Please enter a title";
    }
    if (!formData.description?.trim()) {
      newErrors.description = "Please enter a description";
    }
    if (isInPerson && !formData.location?.trim()) {
      newErrors.location = "Please enter a location";
    }
    if (!formData.price || Number(formData.price) <= 0) {
      newErrors.price = "Please enter a valid budget";
    }
    if (!formData.category) {
      newErrors.category = "Please select a category";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const submitData = buildFormData("Active");
      const res = await dispatch(
        isEditingDraft
          ? updatePropose({ id: initialDraft._id, data: submitData })
          : createPropose(submitData)
      ).unwrap();

      if (res?.status) {
        localStorage.removeItem(DRAFT_KEY);
        dispatch(getAllProposes({ page: 1, limit: 10 }));
        dispatch(getProposeByUser());
        toast.success(
          isEditingDraft
            ? "Request published successfully"
            : "Request posted successfully"
        );
        onSaved?.("published");
        resetForm();
        onClose();
      } else {
        toast.error(res?.message || "Failed to create request");
      }
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.message || "Error creating request";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !userInfo?._id) return null;

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-3 sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -24, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100"
      >
        {/* Sticky Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 md:px-6">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-black tracking-tight">
              {isEditingDraft ? "Edit draft" : "Post a request"}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {isEditingDraft
                ? "Update your saved draft or publish it so sellers can apply"
                : "Tell sellers what you need and receive tailored proposals"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition-colors cursor-pointer disabled:opacity-50"
            disabled={isBusy}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Grey Card Form Body */}
        <form
          id="create-request-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-5 md:px-6 space-y-4 hide-scrollbar"
        >
          {!isEditingDraft && savedDraftsCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-[#F7F7F7] px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                <FileText size={16} className="text-gray-600 shrink-0" />
                <span>
                  You have {savedDraftsCount} saved draft
                  {savedDraftsCount > 1 ? "s" : ""}
                </span>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  onClose();
                  navigate("/profile?tab=My%20Requests&subtab=drafts");
                }}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                View drafts →
              </button>
            </div>
          )}

          {/* Card 1: Service Delivery & Location */}
          <div className={getCardClass(errors.location)}>
            <label className="block mb-2.5 text-sm font-semibold text-gray-900">
              Service delivery *
            </label>
            <SegmentedControl
              disabled={isBusy}
              value={serviceType}
              onChange={(value) => {
                setServiceType(value);
                if (value === "online") {
                  setFormData((prev) => ({ ...prev, location: "" }));
                  if (errors.location) {
                    setErrors((prev) => ({ ...prev, location: false }));
                  }
                }
              }}
              options={[
                { value: "online", label: "Online" },
                { value: "location", label: "At a location" },
                { value: "both", label: "Both" },
              ]}
            />

            {isInPerson && (
              <div className="mt-3.5">
                <label className="block mb-2 text-xs font-semibold text-gray-700">
                  Location *
                </label>
                <LocationAutocomplete
                  variant="type"
                  value={formData.location}
                  onChange={(val) => {
                    setFormData((prev) => ({ ...prev, location: val }));
                    if (errors.location) {
                      setErrors((prev) => ({ ...prev, location: false }));
                    }
                  }}
                  placeholder="Enter city or address"
                  placeholderClassName="placeholder:text-gray-400"
                  leadingIcon={<MapPin size={16} className="text-gray-400" />}
                  className={getInputClass(errors.location)}
                  disabled={isBusy}
                />
                {errors.location && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.location}</p>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Request Title */}
          <div className={getCardClass(errors.title)}>
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Request title *
            </label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              type="text"
              maxLength={200}
              placeholder="e.g., Need a modern logo for my coffee brand"
              className={getInputClass(errors.title)}
              disabled={isBusy}
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.title}</p>
            )}
          </div>

          {/* Card 3: Description */}
          <div className={getCardClass(errors.description)}>
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your goals, timeline, and any important details..."
              rows={4}
              className={`${getInputClass(errors.description)} resize-none`}
              disabled={isBusy}
            />
            {errors.description && (
              <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.description}</p>
            )}
          </div>

          {/* Card 4: Pricing & Budget */}
          <div className={getCardClass(errors.price)}>
            <label className="block mb-2.5 text-sm font-semibold text-gray-900">
              Budget & pricing *
            </label>
            <SegmentedControl
              disabled={isBusy}
              value={pricingType}
              onChange={setPricingType}
              options={[
                { value: "fixed", label: "Fixed budget" },
                { value: "hourly", label: "Per hour price" },
              ]}
            />
            <div className="mt-3 relative">
              <input
                name="price"
                value={formData.price}
                onChange={handleChange}
                type="number"
                min="1"
                placeholder={
                  pricingType === "hourly"
                    ? "Hourly budget (e.g. 40)"
                    : "Total budget (e.g. 150)"
                }
                className={`${getInputClass(errors.price)} pr-20`}
                disabled={isBusy}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full bg-[#F7F7F7] px-2.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
                {pricingType === "hourly" ? "/ hour" : "Fixed"}
              </span>
            </div>
            {errors.price && (
              <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.price}</p>
            )}
          </div>

          {/* Card 5: Category */}
          <div className={getCardClass(errors.category)}>
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Category *
            </label>
            <div
              className={`rounded-xl border bg-white p-3.5 ${
                errors.category ? "border-red-400" : "border-gray-200"
              }`}
            >
              <div className="flex flex-wrap gap-2">
                {categories?.length > 0 ? (
                  categories.map((cat) => {
                    const selected = formData.category === cat.name;
                    return (
                      <button
                        key={cat._id || cat.name}
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            category: selected ? "" : cat.name,
                          }));
                          if (errors.category) {
                            setErrors((prev) => ({ ...prev, category: false }));
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all cursor-pointer disabled:opacity-50 ${
                          selected
                            ? "border-black bg-black text-white font-medium shadow-xs"
                            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {cat.name}
                        {selected && <X size={13} className="text-white shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500">Loading categories...</p>
                )}
              </div>
            </div>
            {errors.category && (
              <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.category}</p>
            )}
          </div>

          {/* Card 6: Reference Images */}
          <div className={getCardClass(false)}>
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Reference images <span className="font-normal text-gray-500">(optional, up to 5)</span>
            </label>
            <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-5 text-center transition-colors hover:border-black cursor-pointer">
              <input
                name="images"
                multiple
                onChange={handleFileChange}
                type="file"
                className="hidden"
                disabled={isBusy}
                accept="image/*"
              />
              <span className="flex items-center justify-center rounded-xl bg-[#F2F2F2] p-2.5 text-gray-700">
                <Upload size={20} className="shrink-0" />
              </span>
              <span className="text-sm font-medium text-gray-800">Click to upload images</span>
              <span className="text-xs text-gray-500">PNG, JPG or WEBP</span>
            </label>
            {(existingImages.length > 0 || filePreviews.length > 0) && (
              <div className="mt-3 grid min-w-0 grid-cols-3 gap-2.5 sm:grid-cols-4">
                {existingImages.map((img, index) => (
                  <div
                    key={img.public_id || img.url || index}
                    className="relative min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white"
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="h-20 w-full object-cover"
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        setExistingImages((prev) => prev.filter((_, i) => i !== index))
                      }
                      aria-label="Remove saved image"
                      className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-white hover:bg-black cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {filePreviews.map((item, index) => (
                  <div
                    key={`${item.file.name}-${index}`}
                    className="relative min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white"
                  >
                    <img
                      src={item.url}
                      alt=""
                      className="h-20 w-full object-cover"
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
                      }
                      aria-label="Remove image"
                      className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-white hover:bg-black cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-gray-100 bg-white px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F2F2F2] hover:bg-gray-200 px-6 py-2.5 text-sm font-semibold text-black transition-colors cursor-pointer disabled:opacity-50"
          >
            {savingDraft ? (
              <>
                <Loader size={16} className="animate-spin" />
                Saving...
              </>
            ) : isEditingDraft ? (
              "Update draft"
            ) : (
              "Save draft"
            )}
          </button>
          <button
            type="submit"
            form="create-request-form"
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black hover:bg-black/90 px-7 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                {isEditingDraft ? "Publishing..." : "Posting..."}
              </>
            ) : (
              <>
                {isEditingDraft ? "Publish request" : "Post request"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
