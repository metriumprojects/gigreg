import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import MainLayout from "../../components/MainLayout";
import { confirmBooking } from "../../redux/reducers/BookingReducer";

const PaymentCancel = () => {
  const { bookId } = useParams();
  const dispatch = useDispatch();

  useEffect(() => {
    if (bookId) {
      dispatch(confirmBooking({ bookingId: bookId, type: "failed" }));
    }
  }, [bookId, dispatch]);

  return (
    <MainLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-[#051842]/15 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-[#051842]">Payment cancelled</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#051842]/80">
            Your payment was not completed. No charge was made.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex rounded-full bg-[#051842] px-6 py-2.5 text-sm font-medium text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default PaymentCancel;
