import { useEffect, useState, useRef, useCallback } from "react";
import LocationAutocomplete from "../../Home/Components/LocationAutocomplete";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  Loader,
  Menu,
} from "lucide-react";
import MainLayout from "../../../components/MainLayout";
import { useDispatch, useSelector } from "react-redux";
import { getTeacherLessons } from "../../../redux/reducers/LessonReducer";
import { createCurriculum } from "../../../redux/reducers/CurriculumReducer";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { getCategories } from "../../../redux/reducers/CategoryReducer";
import { getLessonCalendarByUser } from "../../../redux/reducers/AvailabilityReducer";
import MakeAvailability from "../../../components/MakeAvailability";
import ImageUploader from "../../../components/ImageUploader";
import { GrUpload } from "react-icons/gr";
import { useCurrency } from "../../../currency/CurrencyContext";
import useTeacherPayoutCurrencies from "../../../hooks/useTeacherPayoutCurrencies";

export default function CurriculumPage() {
  const { currency } = useCurrency();
  const { payoutCurrencies, payoutCurrenciesLoading, stripePayoutReady } = useTeacherPayoutCurrencies();
  const navigate = useNavigate();
  useEffect(() => {
    if (!payoutCurrenciesLoading && !stripePayoutReady) {
      toast.info("Set up and verify your Stripe payout account before creating a curriculum.");
      navigate("/withdraw-request", { replace: true });
    }
  }, [navigate, payoutCurrenciesLoading, stripePayoutReady]);
  const lessonImageInputRef = useRef(null);

  const { Teacherlessons } = useSelector((state) => state.lesson);
  const { categories } = useSelector((state) => state.category);
  const { loading, successMessage, errorMessage } = useSelector(
    (state) => state.curriculum,
  );
  const dispatch = useDispatch();

  // STEP MANAGEMENT
  const [currentStep, setCurrentStep] = useState(1); // 1=Details, 2=Type, 3=Lessons/Units
  const [lessonType, setLessonType] = useState(null); // null, "direct", or "unit"
  const [curriculumCurrency, setCurriculumCurrency] = useState(currency);
  useEffect(() => {
    if (payoutCurrencies.length && !payoutCurrencies.includes(curriculumCurrency)) setCurriculumCurrency(payoutCurrencies[0]);
  }, [payoutCurrencies, curriculumCurrency]);

  const [curriculumData, setCurriculumData] = useState({
    title: "",
    description: "",
    price: "",
    category: null,
    isOnline: true,
    supportsInPerson: false,
    location: "",
    images: [],
    message: "Hi, your lesson is confirmed! Looking forward to working with you. I’ll review your goals ahead of the session so we can make the most of our time. If there’s anything specific you want to focus on or prepare, feel free to send it over in advance.",
  });

  const [units, setUnits] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [expandedLessons, setExpandedLessons] = useState({});
  const [showUnitModal, setShowUnitModal] = useState(false);
  const initialUnitFormState = { name: "", description: "", position: "1" };
  const [newUnitData, setNewUnitData] = useState(() => ({
    ...initialUnitFormState,
  }));
  const [showExistingLessonsModal, setShowExistingLessonsModal] =
    useState(false);

  const [curriculumAvailability, setCurriculumAvailability] = useState({
    calendar: null,
    calendarId: null,
    weeklyHours: [],
    dateSpecificHours: [],
  });

  const [coverImage, setCoverImage] = useState(null);

  const MAX_DESCRIPTION_LENGTH = 1200;
  const MIN_IMAGES_REQUIRED = 2;

  useEffect(() => {
    dispatch(getTeacherLessons({ page: 1, limit: 1000 }));
    dispatch(getCategories());
    dispatch(getLessonCalendarByUser());
  }, [dispatch]);

  const handleAvailabilityChange = useCallback((data) => {
    setCurriculumAvailability(data);
  }, []);

  // Handle cover image upload
  const handleCoverImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
    }
  };

  // STEP 1 VALIDATORS
  const isStep1Valid = () => {
    return (
      curriculumData.title.trim() &&
      curriculumData.description.trim() &&
      curriculumData.category &&
      (curriculumData.isOnline || curriculumData.supportsInPerson) &&
      (!curriculumData.supportsInPerson || curriculumData.location.trim()) &&
      curriculumData.images.length >= MIN_IMAGES_REQUIRED
    );
  };

  // STEP 2: Choose lesson type
  const handleChooseLessonType = (type) => {
    setLessonType(type);
  };

  const handleNextFromType = () => {
    if (lessonType) {
      setCurrentStep(3);
    }
  };

  // Navigate back from lesson/unit page
  const handleBackToType = () => {
    setLessonType(null);
    setCurrentStep(2);
  };

  const handleBackToDetails = () => {
    setCurrentStep(1);
  };

  // CURRICULUM DATA HANDLERS
  const handleCurriculumChange = (field, value) => {
    setCurriculumData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCurriculumImagesChange = (updatedImages) => {
    setCurriculumData((prev) => ({
      ...prev,
      images: updatedImages,
    }));
  };

  // UNIT HANDLERS
  const matchesUnit = (lesson, unitId) => {
    const normalizedUnitId = unitId ?? null;
    return (lesson.unitId ?? null) === normalizedUnitId;
  };

  const getNextLessonPosition = (unitId, currentLessons = lessons) => {
    const normalizedUnitId = unitId ?? null;
    const total = currentLessons.filter((lesson) =>
      matchesUnit(lesson, normalizedUnitId),
    ).length;
    return total + 1;
  };

  const normalizeLessonsForUnit = (lessonList, unitId) => {
    const normalizedUnitId = unitId ?? null;
    const sortedUnitLessons = lessonList
      .filter((lesson) => matchesUnit(lesson, normalizedUnitId))
      .sort((a, b) => a.position - b.position);
    return lessonList.map((lesson) => {
      if (!matchesUnit(lesson, normalizedUnitId)) return lesson;
      const index = sortedUnitLessons.findIndex(
        (item) => item.id === lesson.id,
      );
      return { ...lesson, position: index + 1 };
    });
  };

  const reorderLessonPositions = (lessonList, lessonId, newPosition) => {
    const targetLesson = lessonList.find((lesson) => lesson.id === lessonId);
    if (!targetLesson) return lessonList;

    const normalizedUnitId = targetLesson.unitId ?? null;
    const unitLessons = lessonList
      .filter((lesson) => matchesUnit(lesson, normalizedUnitId))
      .sort((a, b) => a.position - b.position);
    const withoutTarget = unitLessons.filter(
      (lesson) => lesson.id !== lessonId,
    );
    const clampedPosition = Math.min(
      Math.max(Number(newPosition) || 1, 1),
      withoutTarget.length + 1,
    );
    const reorderedUnitLessons = [...withoutTarget];
    reorderedUnitLessons.splice(clampedPosition - 1, 0, { ...targetLesson });

    const normalizedUnitLessons = reorderedUnitLessons.map((lesson, index) => ({
      ...lesson,
      position: index + 1,
    }));

    return lessonList.map((lesson) => {
      if (!matchesUnit(lesson, normalizedUnitId)) return lesson;
      const updated = normalizedUnitLessons.find(
        (unitLesson) => unitLesson.id === lesson.id,
      );
      return updated ? updated : lesson;
    });
  };

  const generateId = () => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 10);
  };

  const generateDurationOptions = () => {
    const options = [];
    for (let minutes = 30; minutes <= 240; minutes += 15) {
      const hours = minutes / 60;
      const displayHours = Math.floor(hours);
      const displayMinutes = (hours % 1) * 60;
      let label = "";
      if (displayMinutes === 0) {
        label = `${displayHours}h`;
      } else {
        label = `${displayHours}h ${displayMinutes}m`;
      }
      options.push({ value: label, label });
    }
    return options;
  };

  const durationOptions = generateDurationOptions();

  const formatImagesForState = (images = []) =>
    images.map((image) => ({
      id: generateId(),
      file: image.file ?? null,
      url: image.url ?? image,
    }));

  const createPreviewUrl = (file) => {
    if (
      typeof URL !== "undefined" &&
      typeof URL.createObjectURL === "function"
    ) {
      return URL.createObjectURL(file);
    }
    return "";
  };

  const revokePreviewUrl = (url) => {
    if (
      url &&
      url.startsWith("blob:") &&
      typeof URL !== "undefined" &&
      typeof URL.revokeObjectURL === "function"
    ) {
      URL.revokeObjectURL(url);
    }
  };

  const resetUnitForm = (position = "1") => {
    setNewUnitData({
      ...initialUnitFormState,
      position,
    });
  };

  const sortedUnits = [...units].sort((a, b) => a.position - b.position);

  const getLessonsForUnit = (unitId) => {
    return lessons
      .filter((l) => l.unitId === unitId)
      .sort((a, b) => a.position - b.position);
  };

  const getUnassignedLessons = () => {
    return lessons
      .filter((lesson) => matchesUnit(lesson, null))
      .sort((a, b) => a.position - b.position);
  };

  const getMaxPositionForUnit = (unitId) => {
    const unitLessons = lessons.filter((lesson) => matchesUnit(lesson, unitId));
    return unitLessons.length;
  };

  const handleSaveUnit = () => {
    if (!newUnitData.name.trim()) return;

    const desiredPosition = newUnitData.position
      ? Number(newUnitData.position)
      : units.length + 1;

    if (showUnitModal?.edit && showUnitModal.unitId) {
      const unitId = showUnitModal.unitId;
      setUnits((prevUnits) => {
        const existingUnit = prevUnits.find((unit) => unit.id === unitId);
        if (!existingUnit) return prevUnits;

        return prevUnits.map((unit) => {
          if (unit.id === unitId) {
            return {
              ...unit,
              name: newUnitData.name,
              description: newUnitData.description,
              position: desiredPosition,
            };
          }

          if (desiredPosition > existingUnit.position) {
            return unit.position > existingUnit.position &&
              unit.position <= desiredPosition
              ? { ...unit, position: unit.position - 1 }
              : unit;
          }

          if (desiredPosition < existingUnit.position) {
            return unit.position < existingUnit.position &&
              unit.position >= desiredPosition
              ? { ...unit, position: unit.position + 1 }
              : unit;
          }

          return unit;
        });
      });
    } else {
      setUnits((prevUnits) => {
        const newId = prevUnits.length
          ? Math.max(...prevUnits.map((unit) => unit.id)) + 1
          : 1;
        const adjustedUnits = prevUnits.map((unit) =>
          unit.position >= desiredPosition
            ? { ...unit, position: unit.position + 1 }
            : unit,
        );
        const newUnit = {
          id: newId,
          name: newUnitData.name,
          description: newUnitData.description,
          position: desiredPosition,
        };
        return [...adjustedUnits, newUnit];
      });
    }

    setShowUnitModal(false);
    resetUnitForm();
  };

  const handleUnitPositionChange = (unitId, newPosition) => {
    const desiredPosition = Number(newPosition);
    setUnits((prevUnits) => {
      const existingUnit = prevUnits.find((unit) => unit.id === unitId);
      if (!existingUnit) return prevUnits;
      if (existingUnit.position === desiredPosition) return prevUnits;

      return prevUnits.map((unit) => {
        if (unit.id === unitId) {
          return {
            ...unit,
            position: desiredPosition,
          };
        }

        if (desiredPosition > existingUnit.position) {
          return unit.position > existingUnit.position &&
            unit.position <= desiredPosition
            ? { ...unit, position: unit.position - 1 }
            : unit;
        }

        if (desiredPosition < existingUnit.position) {
          return unit.position < existingUnit.position &&
            unit.position >= desiredPosition
            ? { ...unit, position: unit.position + 1 }
            : unit;
        }

        return unit;
      });
    });
  };

  const handleDeleteUnit = (id) => {
    const unitToDelete = units.find((u) => u.id === id);
    const newUnits = units.filter((u) => u.id !== id);

    const reorderedUnits = newUnits.map((u) =>
      u.position > unitToDelete.position
        ? { ...u, position: u.position - 1 }
        : u,
    );

    const lessonsToKeep = lessons.filter((lesson) => lesson.unitId !== id);
    const lessonsToMove = lessons
      .filter((lesson) => lesson.unitId === id)
      .map((lesson, index) => ({
        ...lesson,
        unitId: null,
        position: getNextLessonPosition(null, lessonsToKeep) + index,
      }));
    const updatedLessons = normalizeLessonsForUnit(
      [...lessonsToKeep, ...lessonsToMove],
      null,
    );

    setUnits(reorderedUnits);
    setLessons(updatedLessons);
  };

  const handleAddLesson = (fromLessonId = null) => {
    const nextId = lessons.length
      ? Math.max(...lessons.map((l) => l.id)) + 1
      : 1;
    let newLesson;

    if (fromLessonId) {
      const existingLesson = lessons.find((l) => l.id === fromLessonId);
      if (!existingLesson) return;
      const unitId = existingLesson.unitId ?? null;
      newLesson = {
        id: nextId,
        title: existingLesson.title,
        unitId,
        position: getNextLessonPosition(unitId),
        description: existingLesson.description,
        images: formatImagesForState(existingLesson.images),
        duration: existingLesson.duration,
        price: existingLesson.price,
        isOnline: existingLesson.isOnline,
        location: existingLesson.location,
        category: existingLesson.category,
        isIndependent: existingLesson.isIndependent,
      };
    } else {
      newLesson = {
        id: nextId,
        title: `Lesson ${lessons.length + 1}`,
        unitId: null,
        position: getNextLessonPosition(null),
        description: "",
        images: [],
        duration: "",
        price: "",
        isOnline: true,
        location: "",
        category: curriculumData.category,
        isIndependent: false,
        availability: {
          weeklyAvailability: [],
          dateAvailability: [],
        },
      };
    }

    const updatedLessons = normalizeLessonsForUnit(
      [...lessons, newLesson],
      newLesson.unitId ?? null,
    );
    setLessons(updatedLessons);
    setExpandedLessons((prev) => ({
      ...prev,
      [newLesson.id]: true,
    }));
    return newLesson.id;
  };

  const handleAddLessonToUnit = (unitId) => {
    const nextId = lessons.length
      ? Math.max(...lessons.map((l) => l.id)) + 1
      : 1;
    const newLesson = {
      id: nextId,
      title: `Lesson ${lessons.length + 1}`,
      unitId,
      position: getNextLessonPosition(unitId),
      description: "",
      images: [],
      duration: "",
      price: "",
      isOnline: true,
      location: "",
      category: curriculumData.category,
      isIndependent: false,
      availability: {
        weeklyAvailability: [],
        dateAvailability: [],
      },
    };

    const updatedLessons = normalizeLessonsForUnit(
      [...lessons, newLesson],
      unitId ?? null,
    );
    setLessons(updatedLessons);
    setExpandedLessons((prev) => ({
      ...prev,
      [newLesson.id]: true,
    }));
    return newLesson.id;
  };

  const handleAddExistingLesson = (existingLesson) => {
    const newLesson = {
      id: Math.max(...lessons.map((l) => l.id), 0) + 1,
      _id: existingLesson._id,
      title: existingLesson.title,
      unitId: null,
      position: 1,
      description: existingLesson.description,
      coverImage: existingLesson.coverImage
        ? {
            id: existingLesson.coverImage._id || existingLesson.coverImage.public_id || Date.now(),
            url: existingLesson.coverImage.url,
            public_id: existingLesson.coverImage.public_id || null,
            file: null,
          }
        : null,
      images: formatImagesForState(existingLesson.images),
      duration: existingLesson.duration,
      price: existingLesson.price,
      isOnline:
        existingLesson.isOnline ??
        (existingLesson.location === "online" ? true : false),
      location: existingLesson.location || "",
      category: existingLesson.category || null,
      isIndependent: existingLesson.isIndependent || true,
      availability: {
        weeklyAvailability: [],
        dateAvailability: [],
      },
    };

    const targetUnitId = newLesson.unitId ?? null;
    newLesson.position = getNextLessonPosition(targetUnitId);

    const updatedLessons = normalizeLessonsForUnit(
      [...lessons, newLesson],
      targetUnitId,
    );

    setLessons(updatedLessons);
    setShowExistingLessonsModal(false);
    setExpandedLessons((prev) => ({
      ...prev,
      [newLesson.id]: true,
    }));
    return newLesson.id;
  };

  const handleLessonImageUpload = (lessonId, fileList) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);

    setLessons((prev) =>
      prev.map((lesson) => {
        if (lesson.id !== lessonId) return lesson;

        const existingImages = lesson.images ? [...lesson.images] : [];
        const newImages = files.map((file) => ({
          id: generateId(),
          file,
          url: createPreviewUrl(file),
        }));

        return {
          ...lesson,
          images: [...existingImages, ...newImages],
        };
      }),
    );

    if (lessonImageInputRef.current) {
      lessonImageInputRef.current.value = "";
    }
  };

  const handleLessonImageRemove = (lessonId, imageId) => {
    setLessons((prev) =>
      prev.map((lesson) => {
        if (lesson.id !== lessonId) return lesson;

        const imageToRemove = lesson.images?.find(
          (image) => image.id === imageId,
        );
        if (imageToRemove?.url) revokePreviewUrl(imageToRemove.url);

        return {
          ...lesson,
          images: (lesson.images || []).filter((image) => image.id !== imageId),
        };
      }),
    );
  };

  const handleLessonCoverImageUpload = (lessonId, file) => {
    if (!file) return;

    setLessons((prev) =>
      prev.map((lesson) => {
        if (lesson.id !== lessonId) return lesson;

        // Revoke old preview URL if exists
        if (lesson.coverImage?.url) {
          revokePreviewUrl(lesson.coverImage.url);
        }

        return {
          ...lesson,
          coverImage: {
            id: generateId(),
            file,
            url: createPreviewUrl(file),
          },
        };
      }),
    );
  };

  const handleLessonChange = (lessonId, field, value) => {
    if (field === "unitId") {
      const newUnitId = value ? Number(value) : null;
      setLessons((prev) => {
        const targetLesson = prev.find((lesson) => lesson.id === lessonId);
        if (!targetLesson) return prev;

        const previousUnitId = targetLesson.unitId ?? null;
        const otherLessons = prev.filter((lesson) => lesson.id !== lessonId);

        const updatedLesson = {
          ...targetLesson,
          unitId: newUnitId,
          position: getNextLessonPosition(newUnitId, otherLessons),
        };

        let updatedLessons = [...otherLessons, updatedLesson];
        updatedLessons = normalizeLessonsForUnit(
          updatedLessons,
          previousUnitId,
        );
        updatedLessons = normalizeLessonsForUnit(updatedLessons, newUnitId);

        return updatedLessons;
      });
    } else if (field === "position") {
      const newPosition = Number(value);
      setLessons((prev) => reorderLessonPositions(prev, lessonId, newPosition));
    } else if (field === "availability") {
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId ? { ...lesson, availability: value } : lesson,
        ),
      );
    } else {
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId ? { ...lesson, [field]: value } : lesson,
        ),
      );
    }
  };

  const handleCategoryChange = (lessonId, categoryId) => {
    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              category: lesson.category === categoryId ? null : categoryId,
            }
          : lesson,
      ),
    );
  };

  const handleDeleteLesson = (id) => {
    setLessons((prev) => {
      const lessonToDelete = prev.find((lesson) => lesson.id === id);
      const remainingLessons = prev.filter((lesson) => lesson.id !== id);
      if (!lessonToDelete) return remainingLessons;
      return normalizeLessonsForUnit(
        remainingLessons,
        lessonToDelete.unitId ?? null,
      );
    });
    setExpandedLessons((prev) => {
      const newExpanded = { ...prev };
      delete newExpanded[id];
      return newExpanded;
    });
  };

  const handleCreateCurriculum = async () => {
    // Validation
    if (!curriculumData.title.trim()) {
      alert("Please enter curriculum title");
      return;
    }

    if (!coverImage) {
      alert("Please upload a curriculum cover image");
      return;
    }

    if (!lessons || lessons.length < 2) {
      alert("Curriculum must have at least 2 lessons");
      return;
    }

    if (
      !curriculumData.images ||
      curriculumData.images.length < MIN_IMAGES_REQUIRED
    ) {
      alert(`Curriculum must have at least ${MIN_IMAGES_REQUIRED} images`);
      return;
    }

    const lessonsWithoutEnoughImages = lessons.filter(
      (lesson) => !lesson.images || lesson.images.length < MIN_IMAGES_REQUIRED,
    );
    if (lessonsWithoutEnoughImages.length > 0) {
      alert(`All lessons must have at least ${MIN_IMAGES_REQUIRED} images`);
      return;
    }

    const lessonsWithoutDescription = lessons.filter(
      (lesson) => !lesson.description || lesson.description.trim().length < 50,
    );
    if (lessonsWithoutDescription.length > 0) {
      alert("All lessons should have a description (at least 50 characters)");
      return;
    }

    const formData = new FormData();
    formData.append("title", curriculumData.title);
    formData.append("description", curriculumData.description);
    formData.append("price", curriculumData.price || 0);
    formData.append("inputCurrency", curriculumCurrency);
    formData.append("category", curriculumData.category || "");
    formData.append("isOnline", curriculumData.isOnline);
    formData.append("supportsInPerson", curriculumData.supportsInPerson);
    formData.append("message", curriculumData.message || "");
    if (curriculumData.supportsInPerson && curriculumData.location) {
      formData.append("location", curriculumData.location);
    }
    formData.append("totalLesson", lessons.length);

    // Add calendar data
    if (curriculumAvailability) {
      // Check if using default calendar
      if (curriculumAvailability.calendar === true) {
        formData.append("calender", true);
        if (curriculumAvailability.weeklyHours) {
          formData.append("weeklyHours", JSON.stringify(curriculumAvailability.weeklyHours));
        }
        if (curriculumAvailability.dateSpecificHours) {
          formData.append("dateSpecificHours", JSON.stringify(curriculumAvailability.dateSpecificHours));
        }
      }
      // Check if using existing calendar
      else if (curriculumAvailability.calendar === false && curriculumAvailability.calenderId) {
        formData.append("calender", false);
        formData.append("calenderId", curriculumAvailability.calenderId);
        if (curriculumAvailability.calendarName) {
          formData.append("calendarName", curriculumAvailability.calendarName);
        }
        if (curriculumAvailability.weeklyHours) {
          formData.append("weeklyHours", JSON.stringify(curriculumAvailability.weeklyHours));
        }
        if (curriculumAvailability.dateSpecificHours) {
          formData.append("dateSpecificHours", JSON.stringify(curriculumAvailability.dateSpecificHours));
        }
      }
      // Custom calendar (no calenderId means custom)
      else if (curriculumAvailability.calendar === false && !curriculumAvailability.calenderId) {
        formData.append("calender", false);
        if (curriculumAvailability.weeklyHours) {
          formData.append("weeklyHours", JSON.stringify(curriculumAvailability.weeklyHours));
        }
        if (curriculumAvailability.dateSpecificHours) {
          formData.append("dateSpecificHours", JSON.stringify(curriculumAvailability.dateSpecificHours));
        }
        if (curriculumAvailability.timeZone) {
          formData.append("timeZone", curriculumAvailability.timeZone);
        }
        if (curriculumAvailability.calendarName) {
          formData.append("calendarName", curriculumAvailability.calendarName);
        }
      }
    } else {
      formData.append("calender", false);
    }

    // Add cover image first, then other images
    if (coverImage) {
      formData.append("curriculumImages", coverImage);
    }

    if (curriculumData.images && curriculumData.images.length > 0) {
      curriculumData.images.forEach((image) => {
        if (image.file) {
          formData.append("curriculumImages", image.file);
        }
      });
    }

    const unitsData = sortedUnits.map((unit) => {
      const unitLessons = getLessonsForUnit(unit.id).map((lesson) => {
        const lessonData = {
          ...(lesson._id && { _id: lesson._id }),
          title: lesson.title,
          description: lesson.description,
          duration: lesson.duration,
          price: lesson.price,
          category: lesson.category,
          position: lesson.position,
          isIndependent: lesson.isIndependent,
          isOnline:
            lesson.isOnline ?? (lesson.location === "online" ? true : false),
        };

        if (!lessonData.isOnline && lesson.location) {
          lessonData.location = lesson.location;
        }

        if (lesson.availability) {
          lessonData.availability = lesson.availability;
        }

        return lessonData;
      });

      return {
        title: unit.name,
        description: unit.description,
        position: unit.position,
        isIndependent: false,
        lessons: unitLessons,
      };
    });

    const unassignedLessonsData = getUnassignedLessons().map((lesson) => {
      const lessonData = {
        ...(lesson._id && { _id: lesson._id }),
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        price: lesson.price,
        category: lesson.category,
        position: lesson.position,
        isIndependent: lesson.isIndependent,
        isOnline:
          lesson.isOnline ?? (lesson.location === "online" ? true : false),
      };

      if (!lessonData.isOnline && lesson.location) {
        lessonData.location = lesson.location;
      }

      if (lesson.availability) {
        lessonData.availability = lesson.availability;
      }

      return lessonData;
    });

    formData.append("units", JSON.stringify(unitsData));

    if (unassignedLessonsData.length > 0) {
      formData.append("lessons", JSON.stringify(unassignedLessonsData));
    }

    lessons.forEach((lesson) => {
      // Send lesson cover image separately (from the separate coverImage field)
      if (lesson.coverImage?.file) {
        formData.append(`lesson_${lesson.id}_cover`, lesson.coverImage.file);
      }
      // Send all lesson images (NOT including the first as cover anymore)
      if (lesson.images && lesson.images.length > 0) {
        lesson.images.forEach((image) => {
          if (image.file) {
            formData.append(`lesson_${lesson.id}`, image.file);
          }
        });
      }
    });

    try {
      await dispatch(createCurriculum(formData)).then((res) => {
        if (res?.payload.status) {
          toast.success(res?.payload.message);
          navigate(`/curriculum-booking/${res?.payload?.curriculumId}`);
        } else {
          toast.error(res?.payload.message);
        }
      });
    } catch (error) {
      console.error("Error creating curriculum:", error);
    }
  };

  // RENDER LOGIC
  return (
    <MainLayout className="mx-auto" width="1800px">
      <div className="min-h-screen bg-white py-10">
        <div className="w-full mx-auto px-4">
          {/* STEP 1: CURRICULUM DETAILS & CALENDAR */}
          {currentStep === 1 && (
            <Step1Details
              curriculumData={curriculumData}
              currency={curriculumCurrency}
              supportedCurrencies={payoutCurrencies}
              onCurrencyChange={setCurriculumCurrency}
              handleCurriculumChange={handleCurriculumChange}
              handleCurriculumImagesChange={handleCurriculumImagesChange}
              categories={categories}
              curriculumAvailability={curriculumAvailability}
              handleAvailabilityChange={handleAvailabilityChange}
              coverImage={coverImage}
              setCoverImage={setCoverImage}
              handleCoverImageUpload={handleCoverImageUpload}
              MAX_DESCRIPTION_LENGTH={MAX_DESCRIPTION_LENGTH}
              MIN_IMAGES_REQUIRED={MIN_IMAGES_REQUIRED}
              isStep1Valid={isStep1Valid}
              onNext={() => setCurrentStep(2)}
            />
          )}

          {/* STEP 2: CHOOSE LESSON TYPE */}
          {currentStep === 2 && (
            <Step2Type
              lessonType={lessonType}
              onChooseType={handleChooseLessonType}
              onBack={handleBackToDetails}
              onNext={handleNextFromType}
            />
          )}

          {/* STEP 3: LESSONS OR UNITS + LESSONS */}
          {currentStep === 3 && lessonType === "direct" && (
            <Step3DirectLessons
              lessons={lessons}
              currency={curriculumCurrency}
              expandedLessons={expandedLessons}
              setExpandedLessons={setExpandedLessons}
              handleAddLesson={handleAddLesson}
              handleAddExistingLesson={handleAddExistingLesson}
              handleLessonChange={handleLessonChange}
              handleCategoryChange={handleCategoryChange}
              handleDeleteLesson={handleDeleteLesson}
              handleLessonImageUpload={handleLessonImageUpload}
              handleLessonImageRemove={handleLessonImageRemove}
              handleLessonCoverImageUpload={handleLessonCoverImageUpload}
              Teacherlessons={Teacherlessons}
              categories={categories}
              durationOptions={durationOptions}
              MAX_DESCRIPTION_LENGTH={MAX_DESCRIPTION_LENGTH}
              MIN_IMAGES_REQUIRED={MIN_IMAGES_REQUIRED}
              lessonImageInputRef={lessonImageInputRef}
              onBack={handleBackToType}
              onSubmit={handleCreateCurriculum}
              loading={loading}
            />
          )}

          {currentStep === 3 && lessonType === "unit" && (
            <Step3Units
              units={units}
              currency={curriculumCurrency}
              sortedUnits={sortedUnits}
              lessons={lessons}
              expandedLessons={expandedLessons}
              setExpandedLessons={setExpandedLessons}
              showUnitModal={showUnitModal}
              setShowUnitModal={setShowUnitModal}
              newUnitData={newUnitData}
              setNewUnitData={setNewUnitData}
              handleSaveUnit={handleSaveUnit}
              handleDeleteUnit={handleDeleteUnit}
              handleUnitPositionChange={handleUnitPositionChange}
              resetUnitForm={resetUnitForm}
              getLessonsForUnit={getLessonsForUnit}
              getMaxPositionForUnit={getMaxPositionForUnit}
              getUnassignedLessons={getUnassignedLessons}
              handleAddLesson={handleAddLesson}
              handleAddLessonToUnit={handleAddLessonToUnit}
              handleAddExistingLesson={handleAddExistingLesson}
              handleLessonChange={handleLessonChange}
              handleCategoryChange={handleCategoryChange}
              handleDeleteLesson={handleDeleteLesson}
              handleLessonImageUpload={handleLessonImageUpload}
              handleLessonImageRemove={handleLessonImageRemove}
              handleLessonCoverImageUpload={handleLessonCoverImageUpload}
              Teacherlessons={Teacherlessons}
              showExistingLessonsModal={showExistingLessonsModal}
              setShowExistingLessonsModal={setShowExistingLessonsModal}
              categories={categories}
              durationOptions={durationOptions}
              MAX_DESCRIPTION_LENGTH={MAX_DESCRIPTION_LENGTH}
              MIN_IMAGES_REQUIRED={MIN_IMAGES_REQUIRED}
              lessonImageInputRef={lessonImageInputRef}
              onBack={handleBackToType}
              onSubmit={handleCreateCurriculum}
              loading={loading}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}

// STEP 1 COMPONENT
function Step1Details({
  curriculumData,
  currency,
  supportedCurrencies,
  onCurrencyChange,
  handleCurriculumChange,
  handleCurriculumImagesChange,
  categories,
  curriculumAvailability,
  handleAvailabilityChange,
  coverImage,
  setCoverImage,
  handleCoverImageUpload,
  MAX_DESCRIPTION_LENGTH,
  MIN_IMAGES_REQUIRED,
  isStep1Valid,
  onNext,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* LEFT COLUMN: CURRICULUM FORM */}
      <form className="space-y-6">
        {/* Title */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">
            Curriculum Title *
          </label>
          <input
            type="text"
            placeholder="Enter curriculum title"
            maxLength="300"
            value={curriculumData.title}
            onChange={(e) => handleCurriculumChange("title", e.target.value)}
            className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black"
          />
          <p className="text-xs text-gray-500 mt-1">
            {curriculumData.title.length}/300 characters
          </p>
        </div>

        {/* Description */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">
            Description *
          </label>
          <textarea
            placeholder="Enter curriculum description"
            value={curriculumData.description}
            onChange={(e) => {
              const text = e.target.value;
              if (
                text.length <= MAX_DESCRIPTION_LENGTH ||
                text.length < curriculumData.description.length
              ) {
                handleCurriculumChange("description", text);
              }
            }}
            rows="5"
            className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black resize-none"
          />
          <div className="flex justify-between text-xs mt-2">
            <div
              className={
                curriculumData.description.length >= 50
                  ? "text-green-600"
                  : "text-amber-600"
              }
            >
              {curriculumData.description.length >= 50
                ? "✓ Long enough"
                : `Minimum 50 characters (${curriculumData.description.length}/50)`}
            </div>
            <div
              className={
                curriculumData.description.length >= MAX_DESCRIPTION_LENGTH
                  ? "text-red-600 font-medium"
                  : "text-gray-500"
              }
            >
              {curriculumData.description.length}/{MAX_DESCRIPTION_LENGTH}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">
            Curriculum Price ({currency}) *
          </label>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <input
              type="number"
              placeholder="Enter price"
              value={curriculumData.price}
              onChange={(e) => handleCurriculumChange("price", e.target.value)}
              step="1"
              min="0"
              className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black"
            />
            <select
              value={currency}
              onChange={(event) => onCurrencyChange(event.target.value)}
              className="bg-white border border-[#DDDDDD] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black"
            >
              {supportedCurrencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">
            Category *
          </label>
          <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category._id}
                    type="button"
                    onClick={() =>
                      handleCurriculumChange(
                        "category",
                        curriculumData.category === category.name
                          ? null
                          : category.name,
                      )
                    }
                    className={`px-3 py-1 rounded-full border text-sm transition-all ${
                      curriculumData.category === category.name
                        ? "bg-black text-white border-black"
                        : "border-gray-400 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Loading categories...</p>
            )}
          </div>
        </div>

        {/* Curriculum Location */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">
            Curriculum Location *
          </label>
          <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={curriculumData.isOnline === true}
                  onChange={(e) =>
                    handleCurriculumChange("isOnline", e.target.checked)
                  }
                  className="w-4 h-4 accent-black"
                />
                <span className="text-sm text-gray-700">Online</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={curriculumData.supportsInPerson === true}
                  onChange={(e) =>
                    handleCurriculumChange("supportsInPerson", e.target.checked)
                  }
                  className="w-4 h-4 accent-black"
                />
                <span className="text-sm text-gray-700">In Person</span>
              </label>
            </div>

            {curriculumData.supportsInPerson === true && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Location Address
                </label>
                <input
                  type="text"
                  placeholder="Enter location address"
                  value={curriculumData.location}
                  onChange={(e) =>
                    handleCurriculumChange("location", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-[#DDDDDD] rounded-xl text-sm focus:outline-none focus:border-black"
                />
              </div>
            )}
          </div>
        </div>

        {/* Curriculum Cover Image */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">Curriculum Cover Image *</label>
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-center">
              {/* Upload Button */}
              <label className="flex items-center justify-center gap-2 text-gray-700 rounded-md px-4 py-2 text-base hover:bg-gray-50 cursor-pointer w-fit disabled:opacity-50 transition-colors">
                <span className="flex items-center gap-1 bg-[#DDDDDD] rounded-md p-2.5">
                  <GrUpload size={20} />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Image Preview */}
            {coverImage && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium text-gray-900">Preview</p>
                  <p className="text-xs text-gray-500">1/1 image</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="group relative w-24 h-24 border-2 border-gray-300 rounded-md overflow-hidden shadow-sm hover:border-blue-400 transition-all">
                    {/* Image */}
                    <img
                      src={URL.createObjectURL(coverImage)}
                      alt="cover-preview"
                      className="w-full h-full object-cover"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

                    {/* Delete Button */}
                    <div
                      onClick={() => setCoverImage(null)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete image"
                    >
                      ✕
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Curriculum Images */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">
            Curriculum Images *
          </label>
          <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
            <ImageUploader
              images={curriculumData.images || []}
              onImagesChange={handleCurriculumImagesChange}
              maxImages={10}
              minImages={MIN_IMAGES_REQUIRED}
              disabled={false}
              label="Upload Images (min 2, max 10)"
            />
          </div>
        </div>
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block text-sm font-semibold text-gray-900">
            Message *
          </label>
               <span className="text-sm text-gray-500 mb-2">Add a short message students will see after booking (e.g. what to prepare or expect).</span>
          <textarea
            name="message"
            rows="5"
            value={curriculumData.message}
            onChange={(e) => handleCurriculumChange("message", e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black disabled:bg-gray-100 disabled:opacity-50 resize-none"
          ></textarea>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={!isStep1Valid()}
          onClick={onNext}
          className="w-fit bg-black text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Next <ArrowRight size={16} />
        </button>
      </form>

      {/* RIGHT COLUMN: CALENDAR */}
      <div className="hidden lg:block">
        <div className="sticky top-10 h-fit">
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Curriculum Availability
            </h3>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            Set when curriculum lessons can be scheduled
          </p>

          <div onClick={(e) => e.stopPropagation()} className="space-y-4">
            <MakeAvailability
              onChange={handleAvailabilityChange}
              customOnly={false}
              isGroupAvailable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Calendar Section for Step 1
function Step1MobileCalendar({
  curriculumAvailability,
  handleAvailabilityChange,
}) {
  return (
    <div className="lg:hidden mt-12">
      <div className="space-y-4">
        <div className="flex items-center gap-1 mb-2">
          <h3 className="text-base font-semibold text-gray-900">
            Curriculum Availability
          </h3>
        </div>
        <p className="text-gray-500 text-sm">
          Set when curriculum lessons can be scheduled
        </p>

        <div onClick={(e) => e.stopPropagation()}>
          <MakeAvailability
            onChange={handleAvailabilityChange}
            customOnly={true}
            isGroupAvailable={false}
          />
        </div>
      </div>
    </div>
  );
}

// STEP 2 COMPONENT
function Step2Type({ lessonType, onChooseType, onBack, onNext }) {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="space-y-4">
        {/* Direct Lessons */}
        <button
          type="button"
          onClick={() => onChooseType("direct")}
          className={`w-full text-left rounded-2xl border px-5 py-4 transition-all ${
            lessonType === "direct"
              ? "border-black shadow-sm"
              : "border-[#DDDDDD] hover:border-gray-400"
          }`}
        >
          <h3 className="text-base font-semibold text-gray-900 mb-2">
            Direct Lesson Course
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            A simple course made of individual lessons with no grouping. Perfect
            for quick learning, standalone sessions, or flexible topics without
            a fixed structure.
          </p>
        </button>

        {/* Unit-Based */}
        <button
          type="button"
          onClick={() => onChooseType("unit")}
          className={`w-full text-left rounded-2xl border px-5 py-4 transition-all ${
            lessonType === "unit"
              ? "border-black shadow-sm"
              : "border-[#DDDDDD] hover:border-gray-400"
          }`}
        >
          <h3 className="text-base font-semibold text-gray-900 mb-2">
            Unit-Based Course
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            A structured course organized into units, each containing multiple
            lessons. Ideal for step-by-step learning where skills build
            progressively over time.
          </p>
        </button>
      </div>

      <div className="flex items-center justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!lessonType}
          className="px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          Next <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// STEP 3A: DIRECT LESSONS
function Step3DirectLessons({
  lessons,
  currency,
  expandedLessons,
  setExpandedLessons,
  handleAddLesson,
  handleAddExistingLesson,
  handleLessonChange,
  handleCategoryChange,
  handleDeleteLesson,
  handleLessonImageUpload,
  handleLessonImageRemove,
  handleLessonCoverImageUpload,
  Teacherlessons,
  categories,
  durationOptions,
  MAX_DESCRIPTION_LENGTH,
  MIN_IMAGES_REQUIRED,
  lessonImageInputRef,
  onBack,
  onSubmit,
  loading,
}) {
  const [selectedLessonId, setSelectedLessonId] = useState(
    lessons[0]?.id ?? null,
  );
  const [existingLessonId, setExistingLessonId] = useState("");

  useEffect(() => {
    if (!lessons.length) {
      setSelectedLessonId(null);
      return;
    }

    if (!lessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(lessons[0].id);
    }
  }, [lessons, selectedLessonId]);

  const sortedLessons = [...lessons].sort((a, b) => a.position - b.position);
  const selectedLesson = lessons.find(
    (lesson) => lesson.id === selectedLessonId,
  );
  const availableExistingLessons = Teacherlessons?.filter(
    (teacherLesson) =>
      !lessons.some((addedLesson) => addedLesson._id === teacherLesson._id),
  );

  const handleAddNewLesson = () => {
    const newId = handleAddLesson();
    if (newId) {
      setSelectedLessonId(newId);
    }
  };

  const handleExistingLessonSelect = (event) => {
    const lessonId = event.target.value;
    setExistingLessonId(lessonId);

    if (!lessonId) return;
    const existingLesson = availableExistingLessons?.find(
      (lesson) => lesson._id === lessonId,
    );
    if (existingLesson) {
      const newId = handleAddExistingLesson(existingLesson);
      if (newId) {
        setSelectedLessonId(newId);
      }
    }

    setExistingLessonId("");
  };

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
          </div>

          {sortedLessons.length === 0 ? (
            <div className="text-gray-500 text-center py-12 bg-[#F7F7F7] rounded-2xl border border-gray-100">
              No lessons yet. Add one to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedLessons.map((lesson) => {
                const previewImage = lesson.coverImage?.url || lesson.images?.[0]?.url;
                const isSelected = lesson.id === selectedLessonId;

                return (
                  <div
                    key={lesson.id}
                    className={`bg-[#F7F7F7] rounded-2xl p-4 transition-all ${
                      isSelected ? "border-black" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        {previewImage ? (
                          <img
                            src={previewImage}
                            alt="lesson"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-900">
                            Lesson {lesson.position}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedLessonId(lesson.id)}
                              className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-800 hover:bg-gray-300 transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">
                          {lesson.title || "Untitled lesson"}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {lesson.description || "Add a short description"}
                        </p>
                        <div className="grid grid-cols-2 items-center gap-3 mt-3">
                          <select
                            value={lesson.position}
                            onChange={(event) =>
                              handleLessonChange(
                                lesson.id,
                                "position",
                                event.target.value,
                              )
                            }
                            className=" px-3 py-2 border border-[#DDDDDD] rounded-lg text-sm bg-white focus:outline-none "
                          >
                            {Array.from({ length: sortedLessons.length }).map(
                              (_, i) => (
                                <option key={i} value={i + 1}>
                                  Position {i + 1}
                                </option>
                              ),
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={handleAddNewLesson}
                            className="px-4 py-2 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors"
                          >
                            Add a Lesson +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#F7F7F7] rounded-2xl p-5 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add a lesson
            </h3>
            <div className="space-y-3">
                     <button
                            type="button"
                            onClick={handleAddNewLesson}
                            className="w-full px-4 py-3 rounded-xl bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors"
                          >
                            Create a new lesson +
                          </button>
              <select
                value={existingLessonId}
                onChange={handleExistingLessonSelect}
                className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black"
              >
                <option value="">Choose from your existing lessons</option>
                {availableExistingLessons?.map((lesson) => (
                  <option key={lesson._id} value={lesson._id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedLesson ? (
            <LessonCard
              lesson={selectedLesson}
              unit={null}
              allUnits={[]}
              maxPosition={sortedLessons.length}
              expandedLessons={expandedLessons}
              setExpandedLessons={setExpandedLessons}
              handleLessonChange={handleLessonChange}
              handleCategoryChange={handleCategoryChange}
              handleDeleteLesson={handleDeleteLesson}
              handleLessonImageUpload={handleLessonImageUpload}
              handleLessonImageRemove={handleLessonImageRemove}
              handleLessonCoverImageUpload={handleLessonCoverImageUpload}
              allCategories={categories}
              durationOptions={durationOptions}
              MAX_DESCRIPTION_LENGTH={MAX_DESCRIPTION_LENGTH}
              MIN_IMAGES_REQUIRED={MIN_IMAGES_REQUIRED}
              lessonImageInputRef={lessonImageInputRef}
              currency={currency}
              forceExpanded={true}
              hideHeader={true}
            />
          ) : (
            <div className="bg-[#F7F7F7] rounded-2xl p-6 text-sm text-gray-600 border border-gray-100">
              Select a lesson to edit its details.
            </div>
          )}

          <div className="flex justify-between gap-4 pt-2">
            <button
              onClick={onBack}
              className="w-fit px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAddNewLesson}
                className=" px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                Add another lesson
              </button>
              <button
                onClick={onSubmit}
                disabled={loading || lessons.length < 2}
                className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? "Creating..." : "Create Curriculum"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// STEP 3B: UNITS + LESSONS
function Step3Units({
  units,
  currency,
  sortedUnits,
  lessons,
  expandedLessons,
  setExpandedLessons,
  showUnitModal,
  setShowUnitModal,
  newUnitData,
  setNewUnitData,
  handleSaveUnit,
  handleDeleteUnit,
  handleUnitPositionChange,
  resetUnitForm,
  getLessonsForUnit,
  getMaxPositionForUnit,
  getUnassignedLessons,
  handleAddLesson,
  handleAddLessonToUnit,
  handleAddExistingLesson,
  handleLessonChange,
  handleCategoryChange,
  handleDeleteLesson,
  handleLessonImageUpload,
  handleLessonImageRemove,
  handleLessonCoverImageUpload,
  Teacherlessons,
  showExistingLessonsModal,
  setShowExistingLessonsModal,
  categories,
  durationOptions,
  MAX_DESCRIPTION_LENGTH,
  MIN_IMAGES_REQUIRED,
  lessonImageInputRef,
  onBack,
  onSubmit,
  loading,
}) {
  const [selectedUnitId, setSelectedUnitId] = useState(
    sortedUnits[0]?.id ?? null,
  );
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [mode, setMode] = useState("unit");
  const [existingLessonId, setExistingLessonId] = useState("");

  useEffect(() => {
    if (sortedUnits.length && selectedUnitId == null && mode !== "unit") {
      setSelectedUnitId(sortedUnits[0].id);
    }
  }, [sortedUnits, selectedUnitId, mode]);

  useEffect(() => {
    if (selectedUnitId) {
      const unit = units.find((item) => item.id === selectedUnitId);
      if (unit) {
        setNewUnitData({
          name: unit.name,
          description: unit.description,
          position: String(unit.position),
        });
      }
    }
  }, [selectedUnitId, units, setNewUnitData]);

  const availableExistingLessons = Teacherlessons?.filter(
    (teacherLesson) =>
      !lessons.some((addedLesson) => addedLesson._id === teacherLesson._id),
  );

  const handleSelectUnit = (unit) => {
    setSelectedUnitId(unit.id);
    setSelectedLessonId(null);
    setMode("unit");
    setShowUnitModal({ edit: true, unitId: unit.id });
    setNewUnitData({
      name: unit.name,
      description: unit.description,
      position: String(unit.position),
    });
  };

  const handleSelectLesson = (lesson) => {
    setSelectedLessonId(lesson.id);
    setMode("lesson");
  };

  const handleAddUnitInline = () => {
    resetUnitForm(String(units.length + 1));
    setShowUnitModal({ edit: false, unitId: null });
    setSelectedUnitId(null);
    setSelectedLessonId(null);
    setMode("unit");
  };

  const handleAddLessonInline = (unitId = null) => {
    const newId = unitId ? handleAddLessonToUnit(unitId) : handleAddLesson();
    if (newId) {
      setSelectedLessonId(newId);
      setMode("lesson");
    }
  };

  const handleExistingLessonSelect = (event) => {
    const lessonId = event.target.value;
    setExistingLessonId(lessonId);

    if (!lessonId) return;
    const existingLesson = availableExistingLessons?.find(
      (lesson) => lesson._id === lessonId,
    );
    if (existingLesson) {
      const newId = handleAddExistingLesson(existingLesson);
      if (newId) {
        if (selectedUnitId) {
          handleLessonChange(newId, "unitId", selectedUnitId);
        }
        setSelectedLessonId(newId);
        setMode("lesson");
      }
    }

    setExistingLessonId("");
  };

  const selectedLesson = lessons.find(
    (lesson) => lesson.id === selectedLessonId,
  );

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
          </div>

          {sortedUnits.length === 0 && lessons.length === 0 ? (
            <div className="text-gray-500 text-center py-12 bg-[#F7F7F7] rounded-2xl border border-gray-100">
              No units or lessons yet. Add a unit to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedUnits.map((unit) => {
                const unitLessons = getLessonsForUnit(unit.id);
                const unitPreviewImage =
                  unitLessons?.[0]?.coverImage?.url || unitLessons?.[0]?.images?.[0]?.url;
                const isUnitSelected =
                  selectedUnitId === unit.id && mode === "unit";

                return (
                  <div key={`unit-${unit.id}`} className="space-y-3">
                    <div
                      className={`bg-[#F7F7F7] border rounded-2xl p-4 transition-all ${
                        isUnitSelected ? "border-black" : "border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-900">
                              Unit {unit.position}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectUnit(unit)}
                                className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-800 hover:bg-gray-300 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">
                            {unit.name || "Untitled unit"}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {unit.description || "Add a unit description"}
                          </p>
                          <div className="grid grid-cols-3 items-center gap-3 mt-3">
                            <select
                              value={String(unit.position)}
                              onChange={(event) =>
                                handleUnitPositionChange(
                                  unit.id,
                                  event.target.value,
                                )
                              }
                              className="flex-1 min-w-[160px] px-3 py-2 border border-[#DDDDDD] rounded-lg text-sm bg-white focus:outline-none focus:border-black"
                            >
                              {Array.from({ length: units.length }).map(
                                (_, i) => (
                                  <option key={i} value={String(i + 1)}>
                                    Position {i + 1}
                                  </option>
                                ),
                              )}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAddLessonInline(unit.id)}
                              className="px-4 py-2 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors"
                            >
                              Add a Lesson +
                            </button>
                            <button
                              type="button"
                              onClick={handleAddUnitInline}
                              className="px-4 py-2 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors"
                            >
                              Add a Unit +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pl-6 border-l border-[#DDDDDD]">
                      {unitLessons.map((lesson) => {
                        const previewImage = lesson.coverImage?.url || lesson.images?.[0]?.url;
                        const isSelected =
                          selectedLessonId === lesson.id && mode === "lesson";

                        return (
                          <div
                            key={lesson.id}
                            className={`bg-[#F7F7F7] border rounded-2xl p-4 transition-all ${
                              isSelected ? "border-black" : "border-transparent"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-[100px] h-[100px] rounded bg-gray-100 overflow-hidden flex-shrink-0">
                                {previewImage ? (
                                  <img
                                    src={previewImage}
                                    alt="lesson"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100" />
                                )}
                              </div>
                              <div className="flex flex-col justify-between flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="px-4 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-900">
                                    Lesson {lesson.position}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectLesson(lesson)}
                                      className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-800 hover:bg-gray-300 transition-colors"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">
                                  {lesson.title || "Untitled lesson"}
                                </p>
                                <div className="grid grid-cols-3 items-center gap-3 mt-3">
                                  <select
                                    value={lesson.position}
                                    onChange={(event) =>
                                      handleLessonChange(
                                        lesson.id,
                                        "position",
                                        event.target.value,
                                      )
                                    }
                                    className="flex-1 min-w-[140px] px-3 py-2 border border-[#DDDDDD] rounded-lg text-sm bg-white focus:outline-none focus:border-black"
                                  >
                                    {Array.from({
                                      length: unitLessons.length,
                                    }).map((_, i) => (
                                      <option key={i} value={i + 1}>
                                        Position {i + 1}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAddLessonInline(unit.id)
                                    }
                                    className="px-4 py-2 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors"
                                  >
                                    Add a Lesson +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleAddUnitInline}
                                    className="px-4 py-2 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors"
                                  >
                                    Add a Unit +
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {mode === "unit" ? (
            <div className="bg-[#F7F7F7] rounded-2xl p-6 border border-gray-100 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Add a Unit
              </h3>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Unit Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter unit name"
                  value={newUnitData.name}
                  onChange={(e) =>
                    setNewUnitData({ ...newUnitData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {newUnitData.name.length}/300
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Enter unit description"
                  value={newUnitData.description}
                  onChange={(e) =>
                    setNewUnitData({
                      ...newUnitData,
                      description: e.target.value,
                    })
                  }
                  rows="4"
                  className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {newUnitData.description.length} characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Position in the curriculum
                </label>
                <select
                  value={newUnitData.position}
                  onChange={(e) =>
                    setNewUnitData({ ...newUnitData, position: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black"
                >
                  {Array.from({
                    length: showUnitModal?.edit
                      ? units.length
                      : units.length + 1,
                  }).map((_, i) => (
                    <option key={i} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveUnit}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors"
                >
                  {showUnitModal?.edit ? "Update Unit" : "Create Unit"}
                </button>
                {showUnitModal?.edit && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteUnit(showUnitModal.unitId);
                      resetUnitForm(String(units.length));
                      setSelectedUnitId(null);
                    }}
                    className="px-4 py-3 border border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-[#F7F7F7] rounded-2xl p-5 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add a lesson
                </h3>
                <div className="space-y-3">
                  <select
                    value={existingLessonId}
                    onChange={handleExistingLessonSelect}
                    className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black"
                  >
                    <option value="">Choose from your existing lessons</option>
                    {availableExistingLessons?.map((lesson) => (
                      <option key={lesson._id} value={lesson._id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Lesson name"
                    value={selectedLesson?.title || ""}
                    onChange={(event) =>
                      selectedLesson &&
                      handleLessonChange(
                        selectedLesson.id,
                        "title",
                        event.target.value,
                      )
                    }
                    className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {selectedLesson ? (
                <LessonCard
                  lesson={selectedLesson}
                  unit={null}
                  allUnits={sortedUnits}
                  maxPosition={getMaxPositionForUnit(selectedLesson.unitId)}
                  expandedLessons={expandedLessons}
                  setExpandedLessons={setExpandedLessons}
                  handleLessonChange={handleLessonChange}
                  handleCategoryChange={handleCategoryChange}
                  handleDeleteLesson={handleDeleteLesson}
                  handleLessonImageUpload={handleLessonImageUpload}
                  handleLessonImageRemove={handleLessonImageRemove}
                  handleLessonCoverImageUpload={handleLessonCoverImageUpload}
                  allCategories={categories}
                  durationOptions={durationOptions}
                  MAX_DESCRIPTION_LENGTH={MAX_DESCRIPTION_LENGTH}
                  MIN_IMAGES_REQUIRED={MIN_IMAGES_REQUIRED}
                  lessonImageInputRef={lessonImageInputRef}
                  currency={currency}
                  forceExpanded={true}
                  hideHeader={true}
                />
              ) : (
                <div className="bg-[#F7F7F7] rounded-2xl p-6 text-sm text-gray-600 border border-gray-100">
                  Select a lesson to edit its details.
                </div>
              )}
            </>
          )}

          <div className="flex justify-between gap-4 pt-2">
            <button
              onClick={onBack}
              className=" px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddUnitInline}
                className=" px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                Add another Unit
              </button>
              <button
                onClick={() => handleAddLessonInline(selectedUnitId)}
                className=" px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                Add another lesson
              </button>
              <button
                onClick={onSubmit}
                disabled={loading || lessons.length < 2}
                className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? "Publishing..." : "Publish"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// LESSON CARD COMPONENT (reusable) - Matching CreateLesson UI
function LessonCard({
  lesson,
  unit,
  allUnits,
  maxPosition,
  expandedLessons,
  setExpandedLessons,
  handleLessonChange,
  handleCategoryChange,
  handleDeleteLesson,
  handleLessonImageUpload,
  handleLessonImageRemove,
  handleLessonCoverImageUpload,
  allCategories,
  durationOptions,
  MAX_DESCRIPTION_LENGTH = 1200,
  MIN_IMAGES_REQUIRED = 2,
  lessonImageInputRef,
  currency,
  forceExpanded = false,
  hideHeader = false,
}) {
  const isExpanded = forceExpanded ? true : expandedLessons[lesson.id];
  // For existing lessons, coverImage is separate; for new lessons use images array
  const lessonImages = lesson.images || [];
  const positionOptionCount = Math.max(maxPosition, 1);

  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    if (
      text.length <= MAX_DESCRIPTION_LENGTH ||
      text.length < lesson.description.length
    ) {
      handleLessonChange(lesson.id, "description", text);
    }
  };

  return (
    <div className="bg-[#F7F7F7] rounded-2xl border border-gray-100 overflow-hidden">
      {!hideHeader && (
        <div
          className="flex items-center justify-between p-4 bg-gray-100 border-b border-[#DDDDDD] cursor-pointer hover:bg-gray-150 transition-colors"
          onClick={(e) => {
            if (
              !e.target.closest(
                'input, button, select, textarea, [role="button"]',
              )
            ) {
              setExpandedLessons((prev) => ({
                ...prev,
                [lesson.id]: !prev[lesson.id],
              }));
            }
          }}
        >
          <div>
            <p className="text-xs text-gray-600 mb-0.5">
              {unit
                ? `Unit ${unit.position} - Pos ${lesson.position}`
                : `Pos ${lesson.position}`}
            </p>
            <h4 className="font-semibold text-sm text-gray-900">
              {lesson.title || "Untitled Lesson"}
            </h4>
          </div>
          {isExpanded ? (
            <ChevronUp size={18} className="text-gray-600" />
          ) : (
            <ChevronDown size={18} className="text-gray-600" />
          )}
        </div>
      )}

      {isExpanded && (
        <div
          className="p-4 bg-white space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Lesson Title *
            </label>
            <input
              type="text"
              placeholder="Enter lesson title"
              maxLength="300"
              value={lesson.title}
              onChange={(e) =>
                handleLessonChange(lesson.id, "title", e.target.value)
              }
              className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              {lesson.title.length}/300 characters
            </p>
          </div>

          {/* Description */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Description *
            </label>
            <textarea
              placeholder="Enter lesson description"
              value={lesson.description}
              onChange={handleDescriptionChange}
              rows="5"
              className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black resize-none"
            />
            <div className="flex justify-between text-xs mt-2">
              <div
                className={
                  lesson.description.length >= 50
                    ? "text-green-600"
                    : "text-amber-600"
                }
              >
                {lesson.description.length >= 50
                  ? "✓ Long enough"
                  : `Minimum 50 characters (${lesson.description.length}/50)`}
              </div>
              <div
                className={
                  lesson.description.length >= MAX_DESCRIPTION_LENGTH
                    ? "text-red-600 font-medium"
                    : "text-gray-500"
                }
              >
                {lesson.description.length}/{MAX_DESCRIPTION_LENGTH}
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Lesson Duration *
            </label>
            <select
              value={lesson.duration}
              onChange={(e) =>
                handleLessonChange(lesson.id, "duration", e.target.value)
              }
              className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black"
            >
              <option value="">Select duration</option>
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Independent */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Independent Lesson
            </label>
            <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lesson.isIndependent === true}
                  onChange={(e) =>
                    handleLessonChange(
                      lesson.id,
                      "isIndependent",
                      e.target.checked,
                    )
                  }
                  className="w-4 h-4 accent-black"
                />
                <span className="text-sm text-gray-700">
                  Mark this lesson as independent
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                When enabled, this lesson can be taken independently without
                completing previous lessons
              </p>
            </div>
          </div>

          {/* Price - Only show if Independent */}
          {lesson.isIndependent && (
            <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
              <label className="block mb-2 text-sm font-semibold text-gray-900">
                Lesson price ({currency})
              </label>
              <input
                type="number"
                placeholder="Enter price"
                value={lesson.price}
                onChange={(e) =>
                  handleLessonChange(lesson.id, "price", e.target.value)
                }
                step="1"
                min="0"
                className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black"
              />
            </div>
          )}

          {/* Lesson Cover Image (First image index 0) */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Lesson Cover Image *
            </label>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-center">
                {/* Upload Button */}
                <label className="flex items-center justify-center gap-2 text-gray-700 rounded-md px-4 py-2 text-base hover:bg-gray-50 cursor-pointer w-fit disabled:opacity-50 transition-colors">
                  <span className="flex items-center gap-1 bg-[#DDDDDD] rounded-md p-2.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 6a3 3 0 013-3h10a1 1 0 01.707.293l-1.414 1.414A1 1 0 0010 4H6a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1h-.5a1 1 0 00-1 1v5.586l-5.293-5.293a1 1 0 00-1.414 0l-2 2A1 1 0 003 8v10a3 3 0 003 3h10a3 3 0 003-3V6a3 3 0 00-3-3H6a3 3 0 00-3 3z"/>
                    </svg>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleLessonCoverImageUpload(lesson.id, file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Image Preview */}
              {lesson.coverImage && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-gray-900">Preview</p>
                    <p className="text-xs text-gray-500">1/1 image</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="group relative w-24 h-24 border-2 border-gray-300 rounded-md overflow-hidden shadow-sm hover:border-blue-400 transition-all">
                      {/* Image */}
                      <img
                        src={lesson.coverImage.url}
                        alt="cover-preview"
                        className="w-full h-full object-cover"
                      />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

                      {/* Delete Button */}
                      <div
                        onClick={() => {
                          handleLessonChange(lesson.id, 'coverImage', null);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete image"
                      >
                        ✕
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lesson Images */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Lesson Images * (min {MIN_IMAGES_REQUIRED})
            </label>
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center">
              <div className="flex flex-wrap gap-3 p-3 w-full bg-gray-50 rounded-lg border border-[#DDDDDD]">
                {lessonImages.map((image, i) => (
                  <div
                    key={image.id ?? i}
                    className="group relative w-24 h-24 rounded-lg overflow-hidden bg-white border border-[#DDDDDD] shadow-sm hover:border-blue-400 transition-all"
                  >
                    <img
                      src={image.url}
                      alt={`lesson-${i}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() =>
                        handleLessonImageRemove(lesson.id, image.id)
                      }
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100"
                      title="Delete image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-2xl cursor-pointer hover:border-black bg-gray-50 hover:bg-gray-100 transition-colors group">
                  <span className="text-gray-400 group-hover:text-gray-600">+</span>
                  <input
                    ref={lessonImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      handleLessonImageUpload(lesson.id, e.target.files)
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Lesson Location */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Lesson Location *
            </label>
            <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lesson.isOnline === true}
                    onChange={(e) =>
                      handleLessonChange(
                        lesson.id,
                        "isOnline",
                        e.target.checked,
                      )
                    }
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-sm text-gray-700">Online</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lesson.isOnline === false}
                    onChange={(e) =>
                      handleLessonChange(
                        lesson.id,
                        "isOnline",
                        !e.target.checked,
                      )
                    }
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-sm text-gray-700">In Person</span>
                </label>
              </div>

              {lesson.isOnline === false && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location Address
                  </label>
                  <input
                    type="text"
                    placeholder="Enter location address"
                    value={lesson.location || ""}
                    onChange={(e) =>
                      handleLessonChange(lesson.id, "location", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-[#DDDDDD] rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Unit Assignment */}
          {allUnits && allUnits.length > 0 && (
            <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
              <label className="block mb-2 text-sm font-semibold text-gray-900">
                Assign to Unit
              </label>
              <select
                value={lesson.unitId || ""}
                onChange={(e) =>
                  handleLessonChange(
                    lesson.id,
                    "unitId",
                    e.target.value || null,
                  )
                }
                className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black"
              >
                <option value="">Without Unit</option>
                {allUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.position}: {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Position */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Position
            </label>
            <select
              value={lesson.position}
              onChange={(e) =>
                handleLessonChange(lesson.id, "position", e.target.value)
              }
              className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-black"
            >
              {Array.from({ length: positionOptionCount }).map((_, i) => (
                <option key={i} value={i + 1}>
                  Position {i + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              Category *
            </label>
            <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => handleCategoryChange(lesson.id, cat.name)}
                    className={`px-3 py-1 rounded-full text-sm border transition-all ${lesson.category === cat.name ? "bg-black text-white border-black" : "border-gray-400 text-gray-700 hover:bg-gray-100"}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => handleDeleteLesson(lesson.id)}
            className="w-full px-4 py-3 border-2 border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Delete Lesson
          </button>
        </div>
      )}
    </div>
  );
}
