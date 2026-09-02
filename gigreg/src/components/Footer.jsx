import React from 'react'
import { Link } from 'react-router-dom'
import { FaDiscord } from "react-icons/fa6";

export default function Footer() {
  return (
    <div className='bg-[#F5F5F5] h-[122px] w-full px-[60px] py-[40px] flex justify-between items-center max-sm:text-center max-sm:flex-col max-sm:h-[376px] max-sm:gap-[20px] max-sm:justify-center max-sm:items-center max-sm:py-[40px] max-sm:px-[60px] mb-15 md:mb-0 lg:mb-0'>
        <div className="">
            <a href="mailto:help@skillslide.com" className='text-[#000000] text-decoration-none text-[14px] font-normal leading-none font-400'>help@skillslide.com</a>
        </div>
        <div className="flex gap-[30px] h-[42px] items-center max-sm:flex-col max-sm:items-center max-sm:h-auto">
            <Link className='text-[#000000] text-[14px] font-normal leading-none font-400' to="/privacy-policy">Privacy Policy</Link>
            <Link className='text-[#000000] text-[14px] font-normal leading-none font-400' to="/terms-of-service">Terms Of Service (CGU)</Link>
            <Link className='text-[#000000] text-[14px] font-normal leading-none font-400' to="/cookie-policy">Cookie Policy</Link>
            <Link className='text-[#000000] text-[14px] font-normal leading-none font-400' to="/legal-notice">Legal Notice</Link>
            <a href='https://discord.gg/vpFwMVf9' target="_blank" className='flex gap-[10px] items-center h-[42px] rounded-lg px-[20px] py-[10px] bg-[#728ADA] text-[#FFFFFF] text-[14px] font-normal leading-none font-400 max-sm:justify-center'><FaDiscord/> Join Our Discord</a>
        </div>
      
    </div>
  )
}
