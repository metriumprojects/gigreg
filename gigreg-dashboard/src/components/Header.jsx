import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { getUser } from '../store/Reducer/AuthReducer';
import { useNavigate } from 'react-router-dom';

const Header = ({ onMenuClick }) => {
  const { userInfo } = useSelector((state) => state.auth);
const dispatch = useDispatch();
const navigate = useNavigate();

// useEffect(() => {
//   if (userInfo.role !== "admin") {
//     navigate("/login");
//   }
// }, [])

useEffect(() => {
  dispatch(getUser())
}, [])

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md hover:bg-gray-100 lg:hidden mr-4"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">Dashboard</h1>
      </div>

      <div className="flex items-center space-x-4">
        
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            <User size={18} />
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{userInfo?.name}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
