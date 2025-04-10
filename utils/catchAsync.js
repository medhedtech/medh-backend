/**
 * Wrapper function to catch errors in async functions
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync; 