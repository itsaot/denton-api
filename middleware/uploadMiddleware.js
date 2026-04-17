const multer = require('multer');
const path = require('path');
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt'
};

const createFilePath = (fileName, type = 'uploads') => `public/${type}/${fileName}`;

const generateFileName = (originalname, mimetype) => {
  const fileExtension = FILE_TYPE_MAP[mimetype];
  if (!fileExtension) {
    throw new Error(`Invalid file type: ${mimetype}`);
  }
  const base = path.basename(originalname, path.extname(originalname)).split(' ').join('-');
  return `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExtension}`;
};

const uploadFileToGitHub = async (file, fileName, type = 'uploads') => {
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

  return `https://raw.githubusercontent.com/${owner}/${repo}/${process.env.GITHUB_BRANCH || 'main'}/${filePath}`;
};

const deleteFileFromGitHub = async (fileUrl) => {
  try {
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const urlParts = fileUrl.split('/');
    const branch = process.env.GITHUB_BRANCH || 'main';
    const pathIndex = urlParts.indexOf(branch) + 1;

    if (pathIndex > 0 && pathIndex < urlParts.length) {
      const ghPath = urlParts.slice(pathIndex).join('/');

      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: ghPath,
        ref: branch
      });

      await octokit.repos.deleteFile({
        owner,
        repo,
        path: ghPath,
        message: `Delete ${ghPath.split('/').pop()}`,
        sha: fileData.sha,
        branch
      });
    }
  } catch (error) {
    console.error('Error deleting file from GitHub:', error);
  }
};

const cleanupUploadedFiles = async (files) => {
  if (!files) return;

  const urls = [];
  if (Array.isArray(files)) {
    files.forEach((f) => {
      if (f.githubUrl) urls.push(f.githubUrl);
    });
  } else {
    if (files.documents) urls.push(...files.documents.map((f) => f.githubUrl).filter(Boolean));
    if (files.media) urls.push(...files.media.map((f) => f.githubUrl).filter(Boolean));
    if (files.file && files.file.githubUrl) urls.push(files.file.githubUrl);
  }

  for (const fileUrl of urls) {
    await deleteFileFromGitHub(fileUrl).catch(console.error);
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!FILE_TYPE_MAP[file.mimetype]) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});

const uploadSingleToGithub = (_fieldName, type = 'uploads') => async (req, res, next) => {
  try {
    if (!req.file) return next();
    const fileName = generateFileName(req.file.originalname, req.file.mimetype);
    const githubUrl = await uploadFileToGitHub(req.file, fileName, type);
    req.file.githubUrl = githubUrl;
    req.file.filename = fileName;
    next();
  } catch (err) {
    next(err);
  }
};

const uploadMultipleToGithub = (_fieldName, type = 'uploads', _maxCount) => async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) return next();
    for (const file of req.files) {
      const fileName = generateFileName(file.originalname, file.mimetype);
      file.githubUrl = await uploadFileToGitHub(file, fileName, type);
      file.filename = fileName;
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  upload,
  generateFileName,
  uploadFileToGitHub,
  uploadSingleToGithub,
  uploadMultipleToGithub,
  cleanupUploadedFiles
};
