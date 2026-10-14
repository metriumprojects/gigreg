import React from 'react'
import { Link } from 'react-router-dom'
import { FaDiscord } from "react-icons/fa6";

export default function Footer() {
  return (
    <div className='bg-[#F5F5F5] w-full px-[20px] sm:px-[60px] pt-[20px] pb-[125px] md:py-[40px] flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-[20px] md:gap-0 md:h-[122px] mb-0'>
        <div className="">
            <a href="mailto:help@gigmake.com" className='text-black text-decoration-none text-[14px] font-normal leading-none font-400'>help@gigmake.com</a>
        </div>
        <div className="flex gap-[20px] md:gap-[30px] h-auto md:h-[42px] items-center flex-col md:flex-row">
            <Link className='text-black text-[14px] font-normal leading-none font-400' to="/privacy-policy">Privacy Policy</Link>
            <Link className='text-black text-[14px] font-normal leading-none font-400' to="/terms-of-service">Terms Of Service (CGU)</Link>
            <Link className='text-black text-[14px] font-normal leading-none font-400' to="/cookie-policy">Cookie Policy</Link>
            <Link className='text-black text-[14px] font-normal leading-none font-400' to="/legal-notice">Legal Notice</Link>
            <a href='https://discord.gg/vpFwMVf9' target="_blank" className='flex gap-[10px] items-center h-[42px] rounded-lg px-[20px] py-[10px] bg-[#728ADA] text-[#FFFFFF] text-[14px] font-normal leading-none font-400 justify-center'><FaDiscord/> Join Our Discord</a>
        </div>
    </div>
  )
}
