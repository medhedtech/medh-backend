# User Preferences

## Important Files
- controllers/brouchers-controller.js - Handles brochure operations
- controllers/course-controller.js - Handles course operations
- models/broucker-model.js - Brochure data model
- models/course-model.js - Course data model
- utils/validation-helpers.js - Utility functions for validation

## API Structure
- Standard RESTful API pattern
- Response format: `{ success: boolean, message: string, data: object }`
- Error format: `{ success: false, message: string, error: string }`
- Pagination format: `{ data: { items: [], totalItems: number, totalPages: number, currentPage: number } }`

## Design Consistency
- Controller methods follow standard pattern:
  - Input validation
  - Data processing
  - Response formatting
- All IDs validated using validateObjectId helper
- All endpoints return standardized success/error responses
- Error handling includes specific error messages and logs

## Coding Techniques
- Async/await for asynchronous operations
- Try/catch blocks for error handling
- MongoDB aggregation for analytics
- Filtering using query parameters
- Modular exports for controller functions

## Notes
- Broucher and brouchers may be misspelled (should be "brochure" and "brochures")
- The server uses nodemailer for sending emails with brochure attachments
- Error handling includes both user-friendly messages and detailed logs 