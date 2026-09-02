import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const Spinner = ({ path = "login" }) => {
  const [count, setCount] = useState(3);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);

  // Progress bar animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          return prev + Math.random() * 30;
        }
        return prev;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prevValue) => --prevValue);
    }, 1000);

    if (userInfo) {
      navigate({
        state: location.pathname,
      });
    }

    if (count === 0) {
      setProgress(100);
      setTimeout(() => {
        navigate(`/${path}`, {
          state: location.pathname,
        });
      }, 300);
    }

    return () => clearInterval(interval);
  }, [count, navigate, location, path, userInfo]);

  return (
    <>
      {count !== 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-4">
          <div className="flex flex-col items-center gap-8 max-w-[200px] w-full">

            {/* Progress Bar Container */}
            <div className="w-full">
              {/* Background bar */}
              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                {/* Progress fill */}
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        ""
      )}
    </>
  );
};

export default Spinner;
