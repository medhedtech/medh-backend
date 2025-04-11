// const express = require('express');
// const router = express.Router();
// const { upload, handleUploadError, cleanupUploadedFiles } = require('../middleware/file-upload');
// const { authenticate } = require('../middleware/auth');

// // Upload single file
// router.post('/uploadMedia',
//   authenticate,
//   (req, res, next) => {
//     console.log('Upload request received');
//     console.log('Request headers:', req.headers);
//     console.log('Request body:', req.body);
//     next();
//   },
//   upload.single('file'),
//   handleUploadError,
//   async (req, res) => {
//     try {
//       console.log('Processing upload request');
//       console.log('Request file:', req.file);

//       if (!req.file) {
//         console.error('No file in request');
//         return res.status(400).json({
//           success: false,
//           message: 'No file uploaded'
//         });
//       }

//       // Validate file object
//       if (!req.file.filename || !req.file.path || !req.file.mimetype) {
//         console.error('Invalid file object:', req.file);
//         cleanupUploadedFiles(req, res, () => {
//           return res.status(400).json({
//             success: false,
//             message: 'Invalid file object received'
//           });
//         });
//         return;
//       }

//       // Return file information
//       const response = {
//         success: true,
//         message: 'File uploaded successfully',
//         data: {
//           filename: req.file.filename,
//           path: req.file.path,
//           size: req.file.size,
//           mimetype: req.file.mimetype,
//           originalname: req.file.originalname
//         }
//       };

//       console.log('Upload successful:', response);
//       res.status(200).json(response);
//     } catch (error) {
//       console.error('Upload error:', error);
//       cleanupUploadedFiles(req, res, () => {
//         res.status(500).json({
//           success: false,
//           message: 'Error uploading file',
//           error: error.message
//         });
//       });
//     }
//   }
// );

// // Upload multiple files
// router.post('/uploadMultiple',
//   authenticate,
//   (req, res, next) => {
//     console.log('Multiple upload request received');
//     console.log('Request headers:', req.headers);
//     console.log('Request body:', req.body);
//     next();
//   },
//   upload.array('files', 10),
//   handleUploadError,
//   async (req, res) => {
//     try {
//       console.log('Processing multiple upload request');
//       console.log('Request files:', req.files);

//       if (!req.files || req.files.length === 0) {
//         console.error('No files in request');
//         return res.status(400).json({
//           success: false,
//           message: 'No files uploaded'
//         });
//       }

//       // Validate files array
//       const invalidFiles = req.files.filter(file => !file.filename || !file.path || !file.mimetype);
//       if (invalidFiles.length > 0) {
//         console.error('Invalid files in request:', invalidFiles);
//         cleanupUploadedFiles(req, res, () => {
//           return res.status(400).json({
//             success: false,
//             message: 'Invalid file objects received'
//           });
//         });
//         return;
//       }

//       // Return files information
//       const response = {
//         success: true,
//         message: 'Files uploaded successfully',
//         data: req.files.map(file => ({
//           filename: file.filename,
//           path: file.path,
//           size: file.size,
//           mimetype: file.mimetype,
//           originalname: file.originalname
//         }))
//       };

//       console.log('Multiple upload successful:', response);
//       res.status(200).json(response);
//     } catch (error) {
//       console.error('Multiple upload error:', error);
//       cleanupUploadedFiles(req, res, () => {
//         res.status(500).json({
//           success: false,
//           message: 'Error uploading files',
//           error: error.message
//         });
//       });
//     }
//   }
// );

// module.exports = router;
