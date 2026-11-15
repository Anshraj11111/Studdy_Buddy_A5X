import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../../logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const LOG_LEVEL_PRIORITY = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class Logger {
  constructor(level = 'INFO') {
    this.level = level;
    this.priority = LOG_LEVEL_PRIORITY[level] || LOG_LEVEL_PRIORITY.INFO;
  }

  /**
   * Format log message
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  /**
   * Write to file
   */
  writeToFile(level, message, data = null) {
    try {
      const logFile = path.join(LOG_DIR, `${level.toLowerCase()}.log`);
      const formattedMessage = this.formatMessage(level, message, data);
      fs.appendFileSync(logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  /**
   * Log error
   */
  error(message, data = null) {
    if (LOG_LEVEL_PRIORITY.ERROR <= this.priority) {
      const formatted = this.formatMessage(LOG_LEVELS.ERROR, message, data);
      console.error(formatted);
      this.writeToFile(LOG_LEVELS.ERROR, message, data);
    }
  }

  /**
   * Log warning
   */
  warn(message, data = null) {
    if (LOG_LEVEL_PRIORITY.WARN <= this.priority) {
      const formatted = this.formatMessage(LOG_LEVELS.WARN, message, data);
      console.warn(formatted);
      this.writeToFile(LOG_LEVELS.WARN, message, data);
    }
  }

  /**
   * Log info
   */
  info(message, data = null) {
    if (LOG_LEVEL_PRIORITY.INFO <= this.priority) {
      const formatted = this.formatMessage(LOG_LEVELS.INFO, message, data);
      console.log(formatted);
      this.writeToFile(LOG_LEVELS.INFO, message, data);
    }
  }

  /**
   * Log debug
   */
  debug(message, data = null) {
    if (LOG_LEVEL_PRIORITY.DEBUG <= this.priority) {
      const formatted = this.formatMessage(LOG_LEVELS.DEBUG, message, data);
      console.debug(formatted);
      this.writeToFile(LOG_LEVELS.DEBUG, message, data);
    }
  }
}

export default new Logger(process.env.LOG_LEVEL || 'INFO');
