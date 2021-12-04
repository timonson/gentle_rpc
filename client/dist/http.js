/**
 * Transpiled for legacy browsers
 */

function _typeof(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function _typeof(obj) {
      return typeof obj;
    };
  } else {
    _typeof = function _typeof(obj) {
      return obj && typeof Symbol === "function" &&
          obj.constructor === Symbol && obj !== Symbol.prototype
        ? "symbol"
        : typeof obj;
    };
  }
  return _typeof(obj);
}

function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) ||
    _unsupportedIterableToArray(arr) || _nonIterableSpread();
}

function _nonIterableSpread() {
  throw new TypeError(
    "Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.",
  );
}

function _iterableToArray(iter) {
  if (
    typeof Symbol !== "undefined" && iter[Symbol.iterator] != null ||
    iter["@@iterator"] != null
  ) {
    return Array.from(iter);
  }
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) {
      symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    }
    keys.push.apply(keys, symbols);
  }
  return keys;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(
          target,
          key,
          Object.getOwnPropertyDescriptor(source, key),
        );
      });
    }
  }
  return target;
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: { value: subClass, writable: true, configurable: true },
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _createSuper(Derived) {
  var hasNativeReflectConstruct = _isNativeReflectConstruct();
  return function _createSuperInternal() {
    var Super = _getPrototypeOf(Derived), result;
    if (hasNativeReflectConstruct) {
      var NewTarget = _getPrototypeOf(this).constructor;
      result = Reflect.construct(Super, arguments, NewTarget);
    } else result = Super.apply(this, arguments);
    return _possibleConstructorReturn(this, result);
  };
}

function _possibleConstructorReturn(self, call) {
  if (call && (_typeof(call) === "object" || typeof call === "function")) {
    return call;
  } else if (call !== void 0) {
    throw new TypeError(
      "Derived constructors may only return object or undefined",
    );
  }
  return _assertThisInitialized(self);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called",
    );
  }
  return self;
}

function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : undefined;
  _wrapNativeSuper = function _wrapNativeSuper(Class) {
    if (Class === null || !_isNativeFunction(Class)) return Class;
    if (typeof Class !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }
    if (typeof _cache !== "undefined") {
      if (_cache.has(Class)) return _cache.get(Class);
      _cache.set(Class, Wrapper);
    }
    function Wrapper() {
      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
    }
    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true,
      },
    });
    return _setPrototypeOf(Wrapper, Class);
  };
  return _wrapNativeSuper(Class);
}

function _construct(Parent, args, Class) {
  if (_isNativeReflectConstruct()) _construct = Reflect.construct;
  else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _setPrototypeOf(instance, Class.prototype);
      return instance;
    };
  }
  return _construct.apply(null, arguments);
}

function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;
  try {
    Boolean.prototype.valueOf.call(
      Reflect.construct(Boolean, [], function () {}),
    );
    return true;
  } catch (e) {
    return false;
  }
}

function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };
  return _setPrototypeOf(o, p);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf
    ? Object.getPrototypeOf
    : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
  return _getPrototypeOf(o);
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else obj[key] = value;
  return obj;
}

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) ||
    _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}

function _nonIterableRest() {
  throw new TypeError(
    "Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.",
  );
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) {
    return _arrayLikeToArray(o, minLen);
  }
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}

function _iterableToArrayLimit(arr, i) {
  var _i = arr == null
    ? null
    : typeof Symbol !== "undefined" && arr[Symbol.iterator] ||
      arr["@@iterator"];
  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;
  var _s, _e;
  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);
      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }
  return _arr;
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function generateId() {
  return window.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
}

function createRequest(_ref) {
  var method = _ref.method,
    params = _ref.params,
    _ref$isNotification = _ref.isNotification,
    isNotification = _ref$isNotification === void 0
      ? false
      : _ref$isNotification,
    id = _ref.id;
  var rpcRequest = {
    jsonrpc: "2.0",
    method: method,
  };
  params && (rpcRequest.params = params);
  id = isNotification ? undefined : id !== undefined ? id : generateId();
  id !== undefined && (rpcRequest.id = id);
  return rpcRequest;
}

function createRequestBatch(batchObj) {
  var isNotification = arguments.length > 1 && arguments[1] !== undefined
    ? arguments[1]
    : false;
  return Array.isArray(batchObj)
    ? batchObj.map(function (el) {
      return Object.entries(el).map(function (_ref2) {
        var _ref3 = _slicedToArray(_ref2, 2),
          method = _ref3[0],
          arr = _ref3[1];

        return arr.map(function (params) {
          return createRequest({
            method: method,
            params: params,
            isNotification: isNotification,
          });
        });
      });
    }).flat(2)
    : Object.entries(batchObj).map(function (_ref4) {
      var _ref5 = _slicedToArray(_ref4, 2),
        key = _ref5[0],
        value = _ref5[1];

      return createRequest({
        method: value[0],
        params: value[1],
        isNotification: isNotification,
        id: key,
      });
    });
}

var BadServerDataError = /*#__PURE__*/ function (_Error) {
  _inherits(BadServerDataError, _Error);

  var _super = _createSuper(BadServerDataError);

  function BadServerDataError(id, message, errorCode, data) {
    var _this;

    _classCallCheck(this, BadServerDataError);

    _this = _super.call(this, message);

    _defineProperty(_assertThisInitialized(_this), "id", void 0);

    _defineProperty(_assertThisInitialized(_this), "code", void 0);

    _defineProperty(_assertThisInitialized(_this), "data", void 0);

    _this.name = _this.constructor.name;
    _this.id = id;
    _this.code = errorCode;
    _this.data = data;
    return _this;
  }

  return BadServerDataError;
}(/*#__PURE__*/ _wrapNativeSuper(Error));

function validateRpcBasis(data) {
  return (data === null || data === void 0 ? void 0 : data.jsonrpc) === "2.0" &&
    (typeof data.id === "number" || typeof data.id === "string" ||
      data.id === null);
}

function validateRpcSuccess(data) {
  return "result" in data;
}

function validateRpcFailure(data) {
  var _data$error;

  return typeof (data === null || data === void 0
        ? void 0
        : (_data$error = data.error) === null || _data$error === void 0
        ? void 0
        : _data$error.code) === "number" &&
    typeof data.error.message === "string";
}

function validateResponse(data, isNotification) {
  if (isNotification && data !== undefined) {
    throw new BadServerDataError(
      null,
      "The server's response to the notification contains unexpected data.",
    );
  }

  if (validateRpcBasis(data)) {
    if (validateRpcSuccess(data)) return data;
    else if (validateRpcFailure(data)) {
      throw new BadServerDataError(
        data.id,
        data.error.message,
        data.error.code,
        data.error.data,
      );
    }
  }

  throw new BadServerDataError(
    null,
    "The received data is no valid JSON-RPC 2.0 Response object.",
  );
}

function send(resource, fetchInit) {
  return fetch(resource instanceof URL ? resource.href : resource, fetchInit)
    .then(function (res) {
      return res.status === 204 || res.headers.get("content-length") === "0"
        ? undefined
        : res.text().then(function (text) {
          return text ? JSON.parse(text) : undefined;
        })["catch"](function (err) {
          return Promise.reject(
            new BadServerDataError(null, "The received data is invalid JSON."),
          );
        });
    });
}

function processBatchArray1(rpcResponseBatch, isNotification) {
  return rpcResponseBatch.map(function (rpcResponse) {
    return validateResponse(rpcResponse, isNotification).result;
  });
}

function processBatchObject1(rpcResponseBatch, isNotification) {
  return rpcResponseBatch.reduce(function (acc, rpcResponse) {
    var rpcSuccess = validateResponse(rpcResponse, isNotification);

    if (rpcSuccess.id !== null) {
      acc[rpcSuccess.id] = rpcSuccess.result;
      return acc;
    } else {
      throw new BadServerDataError(
        null,
        "Type 'null' cannot be used as an index type.",
      );
    }
  }, {});
}

var Remote1 = /*#__PURE__*/ function () {
  function Remote1(resource) {
    var options = arguments.length > 1 && arguments[1] !== undefined
      ? arguments[1]
      : {};

    _classCallCheck(this, Remote1);

    _defineProperty(this, "resource", void 0);

    _defineProperty(this, "fetchInit", void 0);

    var headers = options.headers === undefined
      ? new Headers()
      : options.headers instanceof Headers
      ? options.headers
      : new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    this.fetchInit = _objectSpread(_objectSpread({}, options), {}, {
      method: "POST",
      headers: headers,
    });
    this.resource = resource;
  }

  _createClass(Remote1, [{
    key: "batch",
    value: function batch(batchObj) {
      var _ref6 = arguments.length > 1 && arguments[1] !== undefined
          ? arguments[1]
          : {},
        isNotification = _ref6.isNotification,
        jwt = _ref6.jwt;

      return send(
        this.resource,
        _objectSpread(_objectSpread({}, this.fetchInit), {}, {
          headers: jwt
            ? new Headers(
              [].concat(_toConsumableArray(this.fetchInit.headers.entries()), [[
                "Authorization",
                "Bearer ".concat(jwt),
              ]]),
            )
            : this.fetchInit.headers,
          body: JSON.stringify(createRequestBatch(batchObj, isNotification)),
        }),
      ).then(function (rpcResponseBatch) {
        if (rpcResponseBatch === undefined && isNotification) {
          return rpcResponseBatch;
        } else if (
          Array.isArray(rpcResponseBatch) && rpcResponseBatch.length > 0
        ) {
          return Array.isArray(batchObj)
            ? processBatchArray1(rpcResponseBatch, isNotification)
            : processBatchObject1(rpcResponseBatch, isNotification);
        } else {
          throw new BadServerDataError(
            null,
            "The server returned an invalid batch response.",
          );
        }
      });
    },
  }, {
    key: "call",
    value: function call(method, params) {
      var _ref7 = arguments.length > 2 && arguments[2] !== undefined
          ? arguments[2]
          : {},
        isNotification = _ref7.isNotification,
        jwt = _ref7.jwt;

      var rpcRequestObj = createRequest({
        method: method,
        params: params,
        isNotification: isNotification,
      });
      return send(
        this.resource,
        _objectSpread(_objectSpread({}, this.fetchInit), {}, {
          headers: jwt
            ? new Headers(
              [].concat(_toConsumableArray(this.fetchInit.headers.entries()), [[
                "Authorization",
                "Bearer ".concat(jwt),
              ]]),
            )
            : this.fetchInit.headers,
          body: JSON.stringify(rpcRequestObj),
        }),
      ).then(function (rpcResponse) {
        return rpcResponse === undefined && isNotification
          ? undefined
          : validateResponse(rpcResponse, isNotification).result;
      });
    },
  }]);

  return Remote1;
}();

export { processBatchArray1 as processBatchArray };
export { processBatchObject1 as processBatchObject };
export { Remote1 as Remote };
