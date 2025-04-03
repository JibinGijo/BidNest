import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { compareTwoStrings } from 'string-similarity';

interface Message {
  type: 'user' | 'bot';
  content: React.ReactNode;
  timestamp: Date;
}

interface ListingInfo {
  id: string;
  title: string;
  starting_price: number;
  current_bid: number | null;
  status: string;
}

// Predefined responses for basic queries
const RESPONSES = {
  greetings: 'Hello! How can I assist you today?',
  websiteInfo: 'This is BidNest, an online auction platform where you can bid on unique items and win amazing deals!',
  bidding: 'To place a bid, go to the auction page, enter your bid amount, and click "Place Bid."',
  cancelBid: 'Sorry, bids cannot be canceled once placed. Please make sure to bid carefully!',
  winningBid: 'The highest bid at the end of the auction wins the item. To increase your chances, bid competitively!',
  auctionTime: 'Each auction lasts for 7 days from the time it was created. The remaining time is displayed on the auction page.',
  auctionRules: 'The rules are simple: place your bid higher than the current bid, and the highest bidder wins when the auction ends.',
  payment: 'Payment details will be provided after you win an auction.',
  shipping: 'Shipping details are handled directly between the buyer and seller after the auction ends.',
  accountCreation: 'You can create an account by clicking "Register" in the top menu. It\'s quick and easy!',
  support: 'I\'m here to help! You can ask me about bidding, auctions, or anything else related to BidNest.',
  default: "I'm sorry, I didn't understand that. Can you please rephrase or ask another question?"
};

// Keywords for Intent Matching
const KEYWORDS = {
  greetings: ['hello', 'hi', 'hey', 'howdy'],
  websiteInfo: ['what is this', 'about', 'tell me about', 'what do you do'],
  bidding: ['how to bid', 'place bid', 'bidding', 'make bid'],
  cancelBid: ['cancel bid', 'remove bid', 'undo bid', 'delete bid'],
  winningBid: ['how to win', 'winning bid', 'win auction'],
  auctionTime: ['how long', 'auction time', 'when end', 'duration'],
  auctionRules: ['rules', 'how work', 'guidelines'],
  payment: ['payment', 'how pay', 'pay'],
  shipping: ['shipping', 'delivery', 'send'],
  accountCreation: ['create account', 'sign up', 'register', 'join'],
  support: ['help', 'support', 'assist'],
  itemQuery: ['bid on', 'price of', 'status of', 'info about']
};

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentListing, setCurrentListing] = useState<ListingInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      handleBotResponse("Hi! I'm your local BidNest assistant. I can help you with bidding, listing items, and managing your account right here on your machine. How can I assist you today?");
    }
  }, [isOpen]);

  useEffect(() => {
    // Check if we're on a product detail page
    const match = location.pathname.match(/\/products\/(.+)/);
    if (match) {
      fetchListingInfo(match[1]);
    } else {
      setCurrentListing(null);
    }
  }, [location]);

  const fetchListingInfo = async (listingId: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error) throw error;
      setCurrentListing(data);
    } catch (err) {
      console.error('Error fetching listing info:', err);
    }
  };

  // Check if a string is a whole word in the message
  const isWholeWord = (word: string, message: string) => {
    const wordPattern = new RegExp(`\\b${word}\\b`, 'i');
    return wordPattern.test(message);
  };

  // Find the best matching intent for a user message
  const findBestMatch = (userMessage: string) => {
    const lowerCaseMessage = userMessage.toLowerCase();
    let bestMatch = { intent: null as string | null, score: 0 };

    // First check if it's an item query
    for (const keyword of KEYWORDS.itemQuery) {
      if (lowerCaseMessage.includes(keyword)) {
        return { intent: 'itemQuery', score: 1 };
      }
    }

    // Then check other intents
    for (const [intent, keywords] of Object.entries(KEYWORDS)) {
      // Skip itemQuery as we've already checked it
      if (intent === 'itemQuery') continue;

      for (const keyword of keywords) {
        const similarity = compareTwoStrings(lowerCaseMessage, keyword);
        
        if (similarity > bestMatch.score) {
          bestMatch = { intent, score: similarity };
        }
        
        // Check for exact whole word match
        if (isWholeWord(keyword, lowerCaseMessage)) {
          bestMatch = { intent, score: 1 };
          break;
        }
      }
    }

    return bestMatch.score > 0.5 ? bestMatch : { intent: null, score: 0 };
  };

  const handleBotResponse = (content: React.ReactNode) => {
    setMessages(prev => [...prev, {
      type: 'bot',
      content,
      timestamp: new Date()
    }]);
  };

  const handleUserMessage = async (message: string) => {
    setMessages(prev => [...prev, {
      type: 'user',
      content: message,
      timestamp: new Date()
    }]);

    const matchResult = findBestMatch(message);
    const lowerMessage = message.toLowerCase();

    if (matchResult.intent === 'itemQuery' && currentListing) {
      handleBotResponse(
        <div>
          For {currentListing.title} on your local machine:
          <ul className="list-disc ml-4 mt-2">
            <li>Starting Price: ${currentListing.starting_price}</li>
            <li>Current Bid: ${currentListing.current_bid || currentListing.starting_price}</li>
            <li>Status: {currentListing.status}</li>
          </ul>
          {currentListing.status === 'active' && (
            <p className="mt-2">You can place a bid higher than ${currentListing.current_bid || currentListing.starting_price} right now to participate in this auction.</p>
          )}
        </div>
      );
    } else if (matchResult.intent && RESPONSES[matchResult.intent as keyof typeof RESPONSES]) {
      handleBotResponse(RESPONSES[matchResult.intent as keyof typeof RESPONSES]);
    } else if (lowerMessage.includes('end') && lowerMessage.includes('auction')) {
      handleBotResponse(
        <div>
          To end an auction on your local BidNest:
          <ol className="list-decimal ml-4 mt-2">
            <li>Navigate to "Your Listings" in the menu or <Link to="/your-listings" className="text-indigo-600 hover:text-indigo-800">click here</Link></li>
            <li>Select the listing you want to end</li>
            <li>Use the "End Auction" button at the top</li>
            <li>Confirm your decision in the popup</li>
          </ol>
          <p className="mt-2">Note: Once ended, the auction cannot be restarted. The highest local bidder will automatically win.</p>
        </div>
      );
    } else if (lowerMessage.includes('won') || lowerMessage.includes('winning')) {
      handleBotResponse(
        <div>
          To check your won auctions on your local machine:
          <ol className="list-decimal ml-4 mt-2">
            <li>Ensure you're logged into your local account</li>
            <li>Click "Auctions Won" in the top menu or <Link to="/auctions-won" className="text-indigo-600 hover:text-indigo-800">click here</Link></li>
          </ol>
          <p className="mt-2">You'll see all your winning auctions, including:</p>
          <ul className="list-disc ml-4 mt-2">
            <li>Item details</li>
            <li>Your winning bid amount</li>
            <li>When you won</li>
            <li>Local seller contact information</li>
          </ul>
        </div>
      );
    } else if (lowerMessage.includes('login') || lowerMessage.includes('sign in')) {
      handleBotResponse(
        <div>
          To access your local BidNest account:
          <ol className="list-decimal ml-4 mt-2">
            <li>Click "Login" in the top right or <Link to="/login" className="text-indigo-600 hover:text-indigo-800">click here</Link></li>
            <li>Enter your local email and password</li>
            <li>Click "Sign in" to access your account</li>
          </ol>
          <p className="mt-2">Need a local account? <Link to="/register" className="text-indigo-600 hover:text-indigo-800">Register here</Link></p>
        </div>
      );
    } else if (lowerMessage.includes('bid') || lowerMessage.includes('bidding')) {
      let minBidInfo = '';
      if (currentListing) {
        const minBid = currentListing.current_bid || currentListing.starting_price;
        minBidInfo = `\nFor this item on your local auction, your bid must be higher than $${minBid}.`;
      }

      handleBotResponse(
        <div>
          Here's how to place a bid on your local BidNest:
          <ol className="list-decimal ml-4 mt-2">
            <li>Browse the available local auctions</li>
            <li>Select an item you're interested in</li>
            <li>Enter your bid (must exceed current bid)</li>
            <li>Click "Place Bid" to confirm</li>
          </ol>
          <p className="mt-2">
            Important: You need to be logged in to your local account to bid. The highest local bid when the auction ends wins!
            {minBidInfo}
          </p>
        </div>
      );
    } else if (lowerMessage.includes('sell') || lowerMessage.includes('listing')) {
      handleBotResponse(
        <div>
          To create a new listing on your local BidNest:
          <ol className="list-decimal ml-4 mt-2">
            <li>Log into your local account</li>
            <li>Click "Create Listing" in the menu or <Link to="/create-listing" className="text-indigo-600 hover:text-indigo-800">click here</Link></li>
            <li>Fill in your item details</li>
            <li>Upload a photo from your local machine</li>
            <li>Click "Create Listing" to go live</li>
          </ol>
          <p className="mt-2">
            Your listing will be active for 7 days on your local marketplace. Monitor bids and manage your listing from your 
            <Link to="/your-listings" className="text-indigo-600 hover:text-indigo-800 mx-1">Your Listings</Link> 
            dashboard.
          </p>
        </div>
      );
    } else if (lowerMessage.includes('register') || lowerMessage.includes('sign up')) {
      handleBotResponse(
        <div>
          To create your local BidNest account:
          <ol className="list-decimal ml-4 mt-2">
            <li>Click "Register" at the top right or <Link to="/register" className="text-indigo-600 hover:text-indigo-800">click here</Link></li>
            <li>Enter your email</li>
            <li>Choose a secure password</li>
            <li>Click "Register" to create your local account</li>
          </ol>
          <p className="mt-2">Once registered, you can start bidding and selling on your local BidNest marketplace!</p>
        </div>
      );
    } else {
      handleBotResponse(
        <div>
          I'm your local BidNest assistant. Here's what I can help you with:
          <ul className="list-disc ml-4 mt-2">
            <li>Managing your local account (login/register)</li>
            <li>Placing bids on local auctions</li>
            <li>Creating listings on your local marketplace</li>
            <li>Managing your local auctions</li>
            <li>Checking your won auctions</li>
            <li>Getting current bid information</li>
            <li>Accessing local support</li>
          </ul>
          <p className="mt-2">How can I assist you with your local BidNest experience?</p>
        </div>
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleUserMessage(input.trim());
      setInput('');
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-xl w-96 h-[32rem] flex flex-col">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center">
              <Bot className="h-6 w-6 mr-2" />
              <h3 className="font-semibold">Local BidNest Assistant</h3>
            </div>
            <button
              onClick={toggleChat}
              className="text-white hover:text-indigo-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.content}
                  <div
                    className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-indigo-200' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={toggleChat}
          className="bg-indigo-600 text-white rounded-full p-3 shadow-lg hover:bg-indigo-700 transition-colors"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}