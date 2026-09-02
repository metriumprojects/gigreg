import React from "react";

export default function ProfessionalLoader({ message = "Loading..." }) {
  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      {/* <div className="flex flex-col items-center gap-6 max-w-md">
        <div className="relative w-20 h-20">
   
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin"></div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-slate-800">{message}</p>
          <p className="text-sm text-slate-500">Please wait a moment...</p>
        </div>

      
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }}></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.15s" }}></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.3s" }}></div>
        </div>
      </div> */}
    </div>
  );
}
