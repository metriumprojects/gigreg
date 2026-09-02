import { useEffect, useState, useRef, useCallback } from "react"
import { ChevronDown, ChevronUp, ArrowLeft, ArrowRight, Loader, Info, Trash2, Menu, X } from "lucide-react"
import { GrUpload } from "react-icons/gr"
import MainLayout from "../../../components/MainLayout"
import { useDispatch, useSelector } from "react-redux"
import { useParams, useNavigate } from "react-router-dom"
import { getTeacherLessons } from "../../../redux/reducers/LessonReducer"
import { getSingleCurriculum, updateCurriculum, deleteCurriculum } from "../../../redux/reducers/CurriculumReducer"
import { getCategories } from "../../../redux/reducers/CategoryReducer"
import { getCurriculumAvailability, updateCalendar, getLessonCalendarById, getLessonCalendarByUser } from "../../../redux/reducers/AvailabilityReducer"
import MakeAvailability from "../../../components/MakeAvailability"
import ImageUploader from "../../../components/ImageUploader"
import { toast } from "react-toastify"
import { useCurrency } from "../../../currency/CurrencyContext"

export default function EditCurriculum() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lessonImageInputRef = useRef(null)
  const { currency, convertFromUsd } = useCurrency()

  const { Teacherlessons } = useSelector((state) => state.lesson)
  const { categories } = useSelector((state) => state.category)
  const { loading, singleCurriculum } = useSelector((state) => state.curriculum)
  const { curriculumWeeklyAvailability, curriculumDateAvailability, weeklyAvailability, dateAvailability, updateCalendarLoading } = useSelector((state) => state.availability || {})
  const dispatch = useDispatch()

  const [currentStep, setCurrentStep] = useState(1)
  const [lessonType, setLessonType] = useState(null)

  const [curriculumData, setCurriculumData] = useState({
    title: "",
    description: "",
    price: "",
    category: null,
    isOnline: true,
    supportsInPerson: false,
    location: "",
    images: [],
    message: "",
  })

  const [units, setUnits] = useState([])
  const [lessons, setLessons] = useState([])
  const [expandedLessons, setExpandedLessons] = useState({})

  const initialUnitFormState = { name: "", description: "", position: "1" }
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [newUnitData, setNewUnitData] = useState(() => ({ ...initialUnitFormState }))

  const [displayCalendarData, setDisplayCalendarData] = useState({ weeklyAvailability: {}, dateAvailability: [] })
  const [isCalendarLoading, setIsCalendarLoading] = useState(false)
  const [editedAvailabilityData, setEditedAvailabilityData] = useState(null)

  const [coverImage, setCoverImage] = useState(null)
  const [existingCoverImage, setExistingCoverImage] = useState(null)

  const MAX_DESCRIPTION_LENGTH = 1200
  const MIN_IMAGES_REQUIRED = 2

  useEffect(() => {
    dispatch(getTeacherLessons({ page: 1, limit: 1000 }))
    dispatch(getCategories())
    dispatch(getLessonCalendarByUser())
    if (id) dispatch(getSingleCurriculum(id))
  }, [dispatch, id])

  useEffect(() => {
    if (singleCurriculum && singleCurriculum._id === id) {
      // Load cover image and other images separately
      const coverImageArray = singleCurriculum.coverImage ? [singleCurriculum.coverImage] : []
      const otherImages = singleCurriculum.images || []
      const allImages = [...coverImageArray, ...otherImages]
      
      // Set existing cover image
      if (singleCurriculum.coverImage) {
        setExistingCoverImage(singleCurriculum.coverImage)
      }
      
      setCurriculumData({
        title: singleCurriculum.title || "",
        description: singleCurriculum.description || "",
        price: singleCurriculum.price !== undefined ? convertFromUsd(singleCurriculum.price) : "",
        category: singleCurriculum.category || null,
        isOnline: singleCurriculum.isOnline !== false,
        supportsInPerson: singleCurriculum.supportsInPerson || false,
        location: singleCurriculum.location || "",
        images: formatImagesForState(allImages),
        message: singleCurriculum.message || "",
      })

      if (singleCurriculum.units && singleCurriculum.units.length > 0) {
        setLessonType("unit")
        const formattedUnits = singleCurriculum.units.map((unit) => ({
          id: unit._id || unit.id,
          _id: unit._id,
          name: unit.title,
          description: unit.description || "",
          position: unit.position,
        }))
        setUnits(formattedUnits)
      } else {
        setLessonType("direct")
      }

      const allLessons = []
      if (singleCurriculum.units && singleCurriculum.units.length > 0) {
        singleCurriculum.units.forEach((unit) => {
          if (unit.lessons && unit.lessons.length > 0) {
            unit.lessons.forEach((lesson) => {
              allLessons.push({
                id: lesson._id,
                _id: lesson._id,
                title: lesson.title,
                unitId: unit._id,
                position: lesson.position || 1,
                description: lesson.description || "",
                coverImage: lesson.coverImage
                  ? {
                      id: lesson.coverImage._id || lesson.coverImage.public_id || lesson._id,
                      url: lesson.coverImage.url,
                      public_id: lesson.coverImage.public_id || null,
                      file: null,
                    }
                  : null,
                images: formatImagesForState(lesson.images || []),
                duration: lesson.duration || "",
                price: lesson.price !== undefined ? convertFromUsd(lesson.price) : "",
                isOnline: lesson.isOnline !== false,
                location: lesson.location || "",
                category: lesson.category || null,
                isIndependent: lesson.isIndependent !== false,
              })
            })
          }
        })
      }
      if (singleCurriculum.lessonPosition && singleCurriculum.lessonPosition.length > 0) {
        singleCurriculum.lessonPosition.forEach((lessonPos) => {
          if ((lessonPos.unitPosition === null || lessonPos.unitPosition === undefined) && lessonPos.lId) {
            const lesson = lessonPos.lId
            const alreadyAdded = allLessons.some((l) => l._id === lesson._id)
            if (!alreadyAdded) {
              allLessons.push({
                id: lesson._id,
                _id: lesson._id,
                title: lesson.title,
                unitId: null,
                position: lessonPos.position || 1,
                description: lesson.description || "",
                coverImage: lesson.coverImage
                  ? {
                      id: lesson.coverImage._id || lesson.coverImage.public_id || lesson._id,
                      url: lesson.coverImage.url,
                      public_id: lesson.coverImage.public_id || null,
                      file: null,
                    }
                  : null,
                images: formatImagesForState(lesson.images || []),
                duration: lesson.duration || "",
                price: lesson.price || "",
                isOnline: lesson.isOnline !== false,
                location: lesson.location || "",
                category: lesson.category || null,
                isIndependent: lesson.isIndependent !== false,
              })
            }
          }
        })
      }
      if (allLessons.length > 0) setLessons(allLessons)

      if (singleCurriculum.calenderId) {
        setIsCalendarLoading(true)
        dispatch(getLessonCalendarById({ id: singleCurriculum.calenderId }))
      }
    }
  }, [singleCurriculum, id, dispatch, convertFromUsd])

  useEffect(() => {
    if (singleCurriculum?.calenderId) {
      setDisplayCalendarData({
        weeklyAvailability: weeklyAvailability || {},
        dateAvailability: dateAvailability || [],
      })
      setIsCalendarLoading(false)
    }
  }, [weeklyAvailability, dateAvailability, singleCurriculum?.calenderId])

  // ───── Helpers ─────
  const generateId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
    return Math.random().toString(36).slice(2, 10)
  }

  const generateDurationOptions = () => {
    const options = []
    for (let minutes = 30; minutes <= 240; minutes += 15) {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      const label = m === 0 ? `${h}h` : `${h}h ${m}m`
      options.push({ value: label, label })
    }
    return options
  }
  const durationOptions = generateDurationOptions()

  const formatImagesForState = (images = []) =>
    images.map((image) => ({
      id: generateId(),
      file: image.file ?? null,
      url: image.url ?? image,
      public_id: image.public_id ?? null,
    }))

  const createPreviewUrl = (file) => {
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") return URL.createObjectURL(file)
    return ""
  }

  const revokePreviewUrl = (url) => {
    if (url && url.startsWith("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function")
      URL.revokeObjectURL(url)
  }

  const matchesUnit = (lesson, unitId) => {
    const norm = unitId ?? null
    const lessonUnitId = lesson.unitId ?? null
    if (norm === null && lessonUnitId === null) return true
    if (norm === null || lessonUnitId === null) return false
    return String(lessonUnitId) === String(norm)
  }

  const getNextLessonPosition = (unitId, currentLessons = lessons) => {
    return currentLessons.filter((l) => matchesUnit(l, unitId ?? null)).length + 1
  }

  const normalizeLessonsForUnit = (lessonList, unitId) => {
    const norm = unitId ?? null
    const sorted = lessonList.filter((l) => matchesUnit(l, norm)).sort((a, b) => a.position - b.position)
    return lessonList.map((lesson) => {
      if (!matchesUnit(lesson, norm)) return lesson
      const idx = sorted.findIndex((item) => item.id === lesson.id)
      return { ...lesson, position: idx + 1 }
    })
  }

  const reorderLessonPositions = (lessonList, lessonId, newPosition) => {
    const target = lessonList.find((l) => l.id === lessonId)
    if (!target) return lessonList
    const norm = target.unitId ?? null
    const unitLessons = lessonList.filter((l) => matchesUnit(l, norm)).sort((a, b) => a.position - b.position)
    const without = unitLessons.filter((l) => l.id !== lessonId)
    const clamped = Math.min(Math.max(Number(newPosition) || 1, 1), without.length + 1)
    const reordered = [...without]
    reordered.splice(clamped - 1, 0, { ...target })
    const normalized = reordered.map((l, i) => ({ ...l, position: i + 1 }))
    return lessonList.map((l) => {
      if (!matchesUnit(l, norm)) return l
      const updated = normalized.find((u) => u.id === l.id)
      return updated ? updated : l
    })
  }

  const resetUnitForm = (position = "1") => setNewUnitData({ ...initialUnitFormState, position })

  const sortedUnits = [...units].sort((a, b) => a.position - b.position)

  const getLessonsForUnit = (unitId) =>
    lessons
      .filter((l) => {
        if (unitId === null || unitId === undefined) return l.unitId === null || l.unitId === undefined
        return String(l.unitId) === String(unitId) || l.unitId === unitId
      })
      .sort((a, b) => a.position - b.position)

  const getUnassignedLessons = () =>
    lessons.filter((l) => matchesUnit(l, null)).sort((a, b) => a.position - b.position)

  const getMaxPositionForUnit = (unitId) => lessons.filter((l) => matchesUnit(l, unitId)).length

  // ───── Step 1 validation ─────
  const isStep1Valid = () =>
    curriculumData.title.trim() &&
    curriculumData.description.trim() &&
    curriculumData.category &&
    (curriculumData.isOnline || curriculumData.supportsInPerson) &&
    (!curriculumData.supportsInPerson || curriculumData.location.trim()) &&
    curriculumData.images.length >= MIN_IMAGES_REQUIRED

  const handleCurriculumChange = (field, value) =>
    setCurriculumData((prev) => ({ ...prev, [field]: value }))

  const handleCurriculumImagesChange = (updatedImages) =>
    setCurriculumData((prev) => ({ ...prev, images: updatedImages }))

  const handleCoverImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverImage(file)
    }
  }

  // ───── Unit handlers ─────
  const handleSaveUnit = () => {
    if (!newUnitData.name.trim()) return
    const desiredPosition = Number(newUnitData.position) || units.length + 1
    if (showUnitModal?.edit && showUnitModal.unitId) {
      const unitId = showUnitModal.unitId
      setUnits((prev) => {
        const existing = prev.find((u) => u.id === unitId)
        if (!existing) return prev
        return prev.map((u) => {
          if (u.id === unitId) return { ...u, name: newUnitData.name, description: newUnitData.description, position: desiredPosition }
          if (desiredPosition > existing.position)
            return u.position > existing.position && u.position <= desiredPosition ? { ...u, position: u.position - 1 } : u
          if (desiredPosition < existing.position)
            return u.position < existing.position && u.position >= desiredPosition ? { ...u, position: u.position + 1 } : u
          return u
        })
      })
    } else {
      setUnits((prev) => {
        const newId = prev.length ? Math.max(...prev.map((u) => (typeof u.id === "number" ? u.id : 0))) + 1 : 1
        const adjusted = prev.map((u) => (u.position >= desiredPosition ? { ...u, position: u.position + 1 } : u))
        return [...adjusted, { id: newId, name: newUnitData.name, description: newUnitData.description, position: desiredPosition }]
      })
    }
    setShowUnitModal(false)
    resetUnitForm()
  }

  const handleUnitPositionChange = (unitId, newPosition) => {
    const desired = Number(newPosition)
    setUnits((prev) => {
      const existing = prev.find((u) => u.id === unitId)
      if (!existing || existing.position === desired) return prev
      return prev.map((u) => {
        if (u.id === unitId) return { ...u, position: desired }
        if (desired > existing.position)
          return u.position > existing.position && u.position <= desired ? { ...u, position: u.position - 1 } : u
        return u.position < existing.position && u.position >= desired ? { ...u, position: u.position + 1 } : u
      })
    })
  }

  const handleDeleteUnit = (unitId) => {
    const toDelete = units.find((u) => u.id === unitId)
    const newUnits = units.filter((u) => u.id !== unitId).map((u) =>
      u.position > toDelete.position ? { ...u, position: u.position - 1 } : u
    )
    const keep = lessons.filter((l) => l.unitId !== unitId)
    const move = lessons
      .filter((l) => l.unitId === unitId)
      .map((l, i) => ({ ...l, unitId: null, position: getNextLessonPosition(null, keep) + i }))
    setUnits(newUnits)
    setLessons(normalizeLessonsForUnit([...keep, ...move], null))
  }

  // ───── Lesson handlers ─────
  const handleAddLesson = () => {
    const nextId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const newLesson = {
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
      category: null,
      isIndependent: false,
    }
    const updated = normalizeLessonsForUnit([...lessons, newLesson], null)
    setLessons(updated)
    setExpandedLessons((prev) => ({ ...prev, [newLesson.id]: true }))
    return newLesson.id
  }

  const handleAddLessonToUnit = (unitId) => {
    const nextId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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
      category: null,
      isIndependent: false,
    }
    const updated = normalizeLessonsForUnit([...lessons, newLesson], unitId ?? null)
    setLessons(updated)
    setExpandedLessons((prev) => ({ ...prev, [newLesson.id]: true }))
    return newLesson.id
  }

  const handleAddExistingLesson = (existingLesson) => {
    const newId = `existing-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const newLesson = {
      id: newId,
      _id: existingLesson._id,
      title: existingLesson.title,
      unitId: null,
      position: getNextLessonPosition(null),
      description: existingLesson.description,
      coverImage: existingLesson.coverImage
        ? {
            id: existingLesson.coverImage._id || existingLesson.coverImage.public_id || Date.now(),
            url: existingLesson.coverImage.url,
            public_id: existingLesson.coverImage.public_id || null,
            file: null,
          }
        : null,
      images: formatImagesForState(existingLesson.images || []),
      duration: existingLesson.duration,
      price: existingLesson.price,
      isOnline: existingLesson.isOnline !== false,
      location: existingLesson.location || "",
      category: existingLesson.category || null,
      isIndependent: existingLesson.isIndependent || true,
    }
    const updated = normalizeLessonsForUnit([...lessons, newLesson], null)
    setLessons(updated)
    setExpandedLessons((prev) => ({ ...prev, [newLesson.id]: true }))
    return newLesson.id
  }

  const handleLessonImageUpload = (lessonId, fileList) => {
    if (!fileList?.length) return
    const files = Array.from(fileList)
    setLessons((prev) =>
      prev.map((lesson) => {
        if (lesson.id !== lessonId) return lesson
        const newImages = files.map((file) => ({ id: generateId(), file, url: createPreviewUrl(file) }))
        return { ...lesson, images: [...(lesson.images || []), ...newImages] }
      })
    )
  }

  const handleLessonImageRemove = (lessonId, imageId) => {
    setLessons((prev) =>
      prev.map((lesson) => {
        if (lesson.id !== lessonId) return lesson
        const toRemove = lesson.images?.find((img) => img.id === imageId)
        if (toRemove?.url) revokePreviewUrl(toRemove.url)
        return { ...lesson, images: (lesson.images || []).filter((img) => img.id !== imageId) }
      })
    )
  }

  const handleLessonCoverImageUpload = (lessonId, file) => {
    if (!file) return
    setLessons((prev) =>
      prev.map((lesson) => {
        if (lesson.id !== lessonId) return lesson
        if (lesson.coverImage?.url) {
          revokePreviewUrl(lesson.coverImage.url)
        }
        return {
          ...lesson,
          coverImage: {
            id: generateId(),
            file,
            url: createPreviewUrl(file),
          },
        }
      })
    )
  }

  const handleLessonChange = (lessonId, field, value) => {
    if (field === "unitId") {
      const newUnitId = value ? String(value) : null
      setLessons((prev) => {
        const target = prev.find((l) => String(l.id) === String(lessonId))
        if (!target) return prev
        const prevUnitId = target.unitId ?? null
        const others = prev.filter((l) => String(l.id) !== String(lessonId))
        const updated = { ...target, unitId: newUnitId, position: getNextLessonPosition(newUnitId, others) }
        let list = [...others, updated]
        list = normalizeLessonsForUnit(list, prevUnitId)
        list = normalizeLessonsForUnit(list, newUnitId)
        return list
      })
    } else if (field === "position") {
      setLessons((prev) => reorderLessonPositions(prev, lessonId, Number(value)))
    } else {
      setLessons((prev) =>
        prev.map((l) => (String(l.id) === String(lessonId) ? { ...l, [field]: value } : l))
      )
    }
  }

  const handleCategoryChange = (lessonId, categoryId) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId ? { ...l, category: l.category === categoryId ? null : categoryId } : l
      )
    )
  }

  const handleDeleteLesson = (lessonId) => {
    setLessons((prev) => {
      const toDelete = prev.find((l) => l.id === lessonId)
      if (!toDelete) return prev
      const remaining = prev.filter((l) => l.id !== lessonId)
      return normalizeLessonsForUnit(remaining, toDelete.unitId ?? null)
    })
    setExpandedLessons((prev) => {
      const next = { ...prev }
      delete next[lessonId]
      return next
    })
  }

  // ───── Submit ─────
  const handleUpdateCurriculum = async () => {
    if (!curriculumData.title.trim()) { toast.info("Please enter curriculum title"); return }
    if (lessons.length < 2) { toast.info("Curriculum must have at least 2 lessons"); return }
    if (curriculumData.images.length < MIN_IMAGES_REQUIRED) { toast.info(`Curriculum must have at least ${MIN_IMAGES_REQUIRED} images`); return }

    const formData = new FormData()
    formData.append("title", curriculumData.title)
    formData.append("description", curriculumData.description)
    formData.append("price", curriculumData.price || 0)
    formData.append("inputCurrency", currency)
    formData.append("category", curriculumData.category || "")
    formData.append("isOnline", curriculumData.isOnline)
    formData.append("supportsInPerson", curriculumData.supportsInPerson)
    formData.append("message", curriculumData.message || "")
    if (curriculumData.supportsInPerson && curriculumData.location) formData.append("location", curriculumData.location)
    formData.append("totalLesson", lessons.length)

    // Separate cover image and other images
    const existingImgs = curriculumData.images.filter((img) => img.public_id)
    const newImgs = curriculumData.images.filter((img) => !img.public_id)
    
    // Handle cover image separately (DO NOT include in curriculum images)
    if (coverImage) {
      // New cover image uploaded
      formData.append("coverImage", coverImage)
    } else if (existingCoverImage) {
      // Keep existing cover - pass its public_id so backend knows to keep it
      formData.append("existingCoverImageId", existingCoverImage.public_id)
    }

    // Curriculum images only (NOT including cover image)
    newImgs.forEach((img) => { 
      if (img.file) formData.append("curriculumImages", img.file) 
    })

    // Build existing curriculum image public_ids (NOT including cover image)
    const existingIds = existingImgs.map((img) => img.public_id)
    if (existingIds.length > 0) formData.append("existingCurriculumImages", JSON.stringify(existingIds))

    const unitsData = sortedUnits.map((unit) => {
      const unitLessons = getLessonsForUnit(unit.id).map((lesson) => {
        const lp = {
          title: lesson.title,
          description: lesson.description,
          duration: lesson.duration,
          price: lesson.price,
          category: lesson.category,
          position: lesson.position,
          isIndependent: lesson.isIndependent,
          isOnline: lesson.isOnline,
          location: lesson.location,
        }
        if (lesson._id) lp._id = lesson._id
        return lp
      })
      const up = { title: unit.name, description: unit.description, position: unit.position, isIndependent: false, lessons: unitLessons }
      if (unit.id && typeof unit.id === "string" && !unit.id.startsWith("new-")) up._id = unit.id
      return up
    })

    const unassigned = getUnassignedLessons().map((lesson) => {
      const lp = {
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        price: lesson.price,
        category: lesson.category,
        position: lesson.position,
        isIndependent: lesson.isIndependent,
        isOnline: lesson.isOnline,
        location: lesson.location,
      }
      if (lesson._id) lp._id = lesson._id
      return lp
    })

    formData.append("units", JSON.stringify(unitsData))
    if (unassigned.length > 0) formData.append("lessons", JSON.stringify(unassigned))

    lessons.forEach((lesson) => {
      // Send lesson cover image separately
      if (lesson.coverImage?.file) {
        formData.append(`lesson_${lesson.id}_cover`, lesson.coverImage.file)
      }
      // Send all lesson images
      if (lesson.images && lesson.images.length > 0) {
        lesson.images.forEach((img) => {
          if (img.file) formData.append(`lesson_${lesson.id}`, img.file)
        })
      }
    })

    try {
      const result = await dispatch(updateCurriculum({ id, curriculumData: formData })).unwrap()
      if (result) {
        toast.success("Curriculum updated successfully!")
        setTimeout(() => navigate("/profile?tab=My Curriculum"), 1500)
      }
    } catch (error) {
      toast.error(error.message || "Failed to update curriculum")
    }
  }

  const handleDeleteCurriculum = async () => {
    if (window.confirm("Are you sure you want to delete this curriculum? This action cannot be undone.")) {
      try {
        await dispatch(deleteCurriculum(id)).unwrap()
        toast.success("Curriculum deleted successfully!")
        setTimeout(() => navigate("/profile?tab=My Curriculum"), 1500)
      } catch (error) {
        toast.error(error.message || "Failed to delete curriculum")
      }
    }
  }

  const handleAvailabilityChange = useCallback((data) => {
    setEditedAvailabilityData(data)
  }, [])

  const handleSaveAvailability = () => {
    if (!singleCurriculum?.calenderId) return
    if (!editedAvailabilityData) { toast.info("No changes to save."); return }
    const DAY_NAMES_LIST = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const weeklyHours = []
    for (let i = 0; i < 7; i++) {
      const d = editedAvailabilityData.weeklyAvailability?.[i]
      if (d) weeklyHours.push({ day: DAY_NAMES_LIST[i], available: !d.unavailable, slots: d.slots || [] })
    }
    const dateSpecificHours = (editedAvailabilityData.dateAvailability || []).map((d) => ({
      date: d.date,
      available: !d.unavailable,
      slots: d.slots || [],
    }))
    dispatch(updateCalendar({
      id: singleCurriculum.calenderId,
      calendarData: { weeklyHours, dateSpecificHours, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" },
    })).then((res) => {
      if (res?.payload?.status) {
        toast.success(res?.payload?.message || "Availability saved successfully!")
        dispatch(getLessonCalendarById({ id: singleCurriculum.calenderId }))
        setEditedAvailabilityData(null)
      } else {
        toast.error(res?.payload?.message || "Failed to save availability")
      }
    })
  }

  return (
    <MainLayout className="mx-auto" width="1800px">
      <div className="min-h-screen bg-white py-10">
        <div className="w-full mx-auto px-4">

          {currentStep === 1 && (
            <EditStep1Details
              curriculumData={curriculumData}
              currency={currency}
              handleCurriculumChange={handleCurriculumChange}
              handleCurriculumImagesChange={handleCurriculumImagesChange}
              categories={categories}
              MAX_DESCRIPTION_LENGTH={MAX_DESCRIPTION_LENGTH}
              MIN_IMAGES_REQUIRED={MIN_IMAGES_REQUIRED}
              isStep1Valid={isStep1Valid}
              onNext={() => setCurrentStep(2)}
              displayCalendarData={displayCalendarData}
              isCalendarLoading={isCalendarLoading}
              hasCal={!!singleCurriculum?.calenderId}
              onAvailabilityChange={handleAvailabilityChange}
              onSaveAvailability={handleSaveAvailability}
              updateCalendarLoading={updateCalendarLoading}
              editedAvailabilityData={editedAvailabilityData}
              coverImage={coverImage}
              setCoverImage={setCoverImage}
              handleCoverImageUpload={handleCoverImageUpload}
              existingCoverImage={existingCoverImage}
              onDelete={handleDeleteCurriculum}
              loading={loading}
            />
          )}

          {currentStep === 2 && (
            <EditStep2Type
              lessonType={lessonType}
              onChooseType={setLessonType}
              onBack={() => setCurrentStep(1)}
              onNext={() => lessonType && setCurrentStep(3)}
            />
          )}

          {currentStep === 3 && lessonType === "direct" && (
            <EditStep3DirectLessons
              lessons={lessons}
              currency={currency}
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
              onBack={() => setCurrentStep(2)}
              onSubmit={handleUpdateCurriculum}
              onDelete={handleDeleteCurriculum}
              loading={loading}
            />
          )}

          {currentStep === 3 && lessonType === "unit" && (
            <EditStep3Units
              units={units}
              currency={currency}
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
              categories={categories}
              durationOptions={durationOptions}
              MAX_DESCRIPTION_LENGTH={MAX_DESCRIPTION_LENGTH}
              MIN_IMAGES_REQUIRED={MIN_IMAGES_REQUIRED}
              lessonImageInputRef={lessonImageInputRef}
              onBack={() => setCurrentStep(2)}
              onSubmit={handleUpdateCurriculum}
              onDelete={handleDeleteCurriculum}
              loading={loading}
            />
          )}
        </div>
      </div>
    </MainLayout>
  )
}

// ─────────────────────────────────────────────
// STEP 1: DETAILS
// ─────────────────────────────────────────────
function EditStep1Details({
  curriculumData, currency, handleCurriculumChange, handleCurriculumImagesChange,
  categories, MAX_DESCRIPTION_LENGTH, MIN_IMAGES_REQUIRED,
  isStep1Valid, onNext, displayCalendarData, isCalendarLoading, hasCal,
  onAvailabilityChange, onSaveAvailability, updateCalendarLoading, editedAvailabilityData,
  coverImage, setCoverImage, handleCoverImageUpload, existingCoverImage, onDelete, loading,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* LEFT: FORM */}
      <form className="space-y-6">
        {/* Title */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">Curriculum Title *</label>
          <input
            type="text"
            placeholder="Enter curriculum title"
            maxLength="300"
            value={curriculumData.title}
            onChange={(e) => handleCurriculumChange("title", e.target.value)}
            className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black"
          />
          <p className="text-xs text-gray-500 mt-1">{curriculumData.title.length}/300 characters</p>
        </div>

        {/* Description */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">Description *</label>
          <textarea
            placeholder="Enter curriculum description"
            value={curriculumData.description}
            onChange={(e) => {
              const text = e.target.value
              if (text.length <= MAX_DESCRIPTION_LENGTH || text.length < curriculumData.description.length)
                handleCurriculumChange("description", text)
            }}
            rows="5"
            className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black resize-none"
          />
          <div className="flex justify-between text-xs mt-2">
            <div className={curriculumData.description.length >= 50 ? "text-green-600" : "text-amber-600"}>
              {curriculumData.description.length >= 50 ? "✓ Long enough" : `Minimum 50 characters (${curriculumData.description.length}/50)`}
            </div>
            <div className={curriculumData.description.length >= MAX_DESCRIPTION_LENGTH ? "text-red-600 font-medium" : "text-gray-500"}>
              {curriculumData.description.length}/{MAX_DESCRIPTION_LENGTH}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">Curriculum Price ({currency}) *</label>
          <input
            type="number"
            placeholder="Enter price"
            value={curriculumData.price}
            onChange={(e) => handleCurriculumChange("price", e.target.value)}
            step="1"
            min="0"
            className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black"
          />
        </div>

        {/* Category */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">Category *</label>
          <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => handleCurriculumChange("category", curriculumData.category === cat.name ? null : cat.name)}
                    className={`px-3 py-1 rounded-full border text-sm transition-all ${curriculumData.category === cat.name ? "bg-black text-white border-black" : "border-gray-400 text-gray-700 hover:bg-gray-100"}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Loading categories...</p>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">Curriculum Location *</label>
          <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={curriculumData.isOnline === true} onChange={(e) => handleCurriculumChange("isOnline", e.target.checked)} className="w-4 h-4 accent-black" />
                <span className="text-sm text-gray-700">Online</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={curriculumData.supportsInPerson === true} onChange={(e) => handleCurriculumChange("supportsInPerson", e.target.checked)} className="w-4 h-4 accent-black" />
                <span className="text-sm text-gray-700">In Person</span>
              </label>
            </div>
            {curriculumData.supportsInPerson === true && (
              <div>
                <label className="block text-sm font-medium mb-2">Location Address</label>
                <input
                  type="text"
                  placeholder="Enter location address"
                  value={curriculumData.location}
                  onChange={(e) => handleCurriculumChange("location", e.target.value)}
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

            {/* Existing Cover Image */}
            {existingCoverImage && !coverImage && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium text-gray-900">Current Cover</p>
                  <p className="text-xs text-gray-500">1/1 image</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="group relative w-24 h-24 border-2 border-gray-300 rounded-md overflow-hidden shadow-sm hover:border-blue-400 transition-all">
                    <img
                      src={existingCoverImage.url}
                      alt="cover-preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  </div>
                </div>
              </div>
            )}

            {/* New Cover Image Preview */}
            {coverImage && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium text-gray-900">Preview</p>
                  <p className="text-xs text-gray-500">1/1 image</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="group relative w-24 h-24 border-2 border-gray-300 rounded-md overflow-hidden shadow-sm hover:border-blue-400 transition-all">
                    <img
                      src={URL.createObjectURL(coverImage)}
                      alt="cover-preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
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

        {/* Images */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">Curriculum Images *</label>
          <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
            <ImageUploader
              images={curriculumData.images || []}
              onImagesChange={handleCurriculumImagesChange}
              maxImages={10}
              minImages={MIN_IMAGES_REQUIRED}
              label="Upload Images (min 2, max 10)"
            />
          </div>
        </div>

        {/* Message */}
        <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
          <label className="block mb-2 text-sm font-semibold text-gray-900">Message</label>
          <textarea
            rows="5"
            value={curriculumData.message}
            onChange={(e) => handleCurriculumChange("message", e.target.value)}
            className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-3">

        <button
          type="button"
          disabled={!isStep1Valid()}
          onClick={onNext}
          className="w-fit bg-black text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Next <ArrowRight size={16} />
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="w-fit bg-red-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 size={16} /> Delete Curriculum
          </button>
        )}
        </div>
      </form>

      {/* RIGHT: CALENDAR */}
      <div className="hidden lg:block">
        <div className="sticky top-10 h-fit space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Curriculum Availability</h3>
          <p className="text-gray-500 text-sm">
            {hasCal ? "Edit your curriculum's availability schedule below." : "No availability schedule set."}
          </p>
          {isCalendarLoading ? (
            <div className="flex items-center py-8 gap-2">
              <Loader size={24} className="animate-spin text-black" />
              <span className="text-gray-600">Loading calendar...</span>
            </div>
          ) : hasCal ? (
            <>
              <MakeAvailability
                availabilityData={{ weeklyAvailability: displayCalendarData.weeklyAvailability, dateAvailability: displayCalendarData.dateAvailability }}
                isReadOnly={false}
                isGroupAvailable={false}
                onAvailabilityChange={onAvailabilityChange}
              />
              <button
                type="button"
                onClick={onSaveAvailability}
                disabled={updateCalendarLoading || !editedAvailabilityData}
                className="w-fit bg-black text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updateCalendarLoading ? <Loader size={16} className="animate-spin" /> : null}
                {updateCalendarLoading ? "Saving..." : "Save Availability"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// STEP 2: TYPE SELECTION
// ─────────────────────────────────────────────
function EditStep2Type({ lessonType, onChooseType, onBack, onNext }) {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onChooseType("direct")}
          className={`w-full text-left rounded-2xl border px-5 py-4 transition-all ${lessonType === "direct" ? "border-black shadow-sm" : "border-[#DDDDDD] hover:border-gray-400"}`}
        >
          <h3 className="text-base font-semibold text-gray-900 mb-2">Direct Lesson Course</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            A simple course made of individual lessons with no grouping. Perfect for quick learning, standalone sessions, or flexible topics without a fixed structure.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChooseType("unit")}
          className={`w-full text-left rounded-2xl border px-5 py-4 transition-all ${lessonType === "unit" ? "border-black shadow-sm" : "border-[#DDDDDD] hover:border-gray-400"}`}
        >
          <h3 className="text-base font-semibold text-gray-900 mb-2">Unit-Based Course</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            A structured course organized into units, each containing multiple lessons. Ideal for step-by-step learning where skills build progressively over time.
          </p>
        </button>
      </div>

      <div className="flex items-center justify-between pt-6">
        <button onClick={onBack} className="px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={onNext} disabled={!lessonType} className="px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
          Next <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// STEP 3A: DIRECT LESSONS
// ─────────────────────────────────────────────
function EditStep3DirectLessons({
  lessons, currency, expandedLessons, setExpandedLessons,
  handleAddLesson, handleAddExistingLesson,
  handleLessonChange, handleCategoryChange, handleDeleteLesson,
  handleLessonImageUpload, handleLessonImageRemove, handleLessonCoverImageUpload,
  Teacherlessons, categories, durationOptions,
  MAX_DESCRIPTION_LENGTH, MIN_IMAGES_REQUIRED, lessonImageInputRef,
  onBack, onSubmit, onDelete, loading,
}) {
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.id ?? null)
  const [existingLessonId, setExistingLessonId] = useState("")

  useEffect(() => {
    if (!lessons.length) { setSelectedLessonId(null); return }
    if (!lessons.some((l) => l.id === selectedLessonId)) setSelectedLessonId(lessons[0].id)
  }, [lessons, selectedLessonId])

  const sortedLessons = [...lessons].sort((a, b) => a.position - b.position)
  const selectedLesson = lessons.find((l) => l.id === selectedLessonId)
  const availableExisting = Teacherlessons?.filter((tl) => !lessons.some((al) => al._id === tl._id))

  const handleAddNew = () => {
    const newId = handleAddLesson()
    if (newId) setSelectedLessonId(newId)
  }

  const handleExistingSelect = (e) => {
    const lessonId = e.target.value
    setExistingLessonId(lessonId)
    if (!lessonId) return
    const found = availableExisting?.find((l) => l._id === lessonId)
    if (found) {
      const newId = handleAddExistingLesson(found)
      if (newId) setSelectedLessonId(newId)
    }
    setExistingLessonId("")
  }

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: PREVIEW */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
          {sortedLessons.length === 0 ? (
            <div className="text-gray-500 text-center py-12 bg-[#F7F7F7] rounded-2xl border border-gray-100">
              No lessons yet. Add one to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedLessons.map((lesson) => {
                const previewImage = lesson.coverImage?.url || lesson.images?.[0]?.url
                const isSelected = lesson.id === selectedLessonId
                return (
                  <div key={lesson.id} className={`bg-[#F7F7F7] rounded-2xl p-4 transition-all ${isSelected ? "border border-black" : ""}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                        {previewImage ? <img src={previewImage} alt="lesson" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-900">Lesson {lesson.position}</span>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setSelectedLessonId(lesson.id)} className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-800 hover:bg-gray-300 transition-colors">Edit</button>
                            <Menu size={16} className="text-gray-400" />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">{lesson.title || "Untitled lesson"}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{lesson.description || "Add a short description"}</p>
                        <div className="grid grid-cols-2 items-center gap-3 mt-3">
                          <select value={lesson.position} onChange={(e) => handleLessonChange(lesson.id, "position", e.target.value)} className="px-3 py-2 border border-[#DDDDDD] rounded-lg text-sm bg-white focus:outline-none">
                            {Array.from({ length: sortedLessons.length }).map((_, i) => (<option key={i} value={i + 1}>Position {i + 1}</option>))}
                          </select>
                          <button type="button" onClick={handleAddNew} className="px-4 py-2 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors">Add a Lesson +</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT: EDITOR */}
        <div className="space-y-6">
          <div className="bg-[#F7F7F7] rounded-2xl p-5 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add a lesson</h3>
            <div className="space-y-3">
              <select value={existingLessonId} onChange={handleExistingSelect} className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black">
                <option value="">Choose from your existing lessons</option>
                {availableExisting?.map((l) => (<option key={l._id} value={l._id}>{l.title}</option>))}
              </select>
              <input
                type="text"
                placeholder="Lesson name"
                value={selectedLesson?.title || ""}
                onChange={(e) => selectedLesson && handleLessonChange(selectedLesson.id, "title", e.target.value)}
                className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {selectedLesson ? (
            <LessonCard
              lesson={selectedLesson}
              currency={currency}
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
              forceExpanded={true}
              hideHeader={true}
            />
          ) : (
            <div className="bg-[#F7F7F7] rounded-2xl p-6 text-sm text-gray-600 border border-gray-100">
              Select a lesson from the left to edit its details.
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-4 pt-2">
            <button onClick={onBack} className="px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={handleAddNew} className="px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                Add another lesson
              </button>
              <button onClick={onSubmit} disabled={loading || lessons.length < 2} className="px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                {loading ? "Updating..." : <>Update Curriculum <ArrowRight size={16} /></>}
              </button>
              <button onClick={onDelete} disabled={loading} className="px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// STEP 3B: UNIT-BASED
// ─────────────────────────────────────────────
function EditStep3Units({
  units, currency, sortedUnits, lessons, expandedLessons, setExpandedLessons,
  showUnitModal, setShowUnitModal, newUnitData, setNewUnitData,
  handleSaveUnit, handleDeleteUnit, handleUnitPositionChange, resetUnitForm,
  getLessonsForUnit, getMaxPositionForUnit, getUnassignedLessons,
  handleAddLesson, handleAddLessonToUnit, handleAddExistingLesson,
  handleLessonChange, handleCategoryChange, handleDeleteLesson,
  handleLessonImageUpload, handleLessonImageRemove, handleLessonCoverImageUpload,
  Teacherlessons, categories, durationOptions,
  MAX_DESCRIPTION_LENGTH, MIN_IMAGES_REQUIRED, lessonImageInputRef,
  onBack, onSubmit, onDelete, loading,
}) {
  const [selectedUnitId, setSelectedUnitId] = useState(sortedUnits[0]?.id ?? null)
  const [selectedLessonId, setSelectedLessonId] = useState(null)
  const [mode, setMode] = useState("unit")
  const [existingLessonId, setExistingLessonId] = useState("")

  useEffect(() => {
    if (sortedUnits.length && selectedUnitId == null) setSelectedUnitId(sortedUnits[0].id)
  }, [sortedUnits, selectedUnitId])

  useEffect(() => {
    if (selectedUnitId && mode === "unit") {
      const unit = units.find((u) => u.id === selectedUnitId)
      if (unit) setNewUnitData({ name: unit.name, description: unit.description, position: String(unit.position) })
    }
  }, [selectedUnitId, units, mode, setNewUnitData])

  const availableExisting = Teacherlessons?.filter((tl) => !lessons.some((al) => al._id === tl._id))
  const selectedLesson = lessons.find((l) => l.id === selectedLessonId)

  const handleSelectUnit = (unit) => {
    setSelectedUnitId(unit.id)
    setSelectedLessonId(null)
    setMode("unit")
    setShowUnitModal({ edit: true, unitId: unit.id })
    setNewUnitData({ name: unit.name, description: unit.description, position: String(unit.position) })
  }

  const handleSelectLesson = (lesson) => {
    setSelectedLessonId(lesson.id)
    setMode("lesson")
  }

  const handleAddUnitInline = () => {
    resetUnitForm(String(units.length + 1))
    setShowUnitModal({ edit: false, unitId: null })
    setSelectedUnitId(null)
    setSelectedLessonId(null)
    setMode("unit")
  }

  const handleAddLessonInline = (unitId = null) => {
    const newId = unitId ? handleAddLessonToUnit(unitId) : handleAddLesson()
    if (newId) { setSelectedLessonId(newId); setMode("lesson") }
  }

  const handleExistingSelect = (e) => {
    const lessonId = e.target.value
    setExistingLessonId(lessonId)
    if (!lessonId) return
    const found = availableExisting?.find((l) => l._id === lessonId)
    if (found) {
      const newId = handleAddExistingLesson(found)
      if (newId) {
        if (selectedUnitId) handleLessonChange(newId, "unitId", selectedUnitId)
        setSelectedLessonId(newId)
        setMode("lesson")
      }
    }
    setExistingLessonId("")
  }

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: PREVIEW */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
          {sortedUnits.length === 0 && lessons.length === 0 ? (
            <div className="text-gray-500 text-center py-12 bg-[#F7F7F7] rounded-2xl border border-gray-100">
              No units or lessons yet. Add a unit to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedUnits.map((unit) => {
                const unitLessons = getLessonsForUnit(unit.id)
                const isUnitSelected = selectedUnitId === unit.id && mode === "unit"
                return (
                  <div key={`unit-${unit.id}`} className="space-y-3">
                    <div className={`bg-[#F7F7F7] border rounded-2xl p-4 transition-all ${isUnitSelected ? "border-black" : "border-transparent"}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-900">Unit {unit.position}</span>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => handleSelectUnit(unit)} className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-800 hover:bg-gray-300 transition-colors">Edit</button>
                              <Menu size={16} className="text-gray-400" />
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">{unit.name || "Untitled unit"}</p>
                          <p className="text-xs text-gray-600 line-clamp-2">{unit.description || "Add a unit description"}</p>
                          <div className="grid grid-cols-3 items-center gap-3 mt-3">
                            <select value={String(unit.position)} onChange={(e) => handleUnitPositionChange(unit.id, e.target.value)} className="px-3 py-2 border border-[#DDDDDD] rounded-lg text-sm bg-white focus:outline-none">
                              {Array.from({ length: units.length }).map((_, i) => (<option key={i} value={String(i + 1)}>Position {i + 1}</option>))}
                            </select>
                            <button type="button" onClick={() => handleAddLessonInline(unit.id)} className="px-4 py-2 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors">+ Lesson</button>
                            <button type="button" onClick={handleAddUnitInline} className="px-4 py-2 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors">+ Unit</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pl-6 border-l border-[#DDDDDD]">
                      {unitLessons.map((lesson) => {
                        const previewImage = lesson.coverImage?.url || lesson.images?.[0]?.url
                        const isSelected = selectedLessonId === lesson.id && mode === "lesson"
                        return (
                          <div key={lesson.id} className={`bg-[#F7F7F7] border rounded-2xl p-4 transition-all ${isSelected ? "border-black" : "border-transparent"}`}>
                            <div className="flex items-start gap-3">
                              <div className="w-20 h-20 rounded bg-gray-200 overflow-hidden shrink-0">
                                {previewImage && <img src={previewImage} alt="lesson" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex flex-col justify-between flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-900">Lesson {lesson.position}</span>
                                  <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => handleSelectLesson(lesson)} className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-800 hover:bg-gray-300 transition-colors">Edit</button>
                                    <Menu size={16} className="text-gray-400" />
                                  </div>
                                </div>
                                <p className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">{lesson.title || "Untitled lesson"}</p>
                                <div className="grid grid-cols-3 items-center gap-3 mt-3">
                                  <select value={lesson.position} onChange={(e) => handleLessonChange(lesson.id, "position", e.target.value)} className="px-3 py-2 border border-[#DDDDDD] rounded-lg text-sm bg-white focus:outline-none">
                                    {Array.from({ length: unitLessons.length }).map((_, i) => (<option key={i} value={i + 1}>Position {i + 1}</option>))}
                                  </select>
                                  <button type="button" onClick={() => handleAddLessonInline(unit.id)} className="px-4 py-2 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors">+ Lesson</button>
                                  <button type="button" onClick={handleAddUnitInline} className="px-4 py-2 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors">+ Unit</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Unassigned lessons */}
              {getUnassignedLessons().length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700">Without Unit</span>
                    <button type="button" onClick={() => handleAddLessonInline()} className="px-4 py-1.5 rounded-full bg-[#DDDDDD] text-sm font-semibold text-gray-900 hover:bg-gray-300 transition-colors">Add a Lesson +</button>
                  </div>
                  {getUnassignedLessons().map((lesson) => {
                    const previewImage = lesson.coverImage?.url || lesson.images?.[0]?.url
                    const isSelected = selectedLessonId === lesson.id && mode === "lesson"
                    return (
                      <div key={lesson.id} className={`bg-[#F7F7F7] border rounded-2xl p-4 transition-all ${isSelected ? "border-black" : "border-transparent"}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-20 h-20 rounded bg-gray-200 overflow-hidden shrink-0">
                            {previewImage && <img src={previewImage} alt="lesson" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-900">Lesson {lesson.position}</span>
                              <button type="button" onClick={() => handleSelectLesson(lesson)} className="px-3 py-1 rounded-full bg-[#DDDDDD] text-xs font-semibold text-gray-800 hover:bg-gray-300 transition-colors">Edit</button>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">{lesson.title || "Untitled lesson"}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: EDITOR */}
        <div className="space-y-6">
          {mode === "unit" ? (
            <div className="bg-[#F7F7F7] rounded-2xl p-6 border border-gray-100 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">{showUnitModal?.edit ? "Edit Unit" : "Add a Unit"}</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Unit Name *</label>
                <input
                  type="text"
                  placeholder="Enter unit name"
                  value={newUnitData.name}
                  onChange={(e) => setNewUnitData({ ...newUnitData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black"
                />
                <p className="text-xs text-gray-500 mt-2">{newUnitData.name.length}/300</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                <textarea
                  placeholder="Enter unit description"
                  value={newUnitData.description}
                  onChange={(e) => setNewUnitData({ ...newUnitData, description: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Position in the curriculum</label>
                <select
                  value={newUnitData.position}
                  onChange={(e) => setNewUnitData({ ...newUnitData, position: e.target.value })}
                  className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black"
                >
                  {Array.from({ length: showUnitModal?.edit ? units.length : units.length + 1 }).map((_, i) => (
                    <option key={i} value={String(i + 1)}>{i + 1}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleSaveUnit} className="flex-1 px-4 py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors">
                  {showUnitModal?.edit ? "Update Unit" : "Create Unit"}
                </button>
                {showUnitModal?.edit && (
                  <button
                    type="button"
                    onClick={() => { handleDeleteUnit(showUnitModal.unitId); resetUnitForm(String(units.length)); setSelectedUnitId(null); setMode("unit"); setShowUnitModal({ edit: false, unitId: null }) }}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add a lesson</h3>
                <div className="space-y-3">
                  <select value={existingLessonId} onChange={handleExistingSelect} className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black">
                    <option value="">Choose from your existing lessons</option>
                    {availableExisting?.map((l) => (<option key={l._id} value={l._id}>{l.title}</option>))}
                  </select>
                  <input
                    type="text"
                    placeholder="Lesson name"
                    value={selectedLesson?.title || ""}
                    onChange={(e) => selectedLesson && handleLessonChange(selectedLesson.id, "title", e.target.value)}
                    className="w-full px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>
              {selectedLesson ? (
                <LessonCard
                  lesson={selectedLesson}
                  currency={currency}
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

          <div className="flex flex-wrap justify-between gap-4 pt-2">
            <button onClick={onBack} className="px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={handleAddUnitInline} className="px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                Add another Unit
              </button>
              <button onClick={() => handleAddLessonInline(selectedUnitId)} className="px-6 py-3 border-2 border-black text-black rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                Add another Lesson
              </button>
              <button onClick={onSubmit} disabled={loading || lessons.length < 2} className="px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                {loading ? "Updating..." : <>Update Curriculum <ArrowRight size={16} /></>}
              </button>
              <button onClick={onDelete} disabled={loading} className="px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// LESSON CARD
// ─────────────────────────────────────────────
function LessonCard({
  lesson, currency, unit, allUnits, maxPosition,
  expandedLessons, setExpandedLessons,
  handleLessonChange, handleCategoryChange, handleDeleteLesson,
  handleLessonImageUpload, handleLessonImageRemove, handleLessonCoverImageUpload,
  allCategories, durationOptions,
  MAX_DESCRIPTION_LENGTH = 1200,
  MIN_IMAGES_REQUIRED = 2,
  lessonImageInputRef,
  forceExpanded = false,
  hideHeader = false,
}) {
  const isExpanded = forceExpanded ? true : expandedLessons[lesson.id]
  const lessonImages = lesson.images || []
  const positionOptionCount = Math.max(maxPosition, 1)

  return (
    <div className="bg-[#F7F7F7] rounded-2xl border border-gray-100 overflow-hidden">
      {!hideHeader && (
        <div
          className="flex items-center justify-between p-4 bg-gray-100 border-b border-[#DDDDDD] cursor-pointer hover:bg-gray-200 transition-colors"
          onClick={(e) => {
            if (!e.target.closest("input, button, select, textarea"))
              setExpandedLessons((prev) => ({ ...prev, [lesson.id]: !prev[lesson.id] }))
          }}
        >
          <div>
            <p className="text-xs text-gray-600 mb-0.5">{unit ? `Unit ${unit.position} - Pos ${lesson.position}` : `Pos ${lesson.position}`}</p>
            <h4 className="font-semibold text-sm text-gray-900">{lesson.title || "Untitled Lesson"}</h4>
          </div>
          {isExpanded ? <ChevronUp size={18} className="text-gray-600" /> : <ChevronDown size={18} className="text-gray-600" />}
        </div>
      )}

      {isExpanded && (
        <div className="p-4 bg-white space-y-6" onClick={(e) => e.stopPropagation()}>
          {/* Title */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Title *</label>
            <input type="text" placeholder="Enter lesson title" maxLength="300" value={lesson.title} onChange={(e) => handleLessonChange(lesson.id, "title", e.target.value)} className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black" />
            <p className="text-xs text-gray-500 mt-1">{lesson.title.length}/300 characters</p>
          </div>

          {/* Description */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Description *</label>
            <textarea
              placeholder="Enter lesson description"
              value={lesson.description}
              onChange={(e) => {
                const text = e.target.value
                if (text.length <= MAX_DESCRIPTION_LENGTH || text.length < lesson.description.length)
                  handleLessonChange(lesson.id, "description", text)
              }}
              rows="5"
              className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black resize-none"
            />
            <div className="flex justify-between text-xs mt-2">
              <div className={lesson.description.length >= 50 ? "text-green-600" : "text-amber-600"}>
                {lesson.description.length >= 50 ? "✓ Long enough" : `Minimum 50 chars (${lesson.description.length}/50)`}
              </div>
              <div className={lesson.description.length >= MAX_DESCRIPTION_LENGTH ? "text-red-600 font-medium" : "text-gray-500"}>
                {lesson.description.length}/{MAX_DESCRIPTION_LENGTH}
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Duration *</label>
            <select value={lesson.duration} onChange={(e) => handleLessonChange(lesson.id, "duration", e.target.value)} className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black">
              <option value="">Select duration</option>
              {durationOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>

          {/* Price */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Price per Lesson ({currency}) *</label>
            <input type="number" placeholder="Enter price" value={lesson.price} onChange={(e) => handleLessonChange(lesson.id, "price", e.target.value)} step="1" min="0" className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black" />
          </div>

          {/* Images */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Cover Image *</label>
            <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-center">
                <label className="flex items-center justify-center gap-2 text-gray-700 rounded-md px-4 py-2 text-base hover:bg-gray-50 cursor-pointer w-fit disabled:opacity-50 transition-colors">
                  <span className="flex items-center gap-1 bg-[#DDDDDD] rounded-md p-2.5">
                    <GrUpload size={20} />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleLessonCoverImageUpload(lesson.id, file)
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {lesson.coverImage && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-gray-900">Preview</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="group relative w-24 h-24 border-2 border-gray-300 rounded-md overflow-hidden shadow-sm">
                      <img
                        src={lesson.coverImage.url}
                        alt="cover-preview"
                        className="w-full h-full object-cover"
                      />
                      <div
                        onClick={() => handleLessonChange(lesson.id, 'coverImage', null)}
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
          <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Images * (min {MIN_IMAGES_REQUIRED})</label>
            <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
              <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border border-[#DDDDDD]">
                {lessonImages.map((image, i) => (
                  <div key={image.id ?? i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-white border border-[#DDDDDD]">
                    <img src={image.url} alt={`lesson-${i}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => handleLessonImageRemove(lesson.id, image.id)} className="absolute top-0 right-0 bg-black bg-opacity-70 text-white w-5 h-5 flex items-center justify-center">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-2xl cursor-pointer hover:border-black bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="text-gray-400">+</span>
                  <input ref={lessonImageInputRef} type="file" accept="image/*" multiple className="hidden" onClick={(e) => e.stopPropagation()} onChange={(e) => handleLessonImageUpload(lesson.id, e.target.files)} />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">Upload lesson images ({lessonImages.length}/{MIN_IMAGES_REQUIRED} minimum)</p>
            </div>
          </div>

          {/* Location */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Lesson Location *</label>
            <div className="bg-white border border-[#DDDDDD] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={lesson.isOnline === true} onChange={(e) => handleLessonChange(lesson.id, "isOnline", e.target.checked)} className="w-4 h-4 accent-black" />
                  <span className="text-sm text-gray-700">Online</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={lesson.isOnline === false} onChange={(e) => handleLessonChange(lesson.id, "isOnline", !e.target.checked)} className="w-4 h-4 accent-black" />
                  <span className="text-sm text-gray-700">In Person</span>
                </label>
              </div>
              {lesson.isOnline === false && (
                <input type="text" placeholder="Enter location address" value={lesson.location || ""} onChange={(e) => handleLessonChange(lesson.id, "location", e.target.value)} className="w-full px-4 py-2 border border-[#DDDDDD] rounded-xl text-sm focus:outline-none focus:border-black" />
              )}
            </div>
          </div>

          {/* Unit assignment */}
          {allUnits && allUnits.length > 0 && (
            <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
              <label className="block mb-2 text-sm font-semibold text-gray-900">Assign to Unit</label>
              <select value={lesson.unitId ? String(lesson.unitId) : ""} onChange={(e) => handleLessonChange(lesson.id, "unitId", e.target.value || null)} className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black">
                <option value="">Without Unit</option>
                {allUnits.map((u) => (<option key={u.id} value={String(u.id)}>Unit {u.position}: {u.name}</option>))}
              </select>
            </div>
          )}

          {/* Position */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Position</label>
            <select value={lesson.position} onChange={(e) => handleLessonChange(lesson.id, "position", e.target.value)} className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black">
              {Array.from({ length: positionOptionCount }).map((_, i) => (<option key={i} value={i + 1}>Position {i + 1}</option>))}
            </select>
          </div>

          {/* Category */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Category *</label>
            <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => (
                  <button key={cat._id} type="button" onClick={() => handleCategoryChange(lesson.id, cat.name)} className={`px-3 py-1 rounded-full text-sm border transition-all ${lesson.category === cat.name ? "bg-black text-white border-black" : "border-gray-400 text-gray-700 hover:bg-gray-100"}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Independent */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Independent Lesson</label>
            <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={lesson.isIndependent === true} onChange={(e) => handleLessonChange(lesson.id, "isIndependent", e.target.checked)} className="w-4 h-4 accent-black" />
                <span className="text-sm text-gray-700">Mark this lesson as independent</span>
              </label>
              <p className="text-xs text-gray-500 mt-2">When enabled, this lesson can be taken independently without completing previous lessons</p>
            </div>
          </div>

          {/* Delete */}
          <button type="button" onClick={() => handleDeleteLesson(lesson.id)} className="w-full px-4 py-3 border-2 border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
            Delete Lesson
          </button>
        </div>
      )}
    </div>
  )
}

