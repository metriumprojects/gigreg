import React, { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { formatDueDateTime, formatShortDate } from "../../../utils/dateFormat";
import { toast } from "react-toastify";
import {
  CancelBooking,
  ConfirmDelivery,
  RequestRevision,
  userListingOrders,
} from "../../../redux/reducers/BookingReducer";
import { startChat } from "../../../redux/reducers/ChatReducer";
import { useCurrency } from "../../../currency/CurrencyContext";

const ORDER_TABS = [
  { value: "upcoming", label: "Upcoming Orders" },
  { value: "completed", label: "Completed Orders" },
  { value: "cancelled", label: "Cancelled Orders" },
];

export default function StudentOrders() {
  const { formatPrice } = useCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const { startChatLoading } = useSelector((state) => state.chat);
  const { userListingOrdersData = [] } = useSelector((state) => state.book);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(null);
  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = useState(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [revisionOrder, setRevisionOrder] = useState(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisingOrderId, setRevisingOrderId] = useState(null);

  const fetchOrders = (nextPage = page, status = activeTab) =>
    dispatch(userListingOrders({ page: nextPage, limit, status })).then((response) => {
      setTotal(response?.payload?.total || 0);
    });

  useEffect(() => {
    fetchOrders(page, activeTab);
  }, [dispatch, page, limit, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const formatOrderDate = (value) => formatShortDate(value);

  const formatDueDate = (value) => formatDueDateTime(value, "No due date");

  const emptyMessage =
    activeTab === "completed"
      ? "No completed orders"
      : activeTab === "cancelled"
        ? "No cancelled orders"
        : "No upcoming orders";

  const handleMessageSeller = async (order) => {
    const sellerId = order?.sellerId;

    if (!sellerId) {
      toast.error("Seller information not available");
      return;
    }

    if (!userInfo?._id) {
      toast.info("Please log in to send a message.");
      navigate("/login");
      return;
    }

    try {
      const data = await dispatch(startChat({ targetUserId: sellerId })).unwrap();
      const roomId = data?.room?._id;

      if (!roomId) {
        toast.error("Could not start the chat. Please try again.");
        return;
      }

      navigate(`/chat/${roomId}`);
    } catch (error) {
      const message = typeof error === "string" ? error : "Failed to start chat.";
      toast.error(message);
    }
  };

  const handleCancelOrder = async (order) => {
    if (!order?.bookingId || cancellingOrderId) return;
    setCancellingOrderId(order.bookingId);
    try {
      const res = await dispatch(CancelBooking({ bookId: order.bookingId, type: "listing" }));
      if (res?.payload?.status) {
        toast.success(res.payload.message);
        setConfirmCancelOrder(null);
        fetchOrders(page, activeTab);
      } else {
        toast.error(res?.payload?.message || "Failed to cancel order");
      }
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleConfirmDelivery = async (order) => {
    if (!order?.bookingId || confirmingOrderId) return;
    setConfirmingOrderId(order.bookingId);
    try {
      const res = await dispatch(ConfirmDelivery({ bookId: order.bookingId }));
      if (res?.payload?.status) {
        toast.success(res.payload.message);
        setConfirmDeliveryOrder(null);
        fetchOrders(page, activeTab);
      } else {
        toast.error(res?.payload || "Failed to confirm order delivery");
      }
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleRequestRevision = async (order) => {
    if (!order?.bookingId || revisingOrderId) return;
    setRevisingOrderId(order.bookingId);
    try {
      const res = await dispatch(
        RequestRevision({ bookId: order.bookingId, revisionNote: revisionNote.trim() })
      );
      if (res?.payload?.status) {
        toast.success(res.payload.message);
        setRevisionOrder(null);
        setRevisionNote("");
        fetchOrders(page, activeTab);
      } else {
        toast.error(res?.payload || "Failed to request revision");
      }
    } finally {
      setRevisingOrderId(null);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-[10px] flex gap-6 justify-start text-sm font-medium">
        {ORDER_TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => handleTabChange(item.value)}
            className={`pb-2.5 transition-colors cursor-pointer ${
              activeTab === item.value
                ? "border-b-2 border-black text-black font-semibold"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mb-5 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded border p-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaChevronLeft />
            </button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="rounded border p-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      <div className="mb-10 overflow-x-auto rounded-2xl bg-[#F5F5F5]">
        <table className="w-full min-w-[1080px] overflow-hidden rounded-2xl text-sm">
          <thead className="bg-[#E9EAEE] text-left">
            <tr>
              <th className="p-5 font-semibold">Date of the order</th>
              <th className="p-5 font-semibold">Due date and time</th>
              <th className="p-5 font-semibold">Hours</th>
              <th className="p-5 font-semibold">Listing</th>
              <th className="p-5 font-semibold">Seller name</th>
              <th className="p-5 font-semibold">Amount</th>
              <th className="p-5 font-semibold">Status</th>
              <th className="p-5 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {userListingOrdersData.length > 0 ? (
              userListingOrdersData.map((order) => (
                <tr key={order.bookingId} className="bg-[#F5F5F5]">
                  <td className="p-5">{formatOrderDate(order.orderDate)}</td>
                  <td className="max-w-[150px] whitespace-normal p-5">
                    {formatDueDate(order.dueDate)}
                  </td>
                  <td className="p-5">{order.hours || "-"}</td>
                  <td className="p-5">{order.listingTitle}</td>
                  <td className="p-5">{order.sellerName}</td>
                  <td className="p-5">{formatPrice(order.amount, order.currency || "USD")}</td>
                  <td className="p-5">
                    {order.status === "delivered" ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex w-fit items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                          Delivered — Confirm needed
                        </span>
                        {order.autoCompleteAt && (
                          <span className="text-[11px] text-gray-500">
                            Auto-confirms {formatOrderDate(order.autoCompleteAt)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="capitalize">{order.status}</span>
                    )}
                  </td>
                  <td className="p-5">
                    <div className="flex flex-nowrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleMessageSeller(order)}
                        disabled={startChatLoading}
                        className="whitespace-nowrap rounded-full bg-[#E9EAEE] px-4 py-2 text-black disabled:opacity-60"
                      >
                        Message seller
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="whitespace-nowrap rounded-full bg-[#E9EAEE] px-4 py-2 text-black"
                      >
                        View order details
                      </button>
                      {activeTab === "upcoming" && order.status === "delivered" && (
                        <>
                          <button
                            type="button"
                            disabled={
                              confirmingOrderId === order.bookingId ||
                              revisingOrderId === order.bookingId ||
                              cancellingOrderId === order.bookingId
                            }
                            onClick={() => setConfirmDeliveryOrder(order)}
                            className="whitespace-nowrap rounded-full bg-[#65a30d] hover:bg-[#578d0b] px-4 py-2 text-white font-medium disabled:opacity-50 cursor-pointer"
                          >
                            {confirmingOrderId === order.bookingId
                              ? "Confirming..."
                              : "Confirm & release payment"}
                          </button>
                          <button
                            type="button"
                            disabled={
                              confirmingOrderId === order.bookingId ||
                              revisingOrderId === order.bookingId ||
                              cancellingOrderId === order.bookingId
                            }
                            onClick={() => {
                              setRevisionNote("");
                              setRevisionOrder(order);
                            }}
                            className="whitespace-nowrap rounded-full border border-amber-500 bg-white hover:bg-amber-50 px-4 py-2 text-amber-700 font-medium disabled:opacity-50 cursor-pointer"
                          >
                            {revisingOrderId === order.bookingId
                              ? "Sending..."
                              : "Request revision"}
                          </button>
                        </>
                      )}
                      {activeTab === "upcoming" && (
                        <button
                          type="button"
                          disabled={
                            cancellingOrderId === order.bookingId ||
                            confirmingOrderId === order.bookingId ||
                            revisingOrderId === order.bookingId
                          }
                          onClick={() => setConfirmCancelOrder(order)}
                          className="whitespace-nowrap rounded-full bg-[#E9EAEE] px-4 py-2 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancellingOrderId === order.bookingId ? "Cancelling..." : "Cancel order"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="bg-[#F5F5F5] p-5 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Order details</h3>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-black"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Listing</span>
                <span className="text-right font-medium">{selectedOrder.listingTitle}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Seller</span>
                <span className="text-right font-medium">{selectedOrder.sellerName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Order date</span>
                <span className="text-right font-medium">{formatOrderDate(selectedOrder.orderDate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Due date</span>
                <span className="text-right font-medium">{formatDueDate(selectedOrder.dueDate)}</span>
              </div>
              {selectedOrder.selectedTimes?.length > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Time slots</span>
                  <span className="text-right font-medium">{selectedOrder.selectedTimes.join(", ")}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Hours</span>
                <span className="text-right font-medium">{selectedOrder.hours || "-"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Status</span>
                <span className="text-right font-medium capitalize">{selectedOrder.status}</span>
              </div>
              {selectedOrder.deliveredAt && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Delivered on</span>
                  <span className="text-right font-medium">
                    {formatDueDate(selectedOrder.deliveredAt)}
                  </span>
                </div>
              )}
              {selectedOrder.deliveryNote && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Seller delivery note</span>
                  <span className="text-right font-medium max-w-[260px] break-words">
                    {selectedOrder.deliveryNote}
                  </span>
                </div>
              )}
              {selectedOrder.autoCompleteAt && selectedOrder.status === "delivered" && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Auto-confirms on</span>
                  <span className="text-right font-medium">
                    {formatDueDate(selectedOrder.autoCompleteAt)}
                  </span>
                </div>
              )}
              {selectedOrder.revisionNote && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Your revision note</span>
                  <span className="text-right font-medium text-amber-700 max-w-[260px] break-words">
                    {selectedOrder.revisionNote}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t pt-3">
                <span className="text-gray-500">Amount</span>
                <span className="text-right font-semibold">
                  {formatPrice(selectedOrder.amount, selectedOrder.currency || "USD")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {confirmDeliveryOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-black">Confirm delivery &amp; release payment?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Confirm that you received{" "}
              <span className="font-medium text-black">{confirmDeliveryOrder.listingTitle}</span>{" "}
              satisfactorily. This will complete the order and release the held escrow payment to{" "}
              <span className="font-medium text-black">{confirmDeliveryOrder.sellerName}</span>.
            </p>
            {confirmDeliveryOrder.deliveryNote && (
              <div className="mt-3 rounded-xl bg-[#F5F5F5] p-3 text-xs text-gray-700">
                <span className="font-semibold text-black">Seller note: </span>
                {confirmDeliveryOrder.deliveryNote}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(confirmingOrderId)}
                onClick={() => setConfirmDeliveryOrder(null)}
                className="rounded-full bg-[#E9EAEE] px-5 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={Boolean(confirmingOrderId)}
                onClick={() => handleConfirmDelivery(confirmDeliveryOrder)}
                className="rounded-full bg-[#65a30d] hover:bg-[#578d0b] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {confirmingOrderId ? "Confirming..." : "Yes, release payment"}
              </button>
            </div>
          </div>
        </div>
      )}
      {revisionOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-black">Request revision</h3>
            <p className="mt-2 text-sm text-gray-600">
              Pause auto-completion and keep payment safely in escrow until{" "}
              <span className="font-medium text-black">{revisionOrder.sellerName}</span> updates{" "}
              <span className="font-medium text-black">{revisionOrder.listingTitle}</span>.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                What still needs work? (optional)
              </label>
              <textarea
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Describe what needs to be fixed or delivered..."
                className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(revisingOrderId)}
                onClick={() => {
                  setRevisionOrder(null);
                  setRevisionNote("");
                }}
                className="rounded-full bg-[#E9EAEE] px-5 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={Boolean(revisingOrderId)}
                onClick={() => handleRequestRevision(revisionOrder)}
                className="rounded-full bg-amber-600 hover:bg-amber-700 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {revisingOrderId ? "Sending..." : "Send revision request"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmCancelOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-black">Cancel this order?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to cancel{" "}
              <span className="font-medium text-black">{confirmCancelOrder.listingTitle}</span>? If
              already paid, your payment will be refunded automatically.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(cancellingOrderId)}
                onClick={() => setConfirmCancelOrder(null)}
                className="rounded-full bg-[#E9EAEE] px-5 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                Keep order
              </button>
              <button
                type="button"
                disabled={Boolean(cancellingOrderId)}
                onClick={() => handleCancelOrder(confirmCancelOrder)}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {cancellingOrderId ? "Cancelling..." : "Yes, cancel order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
