const multer = require('multer');

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

function getExpectedUploadFields(req) {
  const base = req.baseUrl || '';
  const path = req.path || '';
  const method = req.method.toUpperCase();

  if (base === '/api/mines') {
    if (method === 'POST' && path === '/') return ['documents', 'media'];
    if (path.endsWith('/documents')) return ['documents'];
    if (path.endsWith('/media')) return ['media'];
  }

  if (base === '/api/minerals') {
    if (method === 'POST' && path === '/') return ['images', 'image', 'documents'];
    if (path.endsWith('/images')) return ['images'];
    if (path.endsWith('/documents')) return ['documents'];
  }

  if (base === '/api/yellow-machines') {
    if (method === 'POST' && path === '/') return ['documents', 'media'];
    if (path.endsWith('/documents')) return ['documents'];
    if (path.endsWith('/media')) return ['media'];
  }

  if (req.originalUrl.startsWith('/api/upload-multiple')) return ['files'];
  if (req.originalUrl.startsWith('/api/upload')) return ['file'];

  return null;
}

function formatMulterError(err, req) {
  const expectedFields = getExpectedUploadFields(req);

  switch (err.code) {
    case 'LIMIT_UNEXPECTED_FILE':
      return {
        status: 400,
        body: {
          status: 'fail',
          code: err.code,
          message: `Unexpected file field "${err.field}".`,
          detail: {
            receivedField: err.field,
            expectedFields,
            endpoint: `${req.method} ${req.originalUrl.split('?')[0]}`,
            hint: expectedFields
              ? `Send files using one of these form field names: ${expectedFields.join(', ')}.`
              : 'Check the API docs for the correct multipart field names for this endpoint.',
          },
        },
      };

    case 'LIMIT_FILE_SIZE':
    case 'FILE_TOO_LARGE':
      return {
        status: 400,
        body: {
          status: 'fail',
          code: err.code,
          message: 'File too large. Maximum size is 10MB.',
          detail: {
            field: err.field || null,
            limit: '10MB',
          },
        },
      };

    case 'LIMIT_FILE_COUNT':
      return {
        status: 400,
        body: {
          status: 'fail',
          code: err.code,
          message: 'Too many files uploaded for this field.',
          detail: {
            field: err.field || null,
          },
        },
      };

    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
    case 'LIMIT_FIELD_COUNT':
    case 'LIMIT_PART_COUNT':
      return {
        status: 400,
        body: {
          status: 'fail',
          code: err.code,
          message: err.message,
          detail: {
            field: err.field || null,
          },
        },
      };

    default:
      return {
        status: 400,
        body: {
          status: 'fail',
          code: err.code,
          message: err.message,
          detail: {
            field: err.field || null,
          },
        },
      };
  }
}

function formatValidationError(err) {
  const details = Object.values(err.errors || {}).map((e) => ({
    field: e.path,
    message: e.message,
    value: e.value,
  }));

  return {
    status: 400,
    body: {
      status: 'fail',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed.',
      detail: { errors: details },
    },
  };
}

function formatCastError(err) {
  return {
    status: 400,
    body: {
      status: 'fail',
      code: 'INVALID_ID',
      message: `Invalid value for field "${err.path}".`,
      detail: {
        field: err.path,
        value: err.value,
        expectedType: err.kind,
      },
    },
  };
}

function formatDuplicateKeyError(err) {
  const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'unknown';
  return {
    status: 409,
    body: {
      status: 'fail',
      code: 'DUPLICATE_KEY',
      message: `A record with this ${field} already exists.`,
      detail: {
        field,
        value: err.keyValue ? err.keyValue[field] : undefined,
      },
    },
  };
}

function formatJsonParseError(err) {
  return {
    status: 400,
    body: {
      status: 'fail',
      code: 'INVALID_JSON',
      message: 'Request body contains invalid JSON.',
      detail: {
        hint: 'Ensure Content-Type is application/json and the body is valid JSON.',
        parseError: err.message,
      },
    },
  };
}

function formatInvalidFileTypeError(err) {
  return {
    status: 400,
    body: {
      status: 'fail',
      code: 'INVALID_FILE_TYPE',
      message: err.message || 'Invalid file type.',
      detail: {
        allowedMimeTypes: ALLOWED_MIME_TYPES,
        hint: 'Upload a supported file type or check the file extension matches its content.',
      },
    },
  };
}

function formatError(err, req) {
  if (err instanceof multer.MulterError) {
    return formatMulterError(err, req);
  }

  if (err.name === 'ValidationError' && err.errors) {
    return formatValidationError(err);
  }

  if (err.name === 'CastError') {
    return formatCastError(err);
  }

  if (err.code === 11000) {
    return formatDuplicateKeyError(err);
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return formatJsonParseError(err);
  }

  if (typeof err.message === 'string' && err.message.toLowerCase().includes('invalid file type')) {
    return formatInvalidFileTypeError(err);
  }

  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const body = {
    status: status >= 500 ? 'error' : 'fail',
    code: err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    message:
      isProduction && status >= 500
        ? 'Something went wrong!'
        : err.message || 'Something went wrong!',
  };

  if (!isProduction && status >= 500 && err.stack) {
    body.detail = { stack: err.stack.split('\n').slice(0, 5) };
  }

  return { status, body };
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err.stack || err);
  } else {
    console.error('Error:', err.message, {
      code: err.code,
      field: err.field,
      path: req.originalUrl,
    });
  }

  const { status, body } = formatError(err, req);
  res.status(status).json(body);
}

module.exports = {
  errorHandler,
  formatError,
  getExpectedUploadFields,
};
