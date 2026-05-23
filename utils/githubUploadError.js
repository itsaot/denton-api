function getGitHubUploadContext({ fileName, type, filePath }) {
  return {
    repo: process.env.GITHUB_REPO || '[missing GITHUB_REPO]',
    branch: process.env.GITHUB_BRANCH || 'main',
    fileName,
    type,
    filePath,
  };
}

function getGitHubErrorMessage(error) {
  if (!error) {
    return 'Unknown GitHub upload error';
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Unknown GitHub upload error';
}

function buildGitHubUploadErrorLog(error, context) {
  return {
    status: error?.status || null,
    message: getGitHubErrorMessage(error),
    request: {
      method: error?.request?.method || null,
      url: error?.request?.url || null,
    },
    response: {
      status: error?.response?.status || null,
      url: error?.response?.url || null,
      data: error?.response?.data || null,
    },
    context,
  };
}

function createGitHubUploadError(error, context) {
  const status = error?.status || error?.response?.status;
  const detail = getGitHubErrorMessage(error);
  const suffix = status ? ` (${status})` : '';
  const message = `Failed to upload file to GitHub${suffix}: ${detail}`;

  const wrappedError = new Error(message);
  wrappedError.cause = error;
  wrappedError.status = status || 500;
  wrappedError.context = context;
  return wrappedError;
}

module.exports = {
  buildGitHubUploadErrorLog,
  createGitHubUploadError,
  getGitHubUploadContext,
};
