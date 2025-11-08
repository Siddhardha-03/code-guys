import React from 'react';
import { Link } from 'react-router-dom';

const Home = ({ user }) => {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Improve Your Coding Skills with <span className="text-primary-600">CodeGuy</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Practice coding problems, take quizzes, and track your progress to become a better programmer.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/practice"
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
          >
            Start Practicing
          </Link>
          {!user && (
            <Link
              to="/register"
              className="bg-white border-2 border-primary-600 text-primary-600 hover:bg-gray-50 px-6 py-3 rounded-md font-medium transition-colors"
            >
              Create Account
            </Link>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose CodeGuy?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4 text-primary-600">💻</div>
            <h3 className="text-xl font-semibold mb-2">Coding Practice</h3>
            <p className="text-gray-600">
              Solve real-world coding problems with our interactive compiler and get instant feedback.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4 text-primary-600">📝</div>
            <h3 className="text-xl font-semibold mb-2">Coding Quizzes</h3>
            <p className="text-gray-600">
              Test your knowledge with our coding quizzes covering various programming concepts.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4 text-primary-600">📊</div>
            <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
            <p className="text-gray-600">
              Track your progress and see how you're improving over time with detailed statistics.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-primary-600 text-white rounded-lg p-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to become a better programmer?</h2>
        <p className="text-xl mb-6">Join thousands of developers who are improving their skills with CodeGuy.</p>
        <Link
          to={user ? "/practice" : "/register"}
          className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-md font-medium inline-block transition-colors"
        >
          {user ? "Start Practicing" : "Sign Up Now"}
        </Link>
      </section>
    </div>
  );
};

export default Home;