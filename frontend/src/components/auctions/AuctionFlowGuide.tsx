import { useState } from 'react';
import { 
  Plus, 
  Clock, 
  DollarSign, 
  Users, 
  Gavel, 
  CheckCircle, 
  MessageSquare,
  Trophy,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  details: string[];
}

const AuctionFlowGuide = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps: Step[] = [
    {
      id: 1,
      title: 'Create Auction',
      description: 'Sellers create auctions with item details, starting price, and duration',
      icon: Plus,
      color: 'bg-blue-500',
      details: [
        'Upload item images and description',
        'Set starting price and bid increment',
        'Choose auction duration and start time',
        'Add item category and tags'
      ]
    },
    {
      id: 2,
      title: 'Auction Goes Live',
      description: 'Auction becomes active and buyers can start bidding',
      icon: Clock,
      color: 'bg-green-500',
      details: [
        'Real-time countdown timer',
        'Live participant counter',
        'Current highest bid display',
        'Instant bid validation'
      ]
    },
    {
      id: 3,
      title: 'Real-Time Bidding',
      description: 'Buyers place bids and see live updates',
      icon: DollarSign,
      color: 'bg-yellow-500',
      details: [
        'Instant bid placement',
        'Real-time price updates',
        'Outbid notifications',
        'Bid history tracking'
      ]
    },
    {
      id: 4,
      title: 'Auction Ends',
      description: 'Timer reaches zero and bidding stops',
      icon: Gavel,
      color: 'bg-red-500',
      details: [
        'Automatic auction closure',
        'Final bid determination',
        'Winner announcement',
        'Seller notification'
      ]
    },
    {
      id: 5,
      title: 'Seller Decision',
      description: 'Seller reviews the highest bid and makes a decision',
      icon: Users,
      color: 'bg-purple-500',
      details: [
        'Accept the highest bid',
        'Reject all bids',
        'Make a counter offer',
        'Complete the transaction'
      ]
    },
    {
      id: 6,
      title: 'Transaction Complete',
      description: 'Deal is finalized and both parties are notified',
      icon: Trophy,
      color: 'bg-green-600',
      details: [
        'Email confirmations sent',
        'PDF invoices generated',
        'Payment processing',
        'Item transfer arranged'
      ]
    }
  ];

  const currentStep = steps[activeStep];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">How Tap2Win Works</h2>
        <p className="text-gray-600">
          Complete auction flow from creation to completion
        </p>
      </div>

      {/* Step Navigation */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-2">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeStep === index
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span className="text-sm font-medium">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Details */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-full ${currentStep.color} text-white`}>
            <currentStep.icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {currentStep.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {currentStep.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentStep.details.map((detail, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Flow */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visual Flow</h3>
        <div className="relative">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                    index <= activeStep ? step.color : 'bg-gray-300'
                  }`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="text-xs text-gray-600 mt-2 text-center max-w-20">
                    {step.title}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-1 mt-4 ${
                      index < activeStep ? 'bg-primary' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <h4 className="font-semibold text-blue-900">Real-Time Updates</h4>
          </div>
          <p className="text-sm text-blue-700">
            Live bidding with instant price updates and notifications
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-green-500" />
            <h4 className="font-semibold text-green-900">Smart Notifications</h4>
          </div>
          <p className="text-sm text-green-700">
            Get notified when outbid, auction ends, or decisions are made
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            <h4 className="font-semibold text-purple-900">Flexible Negotiation</h4>
          </div>
          <p className="text-sm text-purple-700">
            Counter-offer system for flexible deal-making
          </p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 mb-4">
          Ready to experience the complete auction flow?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button className="btn btn-primary">
            Browse Auctions
          </button>
          <button className="btn btn-outline">
            Create Auction
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionFlowGuide;
