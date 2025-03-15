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
    filename: 'lc-actions-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    dirname: 'logs',
    maxSize: '20m',
    maxFiles: '10d',
  });

  const fileErrorsLogTransport = new transports.DailyRotateFile({
    level: 'warn',
    filename: 'lc-errors-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    dirname: 'logs',
    maxSize: '20m',
    maxFiles: '10d',
  });

  const consoleTransport = new transports.Console({
    handleExceptions: false,
    format: format.combine(format.colorize(), ...loggerFormat),
  });

  const logger = mainCreateLogger({
    level: process.env.LOG_LEVEL,
    format: format.combine(...loggerFormat),
    transports: [fileLogTransport, fileErrorsLogTransport],
  });

  if (process.env.NODE_ENV === 'development') {
    logger.add(consoleTransport);
  }

  return logger;
};
