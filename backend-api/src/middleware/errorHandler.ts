export const errorHandler = (err: any, req: any, res: any, next: any) => {
  console.error('Error occurred:', err.message);
  console.error('Stack trace:', err.stack);

  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: statusCode,
    },
  });
};


