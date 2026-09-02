import React, { useEffect, useState } from "react";
import { Smile, Frown } from "lucide-react";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";

import MainLayout from "../../components/MainLayout";
import { BsSend } from "react-icons/bs";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getUserById } from "../../redux/reducers/AuthReducer";
import { startChat } from "../../redux/reducers/ChatReducer";
import { getUserFavorites } from "../../redux/reducers/FavoriteReducer";
import { getActiveListings } from "../../redux/reducers/ListingReducer";
import { ListingCard } from "../Home/Listing";
import PublicFvrt from "./components/PublicFvrt";
import PublicUpcoming from "./components/PublicUpcoming";
import { useCurrency } from "../../currency/CurrencyContext";

export default function PublicProfile() {
  const { currency } = useCurrency();
  const { userbyid, userInfo } = useSelector((state) => state.auth);
  const { startChatLoading } = useSelector((state) => state.chat);
  const { favorites } = useSelector((state) => state.favorite);
  const { activeListings = [], activeTotalPages = 1, loading } = useSelector(
    (state) => state.listing
  );
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const [buildLimit, setBuildLimit] = useState(8);

  const { role: paramRole } = useParams();
  const query = new URLSearchParams(location.search);
  const role = paramRole || query.get("role");
  const isTeacher = role === "teacher";

  const [tab, setTab] = useState(isTeacher ? "Builds" : "Upcoming");

  const studentStates = ["Upcoming", "Bookmarks"];
  const teacherStates = ["Builds"];
  const states = isTeacher ? teacherStates : studentStates;

  useEffect(() => {
    dispatch(getUserById(id));
    dispatch(getUserFavorites());
    if (isTeacher) {
      setTab("Builds");
    }
  }, [dispatch, id, isTeacher]);

  useEffect(() => {
    if (isTeacher && tab === "Builds") {
      dispatch(
        getActiveListings({
          page: 1,
          limit: buildLimit,
          createdBy: id,
          currency,
        })
      );
    }
  }, [dispatch, id, tab, buildLimit, isTeacher, currency]);

  const handleStartChat = async () => {
    if (!userInfo?._id) {
      toast.info("Please log in to send a message.");
      navigate("/login");
      return;
    }

    if (userInfo?._id === id) {
      toast.info("This is your profile.");
      return;
    }

    try {
      const data = await dispatch(startChat({ targetUserId: id })).unwrap();
      const roomId = data?.room?._id;

      if (!roomId) {
        toast.error("Could not start the chat. Please try again.");
        return;
      }

      toast.success("Chat ready.");
      navigate(`/chat/${roomId}`);
    } catch (error) {
      const message = typeof error === "string" ? error : "Failed to start chat.";
      toast.error(message);
    }
  };

  const handleLoadMore = () => {
    if (tab === "Builds") {
      setBuildLimit((prev) => prev + 8);
    }
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === "Builds") {
      setBuildLimit(8);
    }
  };

  const rating = userbyid?.averageRating || 0;

  const ProfileHeader = ({ showPrivateNote = false }) => (
    <div className="flex flex-col items-center text-center">
      <h1 className="mb-4 text-2xl">{userbyid?.name || "Unknown"}</h1>
      <div className="mb-4 h-48 w-48 overflow-hidden rounded-2xl shadow-md">
        <img
          src={userbyid?.image?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
          alt="Profile"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="mb-4 flex items-center gap-3 text-gray-900">
        {rating > 0 && (
          <div className="flex items-center gap-1">
            {rating > 60 ? (
              <Smile className="text-black" size={20} />
            ) : (
              <Frown className="text-black" size={20} />
            )}
            <span>{rating}%</span>
          </div>
        )}
      </div>

      <p className="mb-4 max-w-md text-sm text-gray-700">{userbyid?.bio}</p>

      <div className="flex gap-4">
        <button
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-[#F5F5F5] px-4 py-2 disabled:opacity-60"
          onClick={handleStartChat}
          disabled={startChatLoading}
        >
          {startChatLoading ? "Starting..." : "Send Me a Message"}{" "}
          <BsSend className="h-4 w-4" />
        </button>
      </div>

      {showPrivateNote && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <div className="mb-2 flex items-center gap-3">
            <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-yellow-800">Private Account</h3>
          </div>
          <p className="text-yellow-700">
            This account is private. The user's content and activities are not publicly visible.
          </p>
        </div>
      )}
    </div>
  );

  if (!isTeacher && userbyid?.publicType === false) {
    return (
      <MainLayout>
        <div className="flex min-h-screen w-full flex-col items-center py-12">
          <ProfileHeader showPrivateNote />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex min-h-screen w-full flex-col items-center py-12">
        <ProfileHeader />

        {(userbyid?.publicType !== false || isTeacher) && (
          <div className="w-full pt-6">
            <div className="mb-4 flex justify-left gap-6 font-medium text-gray-700">
              {states.map((s) => (
                <button
                  onClick={() => handleTabChange(s)}
                  key={s}
                  className={`pb-1 ${
                    tab === s
                      ? "border-b-3 border-primary text-black"
                      : "text-gray-500 hover:border-b-2 hover:border-gray-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {tab === "Upcoming" && <PublicUpcoming id={id} />}

            {tab === "Bookmarks" && (
              <div className="rounded-2xl bg-white py-5">
                <PublicFvrt id={id} />
              </div>
            )}

            {tab === "Builds" && isTeacher && (
              <div className="rounded-2xl bg-white py-5">
                {loading && activeListings.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">Loading builds...</div>
                ) : activeListings.length > 0 ? (
                  <>
                    <div className="mx-auto grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-7">
                      {activeListings.map((listing) => (
                        <ListingCard
                          key={listing._id}
                          listing={listing}
                          favorites={favorites}
                        />
                      ))}
                    </div>

                    {activeListings.length >= buildLimit && activeTotalPages > 1 && (
                      <div className="mt-8 flex justify-center">
                        <button
                          type="button"
                          onClick={handleLoadMore}
                          className="rounded-md bg-primary px-6 py-2 text-white transition-colors hover:bg-primary-dark"
                        >
                          Load More Builds
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    No builds found for this seller.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
