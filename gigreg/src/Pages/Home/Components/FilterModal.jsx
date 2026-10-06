import React from "react";
import { motion as Motion } from "framer-motion";
import { X } from "lucide-react";

export default function FilterModal({
  open,
  onClose,
  isOnlineSelected,
  isInPersonSelected,
  onModeChange,
  min = 0,
  max = 100000,
  onMinChange,
  onMaxChange,
  onClear,
  onApply,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed bg-black/40 backdrop-blur-xs inset-0 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="bg-white w-full max-w-[420px] rounded-3xl p-6 shadow-2xl relative border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Price Inputs - transparent pill style */}
        <div className="mb-6 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Minimum</span>
              <div className="relative flex items-center h-11 rounded-full border-[1.5px] border-black bg-white px-3.5 transition-all focus-within:ring-2 focus-within:ring-black/10">
                <span className="text-sm font-bold text-black select-none mr-1.5">$</span>
                <input
                  type="number"
                  min="0"
                  max="99999"
                  value={min}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    onMinChange?.(val);
                  }}
                  className="w-full bg-transparent text-sm font-semibold text-black outline-none placeholder:text-gray-400"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Maximum</span>
              <div className="relative flex items-center h-11 rounded-full border-[1.5px] border-black bg-white px-3.5 transition-all focus-within:ring-2 focus-within:ring-black/10">
                <span className="text-sm font-bold text-black select-none mr-1.5">$</span>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={max}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    onMaxChange?.(val);
                  }}
                  className="w-full bg-transparent text-sm font-semibold text-black outline-none placeholder:text-gray-400"
                  placeholder="100000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClear}
            className="h-11 px-5 rounded-full border-[1.5px] border-gray-200 text-sm font-semibold text-gray-700 hover:text-black hover:border-black hover:bg-gray-50 transition-all cursor-pointer"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onApply || onClose}
            className="h-11 px-7 rounded-full bg-primary hover:opacity-90 text-white text-sm font-bold shadow-sm transition-all cursor-pointer active:scale-98"
          >
            Search
          </button>
        </div>
      </Motion.div>
    </div>
  );
}
