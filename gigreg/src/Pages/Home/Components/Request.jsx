import React, { useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUserFavorites, toggleFavorite } from "../../../redux/reducers/FavoriteReducer";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import RequestCard from "./RequestCard";
import { getLoginUrl, getSafeRedirectPath } from "../../../utils/authRedirect";

export default function Request({
  proposes,
  onSendExistingLesson,
  openCreateLesson,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites } = useSelector((state) => state.favorite);
  const { userInfo } = useSelector((state) => state.auth);
  const [openPropose, setOpenPropose] = useState(null);
  const [savingId, setSavingId] = useState(null);
  
  // Build a Set of favorite propose IDs once — only recalculates when favorites change
  const favoriteIds = useMemo(() => {
    if (!favorites || !Array.isArray(favorites)) return new Set();
    const ids = new Set();
    for (const fav of favorites) {
      if (fav.type === "propose" && fav.propose?._id) {
        ids.add(fav.propose._id);
      }
    }
    return ids;
  }, [favorites]);

  const handleSave = useCallback((proposeId) => {
    if (!userInfo?._id) {
      toast.info("Please log in to save to favorites.");
      navigate(getLoginUrl(location), {
        state: { from: getSafeRedirectPath(location) },
      });
      return;
    }

    setSavingId(proposeId);
    
    dispatch(toggleFavorite({ id: proposeId, type: "propose" })).then((res) => {
      setSavingId(null);
      if (res?.payload?.status) {
        dispatch(getUserFavorites());
        toast.success(res.payload.message || "Updated favorites");
      } else {
        toast.error(res?.payload?.message || "Unable to update favorite");
      }
    }).catch(() => {
      setSavingId(null);
      toast.error("Failed to update favorite");
    });
  }, [dispatch, userInfo?._id, navigate, location]);

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4 sm:gap-5 pb-4 md:pb-10">
      {!proposes || proposes.length === 0 ? (
        <p className="text-center text-gray-500 py-10">No requests found</p>
      ) : (
        proposes.map((req) => (
          <RequestCard
            key={req._id}
            req={req}
            isFavorite={favoriteIds.has(req._id)}
            onSave={handleSave}
            onCreateLesson={openCreateLesson}
            onSendExistingLesson={onSendExistingLesson}
            openPropose={openPropose}
            setOpenPropose={setOpenPropose}
            userInfo={userInfo}
            isLoading={savingId === req._id}
          />
        ))
      )}
    </div>
  );
}