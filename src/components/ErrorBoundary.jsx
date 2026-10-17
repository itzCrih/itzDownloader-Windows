import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-screen">
          <div className="error-card">
            <div className="error-icon-box">
              <AlertTriangle size={32} color="#f85149" />
            </div>
            <h2>Something went wrong</h2>
            <p className="error-details">
              {this.state.error?.message || 'An unexpected rendering error occurred in itzDownloader.'}
            </p>
            <button className="btn-primary" onClick={this.handleReload}>
              <RefreshCw size={16} />
              <span>Restart itzDownloader</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
