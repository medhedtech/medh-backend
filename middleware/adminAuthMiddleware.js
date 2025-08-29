import jwt from "jsonwebtoken";
import Admin from "../models/admin-model.js";

// Admin Authentication Middleware
export const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No valid admin token provided.",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is for admin
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    // Find admin in database
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Admin not found.",
      });
    }

    // Check if admin account is active
    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin account is deactivated.",
      });
    }

    // Check if admin account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: "Access denied. Admin account is temporarily locked.",
      });
    }

    // Update last activity
    admin.last_activity = new Date();
    await admin.save();

    // Add admin to request object
    req.admin = {
      id: admin._id,
      email: admin.email,
      full_name: admin.full_name,
      admin_role: admin.admin_role,
      permissions: admin.permissions,
    };

    next();
  } catch (error) {
    console.error("❌ Admin auth middleware error:", error);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid admin token.",
      });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Admin token has expired.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error in admin authentication.",
    });
  }
};

// Admin Role Authorization Middleware
export const adminRoleMiddleware = (requiredRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: "Access denied. Admin authentication required.",
        });
      }

      // If no specific roles required, allow any admin
      if (requiredRoles.length === 0) {
        return next();
      }

      // Check if admin has required role
      if (!requiredRoles.includes(req.admin.admin_role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${requiredRoles.join(" or ")}`,
        });
      }

      next();
    } catch (error) {
      console.error("❌ Admin role middleware error:", error);
      
      res.status(500).json({
        success: false,
        message: "Internal server error in admin role authorization.",
      });
    }
  };
};

// Admin Permission Middleware
export const adminPermissionMiddleware = (requiredPermissions = []) => {
  return (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: "Access denied. Admin authentication required.",
        });
      }

      // Super-admin has all permissions
      if (req.admin.admin_role === "super-admin") {
        return next();
      }

      // If no specific permissions required, allow any admin
      if (requiredPermissions.length === 0) {
        return next();
      }

      // Check if admin has required permissions
      const hasPermission = requiredPermissions.some(permission =>
        req.admin.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${requiredPermissions.join(" or ")}`,
        });
      }

      next();
    } catch (error) {
      console.error("❌ Admin permission middleware error:", error);
      
      res.status(500).json({
        success: false,
        message: "Internal server error in admin permission authorization.",
      });
    }
  };
};


