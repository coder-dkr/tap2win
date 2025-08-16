import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { User, LogOut, Plus, Gavel, Home, Settings } from 'lucide-react';
import NotificationPanel from '../notifications/NotificationPanel';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Gavel className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-gray-900">Tap2Win</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/" className="btn btn-ghost">
              <Home className="h-5 w-5" />
              <span className="ml-2">Home</span>
            </Link>
            
            <Link to="/auctions" className="btn btn-ghost">
              <Gavel className="h-5 w-5" />
              <span className="ml-2">Auctions</span>
            </Link>

            {isAuthenticated ? (
              <>
               {(user?.role === 'admin' || user?.role === 'seller') && (
                <Link to="/auctions/create" className="btn btn-primary">
                  <Plus className="h-5 w-5" />
                  <span className="ml-2">Create Auction</span>
                </Link>
              )}

                <NotificationPanel />
                {/* <div className="relative">
                  <button className="btn btn-ghost relative">
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                      rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>
                </div> */}

                <div className="relative group">
                  <button className="btn btn-ghost flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>{user?.username}</span>
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Dashboard
                    </Link>
                    <Link to="/my-auctions" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      My Auctions
                    </Link>
                    <Link to="/my-bids" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      My Bids
                    </Link>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Profile
                    </Link>
                    {user?.role === 'admin' && (
                      <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <Settings className="h-4 w-4 inline mr-2" />
                        Admin Panel
                      </Link>
                    )}
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 inline mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn btn-outline">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
