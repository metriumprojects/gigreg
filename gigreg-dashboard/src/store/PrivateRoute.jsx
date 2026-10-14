import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getUser } from "./Reducer/AuthReducer";
import Spinner from "../components/Spinner";

const PrivateRoute = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);
  const [checkingAuth, setCheckingAuth] = useState(!userInfo);

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");

      if (!userInfo) {
        if (!token) {
          if (isMounted) setCheckingAuth(false);
          return;
        }

        try {
          await dispatch(getUser()).unwrap();
        } catch (_) {
          // Token invalid or expired
        }
      }

      if (isMounted) {
        setCheckingAuth(false);
      }
    };

    if (!userInfo) {
      checkUser();
    } else {
      setCheckingAuth(false);
    }

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

