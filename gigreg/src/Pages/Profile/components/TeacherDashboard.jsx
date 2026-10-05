import React, { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment-timezone";
import { toast } from "react-toastify";
import { CancelBooking, CompleteLessons, teacherListingOrders } from "../../../redux/reducers/BookingReducer";
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

  const formatOrderDate = (value) => {
    if (!value) return "";
    return moment(value).format("MM/DD/YY");
  };

  const formatDueDate = (value) => {
    if (!value) return "";
    return moment(value).format("D MMMM [at] hA z");
  };

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

  const handleCancelOrder = (order) => {
    if (!order?.bookingId) return;
    dispatch(CancelBooking({ bookId: order.bookingId, type: "listing" })).then((res) => {
      if (res?.payload?.status) {
        toast.success(res.payload.message);
        fetchOrders(ordersPage, activeTab);
      } else {
        toast.error(res?.payload?.message || "Failed to cancel order");
      }
    });
  };

  const handleCompleteOrder = (order) => {
    if (!order?.bookingId) return;
    dispatch(CompleteLessons({ bookId: order.bookingId, type: "listing" })).then((res) => {
      if (res?.payload?.status) {
        toast.success(res.payload.message);
        fetchOrders(ordersPage, activeTab);
      } else {
        toast.error(res?.payload?.message || "Failed to complete order");
      }
    });
  };

  return (
    <div className="w-full">
      <div className="mb-[20px] flex gap-6 justify-start text-sm font-medium">
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
                  <td className="p-5 capitalize">{order.status}</td>
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
                            onClick={() => handleCancelOrder(order)}
                            className="whitespace-nowrap rounded-full bg-[#E9EAEE] px-4 py-2 text-black"
                          >
                            Cancel order
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCompleteOrder(order)}
                            className="whitespace-nowrap rounded-full bg-[#E9EAEE] px-4 py-2 text-black"
                          >
                            Mark order as complete
                          </button>
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
    </div>
  );
}
