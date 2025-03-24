import { createLogger as mainCreateLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

const isDev = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || 'info';

export const createLogger = (label: string, options: { saveToFile?: boolean; console?: boolean; } = {
  saveToFile: logLevel !== 'off',
  console: isDev,
}) => {
  const { saveToFile, console } = options;
  const loggerFormat = [
    format.label({ label }),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.printf(
      ({ level, message, label = 'app', timestamp, ...props }) =>
        `${timestamp} [ ${label}:${level} ]: ${message} ${Object.keys(props).length ? JSON.stringify(props) : ''}`,
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
    level: logLevel,
    format: format.combine(...loggerFormat),
    transports: [],
  });

  if (saveToFile) {
    logger.add(fileLogTransport);
    logger.add(fileErrorsLogTransport);
  }

  if (console) {
    logger.add(consoleTransport);
  }

  return logger;
};
