import React, { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { deletePropose, getProposeByUser } from "../../../redux/reducers/ProposeReducer";
import UpdateRequest from "../Request/UpdateRequest";
import { toast } from "react-toastify";
import ProfileRequestCard from "./ProfileRequestCard";
import CreateRequestPopup from "../../Home/Components/CreateRequestPopup";

export default function Request() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userProposes = [], loading } = useSelector((state) => state.propose);
  const [edit, setEdit] = useState(false);
  const [id, setId] = useState(null);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);

  const subtab = searchParams.get("subtab") === "drafts" ? "drafts" : "published";

  useEffect(() => {
    dispatch(getProposeByUser());
  }, [dispatch]);

  const { publishedRequests, draftRequests } = useMemo(() => {
    const list = Array.isArray(userProposes) ? userProposes : [];
    const drafts = [];
    const published = [];
    for (const item of list) {
      if (item?.status === "Draft") {
        drafts.push(item);
      } else {
        published.push(item);
      }
    }
    return { publishedRequests: published, draftRequests: drafts };
  }, [userProposes]);

  const handleSubtabChange = (nextSubtab) => {
    if (nextSubtab === "drafts") {
      setSearchParams({ tab: "My Requests", subtab: "drafts" });
    } else {
      setSearchParams({ tab: "My Requests" });
    }
  };

  const handleEdit = (reqId) => {
    setEdit(true);
    setId(reqId);
  };

  const handleContinueDraft = (draftReq) => {
    setEditingDraft(draftReq);
    setShowCreateRequest(true);
  };

  const handleOpenNewRequest = () => {
    setEditingDraft(null);
    setShowCreateRequest(true);
  };

  const handleDelete = (reqId) => {
    toast.info(
      <div>
        <p className="font-medium">Are you sure you want to delete?</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              dispatch(deletePropose(reqId)).then((res) => {
                if (res.payload?.status) {
                  toast.success("Request deleted successfully");
                  dispatch(getProposeByUser());
                } else {
                  toast.error(res.payload?.message || "Failed to delete request");
                }
              });
              toast.dismiss();
            }}
            className="bg-red-500 text-white px-3 py-1 rounded"
          >
            Yes
          </button>

          <button
            onClick={() => toast.dismiss()}
            className="bg-gray-300 px-3 py-1 rounded"
          >
            No
          </button>
        </div>
      </div>,
      { autoClose: false }
    );
  };

  const visibleRequests = subtab === "drafts" ? draftRequests : publishedRequests;

  return (
    <div className="w-full pb-10 space-y-[20px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Sub-tabs: Published / Drafts */}
        <div className="inline-flex h-[46px] w-fit items-center rounded-full border-[1.5px] border-black bg-white p-[3.5px] gap-1">
          <button
            type="button"
            onClick={() => handleSubtabChange("published")}
            className={`whitespace-nowrap rounded-full px-5 h-9 text-sm font-semibold flex items-center justify-center transition-colors duration-200 cursor-pointer ${
              subtab === "published"
                ? "bg-primary text-white shadow-sm"
                : "text-black hover:bg-gray-100"
            }`}
          >
            Published ({publishedRequests.length})
          </button>
          <button
            type="button"
            onClick={() => handleSubtabChange("drafts")}
            className={`whitespace-nowrap rounded-full px-5 h-9 text-sm font-semibold flex items-center justify-center transition-colors duration-200 cursor-pointer ${
              subtab === "drafts"
                ? "bg-primary text-white shadow-sm"
                : "text-black hover:bg-gray-100"
            }`}
          >
            Drafts ({draftRequests.length})
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenNewRequest}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Post a request
        </button>
      </div>

      {visibleRequests.length > 0 ? (
        <div className="space-y-[20px]">
          {visibleRequests.map((req) => (
            <ProfileRequestCard
              key={req._id}
              req={req}
              onEdit={handleEdit}
              onContinueDraft={handleContinueDraft}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-[#F7F7F7] py-12 px-4 text-center">
          <p className="text-base font-medium text-gray-800">
            {loading
              ? "Loading your requests..."
              : subtab === "drafts"
              ? "No saved drafts yet"
              : "No published requests yet"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {subtab === "drafts"
              ? "When you save a request draft, it appears here so you can finish it anytime."
              : "Post a request to let sellers send you custom proposals."}
          </p>
          {!loading && subtab === "published" && (
            <button
              type="button"
              onClick={handleOpenNewRequest}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Plus size={15} />
              Post a request
            </button>
          )}
        </div>
      )}

      {edit && (
        <UpdateRequest id={id} open={edit} onClose={() => setEdit(false)} />
      )}

      <CreateRequestPopup
        open={showCreateRequest}
        initialDraft={editingDraft}
        onSaved={(mode) => {
          handleSubtabChange(mode === "draft" ? "drafts" : "published");
        }}
        onClose={() => {
          setShowCreateRequest(false);
          setEditingDraft(null);
        }}
      />
    </div>
  );
}
