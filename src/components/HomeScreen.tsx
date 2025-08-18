import React, { useState } from 'react';
import { SignatureCanvas } from './SignatureCanvas';
import { SignatureApplicator } from './SignatureApplicator';
import { Signature } from '../models/Signature';

interface HomeScreenProps {
  userId?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  userId = 'default-user' 
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'about'>('create');
  const [signatures, setSignatures] = useState<Signature[]>([]);

  const handleSignatureSave = (signature: Signature) => {
    setSignatures(prev => [...prev, signature]);
  };

  const handleSignatureApplied = (signature: Signature, position: { x: number; y: number }) => {
    console.log('Signature applied:', signature, 'at position:', position);
    // Handle signature application logic here
  };

  return (
    <div className="homescreen">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 24L24 8M8 8L24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h1>SignaturePro</h1>
          </div>
          <nav className="nav">
            <button 
              className={`nav-button ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" fill="currentColor"/>
              </svg>
              Create
            </button>
            <button 
              className={`nav-button ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" fill="currentColor"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L16 11.586V5a2 2 0 00-2-2v1a1 1 0 01-1 1H7a1 1 0 01-1-1V3a2 2 0 00-2 2v10a2 2 0 002 2h5.586l-1.293-1.293a1 1 0 111.414-1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L16 16.586H6a2 2 0 01-2-2V5z" clipRule="evenodd" fill="currentColor"/>
              </svg>
              Manage
            </button>
            <button 
              className={`nav-button ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" fill="currentColor"/>
              </svg>
              About
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {activeTab === 'create' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Create Your Signature</h2>
                <p>Draw your signature using the canvas below. Your signature will be saved securely for future use.</p>
              </div>
              <div className="signature-canvas-wrapper">
                <SignatureCanvas
                  width={600}
                  height={250}
                  onSave={handleSignatureSave}
                  className="modern-canvas"
                />
              </div>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                  </div>
                  <h3>Secure Storage</h3>
                  <p>Your signatures are stored securely with encryption</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <h3>Multiple Formats</h3>
                  <p>Export signatures in various formats for different uses</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M17 7H22V9H19V12H17V9H14V7H17V4H19V7H17ZM12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <h3>Easy Integration</h3>
                  <p>Seamlessly integrate signatures into your documents</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Manage Signatures</h2>
                <p>View, organize, and apply your saved signatures to documents.</p>
              </div>
              <SignatureApplicator
                userId={userId}
                onSignatureApplied={handleSignatureApplied}
                documentWidth={800}
                documentHeight={600}
              />
            </div>
          )}

          {activeTab === 'about' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>About SignaturePro</h2>
                <p>Professional digital signature solution for modern workflows.</p>
              </div>
              <div className="about-content">
                <div className="about-section">
                  <h3>Features</h3>
                  <ul>
                    <li>✓ Create digital signatures with touch or mouse</li>
                    <li>✓ Secure signature storage and management</li>
                    <li>✓ Multiple signature formats and styles</li>
                    <li>✓ Document integration capabilities</li>
                    <li>✓ Cross-platform compatibility</li>
                  </ul>
                </div>
                <div className="about-section">
                  <h3>Security</h3>
                  <p>
                    Your signatures are protected with industry-standard encryption. 
                    We prioritize your privacy and ensure that your signature data 
                    remains secure and confidential.
                  </p>
                </div>
                <div className="about-section">
                  <h3>Support</h3>
                  <p>
                    Need help? Our support team is available to assist you with 
                    any questions or issues you may encounter while using SignaturePro.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 SignaturePro. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#support">Support</a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .homescreen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #333;
        }

        .header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #4f46e5;
        }

        .logo h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .nav {
          display: flex;
          gap: 0.5rem;
        }

        .nav-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-radius: 0.5rem;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nav-button:hover {
          background: rgba(79, 70, 229, 0.1);
          color: #4f46e5;
        }

        .nav-button.active {
          background: #4f46e5;
          color: white;
        }

        .main-content {
          flex: 1;
          padding: 2rem 0;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .tab-content {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .section-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .section-header h2 {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .section-header p {
          font-size: 1.125rem;
          color: #6b7280;
          margin: 0;
        }

        .signature-canvas-wrapper {
          display: flex;
          justify-content: center;
          margin: 2rem 0;
          padding: 2rem;
          background: #f9fafb;
          border-radius: 0.75rem;
          border: 2px dashed #d1d5db;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-top: 3rem;
        }

        .feature-card {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 0.75rem;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .feature-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          background: #4f46e5;
          color: white;
          border-radius: 0.75rem;
          margin-bottom: 1rem;
        }

        .feature-card h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .feature-card p {
          color: #6b7280;
          margin: 0;
        }

        .about-content {
          display: grid;
          gap: 2rem;
          margin-top: 2rem;
        }

        .about-section h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .about-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .about-section li {
          padding: 0.5rem 0;
          color: #4b5563;
        }

        .about-section p {
          color: #6b7280;
          line-height: 1.6;
          margin: 0;
        }

        .footer {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1.5rem 0;
        }

        .footer .container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer p {
          margin: 0;
          color: #6b7280;
        }

        .footer-links {
          display: flex;
          gap: 1.5rem;
        }

        .footer-links a {
          color: #6b7280;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-links a:hover {
          color: #4f46e5;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }

          .nav {
            width: 100%;
            justify-content: center;
          }

          .nav-button {
            flex: 1;
            justify-content: center;
            padding: 0.75rem 0.5rem;
          }

          .container {
            padding: 0 1rem;
          }

          .tab-content {
            padding: 1.5rem;
          }

          .section-header h2 {
            font-size: 1.5rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .footer .container {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .signature-canvas-wrapper {
            padding: 1rem;
          }
        }

        @media (max-width: 480px) {
          .nav {
            flex-direction: column;
          }

          .nav-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default HomeScreen;