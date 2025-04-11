module.exports = {
  success: (res, data, message = "Operation successful", status = 200) => {
    return res.status(status).json({ success: true, message, data });
  },
  error: (res, message = "Operation failed", error = null, status = 500) => {
    return res.status(status).json({ success: false, message, error });
  },
};
