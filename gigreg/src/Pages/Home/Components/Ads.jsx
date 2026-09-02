"use client";
import React from "react";
import { Star } from "lucide-react";

const Ads = () => {
  return (
    <div
      className="relative rounded-[20px] overflow-hidden shadow-lg w-full flex items-end my-6"
      style={{
        backgroundImage: `url('https://i.ibb.co/23P4712f/bgsk.png')`, // replace with your image path
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Content */}
      <div className="relative z-10 text-white p-10 max-w-lg space-y-4">
        {/* Title */}
        <h2 className="text-xl font-semibold">Assemble a PC in 3 Hours</h2>

        {/* Instructor Info */}
        <div className="flex items-center gap-3">
          <img
            src="https://i.ibb.co/tpV3m2GW/no-image.png"
            alt="Instructor"
            className="w-9 h-9 rounded-full object-cover border border-white/40"
          />
          <div>
            <p className="text-base font-medium">Martin Passaquindici Arcand</p>
            <p className="text-base text-gray-300">United States</p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center text-yellow-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-current" />
          ))}
        </div>

        {/* Description */}
        <p className="text-base text-gray-100 line-clamp-2">
          Great mic for the price! ZealSound offers excellent sound quality...
        </p>

        {/* Button */}
        <button className="bg-white text-black px-4 py-2 rounded-md font-medium text-base hover:bg-gray-200 transition">
          Learn More
        </button>
      </div>
    </div>
  );
};

export default Ads;
