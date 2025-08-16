import { Link } from 'react-router-dom';
import { Clock, Users, TrendingUp } from 'lucide-react';
import AuctionFlowGuide from '../components/auctions/AuctionFlowGuide';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-secondary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to Tap2Win
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              The premier real-time auction platform where every bid counts
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auctions" className="btn btn-lg bg-white text-primary hover:bg-gray-100">
                Browse Auctions
              </Link>
              <Link to="/register" className="btn btn-lg btn-outline border-white text-white hover:bg-white hover:text-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Tap2Win?
            </h2>
            <p className="text-lg text-gray-600">
              Experience the thrill of real-time bidding with our cutting-edge platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Bidding</h3>
              <p className="text-gray-600">
                Place bids instantly and see live updates as they happen
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Live Notifications</h3>
              <p className="text-gray-600">
                Get instant alerts when you're outbid or when auctions end
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Negotiations</h3>
              <p className="text-gray-600">
                Counter-offer system for flexible deal-making
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Auction Flow Guide */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AuctionFlowGuide />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Start Bidding?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of users who trust Tap2Win for their auction needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn btn-lg btn-primary">
              Create Account
            </Link>
            <Link to="/auctions" className="btn btn-lg btn-outline">
              View Auctions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
