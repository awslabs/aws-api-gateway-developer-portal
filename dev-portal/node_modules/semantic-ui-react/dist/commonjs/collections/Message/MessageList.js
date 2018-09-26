'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _map2 = require('lodash/map');

var _map3 = _interopRequireDefault(_map2);

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _lib = require('../../lib');

var _MessageItem = require('./MessageItem');

var _MessageItem2 = _interopRequireDefault(_MessageItem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function MessageList(props) {
  var children = props.children,
      className = props.className,
      items = props.items;

  var classes = (0, _classnames2.default)('list', className);
  var rest = (0, _lib.getUnhandledProps)(MessageList, props);
  var ElementType = (0, _lib.getElementType)(MessageList, props);

  if (children) {
    return _react2.default.createElement(
      ElementType,
      _extends({}, rest, { className: classes }),
      children
    );
  }

  var content = (0, _map3.default)(items, function (item) {
    return _react2.default.createElement(
      _MessageItem2.default,
      { key: item },
      item
    );
  });

  return _react2.default.createElement(
    ElementType,
    _extends({}, rest, { className: classes }),
    content
  );
}

MessageList._meta = {
  name: 'MessageList',
  parent: 'Message',
  type: _lib.META.TYPES.COLLECTION
};

MessageList.propTypes = {
  /** An element type to render as (string or function). */
  as: _lib.customPropTypes.as,

  /** Primary content. */
  children: _react.PropTypes.node,

  /** Additional classes. */
  className: _react.PropTypes.string,

  /** Strings to use as list items. Mutually exclusive with children. */
  items: _react.PropTypes.arrayOf(_react.PropTypes.string)
};

MessageList.defaultProps = {
  as: 'ul'
};

exports.default = MessageList;