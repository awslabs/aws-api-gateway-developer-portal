'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createHTMLInput = exports.createHTMLImage = undefined;

var _partial2 = require('lodash/partial');

var _partial3 = _interopRequireDefault(_partial2);

var _isArray2 = require('lodash/isArray');

var _isArray3 = _interopRequireDefault(_isArray2);

var _isNumber2 = require('lodash/isNumber');

var _isNumber3 = _interopRequireDefault(_isNumber2);

var _isString2 = require('lodash/isString');

var _isString3 = _interopRequireDefault(_isString2);

var _isPlainObject2 = require('lodash/isPlainObject');

var _isPlainObject3 = _interopRequireDefault(_isPlainObject2);

var _isFunction2 = require('lodash/isFunction');

var _isFunction3 = _interopRequireDefault(_isFunction2);

var _has2 = require('lodash/has');

var _has3 = _interopRequireDefault(_has2);

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.createShorthand = createShorthand;
exports.createShorthandFactory = createShorthandFactory;

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

/**
 * Merges props and classNames.
 *
 * @param {object} defaultProps A props object
 * @param {object} props A props object
 * @returns {object} A new props object
 */
var mergePropsAndClassName = function mergePropsAndClassName(defaultProps, props) {
  var _defaultProps$props = _extends({}, defaultProps, props),
      childKey = _defaultProps$props.childKey,
      newProps = _objectWithoutProperties(_defaultProps$props, ['childKey']);

  if ((0, _has3.default)(props, 'className') || (0, _has3.default)(defaultProps.className)) {
    newProps.className = (0, _classnames2.default)(defaultProps.className, props.className); // eslint-disable-line react/prop-types
  }

  if (!newProps.key && childKey) {
    newProps.key = (0, _isFunction3.default)(childKey) ? childKey(newProps) : childKey;
  }

  return newProps;
};

/**
 * A more robust React.createElement.
 * It can create elements from primitive values.
 *
 * @param {function|string} Component A ReactClass or string
 * @param {function} mapValueToProps A function that maps a primitive value to the Component props
 * @param {string|object|function} val The value to create a ReactElement from
 * @param {object|function} [defaultProps={}] Default props object or function (called with regular props).
 * @returns {function|null}
 */
function createShorthand(Component, mapValueToProps, val) {
  var defaultProps = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  if (typeof Component !== 'function' && typeof Component !== 'string') {
    throw new Error('createShorthandFactory() Component must be a string or function.');
  }
  // short circuit for disabling shorthand
  if (val === null) return null;

  var type = void 0;
  var usersProps = {};

  if ((0, _react.isValidElement)(val)) {
    type = 'element';
    usersProps = val.props;
  } else if ((0, _isPlainObject3.default)(val)) {
    type = 'props';
    usersProps = val;
  } else if ((0, _isString3.default)(val) || (0, _isNumber3.default)(val) || (0, _isArray3.default)(val)) {
    type = 'literal';
    usersProps = mapValueToProps(val);
  }

  defaultProps = (0, _isFunction3.default)(defaultProps) ? defaultProps(usersProps) : defaultProps;
  var props = mergePropsAndClassName(defaultProps, usersProps);

  // Clone ReactElements
  if (type === 'element') {
    return (0, _react.cloneElement)(val, props);
  }

  // Create ReactElements from props objects
  // Map values to props and create a ReactElement
  if (type === 'props' || type === 'literal') {
    return _react2.default.createElement(Component, props);
  }

  // Otherwise null
  return null;
}

function createShorthandFactory(Component, mapValueToProps) {
  if (typeof Component !== 'function' && typeof Component !== 'string') {
    throw new Error('createShorthandFactory() Component must be a string or function.');
  }
  return (0, _partial3.default)(createShorthand, Component, mapValueToProps);
}

// ----------------------------------------
// HTML Factories
// ----------------------------------------
var createHTMLImage = exports.createHTMLImage = createShorthandFactory('img', function (value) {
  return { src: value };
});
var createHTMLInput = exports.createHTMLInput = createShorthandFactory('input', function (value) {
  return { type: value };
});