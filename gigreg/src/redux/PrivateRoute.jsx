import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getUser } from "./reducers/AuthReducer";

const PrivateRoute = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);
  const [checked, setChecked] = useState(Boolean(userInfo));

  useEffect(() => {
    let active = true;

    if (userInfo) {
      setChecked(true);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setChecked(true);
      return;
    }

    dispatch(getUser()).finally(() => {
      if (active) setChecked(true);
    });

    return () => {
      active = false;
    };
  }, [dispatch, userInfo]);

  if (userInfo) {
    return <Outlet />;
  }

  if (!checked) {
    return null;
  }

  return <Navigate to="/login" replace state={location.pathname} />;
};

export default PrivateRoute;
