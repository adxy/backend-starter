require('app-module-path').addPath(require('path').resolve(__dirname));
require('dotenv-safe').config();
require('express-async-errors');
require('models/db');

const config = require('config');
const boolParser = require('express-query-boolean');
const express = require('express');
const gracefulShutdown = require('http-graceful-shutdown');
const cors = require('utils/cors'); // only for dev environment

const logger = require('utils/logger');
const winstonLogger = require('utils/winstonLogger');
const clsify = require('middlewares/clsify');
const correlationIdBinder = require('middlewares/correlationIdBinder');
const responseHandlers = require('middlewares/response');
const routes = require('routes');

const app = express();

if (process.env.NODE_ENV === 'development') {
  logger.info('Using CORS for Development.');
  app.use(cors);
}

app.set('port', config.get('port'));

// disable x-powered-by header
app.disable('x-powered-by');

// Middlewares defined below. Order matters.
// CLSify the Express request.
app.use(clsify());
app.use(correlationIdBinder);

// Custom Response Handlers
app.use(responseHandlers);

// Request Body Parsing
app.use(express.text({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Request query parameter - boolean parsing
app.use(boolParser());

app.use(routes);

app.use((err, req, res, next) => {
  logger.error(err);
  res.serverError({});
});

const server = app.listen(app.get('port'), () =>
  logger.info(
    `Server started. Listening on port ${app.get('port')} in ${process.env.NODE_ENV} environment.`,
  ),
);

const shutdownCleanup = async (signal) => {
  logger.info(`Received ${signal}, shutting down...`);
  // eslint-disable-next-line no-promise-executor-return
  const loggerDone = new Promise((resolve) => winstonLogger.on('finish', resolve));
  winstonLogger.end();

  return loggerDone;
};

gracefulShutdown(server, { onShutdown: shutdownCleanup, timeout: 5000 });

process.on('unhandledRejection', (err) => {
  logger.error(err);
  process.exit(1);
});
