import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer, Slide } from "react-toastify";
import PrivateRoute from "./redux/PrivateRoute";

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Build-only site: listings (gigs), no lessons or curriculum
const Login = lazy(() => import("./Pages/Auth/Login"));
const Register = lazy(() => import("./Pages/Auth/Register"));
const Profile = lazy(() => import("./Pages/Profile/Profile"));
const Forget = lazy(() => import("./Pages/Auth/Forget"));
const NewPassword = lazy(() => import("./Pages/Auth/NewPassword"));
const PublicProfile = lazy(() => import("./Pages/Profile/PublicProfile"));
const EditProfile = lazy(() => import("./Pages/Profile/EditProfile"));
const SendMessage = lazy(() => import("./Pages/Auth/SendMessage"));
const Chat = lazy(() => import("./Pages/Chat/Chat"));
const Withdrawal = lazy(() => import("./Pages/withdraw/Withdrawal"));
const VerifyEmail = lazy(() => import("./Pages/Auth/VerifyEmail"));
const MailVerify = lazy(() => import("./Pages/Auth/MailVerify"));
const AfterPaymentCurri = lazy(() => import("./Pages/Payment/AfterPaymentCuri"));
const PaymentCancel = lazy(() => import("./Pages/Payment/PaymentCancel"));
const Privacypolicy = lazy(() => import("./Pages/Footer/Privacypolicy"));
const Termsofservice = lazy(() => import("./Pages/Footer/Termsofservice"));
const Cookiepolicy = lazy(() => import("./Pages/Footer/Cookiepolicy"));
const Legalnotice = lazy(() => import("./Pages/Footer/Legalnotice"));
const CreateListing = lazy(() => import("./Pages/Listing/CreateListing"));
const UpdateListing = lazy(() => import("./Pages/Listing/UpdateListing"));
const ListingDetails = lazy(() => import("./Pages/Listing/ListingDetails"));
const Listing = lazy(() => import("./Pages/Home/Listing"));
const Teach = lazy(() => import("./Pages/Home/Teach"));
const CreateSellerProfile = lazy(() => import("./Pages/Auth/CreateSellerProfile"));
const SellerCreated = lazy(() => import("./Pages/Auth/SellerCreated"));
const ProposalSubmitted = lazy(() => import("./Pages/Auth/ProposalSubmitted"));
const SendProposal = lazy(() => import("./Pages/Auth/SendProposal"));

const App = () => {
  return (
    <>
      <Router>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Listing />} />
            <Route path="/listing" element={<Navigate to="/" replace />} />
            <Route path="/listing/:slug" element={<ListingDetails />} />
            <Route path="/teach" element={<Teach />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/mail-verify/:token" element={<MailVerify />} />
            <Route path="/forget" element={<Forget />} />
            <Route path="/send-message" element={<SendMessage />} />
            <Route path="/new-password/:token" element={<NewPassword />} />

            <Route path="/privacy-policy" element={<Privacypolicy />} />
            <Route path="/terms-of-service" element={<Termsofservice />} />
            <Route path="/cookie-policy" element={<Cookiepolicy />} />
            <Route path="/legal-notice" element={<Legalnotice />} />
            <Route path="/user-profile/:id" element={<PublicProfile />} />

            <Route path="/" element={<PrivateRoute />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/edit-profile" element={<EditProfile />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:id" element={<Chat />} />
              <Route path="/after-payment-curri/:bookId" element={<AfterPaymentCurri />} />
              <Route path="/payment-cancel/:bookId" element={<PaymentCancel />} />
              <Route path="/withdraw-request" element={<Withdrawal />} />
              <Route path="/create-listing" element={<CreateListing />} />
              <Route path="/update-listing/:id" element={<UpdateListing />} />
              <Route path="/create-seller-profile" element={<CreateSellerProfile />} />
              <Route path="/seller-created" element={<SellerCreated />} />
              <Route path="/proposal-submitted" element={<ProposalSubmitted />} />
              <Route path="/send-proposal" element={<SendProposal />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
      <ToastContainer
        position="bottom-center"
        autoClose={2000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        theme="light"
        transition={Slide}
      />
    </>
  );
};

export default App;
