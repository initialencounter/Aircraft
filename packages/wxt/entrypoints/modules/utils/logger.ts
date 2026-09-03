/**
 * 日志级别类型
 */
export type LogLevel = 'trace' | 'debug' | 'log' | 'info' | 'warn' | 'error';

/**
 * 日志级别优先级映射
 */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  log: 2,
  info: 3,
  warn: 4,
  error: 5,
};

/**
 * 默认样式（按级别）
 */
const DEFAULT_STYLES: Record<LogLevel, string> = {
  log: 'color: #58a6ff; font-weight: 500;',
  info: 'color: #58a6ff; font-weight: 500;',
  warn: 'color: #f0883e; font-weight: 600;',
  error: 'color: #f85149; font-weight: 700;',
  debug: 'color: #d2a8ff; font-weight: 500;',
  trace: 'color: #8b949e; font-weight: 400;',
};

/**
 * Logger 配置选项
 */
export interface LoggerOptions {
  /** 日志前缀（默认 ''） */
  prefix?: string;
  /** 是否显示时间戳（默认 false） */
  showTimestamp?: boolean;
  /** 是否启用输出（默认 true） */
  enabled?: boolean;
  /** 前缀的 CSS 样式字符串（默认 '#58a6ff; font-weight: 600;'） */
  style?: string;
  /** 最低输出级别（默认 'trace'） */
  level?: LogLevel;
}

/**
 * ConsoleLogger - 可配置前缀、多级别、带样式的 console 包装器
 */
export class ConsoleLogger {
  private _prefix: string;
  private _showTimestamp: boolean;
  private _enabled: boolean;
  private _style: string;
  private _level: LogLevel;

  // 原生 console 方法（绑定 this）
  private readonly _native: {
    log: Console['log'];
    info: Console['info'];
    warn: Console['warn'];
    error: Console['error'];
    debug: Console['debug'];
    trace: Console['trace'];
  };

  /**
   * @param options - 配置选项
   */
  constructor(options: LoggerOptions = {}) {
    const {
      prefix = '',
      showTimestamp = false,
      enabled = true,
      style = 'color: #58a6ff; font-weight: 600;',
      level = 'trace',
    } = options;

    this._prefix = prefix;
    this._showTimestamp = showTimestamp;
    this._enabled = enabled;
    this._style = style;
    this._level = level;

    // 绑定原生方法以保证 this 指向正确
    this._native = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
      trace: console.trace.bind(console),
    };
  }

  // ---------- 核心输出 ----------

  /**
   * 内部输出方法
   * @param level 日志级别
   * @param args 输出参数
   */
  private _output(level: LogLevel, ...args: any[]): void {
    if (!this._enabled) return;

    const currentPriority = LEVEL_PRIORITY[level];
    const minPriority = LEVEL_PRIORITY[this._level];
    if (currentPriority < minPriority) return;

    const parts: string[] = [];
    const styles: string[] = [];

    if (this._showTimestamp) {
      const now = new Date();
      const ts =
        now.toLocaleTimeString('zh-CN', { hour12: false }) +
        '.' + String(now.getMilliseconds()).padStart(3, '0');
      parts.push(`%c${ts}`);
      styles.push('color: #8b949e; font-size: 11px;');
    }

    if (this._prefix) {
      parts.push(`%c${this._prefix}`);
      styles.push(this._style || DEFAULT_STYLES[level] || '');
    }

    const nativeFn = this._native[level] || this._native.log;
    if (parts.length > 0) {
      nativeFn(parts.join(' '), ...styles, ...args);
    } else {
      nativeFn(...args);
    }
  }

  // ---------- 公开 API ----------

  /** 普通日志 */
  log(...args: any[]): this {
    this._output('log', ...args);
    return this;
  }

  /** 信息日志 */
  info(...args: any[]): this {
    this._output('info', ...args);
    return this;
  }

  /** 警告日志 */
  warn(...args: any[]): this {
    this._output('warn', ...args);
    return this;
  }

  /** 错误日志 */
  error(...args: any[]): this {
    this._output('error', ...args);
    return this;
  }

  /** 调试日志 */
  debug(...args: any[]): this {
    this._output('debug', ...args);
    return this;
  }

  /**
   * 跟踪日志（输出调用栈）
   * 如果传入了参数，会先输出消息，再输出堆栈
   */
  trace(...args: any[]): this {
    if (!this._enabled) return this;
    const currentPriority = LEVEL_PRIORITY.trace;
    const minPriority = LEVEL_PRIORITY[this._level];
    if (currentPriority < minPriority) return this;

    if (args.length > 0) {
      this._output('trace', ...args);
    }
    this._native.trace();
    return this;
  }

  // ---------- 配置方法 ----------

  /** 设置前缀 */
  setPrefix(prefix: string): this {
    this._prefix = prefix;
    return this;
  }

  /** 获取当前前缀 */
  getPrefix(): string {
    return this._prefix;
  }

  /** 启用/禁用 */
  setEnabled(enabled: boolean): this {
    this._enabled = !!enabled;
    return this;
  }

  /** 是否启用 */
  isEnabled(): boolean {
    return this._enabled;
  }

  /** 设置时间戳显示 */
  setTimestamp(show: boolean): this {
    this._showTimestamp = !!show;
    return this;
  }

  /** 设置前缀样式 */
  setStyle(style: string): this {
    this._style = style;
    return this;
  }

  /** 设置最低日志级别 */
  setLevel(level: LogLevel): this {
    if (level in LEVEL_PRIORITY) {
      this._level = level;
    }
    return this;
  }

  /** 获取当前级别 */
  getLevel(): LogLevel {
    return this._level;
  }

  // ---------- 子实例（继承配置） ----------

  /**
   * 创建子实例，继承当前配置，可覆盖部分选项
   * @param overrides - 覆盖的配置
   */
  child(overrides: LoggerOptions = {}): ConsoleLogger {
    return new ConsoleLogger({
      prefix: overrides.prefix ?? this._prefix,
      showTimestamp: overrides.showTimestamp ?? this._showTimestamp,
      enabled: overrides.enabled ?? this._enabled,
      style: overrides.style ?? this._style,
      level: overrides.level ?? this._level,
    });
  }

  // ---------- 辅助工具 ----------

  /** 清空控制台（谨慎使用） */
  clear(): this {
    if (this._enabled) {
      console.clear();
    }
    return this;
  }

  /**
   * 分组输出（折叠）
   * @param label 分组标签
   * @param args 额外参数
   */
  groupCollapsed(label: string, ...args: any[]): this {
    if (!this._enabled) return this;
    const prefix = this._buildPrefixOnly();
    const finalLabel = prefix ? `${prefix} ${label}` : label;
    console.groupCollapsed(finalLabel, ...args);
    return this;
  }

  /**
   * 分组输出（展开）
   * @param label 分组标签
   * @param args 额外参数
   */
  group(label: string, ...args: any[]): this {
    if (!this._enabled) return this;
    const prefix = this._buildPrefixOnly();
    const finalLabel = prefix ? `${prefix} ${label}` : label;
    console.group(finalLabel, ...args);
    return this;
  }

  /** 分组结束 */
  groupEnd(): this {
    if (this._enabled) {
      console.groupEnd();
    }
    return this;
  }

  /**
   * 计时开始
   * @param label 计时标签
   */
  time(label: string): this {
    if (this._enabled) {
      const prefix = this._buildPrefixOnly();
      const finalLabel = prefix ? `${prefix} ${label}` : label;
      console.time(finalLabel);
    }
    return this;
  }

  /**
   * 计时结束
   * @param label 计时标签（需与 time 传入的标签一致）
   */
  timeEnd(label: string): this {
    if (this._enabled) {
      const prefix = this._buildPrefixOnly();
      const finalLabel = prefix ? `${prefix} ${label}` : label;
      console.timeEnd(finalLabel);
    }
    return this;
  }

  /**
   * 构建纯文本前缀（不含样式）
   * @private
   */
  private _buildPrefixOnly(): string {
    let p = '';
    if (this._showTimestamp) {
      const now = new Date();
      const ts =
        now.toLocaleTimeString('zh-CN', { hour12: false }) +
        '.' + String(now.getMilliseconds()).padStart(3, '0');
      p += `[${ts}]`;
    }
    if (this._prefix) {
      p += ` ${this._prefix}`;
    }
    return p.trim();
  }
}

// ========== 使用示例 ==========
/*
// 创建实例
const logger = new ConsoleLogger({
  prefix: '[MyApp]',
  showTimestamp: true,
  enabled: true,
  style: 'color: #f0883e; font-weight: 700;',
  level: 'trace',
});

logger.log('普通日志');
logger.info('信息日志');
logger.warn('警告日志');
logger.error('错误日志', new Error('something wrong'));
logger.debug('调试信息', { id: 42 });

// 修改配置
logger.setPrefix('[Dev]');
logger.setLevel('warn'); // 只显示 warn 及以上
logger.warn('这条会显示');
logger.info('这条被过滤掉');

// 创建子实例
const child = logger.child({ prefix: '[Child]' });
child.log('子实例日志');

// 分组输出
logger.group('请求详情');
logger.log('URL: /api/users');
logger.groupEnd();

// 计时
logger.time('fetchData');
// ... 执行操作
logger.timeEnd('fetchData');
*/