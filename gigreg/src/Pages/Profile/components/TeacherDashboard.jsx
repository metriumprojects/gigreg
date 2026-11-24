import React, { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { formatDueDateTime, formatShortDate } from "../../../utils/dateFormat";
import { toast } from "react-toastify";
import { CancelBooking, DeliverOrder, teacherListingOrders } from "../../../redux/reducers/BookingReducer";
import { startChat } from "../../../redux/reducers/ChatReducer";
import { useCurrency } from "../../../currency/CurrencyContext";

const ORDER_TABS = [
  { value: "upcoming", label: "Upcoming Orders" },
  { value: "completed", label: "Completed Orders" },
  { value: "cancelled", label: "Cancelled Orders" },
];

export default function LessonsDashboard() {
  const { formatPrice } = useCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const { startChatLoading } = useSelector((state) => state.chat);
  const { teacherListingOrdersData = [] } = useSelector((state) => state.book);

  const [activeTab, setActiveTab] = useState("upcoming");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit] = useState(10);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionOrder, setActionOrder] = useState({ id: null, type: null });
  const [confirmAction, setConfirmAction] = useState(null);
  const [deliveryNote, setDeliveryNote] = useState("");

  const fetchOrders = (page = ordersPage, status = activeTab) =>
    dispatch(teacherListingOrders({ page, limit: ordersLimit, status })).then((response) => {
      setOrdersTotal(response?.payload?.total || 0);
    });

  useEffect(() => {
    fetchOrders(ordersPage, activeTab);
  }, [dispatch, ordersPage, ordersLimit, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setOrdersPage(1);
  };

  const ordersTotalPages = Math.ceil(ordersTotal / ordersLimit) || 1;

  const formatOrderDate = (value) => formatShortDate(value);

  const formatDueDate = (value) => formatDueDateTime(value, "");

  const emptyMessage =
    activeTab === "completed"
      ? "No completed orders"
      : activeTab === "cancelled"
        ? "No cancelled orders"
        : "No upcoming orders";

  const handleMessageClient = async (order) => {
    const clientId = order?.clientId;
    if (!clientId) {
      toast.error("Client information not available");
      return;
    }
    if (!userInfo?._id) {
      toast.info("Please log in to send a message.");
      navigate("/login");
      return;
    }

    try {
      const data = await dispatch(startChat({ targetUserId: clientId })).unwrap();
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
    if (!order?.bookingId || actionOrder.id) return;
    setActionOrder({ id: order.bookingId, type: "cancel" });
    try {
      const res = await dispatch(CancelBooking({ bookId: order.bookingId, type: "listing" }));
      if (res?.payload?.status) {
        toast.success(res.payload.message);
        setConfirmAction(null);
        fetchOrders(ordersPage, activeTab);
      } else {
        toast.error(res?.payload?.message || "Failed to cancel order");
      }
    } finally {
      setActionOrder({ id: null, type: null });
    }
  };

  const handleDeliverOrder = async (order) => {
    if (!order?.bookingId || actionOrder.id) return;
    setActionOrder({ id: order.bookingId, type: "deliver" });
    try {
      const res = await dispatch(
        DeliverOrder({ bookId: order.bookingId, deliveryNote: deliveryNote.trim() })
      );
      if (res?.payload?.status) {
        toast.success(res.payload.message);
        setConfirmAction(null);
        setDeliveryNote("");
        fetchOrders(ordersPage, activeTab);
      } else {
        toast.error(res?.payload || "Failed to mark order as delivered");
      }
    } finally {
      setActionOrder({ id: null, type: null });
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

      {ordersTotalPages > 1 && (
        <div className="mb-5 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOrdersPage((prev) => Math.max(1, prev - 1))}
              disabled={ordersPage === 1}
              className="rounded border p-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaChevronLeft />
            </button>
            <span className="text-sm">
              Page {ordersPage} of {ordersTotalPages}
            </span>
            <button
              type="button"
              onClick={() => setOrdersPage((prev) => Math.min(ordersTotalPages, prev + 1))}
              disabled={ordersPage === ordersTotalPages}
              className="rounded border p-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      <div className="mb-10 overflow-x-auto rounded-2xl bg-[#F5F5F5]">
        <table className="w-full min-w-[1180px] overflow-hidden rounded-2xl text-sm">
          <thead className="bg-[#E9EAEE] text-left">
            <tr>
              <th className="p-5 font-semibold">Date of the order</th>
              <th className="p-5 font-semibold">Due date and time</th>
              <th className="p-5 font-semibold">Hours</th>
              <th className="p-5 font-semibold">Listing</th>
              <th className="p-5 font-semibold">Client name</th>
              <th className="p-5 font-semibold">Amount</th>
              <th className="p-5 font-semibold">Status</th>
              <th className="p-5 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {teacherListingOrdersData.length > 0 ? (
              teacherListingOrdersData.map((order) => (
                <tr key={order.bookingId} className="bg-[#F5F5F5]">
                  <td className="p-5">{formatOrderDate(order.orderDate)}</td>
                  <td className="max-w-[150px] whitespace-normal p-5">
                    {formatDueDate(order.dueDate) || "No due date"}
                  </td>
                  <td className="p-5">{order.hours || "-"}</td>
                  <td className="p-5">{order.listingTitle}</td>
                  <td className="p-5">{order.clientName}</td>
                  <td className="p-5">{formatPrice(order.amount, order.currency || "USD")}</td>
                  <td className="p-5">
                    {order.status === "delivered" ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          Delivered · Awaiting buyer
                        </span>
                        {order.autoCompleteAt && (
                          <span className="text-[11px] text-gray-500">
                            Auto-releases {formatOrderDate(order.autoCompleteAt)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="capitalize">{order.status}</span>
                        {activeTab === "upcoming" && order.revisionNote && (
                          <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            Revision requested
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-5">
                    <div className="flex flex-nowrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleMessageClient(order)}
                        disabled={startChatLoading}
                        className="whitespace-nowrap rounded-full bg-[#E9EAEE] px-4 py-2 text-black disabled:opacity-60"
                      >
                        Message client
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="whitespace-nowrap rounded-full bg-[#E9EAEE] px-4 py-2 text-black"
                      >
                        View invoice for orders details
                      </button>
                      {activeTab === "upcoming" && (
                        <>
                          <button
                            type="button"
                            disabled={actionOrder.id === order.bookingId}
                            onClick={() => setConfirmAction({ order, type: "cancel" })}
                            className="whitespace-nowrap rounded-full bg-[#E9EAEE] px-4 py-2 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionOrder.id === order.bookingId && actionOrder.type === "cancel"
                              ? "Cancelling..."
                              : "Cancel order"}
                          </button>
                          {order.status === "delivered" ? (
                            <span className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-50 border border-amber-200 px-4 py-2 text-xs font-medium text-amber-800">
                              Awaiting buyer confirmation
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={actionOrder.id === order.bookingId}
                              onClick={() => {
                                setDeliveryNote("");
                                setConfirmAction({ order, type: "deliver" });
                              }}
                              className="whitespace-nowrap rounded-full bg-primary px-4 py-2 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {actionOrder.id === order.bookingId && actionOrder.type === "deliver"
                                ? "Marking..."
                                : "Mark as delivered"}
                            </button>
                          )}
                        </>
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
                <span className="text-gray-500">Client</span>
                <span className="text-right font-medium">{selectedOrder.clientName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Order date</span>
                <span className="text-right font-medium">{formatOrderDate(selectedOrder.orderDate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Due date</span>
                <span className="text-right font-medium">
                  {formatDueDate(selectedOrder.dueDate) || "No due date"}
                </span>
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
              {selectedOrder.deliveryNote && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Delivery note</span>
                  <span className="text-right font-medium max-w-[260px] break-words">
                    {selectedOrder.deliveryNote}
                  </span>
                </div>
              )}
              {selectedOrder.autoCompleteAt && selectedOrder.status === "delivered" && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Auto-releases on</span>
                  <span className="text-right font-medium">
                    {formatDueDate(selectedOrder.autoCompleteAt) || formatOrderDate(selectedOrder.autoCompleteAt)}
                  </span>
                </div>
              )}
              {selectedOrder.revisionNote && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Buyer revision note</span>
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
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-black">
              {confirmAction.type === "cancel" ? "Cancel & refund order?" : "Mark order as delivered?"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirmAction.type === "cancel" ? (
                <>
                  Cancelling{" "}
                  <span className="font-medium text-black">{confirmAction.order.listingTitle}</span>{" "}
                  will issue a full refund to the client.
                </>
              ) : (
                <>
                  Let the buyer know{" "}
                  <span className="font-medium text-black">{confirmAction.order.listingTitle}</span>{" "}
                  is ready. Funds are released from escrow once the buyer confirms or automatically
                  after 3 days if no revision is requested.
                </>
              )}
            </p>
            {confirmAction.type === "deliver" && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Delivery note for buyer (optional)
                </label>
                <textarea
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Share summary of completed work or next steps..."
                  className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(actionOrder.id)}
                onClick={() => {
                  setConfirmAction(null);
                  setDeliveryNote("");
                }}
                className="rounded-full bg-[#E9EAEE] px-5 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={Boolean(actionOrder.id)}
                onClick={() =>
                  confirmAction.type === "cancel"
                    ? handleCancelOrder(confirmAction.order)
                    : handleDeliverOrder(confirmAction.order)
                }
                className={`rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  confirmAction.type === "cancel" ? "bg-red-600" : "bg-[#1034a6]"
                }`}
              >
                {actionOrder.id
                  ? confirmAction.type === "cancel"
                    ? "Cancelling..."
                    : "Marking..."
                  : confirmAction.type === "cancel"
                  ? "Yes, cancel & refund"
                  : "Yes, mark delivered"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
