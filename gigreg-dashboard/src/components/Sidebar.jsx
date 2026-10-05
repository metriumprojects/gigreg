import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Layers, Store, Images, X, LogOut } from "lucide-react";
import { getUser, LogoutUser } from "../store/Reducer/AuthReducer";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";

const Sidebar = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Store, label: "Listings", path: "/listings" },
    { icon: Layers, label: "Categories", path: "/categories" },
    { icon: Images, label: "Home Slider", path: "/home-slider" },
  ];

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(LogoutUser()).then((res) => {
      if (res.payload.status) {
        toast.success(res.payload.message);
        dispatch(getUser());
      } else {
        toast.error(res.payload.message);
      }
    });
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen w-64 border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:h-auto lg:min-h-screen lg:translate-x-0
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
          <span className="text-xl font-bold text-primary">Gigreg Admin</span>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100 lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1 p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`
                flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors
                ${
                  isActive(item.path)
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <item.icon size={20} className="mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={20} className="mr-3" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
