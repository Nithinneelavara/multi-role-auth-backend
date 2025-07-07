import { Request, Response, NextFunction } from 'express';

export const exitLogger = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any)._exitLoggerAttached) return next();

  (req as any)._exitLoggerAttached = true;
  const oldSend = res.send;

  res.send = function (body?: any): Response {
    const resAny = res as any;

    if (!resAny._exitLogged) {
      const endTime = Date.now();
      const txtId = req.txtId || 'N/A';
      const startTime = req.startTime || endTime;
      const spentTimeMs = endTime - startTime;

      let responseBody: any;
      try {
        responseBody = typeof body === 'string' ? JSON.parse(body) : body;
      } catch {
        responseBody = body;
      }

      const logObject = {
        txtId,
        status: res.statusCode,
        method: req.method,
        path: req.originalUrl,
        query: req.query,
        requestBody: req.body,
        response: responseBody,
        timeSpentMs: spentTimeMs,
        timestamp: new Date(endTime).toISOString()
      };
      console.log('[EXIT LOG]:\n' + JSON.stringify(logObject, null, 2));
      resAny._exitLogged = true;
    }
    return oldSend.call(this, body);
  };
 if (req.apiResponse) {
  const { statusCode = 200, ...responseBody } = req.apiResponse;
  return res.status(statusCode).send(responseBody);
}
  const errorMessage = ' Cannot send response: no exit point reached (req.apiResponse not set)';
  console.error('[EXIT ERROR]:', errorMessage);

  return res.status(500).send({
    success: false,
    message: errorMessage,
    path: req.originalUrl,
    method: req.method
  });
};
