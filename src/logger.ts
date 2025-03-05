import { createLogger as mainCreateLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

export const createLogger = (label: string) => {
  const loggerFormat = [
    format.label({ label }),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.printf(
      ({ level, message, label = 'app', timestamp, ...props }) =>
        `${timestamp} [ ${label}:${level} ]: ${message} ${Object.keys(props).length ? JSON.stringify(props) : ''}`
    ),
  ];

  const fileLogTransport = new transports.DailyRotateFile({
    filename: 'actions-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    dirname: 'logs',
    maxSize: '20m',
    maxFiles: '30d',
  });

  const fileErrorsLogTransport = new transports.DailyRotateFile({
    level: 'error',
    filename: 'errors-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    dirname: 'logs',
    //maxsize: 10 * 1024 * 1024,
    maxSize: '20m',
    maxFiles: '30d',
  });

  const consoleTransport = new transports.Console({
    //level: 'info', //process.env.LOG_LEVEL
    handleExceptions: false,
    format: format.combine(format.colorize(), ...loggerFormat),
  });

  const logger = mainCreateLogger({
    level: 'debug',
    format: format.combine(...loggerFormat),
    transports: [fileLogTransport, fileErrorsLogTransport],
  });

  if (process.env.NODE_ENV === 'development') {
    logger.add(consoleTransport);
  }

  return logger;
};

export default createLogger('app');
