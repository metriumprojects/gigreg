import React from "react";
import { X, DollarSign, UserRound, SquarePen } from "lucide-react";
import { motion } from "framer-motion";

const Info = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div    initial={{ opacity: 0, y: -20, scale: 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }}
        transition={{ duration: 0.35, ease: "easeOut" }} className="bg-white max-w-5xl rounded shadow-xl p-6 overflow-hidden relative animate-fadeIn  max-h-[95vh] overflow-y-auto hide-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white rounded-full p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Section */}
        <div>
            <img src="https://i.ibb.co/PZXtJ1ZG/Frame-1261153765.png" alt="img" />
        </div>

        {/* How it Works Section */}
        <div className="py-8 text-center">
                <div className="bg-[#F5F5F5] p-4">
          <h3 className="text-xl font-semibold mb-6">How it works</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 rounded-full"><UserRound size={33} /></div>
              <h4 className="font-semibold mb-1">1. Create a seller profile</h4>
              <p className="text-gray-500 text-sm">Sign up for free, set up your profile in minutes, and start sharing your knowledge.</p>
            </div>

            <div>
              <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 rounded-full"><SquarePen size={33} /></div>
              <h4 className="font-semibold mb-1">2. Create a listing</h4>
              <p className="text-gray-500 text-sm">Create your first listing, set availability, and get notified when a client books.</p>
            </div>

            <div>
              <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 rounded-full"><DollarSign size={33} /></div>
              <h4 className="font-semibold mb-1">3. Get paid</h4>
              <p className="text-gray-500 text-sm">All listings are prepaid — you’ll always receive your payment on time.</p>
            </div>
          </div>
          </div>

          {/* Mentions */}
          <div className="mt-10">
            <h4 className="text-lg font-semibold text-gray-600 mb-4">They mentioned us ...</h4>
            <marquee className=" w-full">
                <div className="flex items-center gap-22 w-full">
                <img src="https://i.ibb.co/4Z5g5gck/Frame-1261154430.png" alt="mention-1" className="h-22 object-cover" />
                <img src="https://i.ibb.co/99Hk80GF/Frame-1261154429.png" alt="mention-1" className="h-22 object-cover" />
                <img src="https://i.ibb.co/gMjNqcNz/ab6765630000ba8a0cd30ecb4ab45ba3c6cba5f6.png" alt="mention-1" className="h-22 object-cover" />
                <img src="https://i.ibb.co/7JSTCnnj/Frame-1261154431.png" alt="mention-1" className="h-22 object-cover" />
                <img src="https://i.ibb.co/cXsLBW69/ab6765630000ba8adb02dd7e735e527d2937647c.png" alt="mention-1" className="h-22 object-cover" />
                </div>
            </marquee>
          </div>

        </div>
          <button className="mt-8 bg-primary text-white px-6 py-2 rounded font-medium">Start now, make money!</button>
      </motion.div>
    </div>
  );
};

export default Info;