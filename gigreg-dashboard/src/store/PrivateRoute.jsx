import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getUser } from "./Reducer/AuthReducer";
import Spinner from "../components/Spinner";

const PrivateRoute = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkUser = async () => {
      if (!userInfo) {
        try {
          await dispatch(getUser()).unwrap();
        } catch (_) {
          // User is not authenticated; redirect handled in render.
        }
      }
      if (isMounted) {
        setCheckingAuth(false);
      }
    };

    checkUser();
    return () => {
      isMounted = false;
    };
  }, [dispatch, userInfo]);

  if (checkingAuth) return <Spinner />;

  if (!userInfo || userInfo.role !== "admin") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default PrivateRoute;
