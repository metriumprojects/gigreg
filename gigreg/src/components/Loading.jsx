import React, { useState, useEffect } from 'react'

const Loading = () => {
  const [progress, setProgress] = useState(0);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-4">
      <div className="flex flex-col items-center gap-8 max-w-md w-full">
        {/* Loading Text */}
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-800">Loading...</p>
          <p className="text-sm text-slate-500 mt-1">Please wait</p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full">
          {/* Background bar */}
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            {/* Progress fill */}
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Progress percentage */}
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-slate-500">Progress</span>
            <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Loading
