// utils/logger.ts
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sentry from '@sentry/react-native';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  PAYMENT = 'payment',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  stackTrace?: string;
}

class Logger {
  private logFilePath: string;
  private maxLogSize: number = 1024 * 1024; // 1MB
  private isInitialized: boolean = false;

  constructor() {
    this.logFilePath = `${FileSystem.documentDirectory}logs/ticket-grabber.log`;
    this.initialize().catch((error) => console.error('Logger initialization failed', error));
  }

  private async initialize(): Promise<void> {
    try {
      const logsDir = `${FileSystem.documentDirectory}logs`;
      const dirInfo = await FileSystem.getInfoAsync(logsDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(logsDir, { intermediates: true });
      }
      
      await this.rotateLogIfNeeded();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize logger directory', error);
      this.isInitialized = false;
    }
  }

  private async rotateLogIfNeeded(): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(this.logFilePath);
      if (info.exists && info.size && info.size > this.maxLogSize) {
        const backupPath = `${this.logFilePath}.bak`;
        await FileSystem.moveAsync({ from: this.logFilePath, to: backupPath });
      }
    } catch (error) {
      console.warn('Log rotation failed', error);
    }
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.isInitialized) return;
    try {
      const logLine = `${entry.timestamp.toISOString()} [${entry.level.toUpperCase()}] ${entry.message} ${JSON.stringify(entry.context || {})} ${entry.stackTrace || ''}\n`;
      
      let existingContent = '';
      const fileInfo = await FileSystem.getInfoAsync(this.logFilePath);
      if (fileInfo.exists) {
        existingContent = await FileSystem.readAsStringAsync(this.logFilePath);
      }
      
      await FileSystem.writeAsStringAsync(this.logFilePath, existingContent + logLine);
      await this.rotateLogIfNeeded();
    } catch (error) {
      console.error('Failed to write log', error);
    }
  }

  private logToConsole(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    const logMethod = level === LogLevel.ERROR ? console.error : 
                     level === LogLevel.WARN ? console.warn : 
                     level === LogLevel.DEBUG ? console.debug : 
                     level === LogLevel.PAYMENT ? console.log : 
                     console.log;
    logMethod(`[${level.toUpperCase()}] ${message}`, context, error ? error.stack : '');
  }

  private sendToSentry(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (process.env.NODE_ENV === 'production' && Sentry) {
      Sentry.withScope((scope) => {
        scope.setLevel(level === LogLevel.ERROR ? 'error' : 
                       level === LogLevel.WARN ? 'warning' : 
                       level === LogLevel.PAYMENT ? 'info' : 'info');
        scope.setExtras(context || {});
        if (error) Sentry.captureException(error);
        else Sentry.captureMessage(message);
      });
    }
  }

  public log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      stackTrace: error ? error.stack : undefined,
    };

    this.logToConsole(level, message, context, error);
    this.writeLog(entry);
    this.sendToSentry(level, message, context, error);
  }

  public debug(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.DEBUG, message, context, error);
  }

  public info(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.INFO, message, context, error);
  }

  public warn(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  public error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  public payment(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.PAYMENT, message, context, error);
  }

  public async getLogs(): Promise<string> {
    try {
      const logs = await FileSystem.readAsStringAsync(this.logFilePath);
      return logs;
    } catch (error) {
      console.error('Failed to read logs', error);
      return '';
    }
  }

  public async clearLogs(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.logFilePath, { idempotent: true });
      await this.initialize();
    } catch (error) {
      console.error('Failed to clear logs', error);
    }
  }
}

export const logger = new Logger();