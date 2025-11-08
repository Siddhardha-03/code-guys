import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="text-xl font-bold flex items-center">
              <span className="mr-2">🧑‍💻</span>
              <span>CodeGuy</span>
            </Link>
            <p className="text-gray-400 mt-2">
              Improve your coding skills with practice problems and quizzes
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-lg font-semibold mb-2">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/practice" className="text-gray-400 hover:text-white transition-colors">
                    Practice Problems
                  </Link>
                </li>
                <li>
                  <Link to="/quizzes" className="text-gray-400 hover:text-white transition-colors">
                    Coding Quizzes
                  </Link>
                </li>
                <li>
                  <Link to="/compiler" className="text-gray-400 hover:text-white transition-colors">
                    Online Compiler
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Account</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-gray-400 hover:text-white transition-colors">
                    Register
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
          <p>&copy; {currentYear} CodeGuy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;