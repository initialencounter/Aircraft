interface QmsgInstance {
  id: number;
  config: string;
  inst: MsgInstance;
}

interface QmsgType {
  version: string;
  instanceCount: number;
  oMsgs: Record<number, QmsgInstance>;
  maxNums: number;
  config: (cfg: Partial<MsgSettings>) => void;
  info: (txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>) => MsgInstance;
  warning: (txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>) => MsgInstance;
  success: (txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>) => MsgInstance;
  error: (txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>) => MsgInstance;
  loading: (txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>) => MsgInstance;
  remove: (id: number) => void;
  closeAll: () => void;
}

interface MsgSettings {
  position: string;
  type: string;
  showClose: boolean;
  timeout: number;
  animation: boolean;
  autoClose: boolean;
  content: string;
  onClose: Function | null;
  maxNums: number;
  html: boolean;
}

interface MsgInstance {
  id: number;
  settings: MsgSettings;
  timeout: number;
  timer: any;
  $elem: HTMLElement;
  $wrapper: HTMLElement;
  state: string;
  count?: number;
  close: () => void;
  destroy: () => void;
}

function getQmsg() {
  /**

插件描述：一款优雅的原生JS页面消息提示插件，兼容性良好，无任何依赖。

声明：此插件非笔者原创，笔者只做了部分内容的修改，以符合个人需求。以下为原插件来源信息：

- 原作者：或许吧（jesseqin）

- 转载地址：https://www.jq22.com/jquery-info23550
 
*/


  // assign 兼容处理
  if (typeof Object.assign != 'function') {
    Object.assign = function (target: any) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      target = Object(target);
      for (let index = 1; index < arguments.length; index++) {
        let source = arguments[index];
        if (source != null) {
          for (let key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
      }
      return target;
    }
  };

  // 'classList' 兼容处理
  let isClsList = 'classList' in HTMLElement.prototype;
  if (!isClsList) {
    Object.defineProperty(HTMLElement.prototype, 'classList', {
      get: function () {
        // add, remove ,contains,toggle
        // this  - > 
        let _self = this;
        return {
          add: function (cls: string) {
            if (!this.contains(cls)) {
              _self.className += ' ' + cls;
            }
          },
          remove: function (cls: string) {
            if (this.contains(cls)) {
              let reg = new RegExp(cls);
              _self.className = _self.className.replace(reg, '');
            }
          },
          contains: function (cls: string) {
            let index = _self.className.indexOf(cls);
            return index != -1 ? true : false;
          },
          toggle: function (cls: string) {
            if (this.contains(cls)) {
              this.remove(cls);
            } else {
              this.add(cls);
            }
          }
        };
      }
    });
  }

  /**
   * 声明插件名称
   */
  var PLUGIN_NAME = "qmsg";


  const NAMESPACE = PLUGIN_NAME;

  /**
   * 状态 & 动画
   * 显示中，显示完成，关闭中
   */
  const STATES = {
    opening: 'MessageMoveIn',
    done: '',
    closing: 'MessageMoveOut'
  };

  /**
   * 全局默认配置
   * 可在引入js之前通过QMSG_GLOBALS.DEFAULTS进行配置
   * position {String} 位置，仅支持'center','right','left',默认'center'
   * type {String} 类型，支持'info','warning','success','error','loading'
   * showClose {Boolean} 是否显示关闭图标，默认为false不显示
   * timeout {Number} 多久后自动关闭，单位ms,默认2500
   * autoClose {Boolean} 是否自动关闭，默认true,注意在type为loading的时候自动关闭为false
   * content {String} 提示的内容
   * onClose {Function} 关闭的回调函数
   */
  let DEFAULTS = Object.assign({
    position: 'center',
    type: "info",
    showClose: false,
    timeout: 2500,
    animation: true,
    autoClose: true,
    content: "",
    onClose: null,
    maxNums: 5,
    html: false
  }, window);

  /**
   * 设置icon html代码
   */
  const ICONS = {
    info: '<svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="white" fill-opacity="0.01"/><path d="M24 44C29.5228 44 34.5228 41.7614 38.1421 38.1421C41.7614 34.5228 44 29.5228 44 24C44 18.4772 41.7614 13.4772 38.1421 9.85786C34.5228 6.23858 29.5228 4 24 4C18.4772 4 13.4772 6.23858 9.85786 9.85786C6.23858 13.4772 4 18.4772 4 24C4 29.5228 6.23858 34.5228 9.85786 38.1421C13.4772 41.7614 18.4772 44 24 44Z" fill="#1890ff" stroke="#1890ff" stroke-width="4" stroke-linejoin="round"/><path fill-rule="evenodd" clip-rule="evenodd" d="M24 11C25.3807 11 26.5 12.1193 26.5 13.5C26.5 14.8807 25.3807 16 24 16C22.6193 16 21.5 14.8807 21.5 13.5C21.5 12.1193 22.6193 11 24 11Z" fill="#FFF"/><path d="M24.5 34V20H23.5H22.5" stroke="#FFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 34H28" stroke="#FFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="white" fill-opacity="0.01"/><path d="M24 44C29.5228 44 34.5228 41.7614 38.1421 38.1421C41.7614 34.5228 44 29.5228 44 24C44 18.4772 41.7614 13.4772 38.1421 9.85786C34.5228 6.23858 29.5228 4 24 4C18.4772 4 13.4772 6.23858 9.85786 9.85786C6.23858 13.4772 4 18.4772 4 24C4 29.5228 6.23858 34.5228 9.85786 38.1421C13.4772 41.7614 18.4772 44 24 44Z" fill="#faad14" stroke="#faad14" stroke-width="4" stroke-linejoin="round"/><path fill-rule="evenodd" clip-rule="evenodd" d="M24 37C25.3807 37 26.5 35.8807 26.5 34.5C26.5 33.1193 25.3807 32 24 32C22.6193 32 21.5 33.1193 21.5 34.5C21.5 35.8807 22.6193 37 24 37Z" fill="#FFF"/><path d="M24 12V28" stroke="#FFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="white" fill-opacity="0.01"/><path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" fill="#f5222d" stroke="#f5222d" stroke-width="4" stroke-linejoin="round"/><path d="M29.6569 18.3431L18.3432 29.6568" stroke="#FFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.3432 18.3431L29.6569 29.6568" stroke="#FFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    success: '<svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="white" fill-opacity="0.01"/><path d="M24 4L29.2533 7.83204L35.7557 7.81966L37.7533 14.0077L43.0211 17.8197L41 24L43.0211 30.1803L37.7533 33.9923L35.7557 40.1803L29.2533 40.168L24 44L18.7467 40.168L12.2443 40.1803L10.2467 33.9923L4.97887 30.1803L7 24L4.97887 17.8197L10.2467 14.0077L12.2443 7.81966L18.7467 7.83204L24 4Z" fill="#52c41a" stroke="#52c41a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 24L22 29L32 19" stroke="#FFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    loading: '<svg class="animate-turn" width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="white" fill-opacity="0.01"/><path d="M4 24C4 35.0457 12.9543 44 24 44V44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4" stroke="#1890ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 24C36 17.3726 30.6274 12 24 12C17.3726 12 12 17.3726 12 24C12 30.6274 17.3726 36 24 36V36" stroke="#1890ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="white" fill-opacity="0.01"/><path d="M14 14L34 34" stroke="#909399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 34L34 14" stroke="#909399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /**
   * 是否支持动画属性
   * @type {Boolean}
   */
  const CAN_ANIMATION = (function () {
    const style = document.createElement('div').style;
    return style.animationName !== undefined
  })();

  /**
   * 生成带插件名的名称
   * @param {...String}
   * @returns {String}
   */
  function namespacify(...args: string[]): string {
    let res = NAMESPACE;
    for (let i = 0; i < args.length; ++i) {
      res += '-' + args[i];
    }
    return res;
  }

  

  /**
   * 每条消息的构造函数
   * @param {Object} opts 配置参数，参考DEFAULTS
   */
  function Msg(this: MsgInstance, opts: Partial<MsgSettings>) {
    let oMsg = this;
    oMsg.settings = Object.assign({}, DEFAULTS, opts || {});
    oMsg.id = Qmsg.instanceCount;
    let timeout = oMsg.settings.timeout;
    timeout = parseInt(timeout as any) >= 0 ? parseInt(timeout as any) : DEFAULTS.timeout;
    oMsg.timeout = timeout;
    oMsg.settings.timeout = timeout;
    oMsg.timer = null;
    let $elem = document.createElement("div");
    let $svg = ICONS[oMsg.settings.type as keyof typeof ICONS || 'info'];
    let contentClassName = namespacify("content-" + (oMsg.settings.type || 'info'));
    contentClassName += oMsg.settings.showClose ? ' ' + namespacify('content-with-close') : '';
    let content = oMsg.settings.content || '';
    let $closeSvg = ICONS['close'];
    let $closeIcon = oMsg.settings.showClose ? '<i class="qmsg-icon qmsg-icon-close">' + $closeSvg + '</i>' : '';
    let $span = document.createElement("span");
    if (oMsg.settings.html) {
      $span.innerHTML = content;
    } else {
      $span.innerText = content;
    }
    $elem.innerHTML = '<div class="qmsg-content">\
          <div class="' + contentClassName + '">\
              <i class="qmsg-icon">' + $svg + '</i>' + $span.outerHTML + $closeIcon +
      '</div>\
      </div>';

    $elem.classList.add(namespacify('item'));
    $elem.style.textAlign = oMsg.settings.position;
    let $wrapper = document.querySelector('.' + NAMESPACE);
    if (!$wrapper) {
      $wrapper = document.createElement("div");
      $wrapper.classList.add(NAMESPACE, namespacify('wrapper'), namespacify('is-initialized'));
      document.body.appendChild($wrapper);
    }
    $wrapper.appendChild($elem);
    oMsg.$wrapper = $wrapper as HTMLElement;
    oMsg.$elem = $elem;
    setState(oMsg, 'opening');
    if (oMsg.settings.showClose) { //关闭按钮绑定点击事件
      $elem.querySelector(".qmsg-icon-close")?.addEventListener('click', function () {
        oMsg.close();
      }.bind($elem));
    }
    $elem.addEventListener("animationend", function (this: MsgInstance, e: AnimationEvent) {   // 监听动画完成
      let target = e.target as HTMLElement, animationName = e.animationName;
      if (animationName == STATES['closing']) {
        clearInterval(this.timer);
        this.destroy();
      }
      target.style.animationName = '';
      target.style.webkitAnimationName = '';
    }.bind(oMsg));
    if (oMsg.settings.autoClose) { // 自动关闭
      let intvMs = 10; // 定时器频率
      oMsg.timer = setInterval(function (this: MsgInstance) {
        this.timeout -= intvMs;
        if (this.timeout <= 0) {
          clearInterval(this.timer);
          this.close();
        }
      }.bind(oMsg), intvMs);
      oMsg.$elem.addEventListener('mouseover', function (this: MsgInstance) {
        clearInterval(this.timer);
      }.bind(oMsg));
      oMsg.$elem.addEventListener('mouseout', function (this: MsgInstance) {
        if (this.state != 'closing') { // 状态为关闭则不重启定时器
          this.timer = setInterval(function (this: MsgInstance) {
            this.timeout -= intvMs;
            if (this.timeout <= 0) {
              clearInterval(this.timer);
              this.close();
            }
          }.bind(oMsg), intvMs);
        }
      }.bind(oMsg));
    }
  }

  function setState(inst: MsgInstance, state: keyof typeof STATES) {
    if (!state || !STATES[state]) return;
    inst.state = state;
    inst.$elem.style.animationName = STATES[state];
  }

  /**
   * 直接销毁元素，不会触发关闭回调函数
   */
  Msg.prototype.destroy = function (this: MsgInstance) {
    this.$elem.parentNode && this.$elem.parentNode.removeChild(this.$elem);
    clearInterval(this.timer);
    Qmsg.remove(this.id);
  };

  /**
   * 关闭，支持动画则会触发动画事件
   */
  Msg.prototype.close = function (this: MsgInstance) {
    setState(this, 'closing');
    if (!CAN_ANIMATION) { // 不支持动画
      this.destroy();
    } else {
      Qmsg.remove(this.id);
    }
    let callback = this.settings.onClose;
    if (callback && callback instanceof Function) {
      callback.call(this);
    }
  };

  /**
   * 设置消息数量统计
   * @private
   */
  function setMsgCount(oMsg: MsgInstance) {
    let countClassName = namespacify('count');
    let $content = oMsg.$elem.querySelector("." + namespacify('content')) as HTMLElement,
      $count = $content.querySelector('.' + countClassName) as HTMLElement;
    if (!$count) {
      $count = document.createElement("span");
      $count.classList.add(countClassName);
      $content.appendChild($count);
    }
    $count.innerHTML = oMsg.count?.toString() || '';
    $count.style.animationName = "";
    $count.style.animationName = "MessageShake";
    oMsg.timeout = oMsg.settings.timeout || DEFAULTS.timeout;
  }

  /**
   * 合并参数为配置信息，用于创建Msg实例
   * @param {String} txt 文本内容
   * @param {Object} config 配置
   * @private
   */
  function mergeArgs(txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>): MsgSettings {
    let opts = Object.assign({}, DEFAULTS);
    if (arguments.length === 0) {
      return opts;
    }
    if (typeof txt !== 'string') {
      return Object.assign(opts, txt);
    } else {
      opts.content = txt.toString();
    }
    if (config && typeof config === 'object') {
      return Object.assign(opts, config);
    }
    return opts;
  }

  

  /**
   * 通过配置信息 来判断是否为同一条消息,并返回消息实例
   * @param {Object} params 配置项
   * @private
   */
  function judgeReMsg(this: QmsgType, params: Partial<MsgSettings>): MsgInstance {
    params = params || {};
    const oMsg: MsgInstance = new (Msg as any)(params) as MsgInstance;
    setMsgCount(oMsg);
    return oMsg;
  }

  const Qmsg: QmsgType = {
    version: '0.0.1',
    instanceCount: 0,
    oMsgs: {},
    maxNums: DEFAULTS.maxNums || 5,
    config: function (cfg: Partial<MsgSettings>) {
      DEFAULTS = cfg && cfg instanceof Object ? Object.assign(DEFAULTS, cfg) : DEFAULTS;
      this.maxNums = DEFAULTS.maxNums && DEFAULTS.maxNums > 0 ? parseInt(DEFAULTS.maxNums as any) : 3;
    },
    info: function (txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>) {
      var params = mergeArgs(txt, config);
      params.type = 'info';
      return judgeReMsg.call(this, params);
    },
    warning: function (txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>) {
      var params = mergeArgs(txt, config);
      params.type = 'warning';
      return judgeReMsg.call(this, params);
    },
    success: function (txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>) {
      var params = mergeArgs(txt, config);
      params.type = 'success';
      return judgeReMsg.call(this, params);
    },
    error: function (txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>) {
      var params = mergeArgs(txt, config);
      params.type = 'error';
      return judgeReMsg.call(this, params);
    },
    loading: function (txt: string | Partial<MsgSettings>, config?: Partial<MsgSettings>) {
      var params = mergeArgs(txt, config);
      params.type = 'loading';
      params.autoClose = false;
      return judgeReMsg.call(this, params);
    },
    remove: function (id: number) {
      this.oMsgs[id] && delete this.oMsgs[id];
    },
    closeAll: function () {
      for (var i in this.oMsgs) {
        this.oMsgs[i] && this.oMsgs[i].inst.close();
      }
    }
  };
  return Qmsg;
}


export { getQmsg, QmsgType, MsgSettings, MsgInstance};