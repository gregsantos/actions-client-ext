'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var fclCore = require('@onflow/fcl-core');
var config = require('@onflow/config');
var utilInvariant = require('@onflow/util-invariant');
var utilUid = require('@onflow/util-uid');
var fclWc = require('@onflow/fcl-wc');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(
          n,
          k,
          d.get
            ? d
            : {
                enumerable: true,
                get: function () {
                  return e[k];
                },
              }
        );
      }
    });
  }
  n['default'] = e;
  return Object.freeze(n);
}

var fclWc__namespace = /*#__PURE__*/ _interopNamespace(fclWc);

const FRAME = 'FCL_IFRAME';
const FRAME_STYLES = `
  position:fixed;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
  height: 100%;
  width: 100vw;
  display:block;
  background:rgba(0,0,0,0.25);
  z-index: 2147483647;
  box-sizing: border-box;
  color-scheme: light;
`;
function renderFrame(src) {
  utilInvariant.invariant(
    !document.getElementById(FRAME),
    'Attempt at triggering multiple Frames',
    {
      src,
    }
  );
  const $frame = document.createElement('iframe');
  $frame.src = src;
  $frame.id = FRAME;
  $frame.allow = 'usb *; hid *';
  $frame.frameBorder = '0';
  $frame.style.cssText = FRAME_STYLES;
  document.body.append($frame);
  const unmount = () => {
    if (document.getElementById(FRAME)) {
      document.getElementById(FRAME).remove();
    }
  };
  return [$frame.contentWindow, unmount];
}

const POP = 'FCL_POP';
let popup = null;
let previousUrl$1 = null;
function popupWindow(url, windowName, win, w, h) {
  const y = win.top.outerHeight / 2 + win.top.screenY - h / 2;
  const x = win.top.outerWidth / 2 + win.top.screenX - w / 2;
  const popup = win.open(
    url,
    windowName,
    `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`
  );
  if (!popup)
    throw new Error(
      'Popup failed to open (was it blocked by a popup blocker?)'
    );
  return popup;
}
function renderPop(src) {
  if (popup == null || popup?.closed) {
    popup = popupWindow(src, POP, window, 640, 770);
  } else if (previousUrl$1 !== src) {
    popup.location.replace(src);
    popup.focus();
  } else {
    popup.focus();
  }
  previousUrl$1 = src;
  const unmount = () => {
    if (popup && !popup.closed) {
      popup.close();
    }
    popup = null;
  };
  return [popup, unmount];
}

let tab$1 = null;
let previousUrl = null;
function renderTab(src) {
  if (tab$1 == null || tab$1?.closed) {
    tab$1 = window.open(src, '_blank');
    if (!tab$1)
      throw new Error('Tab failed to open (was it blocked by the browser?)');
  } else if (previousUrl !== src) {
    tab$1.location.replace(src);
    tab$1.focus();
  } else {
    tab$1.focus();
  }
  previousUrl = src;
  const unmount = () => {
    if (tab$1 && !tab$1.closed) {
      tab$1.close();
    }
    tab$1 = null;
  };
  return [tab$1, unmount];
}

const isServerSide = () => typeof window === 'undefined';
const getSessionStorage = () => {
  try {
    const SESSION_STORAGE = {
      can: !isServerSide(),
      get: async (key) => JSON.parse(sessionStorage.getItem(key)),
      put: async (key, value) =>
        sessionStorage.setItem(key, JSON.stringify(value)),
    };
    return SESSION_STORAGE;
  } catch (error) {
    return null;
  }
};
const getDefaultConfig = () => {
  return {
    'discovery.wallet.method.default': 'IFRAME/RPC',
    'fcl.storage.default': getSessionStorage(),
  };
};

const noop$3 = () => {};
function frame(service) {
  let opts =
    arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (service == null)
    return {
      send: noop$3,
      close: noop$3,
    };
  const onClose = opts.onClose || noop$3;
  const onMessage = opts.onMessage || noop$3;
  const onReady = opts.onReady || noop$3;
  const onResponse = opts.onResponse || noop$3;
  const handler = fclCore.buildMessageHandler({
    close,
    send,
    onReady,
    onResponse,
    onMessage,
  });
  window.addEventListener('message', handler);
  const [$frame, unmount] = renderFrame(fclCore.serviceEndpoint(service));
  return {
    send,
    close,
  };
  function close() {
    try {
      window.removeEventListener('message', handler);
      unmount();
      onClose();
    } catch (error) {
      console.error('Frame Close Error', error);
    }
  }
  function send(msg) {
    try {
      $frame.postMessage(JSON.parse(JSON.stringify(msg || {})), '*');
    } catch (error) {
      console.error('Frame Send Error', msg, error);
    }
  }
}

const VERSION = '1.11.0';

function execIframeRPC(_ref) {
  let { service, body, config, opts } = _ref;
  return new Promise((resolve, reject) => {
    const id = utilUid.uid();
    const includeOlderJsonRpcCall = opts.includeOlderJsonRpcCall;
    frame(service, {
      async onReady(_, _ref2) {
        let { send } = _ref2;
        try {
          send({
            type: 'FCL:VIEW:READY:RESPONSE',
            fclVersion: VERSION,
            body,
            service: {
              params: service.params,
              data: service.data,
              type: service.type,
            },
            config,
          });
          send({
            fclVersion: VERSION,
            type: 'FCL:FRAME:READY:RESPONSE',
            body,
            service: {
              params: service.params,
              data: service.data,
              type: service.type,
            },
            config,
            deprecated: {
              message:
                'FCL:FRAME:READY:RESPONSE is deprecated and replaced with type: FCL:VIEW:READY:RESPONSE',
            },
          });
          if (includeOlderJsonRpcCall) {
            send({
              jsonrpc: '2.0',
              id: id,
              method: 'fcl:sign',
              params: [body, service.params],
              deprecated: {
                message:
                  'jsonrpc is deprecated and replaced with type: FCL:VIEW:READY:RESPONSE',
              },
            });
          }
        } catch (error) {
          throw error;
        }
      },
      onResponse(e, _ref3) {
        let { close } = _ref3;
        try {
          if (typeof e.data !== 'object') return;
          const resp = fclCore.normalizePollingResponse(e.data);
          switch (resp.status) {
            case 'APPROVED':
              resolve(resp.data);
              close();
              break;
            case 'DECLINED':
              reject(`Declined: ${resp.reason || 'No reason supplied'}`);
              close();
              break;
            case 'REDIRECT':
              resolve(resp);
              close();
              break;
            default:
              reject(`Declined: No reason supplied`);
              close();
              break;
          }
        } catch (error) {
          console.error('execIframeRPC onResponse error', error);
          throw error;
        }
      },
      onMessage(e, _ref4) {
        let { close } = _ref4;
        try {
          if (typeof e.data !== 'object') return;
          if (e.data.jsonrpc !== '2.0') return;
          if (e.data.id !== id) return;
          const resp = fclCore.normalizePollingResponse(e.data.result);
          switch (resp.status) {
            case 'APPROVED':
              resolve(resp.data);
              close();
              break;
            case 'DECLINED':
              reject(`Declined: ${resp.reason || 'No reason supplied'}`);
              close();
              break;
            case 'REDIRECT':
              resolve(resp);
              close();
              break;
            default:
              reject(`Declined: No reason supplied`);
              close();
              break;
          }
        } catch (error) {
          console.error('execIframeRPC onMessage error', error);
          throw error;
        }
      },
      onClose() {
        reject(`Declined: Externally Halted`);
      },
    });
  });
}

const noop$2 = () => {};
function pop(service) {
  let opts =
    arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (service == null)
    return {
      send: noop$2,
      close: noop$2,
    };
  const onClose = opts.onClose || noop$2;
  const onMessage = opts.onMessage || noop$2;
  const onReady = opts.onReady || noop$2;
  const onResponse = opts.onResponse || noop$2;
  const handler = fclCore.buildMessageHandler({
    close,
    send,
    onReady,
    onResponse,
    onMessage,
  });
  window.addEventListener('message', handler);
  const [$pop, unmount] = renderPop(fclCore.serviceEndpoint(service));
  const timer = setInterval(function () {
    if ($pop && $pop.closed) {
      close();
    }
  }, 500);
  return {
    send,
    close,
  };
  function close() {
    try {
      window.removeEventListener('message', handler);
      clearInterval(timer);
      unmount();
      onClose();
    } catch (error) {
      console.error('Popup Close Error', error);
    }
  }
  function send(msg) {
    try {
      $pop.postMessage(JSON.parse(JSON.stringify(msg || {})), '*');
    } catch (error) {
      console.error('Popup Send Error', msg, error);
    }
  }
}

function execPopRPC(_ref) {
  let { service, body, config, opts } = _ref;
  return new Promise((resolve, reject) => {
    const id = utilUid.uid();
    const { redir, includeOlderJsonRpcCall } = opts;
    pop(service, {
      async onReady(_, _ref2) {
        let { send } = _ref2;
        try {
          send({
            fclVersion: VERSION,
            type: 'FCL:VIEW:READY:RESPONSE',
            body,
            service: {
              params: service.params,
              data: service.data,
              type: service.type,
            },
            config,
          });
          send({
            fclVersion: VERSION,
            type: 'FCL:FRAME:READY:RESPONSE',
            body,
            service: {
              params: service.params,
              data: service.data,
              type: service.type,
            },
            config,
            deprecated: {
              message:
                'FCL:FRAME:READY:RESPONSE is deprecated and replaced with type: FCL:VIEW:READY:RESPONSE',
            },
          });
          if (includeOlderJsonRpcCall) {
            send({
              jsonrpc: '2.0',
              id: id,
              method: 'fcl:sign',
              params: [body, service.params],
            });
          }
        } catch (error) {
          throw error;
        }
      },
      onResponse(e, _ref3) {
        let { close } = _ref3;
        try {
          if (typeof e.data !== 'object') return;
          const resp = fclCore.normalizePollingResponse(e.data);
          switch (resp.status) {
            case 'APPROVED':
              resolve(resp.data);
              !redir && close();
              break;
            case 'DECLINED':
              reject(`Declined: ${resp.reason || 'No reason supplied'}`);
              close();
              break;
            case 'REDIRECT':
              resolve(resp);
              close();
              break;
            default:
              reject(`Declined: No reason supplied`);
              close();
              break;
          }
        } catch (error) {
          console.error('execPopRPC onResponse error', error);
          throw error;
        }
      },
      onMessage(e, _ref4) {
        let { close } = _ref4;
        try {
          if (typeof e.data !== 'object') return;
          if (e.data.jsonrpc !== '2.0') return;
          if (e.data.id !== id) return;
          const resp = fclCore.normalizePollingResponse(e.data.result);
          switch (resp.status) {
            case 'APPROVED':
              resolve(resp.data);
              !redir && close();
              break;
            case 'DECLINED':
              reject(`Declined: ${resp.reason || 'No reason supplied'}`);
              close();
              break;
            case 'REDIRECT':
              resolve(resp);
              close();
              break;
            default:
              reject(`Declined: No reason supplied`);
              close();
              break;
          }
        } catch (error) {
          console.error('execPopRPC onMessage error', error);
          throw error;
        }
      },
      onClose() {
        reject(`Declined: Externally Halted`);
      },
    });
  });
}

const noop$1 = () => {};
function tab(service) {
  let opts =
    arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (service == null)
    return {
      send: noop$1,
      close: noop$1,
    };
  const onClose = opts.onClose || noop$1;
  const onMessage = opts.onMessage || noop$1;
  const onReady = opts.onReady || noop$1;
  const onResponse = opts.onResponse || noop$1;
  const handler = fclCore.buildMessageHandler({
    close,
    send,
    onReady,
    onResponse,
    onMessage,
  });
  window.addEventListener('message', handler);
  const [$tab, unmount] = renderTab(fclCore.serviceEndpoint(service));
  const timer = setInterval(function () {
    if ($tab && $tab.closed) {
      close();
    }
  }, 500);
  return {
    send,
    close,
  };
  function close() {
    try {
      window.removeEventListener('message', handler);
      clearInterval(timer);
      unmount();
      onClose();
    } catch (error) {
      console.error('Tab Close Error', error);
    }
  }
  function send(msg) {
    try {
      $tab.postMessage(JSON.parse(JSON.stringify(msg || {})), '*');
    } catch (error) {
      console.error('Tab Send Error', msg, error);
    }
  }
}

function execTabRPC(_ref) {
  let { service, body, config, opts } = _ref;
  return new Promise((resolve, reject) => {
    const id = utilUid.uid();
    const { redir, includeOlderJsonRpcCall } = opts;
    tab(service, {
      async onReady(_, _ref2) {
        let { send } = _ref2;
        try {
          send({
            fclVersion: VERSION,
            type: 'FCL:VIEW:READY:RESPONSE',
            body,
            service: {
              params: service.params,
              data: service.data,
              type: service.type,
            },
            config,
          });
          send({
            fclVersion: VERSION,
            type: 'FCL:FRAME:READY:RESPONSE',
            body,
            service: {
              params: service.params,
              data: service.data,
              type: service.type,
            },
            config,
            deprecated: {
              message:
                'FCL:FRAME:READY:RESPONSE is deprecated and replaced with type: FCL:VIEW:READY:RESPONSE',
            },
          });
          if (includeOlderJsonRpcCall) {
            send({
              jsonrpc: '2.0',
              id: id,
              method: 'fcl:sign',
              params: [body, service.params],
            });
          }
        } catch (error) {
          throw error;
        }
      },
      onResponse(e, _ref3) {
        let { close } = _ref3;
        try {
          if (typeof e.data !== 'object') return;
          const resp = fclCore.normalizePollingResponse(e.data);
          switch (resp.status) {
            case 'APPROVED':
              resolve(resp.data);
              !redir && close();
              break;
            case 'DECLINED':
              reject(`Declined: ${resp.reason || 'No reason supplied'}`);
              close();
              break;
            case 'REDIRECT':
              resolve(resp);
              close();
              break;
            default:
              reject(`Declined: No reason supplied`);
              close();
              break;
          }
        } catch (error) {
          console.error('execPopRPC onResponse error', error);
          throw error;
        }
      },
      onMessage(e, _ref4) {
        let { close } = _ref4;
        try {
          if (typeof e.data !== 'object') return;
          if (e.data.jsonrpc !== '2.0') return;
          if (e.data.id !== id) return;
          const resp = fclCore.normalizePollingResponse(e.data.result);
          switch (resp.status) {
            case 'APPROVED':
              resolve(resp.data);
              !redir && close();
              break;
            case 'DECLINED':
              reject(`Declined: ${resp.reason || 'No reason supplied'}`);
              close();
              break;
            case 'REDIRECT':
              resolve(resp);
              close();
              break;
            default:
              reject(`Declined: No reason supplied`);
              close();
              break;
          }
        } catch (error) {
          console.error('execPopRPC onMessage error', error);
          throw error;
        }
      },
      onClose() {
        reject(`Declined: Externally Halted`);
      },
    });
  });
}

const noop = () => {};
function extension(service) {
  let opts =
    arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (service == null)
    return {
      send: noop,
      close: noop,
    };
  const onClose = opts.onClose || noop;
  const onMessage = opts.onMessage || noop;
  const onReady = opts.onReady || noop;
  const onResponse = opts.onResponse || noop;
  const handler = fclCore.buildMessageHandler({
    close,
    send,
    onReady,
    onResponse,
    onMessage,
  });
  window.addEventListener('message', handler);
  send({
    service,
  });
  return {
    send,
    close,
  };
  function close() {
    try {
      window.removeEventListener('message', handler);
      onClose();
    } catch (error) {
      console.error('Ext Close Error', error);
    }
  }
  function send(msg) {
    try {
      window && window.postMessage(JSON.parse(JSON.stringify(msg || {})), '*');
    } catch (error) {
      console.error('Ext Send Error', msg, error);
    }
  }
}

function execExtRPC(_ref) {
  let { service, body, config, opts } = _ref;
  return new Promise((resolve, reject) => {
    extension(service, {
      async onReady(_, _ref2) {
        let { send } = _ref2;
        try {
          send({
            fclVersion: VERSION,
            type: 'FCL:VIEW:READY:RESPONSE',
            body,
            service: {
              params: service.params,
              data: service.data,
              type: service.type,
            },
            config,
          });
        } catch (error) {
          throw error;
        }
      },
      onResponse(e, _ref3) {
        let { close } = _ref3;
        try {
          if (typeof e.data !== 'object') return;
          const resp = fclCore.normalizePollingResponse(e.data);
          switch (resp.status) {
            case 'APPROVED':
              resolve(resp.data);
              close();
              break;
            case 'DECLINED':
              reject(`Declined: ${resp.reason || 'No reason supplied'}`);
              close();
              break;
            case 'REDIRECT':
              resolve(resp);
              close();
              break;
            default:
              reject(`Declined: No reason supplied`);
              close();
              break;
          }
        } catch (error) {
          console.error('execExtRPC onResponse error', error);
          throw error;
        }
      },
      onClose() {
        reject(`Declined: Externally Halted`);
      },
    });
  });
}

const NOT_IMPLEMENTED = () => {
  throw new Error('Strategy util has not been implemented on this platform');
};
const VIEWS = {
  'VIEW/IFRAME': renderFrame,
  'VIEW/POP': renderPop,
  'VIEW/TAB': renderTab,
  'VIEW/MOBILE_BROWSER': NOT_IMPLEMENTED,
  'VIEW/DEEPLINK': NOT_IMPLEMENTED,
};
async function execLocal(service) {
  let opts =
    arguments.length > 1 && arguments[1] !== undefined
      ? arguments[1]
      : {
          serviceEndpoint: () => {},
        };
  const { serviceEndpoint } = opts;
  try {
    return VIEWS[service.method](serviceEndpoint(service), opts);
  } catch (error) {
    console.error('execLocal({service, opts = {}})', error, {
      service,
      opts,
    });
    throw error;
  }
}

const coreStrategies = {
  [fclCore.CORE_STRATEGIES['HTTP/RPC']]: fclCore.getExecHttpPost(execLocal),
  [fclCore.CORE_STRATEGIES['HTTP/POST']]: fclCore.getExecHttpPost(execLocal),
  [fclCore.CORE_STRATEGIES['IFRAME/RPC']]: execIframeRPC,
  [fclCore.CORE_STRATEGIES['POP/RPC']]: execPopRPC,
  [fclCore.CORE_STRATEGIES['TAB/RPC']]: execTabRPC,
  [fclCore.CORE_STRATEGIES['EXT/RPC']]: execExtRPC,
};

const isServer = typeof window === 'undefined';
const getMetadata = (config) => {
  const appTitle = config['app.detail.title'];
  const appIcon = config['app.detail.icon'];
  const appDescription = config['app.detail.description'];
  const appUrl = config['app.detail.url'];
  return {
    name: appTitle ?? document.title,
    description: appDescription ?? '',
    url: appUrl ?? window.location.origin,
    icons: appIcon ? [appIcon] : [],
  };
};
function initFclWcLoader() {
  // We cannot load WalletConnect plugin on server side
  if (isServer) {
    return;
  }

  // Use previous configuration to check for changes & notify the user that this is not possible
  let lastConfig = null;

  // Only the first configuration will be used
  let hasLoaded = false;
  config.config.subscribe(async (fullConfig) => {
    const wcConfig = {
      'walletconnect.projectId': fullConfig['walletconnect.projectId'],
      'app.detail.title': fullConfig['app.detail.title'],
      'app.detail.icon': fullConfig['app.detail.icon'],
      'app.detail.description': fullConfig['app.detail.description'],
      'app.detail.url': fullConfig['app.detail.url'],
    };
    const projectId = wcConfig['walletconnect.projectId'];

    // Check if the plugin is already loaded by this loader, but with different configuration
    // The plugin can only be loaded once
    const previousConfig = lastConfig;
    lastConfig = JSON.stringify(wcConfig, null, 2);
    if (hasLoaded) {
      if (previousConfig !== lastConfig) {
        console.warn(`FCL WalletConnect Plugin has been already loaded with different configuration. It is not possible to change the configuration after the plugin has been loaded.

Previous configuration:
${previousConfig}

Current configuration:
${lastConfig}`);
      }
      return;
    }

    // If the configuration is not set, we do not load the plugin
    const isConfigured = !!projectId;
    if (!isConfigured) {
      return;
    }
    utilInvariant.invariant(
      !!projectId,
      "FCL Configuration value for 'walletconnect.projectId' is required"
    );

    // Check if the plugin is already loaded manually
    // Usually this won't happen as it is more likely that the plugin will be loaded by this loader
    // before the developer has a chance to load it manually, but it's good to check
    if (
      fclCore.pluginRegistry
        .getPlugins()
        .has(fclWc__namespace.SERVICE_PLUGIN_NAME)
    ) {
      if (!hasLoaded) {
        console.warn(
          'It seems like the FCL WalletConnect plugins has been already loaded manually. This is no longer necessary, please see the documentation for more information.'
        );
      }
      hasLoaded = true;
      return;
    }
    hasLoaded = true;

    // Load the plugin if not already loaded
    // We must lazy load the plugin to avoid race conditions
    // where the developer attempts to use the plugin before
    // our loader applies the configuration
    const { FclWcServicePlugin } = fclWc__namespace.initLazy({
      projectId,
      metadata: getMetadata(wcConfig),
    });
    fclCore.pluginRegistry.add([FclWcServicePlugin]);
  });
}

const mutate = fclCore.getMutate({
  platform: 'web',
});
const currentUser = fclCore.getCurrentUser({
  platform: 'web',
});
const authenticate = function () {
  let opts =
    arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return currentUser().authenticate(opts);
};
const unauthenticate = () => currentUser().unauthenticate();
const reauthenticate = function () {
  let opts =
    arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  currentUser().unauthenticate();
  return currentUser().authenticate(opts);
};
const signUp = function () {
  let opts =
    arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return currentUser().authenticate(opts);
};
const logIn = function () {
  let opts =
    arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return currentUser().authenticate(opts);
};
const authz = currentUser().authorization;
config.config(getDefaultConfig());
fclCore.initServiceRegistry({
  coreStrategies,
});

// Automatically load fcl-wc plugin
// Based on the user's config
initFclWcLoader();

Object.defineProperty(exports, 'AppUtils', {
  enumerable: true,
  get: function () {
    return fclCore.AppUtils;
  },
});
Object.defineProperty(exports, 'InteractionTemplateUtils', {
  enumerable: true,
  get: function () {
    return fclCore.InteractionTemplateUtils;
  },
});
Object.defineProperty(exports, 'TestUtils', {
  enumerable: true,
  get: function () {
    return fclCore.TestUtils;
  },
});
Object.defineProperty(exports, 'VERSION', {
  enumerable: true,
  get: function () {
    return fclCore.VERSION;
  },
});
Object.defineProperty(exports, 'WalletUtils', {
  enumerable: true,
  get: function () {
    return fclCore.WalletUtils;
  },
});
Object.defineProperty(exports, 'account', {
  enumerable: true,
  get: function () {
    return fclCore.account;
  },
});
Object.defineProperty(exports, 'arg', {
  enumerable: true,
  get: function () {
    return fclCore.arg;
  },
});
Object.defineProperty(exports, 'args', {
  enumerable: true,
  get: function () {
    return fclCore.args;
  },
});
Object.defineProperty(exports, 'atBlockHeight', {
  enumerable: true,
  get: function () {
    return fclCore.atBlockHeight;
  },
});
Object.defineProperty(exports, 'atBlockId', {
  enumerable: true,
  get: function () {
    return fclCore.atBlockId;
  },
});
Object.defineProperty(exports, 'authorization', {
  enumerable: true,
  get: function () {
    return fclCore.authorization;
  },
});
Object.defineProperty(exports, 'authorizations', {
  enumerable: true,
  get: function () {
    return fclCore.authorizations;
  },
});
Object.defineProperty(exports, 'block', {
  enumerable: true,
  get: function () {
    return fclCore.block;
  },
});
Object.defineProperty(exports, 'build', {
  enumerable: true,
  get: function () {
    return fclCore.build;
  },
});
Object.defineProperty(exports, 'cadence', {
  enumerable: true,
  get: function () {
    return fclCore.cadence;
  },
});
Object.defineProperty(exports, 'cdc', {
  enumerable: true,
  get: function () {
    return fclCore.cdc;
  },
});
Object.defineProperty(exports, 'config', {
  enumerable: true,
  get: function () {
    return fclCore.config;
  },
});
Object.defineProperty(exports, 'createSignableVoucher', {
  enumerable: true,
  get: function () {
    return fclCore.createSignableVoucher;
  },
});
Object.defineProperty(exports, 'decode', {
  enumerable: true,
  get: function () {
    return fclCore.decode;
  },
});
Object.defineProperty(exports, 'discovery', {
  enumerable: true,
  get: function () {
    return fclCore.discovery;
  },
});
Object.defineProperty(exports, 'display', {
  enumerable: true,
  get: function () {
    return fclCore.display;
  },
});
Object.defineProperty(exports, 'events', {
  enumerable: true,
  get: function () {
    return fclCore.events;
  },
});
Object.defineProperty(exports, 'getAccount', {
  enumerable: true,
  get: function () {
    return fclCore.getAccount;
  },
});
Object.defineProperty(exports, 'getBlock', {
  enumerable: true,
  get: function () {
    return fclCore.getBlock;
  },
});
Object.defineProperty(exports, 'getBlockHeader', {
  enumerable: true,
  get: function () {
    return fclCore.getBlockHeader;
  },
});
Object.defineProperty(exports, 'getChainId', {
  enumerable: true,
  get: function () {
    return fclCore.getChainId;
  },
});
Object.defineProperty(exports, 'getCollection', {
  enumerable: true,
  get: function () {
    return fclCore.getCollection;
  },
});
Object.defineProperty(exports, 'getEvents', {
  enumerable: true,
  get: function () {
    return fclCore.getEvents;
  },
});
Object.defineProperty(exports, 'getEventsAtBlockHeightRange', {
  enumerable: true,
  get: function () {
    return fclCore.getEventsAtBlockHeightRange;
  },
});
Object.defineProperty(exports, 'getEventsAtBlockIds', {
  enumerable: true,
  get: function () {
    return fclCore.getEventsAtBlockIds;
  },
});
Object.defineProperty(exports, 'getNetworkParameters', {
  enumerable: true,
  get: function () {
    return fclCore.getNetworkParameters;
  },
});
Object.defineProperty(exports, 'getNodeVersionInfo', {
  enumerable: true,
  get: function () {
    return fclCore.getNodeVersionInfo;
  },
});
Object.defineProperty(exports, 'getTransaction', {
  enumerable: true,
  get: function () {
    return fclCore.getTransaction;
  },
});
Object.defineProperty(exports, 'getTransactionStatus', {
  enumerable: true,
  get: function () {
    return fclCore.getTransactionStatus;
  },
});
Object.defineProperty(exports, 'invariant', {
  enumerable: true,
  get: function () {
    return fclCore.invariant;
  },
});
Object.defineProperty(exports, 'isBad', {
  enumerable: true,
  get: function () {
    return fclCore.isBad;
  },
});
Object.defineProperty(exports, 'isOk', {
  enumerable: true,
  get: function () {
    return fclCore.isOk;
  },
});
Object.defineProperty(exports, 'limit', {
  enumerable: true,
  get: function () {
    return fclCore.limit;
  },
});
Object.defineProperty(exports, 'nodeVersionInfo', {
  enumerable: true,
  get: function () {
    return fclCore.nodeVersionInfo;
  },
});
Object.defineProperty(exports, 'param', {
  enumerable: true,
  get: function () {
    return fclCore.param;
  },
});
Object.defineProperty(exports, 'params', {
  enumerable: true,
  get: function () {
    return fclCore.params;
  },
});
Object.defineProperty(exports, 'payer', {
  enumerable: true,
  get: function () {
    return fclCore.payer;
  },
});
Object.defineProperty(exports, 'ping', {
  enumerable: true,
  get: function () {
    return fclCore.ping;
  },
});
Object.defineProperty(exports, 'pipe', {
  enumerable: true,
  get: function () {
    return fclCore.pipe;
  },
});
Object.defineProperty(exports, 'pluginRegistry', {
  enumerable: true,
  get: function () {
    return fclCore.pluginRegistry;
  },
});
Object.defineProperty(exports, 'proposer', {
  enumerable: true,
  get: function () {
    return fclCore.proposer;
  },
});
Object.defineProperty(exports, 'query', {
  enumerable: true,
  get: function () {
    return fclCore.query;
  },
});
Object.defineProperty(exports, 'ref', {
  enumerable: true,
  get: function () {
    return fclCore.ref;
  },
});
Object.defineProperty(exports, 'sansPrefix', {
  enumerable: true,
  get: function () {
    return fclCore.sansPrefix;
  },
});
Object.defineProperty(exports, 'script', {
  enumerable: true,
  get: function () {
    return fclCore.script;
  },
});
Object.defineProperty(exports, 'send', {
  enumerable: true,
  get: function () {
    return fclCore.send;
  },
});
Object.defineProperty(exports, 'serialize', {
  enumerable: true,
  get: function () {
    return fclCore.serialize;
  },
});
Object.defineProperty(exports, 'subscribeEvents', {
  enumerable: true,
  get: function () {
    return fclCore.subscribeEvents;
  },
});
Object.defineProperty(exports, 't', {
  enumerable: true,
  get: function () {
    return fclCore.t;
  },
});
Object.defineProperty(exports, 'transaction', {
  enumerable: true,
  get: function () {
    return fclCore.transaction;
  },
});
Object.defineProperty(exports, 'tx', {
  enumerable: true,
  get: function () {
    return fclCore.tx;
  },
});
Object.defineProperty(exports, 'validator', {
  enumerable: true,
  get: function () {
    return fclCore.validator;
  },
});
Object.defineProperty(exports, 'verifyUserSignatures', {
  enumerable: true,
  get: function () {
    return fclCore.verifyUserSignatures;
  },
});
Object.defineProperty(exports, 'voucherIntercept', {
  enumerable: true,
  get: function () {
    return fclCore.voucherIntercept;
  },
});
Object.defineProperty(exports, 'voucherToTxId', {
  enumerable: true,
  get: function () {
    return fclCore.voucherToTxId;
  },
});
Object.defineProperty(exports, 'why', {
  enumerable: true,
  get: function () {
    return fclCore.why;
  },
});
Object.defineProperty(exports, 'withPrefix', {
  enumerable: true,
  get: function () {
    return fclCore.withPrefix;
  },
});
exports.authenticate = authenticate;
exports.authz = authz;
exports.currentUser = currentUser;
exports.logIn = logIn;
exports.mutate = mutate;
exports.reauthenticate = reauthenticate;
exports.signUp = signUp;
exports.unauthenticate = unauthenticate;
//# sourceMappingURL=fcl.js.map
