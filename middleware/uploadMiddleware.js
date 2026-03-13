// middleware.uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const { Octokit } = require("@octokit/rest");
require('dotenv').config();

// GitHub configuration
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// File type validation
const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt'
};

// Use memory storage for GitHub uploads
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const isValid = !!FILE_TYPE_MAP[file.mimetype];
  
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: jpeg, jpg, png, pdf, doc, docx'), false);
  }
};

// Upload middleware
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

// Helper function to create file path in GitHub repo
const createFilePath = (fileName, type = 'uploads') => `public/${type}/${fileName}`;

// Helper function to upload file to GitHub
const uploadFileToGitHub = async (file, fileName, type = 'uploads') => {
  try {
    const filePath = createFilePath(fileName, type);
    const content = file.buffer.toString('base64');
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Upload ${fileName}`,
      content,
      branch: process.env.GITHUB_BRANCH || 'main'
    });
    
    // Return the raw GitHub URL
    return `https://raw.githubusercontent.com/${owner}/${repo}/${process.env.GITHUB_BRANCH || 'main'}/${filePath}`;
  } catch (error) {
    console.error('Error uploading file to GitHub:', error);
    throw new Error('Failed to upload file to GitHub');
  }
};

// Helper function to delete file from GitHub
const deleteFileFromGitHub = async (fileUrl) => {
  try {
    // Extract path from GitHub URL
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const urlParts = fileUrl.split('/');
    const branch = process.env.GITHUB_BRANCH || 'main';
    const pathIndex = urlParts.indexOf(branch) + 1;
    
    if (pathIndex > 0 && pathIndex < urlParts.length) {
      const filePath = urlParts.slice(pathIndex).join('/');
      
      // Get the file's SHA (required for deletion)
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch
      });
      
      // Delete the file
      await octokit.repos.deleteFile({
        owner,
        repo,
        path: filePath,
        message: `Delete ${filePath.split('/').pop()}`,
        sha: fileData.sha,
        branch
      });
    }
  } catch (error) {
    console.error('Error deleting file from GitHub:', error);
    // Don't throw, just log the error
  }
};

// Helper function to generate unique filename
const generateFileName = (originalName, mimetype) => {
  const fileExtension = FILE_TYPE_MAP[mimetype];
  const sanitizedName = originalName.split(' ').join('-').replace(/[^a-zA-Z0-9.-]/g, '');
  const baseName = path.parse(sanitizedName).name;
  return `${baseName}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
};

// Middleware to handle single file upload to GitHub
const uploadSingleToGithub = (fieldName, type = 'uploads') => {
  return async (req, res, next) => {
    try {
      if (!req.file) {
        return next();
      }

      const fileName = generateFileName(req.file.originalname, req.file.mimetype);
      const githubUrl = await uploadFileToGitHub(req.file, fileName, type);
      
      // Attach GitHub info to the file object
      req.file.githubUrl = githubUrl;
      req.file.filename = fileName;
      req.file.path = githubUrl; // Override path with GitHub URL
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to handle multiple file uploads to GitHub
const uploadMultipleToGithub = (fieldName, type = 'uploads', maxCount = 10) => {
  return async (req, res, next) => {
    try {
      const files = req.files?.[fieldName] || req.files;
      
      if (!files || files.length === 0) {
        return next();
      }

      const fileArray = Array.isArray(files) ? files : [files];
      
      const uploadPromises = fileArray.map(async (file) => {
        const fileName = generateFileName(file.originalname, file.mimetype);
        const githubUrl = await uploadFileToGitHub(file, fileName, type);
        
        // Attach GitHub info to the file object
        file.githubUrl = githubUrl;
        file.filename = fileName;
        file.path = githubUrl; // Override path with GitHub URL
        
        return file;
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      
      if (req.files && req.files[fieldName]) {
        req.files[fieldName] = uploadedFiles;
      } else {
        req.files = uploadedFiles;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Cleanup function for failed uploads
const cleanupUploadedFiles = async (files) => {
  if (!files) return;
  
  try {
    const fileUrls = [];
    
    if (Array.isArray(files)) {
      fileUrls.push(...files.map(file => file.githubUrl));
    } else if (typeof files === 'object') {
      Object.values(files).forEach(fileArray => {
        if (Array.isArray(fileArray)) {
          fileUrls.push(...fileArray.map(file => file.githubUrl));
        } else if (fileArray?.githubUrl) {
          fileUrls.push(fileArray.githubUrl);
        }
      });
    }
    
    for (const fileUrl of fileUrls) {
      if (fileUrl) {
        await deleteFileFromGitHub(fileUrl).catch(console.error);
      }
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
};

// Export all utilities
module.exports = {
  upload,
  uploadSingleToGithub,
  uploadMultipleToGithub,
  cleanupUploadedFiles,
  deleteFileFromGitHub,
  FILE_TYPE_MAP
};
