// Role-based authorization middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated (auth middleware should run first)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      // Check if user's role is in the allowed roles array
      if (!allowedRoles.includes(req.userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization failed.'
      });
    }
  };
};

// Specific role middlewares for convenience
const isFactory = authorize('factory');
const isTechnician = authorize('technician');
const isAdmin = authorize('admin');
const isFactoryOrTechnician = authorize('factory', 'technician');
const isFactoryOrAdmin = authorize('factory', 'admin');
const isTechnicianOrAdmin = authorize('technician', 'admin');

module.exports = {
  authorize,
  isFactory,
  isTechnician,
  isAdmin,
  isFactoryOrTechnician,
  isFactoryOrAdmin,
  isTechnicianOrAdmin
};