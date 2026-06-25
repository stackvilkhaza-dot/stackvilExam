import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const adminInfo = localStorage.getItem('adminInfo');
  
  if (!adminInfo) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
