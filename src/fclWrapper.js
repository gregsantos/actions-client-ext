'use strict';
import * as fcl from '@onflow/fcl';
// fcl-wrapper.js
(function () {
  // Store the original define function if it exists
  var originalDefine = window.define;

  // Temporarily replace define with our own version
  window.define = function (factory) {
    var fcl = factory();
    window.fcl = fcl;

    // Set up a listener for FCL function calls
    window.addEventListener('message', (event) => {
      if (event.data.type === 'CALL_FCL_FUNCTION') {
        const { functionName, args } = event.data;
        if (typeof fcl[functionName] === 'function') {
          try {
            const result = fcl[functionName](...args);
            window.postMessage(
              {
                type: 'FCL_FUNCTION_RESULT',
                functionName,
                result,
              },
              '*'
            );
          } catch (error) {
            window.postMessage(
              {
                type: 'FCL_FUNCTION_ERROR',
                functionName,
                error: error.message,
              },
              '*'
            );
          }
        } else {
          window.postMessage(
            {
              type: 'FCL_FUNCTION_ERROR',
              functionName,
              error: 'Function not found',
            },
            '*'
          );
        }
      }
    });

    console.log(
      'FCL has been initialized and exposed to window.fcl',
      window.fcl
    );

    // Restore the original define function
    window.define = originalDefine;
  };

  // Create a script element to load the FCL library
  var script = document.createElement('script');
  script.src = chrome.runtime.getURL('fcl.js');
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
})();
