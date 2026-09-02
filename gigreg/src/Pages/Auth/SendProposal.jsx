import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight, Check, ChevronDown, Plus } from "lucide-react";
import { toast } from "react-toastify";
import MainLayout from "../../components/MainLayout";
import { getProposeById } from "../../redux/reducers/ProposeReducer";
import { getMyListings } from "../../redux/reducers/ListingReducer";
import { sendChatMessage, startChat } from "../../redux/reducers/ChatReducer";
import { becomeTeacher, getUser } from "../../redux/reducers/AuthReducer";
import {
  createListingProposalUrl,
  formatRequestDate,
  getRequestBuyerId,
  loadProposalRequest,
  saveProposalMessage,
  saveProposalRequest,
} from "../../utils/proposalRequest";

const LOGO_URL =
  "https://res.cloudinary.com/dinwxxnzm/image/upload/v1784044801/Logo_1_jldcf8.png";

export default function SendProposal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const { listings = [], loading: listingsLoading } = useSelector((state) => state.listing);

  const [request, setRequest] = useState(() => {
    const cached = loadProposalRequest();
    if (cached && (!requestId || String(cached._id) === String(requestId))) return cached;
    return null;
  });
  const [selectedListingId, setSelectedListingId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const activeListings = useMemo(
    () => (listings || []).filter((item) => (item?.status || "Active") === "Active"),
    [listings]
  );
  const selectedListing = activeListings.find((item) => item._id === selectedListingId) || null;

  useEffect(() => {
    dispatch(getMyListings({ page: 1, limit: 50 }));
  }, [dispatch]);

  useEffect(() => {
    if (!requestId) return;
    dispatch(getProposeById(requestId)).then((res) => {
      const data = res.payload?._id ? res.payload : res.payload?.propose;
      if (data?._id) {
        setRequest(data);
        saveProposalRequest(data);
      }
    });
  }, [dispatch, requestId]);

  const handleSend = async () => {
    const buyerId = getRequestBuyerId(request);
    if (!buyerId) {
      toast.error("Buyer details are missing");
      return;
    }
    if (!selectedListingId) {
      toast.info("Please select one of your listings");
      return;
    }

    try {
      setSending(true);
      const chatData = await dispatch(startChat({ targetUserId: buyerId })).unwrap();
      const roomId = chatData?.room?._id;
      if (!roomId) {
        toast.error("Could not start chat with the buyer");
        return;
      }

      await dispatch(
        sendChatMessage({
          roomId,
          listingId: selectedListingId,
          message: message.trim() || undefined,
        })
      ).unwrap();

      toast.success("Proposal sent to the buyer");
      const customMessage = message.trim();
      saveProposalMessage(customMessage);
      navigate("/proposal-submitted", {
        state: {
          request,
          listing: selectedListing,
          message: customMessage,
        },
      });
    } catch (error) {
      const errMessage =
        typeof error === "string" ? error : error?.message || "Failed to send proposal";
      toast.error(errMessage);
    } finally {
      setSending(false);
    }
  };

  const handleBuyerProfile = () => {
    dispatch(becomeTeacher("user")).then(() => {
      dispatch(getUser());
      navigate("/profile");
    });
  };

  return (
    <MainLayout hideHeader hideFooter hideMobileMenu contentClassName="!min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-2 py-10 space-y-6">
        <Link to="/" className="inline-flex" aria-label="Gigreg home">
          <img src={LOGO_URL} alt="Gigreg" className="h-11 w-auto object-contain" />
        </Link>

        <div className="flex items-start gap-3">
          <span className=" flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Check size={18} strokeWidth={3} />
          </span>
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-black">
              Send a proposal
            </h1>
          </div>
        </div>
        
        <p className=" text-[16px] text-gray-500">
              You&apos;re now on your seller profile, please select or create a new listing to send as a
              proposal!
            </p>

        {request && (
          <div className=" rounded-2xl bg-[#F7F7F7] p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:gap-5">
              {request?.images?.[0]?.url ? (
                <img
                  src={request.images[0].url}
                  alt=""
                  className="h-28 w-28 shrink-0 rounded-2xl bg-gray-200 object-cover md:h-36 md:w-36"
                />
              ) : (
                <div className="h-28 w-28 shrink-0 rounded-2xl bg-gray-300 md:h-36 md:w-36" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600">
                    {formatRequestDate(request.updatedAt || request.createdAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {request?.user?.name || "unknown"}
                    </span>
                    <img
                      src={
                        request?.user?.image?.url ||
                        "https://i.ibb.co/tpV3m2GW/no-image.png"
                      }
                      alt=""
                      className="h-8 w-8 rounded-sm object-cover"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-gray-900">
                    Budget ${request?.price}
                  </span>
                  {request?.category && (
                    <span className="rounded-full bg-white px-3 py-1 text-gray-800">
                      {request.category}
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-sm font-semibold text-gray-900">{request.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                  {request.description || "No description available."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <select
            value={selectedListingId}
            onChange={(e) => setSelectedListingId(e.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-900 bg-white px-4 py-3 pr-10 text-sm text-gray-900 outline-none"
          >
            <option value="">
              {listingsLoading ? "Loading listings..." : "Select one of your listing"}
            </option>
            {activeListings.map((listing) => (
              <option key={listing._id} value={listing._id}>
                {listing.title}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add custom message"
          rows={5}
          className=" w-full resize-none rounded-lg border border-gray-900 bg-white px-4 py-3 text-sm outline-none"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(createListingProposalUrl(requestId || request?._id))}
            className="inline-flex items-center gap-2 rounded-full bg-[#CCCCCC] px-5 py-3 text-sm  text-black"
          >
            <Plus size={16} />
            Create a new listing
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm  text-white disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send this proposal"}
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="text-left text-base text-gray-700">
          <button type="button" onClick={handleBuyerProfile} className="underline underline-offset-2 text-black">
            Cancel and go back to buyer profile
          </button>
          <span className="mx-2">or</span>
          <Link to="/profile?tab=My Listing" className="underline underline-offset-2 text-black ">
            Cancel and see your newly created listing
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
