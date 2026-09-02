import React from "react";

export default function CategoryCardSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Text skeleton */}
      <div className="mb-3 w-16 h-4 rounded-lg bg-linear-to-r from-gray-200 to-gray-300 animate-pulse"></div>
      {/* Image skeleton */}
      <div className="h-20 w-20 rounded-lg bg-linear-to-r from-gray-200 to-gray-300 animate-pulse"></div>
      
    </div>
  );
}
