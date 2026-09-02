import { Calendar, CircleCheck, MessageCircle } from "lucide-react";
import MainLayout from "../../components/MainLayout";

export default function AfterPayment() {
  return (
    <MainLayout>
    <div className="w-full bg-[#f5f5f5] rounded-2xl p-6 flex flex-col items-center text-center md:text-left gap-4 min-h-[77vh]">

      {/* Left Icon */}
      <div className="w-full bg-[#f5f5f5] rounded-2xl p-6 flex flex-col items-center text-center md:flex-row md:text-left md:items-center md:justify-start gap-4">
      <div className="flex items-center justify-center">
  <CircleCheck size={30} className="fill-green-500 text-[#f5f5f5]" />
      </div>

      {/* Text */}
      <p className="text-gray-700 leading-snug">
        Thank you! Your lesson is booked.
        Your teacher will be in touch with you shortly but you can reach out now
        if you have any queries regarding your lesson!
      </p>


      </div>
      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 md:mr-4 mt-2">

        <button className="bg-[#051842] text-white px-5 py-2.5 rounded-full text-sm flex items-center gap-2">
          <span><MessageCircle size={20} /></span> Message teacher
        </button>

        <button className="bg-[#051842] text-white px-5 py-2.5 rounded-full text-sm flex items-center gap-2">
          <span><Calendar size={20} /></span> Add to my calendar
        </button>
        </div>
    </div>
    </MainLayout>
  );
}
