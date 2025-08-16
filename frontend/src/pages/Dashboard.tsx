import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Gavel, Plus, Clock, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your auctions and bids
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="bg-primary text-white rounded-full p-3">
                <Gavel className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold">Active Auctions</h3>
                <p className="text-2xl font-bold text-primary">0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="bg-success text-white rounded-full p-3">
                <Clock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold">My Bids</h3>
                <p className="text-2xl font-bold text-success">0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="bg-warning text-white rounded-full p-3">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold">Winning Bids</h3>
                <p className="text-2xl font-bold text-warning">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
          </div>
          <div className="card-content space-y-4">
            <Link to="/auctions/create" className="btn btn-primary w-full">
              <Plus className="h-5 w-5 mr-2" />
              Create New Auction
            </Link>
            <Link to="/auctions" className="btn btn-outline w-full">
              <Gavel className="h-5 w-5 mr-2" />
              Browse Auctions
            </Link>
            <Link to="/my-auctions" className="btn btn-outline w-full">
              View My Auctions
            </Link>
            <Link to="/my-bids" className="btn btn-outline w-full">
              View My Bids
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Activity</h2>
          </div>
          <div className="card-content">
            <p className="text-gray-500 text-center py-8">
              No recent activity to display
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
