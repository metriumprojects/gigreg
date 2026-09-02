import { Heart, Edit, Trash } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deletePropose, getProposeByUser } from "../../../redux/reducers/ProposeReducer";
import UpdateRequest from "../Request/UpdateRequest";
import { toast } from "react-toastify";
import ProfileRequestCard from "./ProfileRequestCard";
import CreateRequestPopup from "../../Home/Components/CreateRequestPopup";

export default function Request() {
  const dispatch = useDispatch();
  const { userProposes } = useSelector((state) => state.propose);
  const [edit, setEdit] = useState(false);
  const [id, setId] = useState(null);
  const [showCreateRequest, setShowCreateRequest] = useState(false);

  useEffect(() => {
    dispatch(getProposeByUser());
  }, [dispatch]);

  const handleedit = (id) => {
    setEdit(true);
    setId(id);
  };

const handleDelete = (id) => {
  toast.info(
    <div>
      <p className="font-medium">Are you sure you want to delete?</p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            dispatch(deletePropose(id)).then((res) => {
              if (res.payload.status) {
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

  return (
    <div className="w-full pb-10 space-y-6">
           <div className="flex items-center justify-between mb-5 mt-7.5">
          <h2 className="text-[28px] font-medium">My Requests</h2>
          <span 
            onClick={() => setShowCreateRequest(true)}
            className="text-black cursor-pointer transition-colors"
          >
            Post a request
          </span>
        </div>
      {userProposes && userProposes.length > 0 ? (
        userProposes.map((req) => (
          <ProfileRequestCard
            key={req._id}
            req={req}
            onEdit={handleedit}
            onDelete={handleDelete}
          />
        ))
      ) : (
        <p className="text-center text-gray-500 py-10">No requests found</p>
      )}

      {edit && (
        <UpdateRequest id={id} open={edit} onClose={() => setEdit(false)} />
      )}

      <CreateRequestPopup
        open={showCreateRequest}
        onClose={() => setShowCreateRequest(false)}
      />
    </div>
  );
}
