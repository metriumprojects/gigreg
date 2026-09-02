import React from "react";

const CurriculumCardSkeleton = () => {
  return (
    <div className="mb-7 min-w-0 animate-pulse">
      {/* Title Skeleton */}
      {/* <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div> */}

      {/* Image Skeleton */}
      <div className="relative aspect-square w-full rounded-[20px] bg-gray-200">
        <div className="absolute left-3 top-3 h-6 w-14 rounded-full bg-gray-300" />
        <div className="absolute right-3 top-3 h-7 w-7 rounded-full bg-gray-300" />
      </div>

      {/* Content Skeleton */}
      <div className="space-y-2 pt-2">
        <div className="h-4 w-11/12 rounded bg-gray-200" />
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-8 w-40 rounded-full bg-gray-200" />
      </div>
    </div>
  );
};

export default CurriculumCardSkeleton;
