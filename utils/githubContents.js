const DEFAULT_MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 250;

let contentsWriteQueue = Promise.resolve();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getStatus = (error) => error?.status || error?.response?.status;

const isBranchHeadConflict = (error) => {
  if (getStatus(error) !== 409) return false;

  const message = String(error?.message || error?.response?.data?.message || '');
  return (
    message.includes('expected') ||
    message.includes('Conflict') ||
    message.includes('branch')
  );
};

const enqueueContentsWrite = (task) => {
  const queuedTask = contentsWriteQueue.then(task, task);
  contentsWriteQueue = queuedTask.catch(() => {});
  return queuedTask;
};

const getRetryDelay = (attempt) => {
  const jitter = Math.floor(Math.random() * 100);
  return BASE_RETRY_DELAY_MS * (attempt + 1) + jitter;
};

async function createOrUpdateFileContentsWithRetry(octokit, params, options = {}) {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await enqueueContentsWrite(() => octokit.repos.createOrUpdateFileContents(params));
    } catch (error) {
      if (!isBranchHeadConflict(error) || attempt >= maxRetries) {
        throw error;
      }

      await sleep(getRetryDelay(attempt));
    }
  }
}

module.exports = {
  createOrUpdateFileContentsWithRetry,
};
