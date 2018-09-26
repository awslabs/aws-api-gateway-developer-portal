'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _lib = require('../../lib');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * A simple <textarea> wrapper for use in Form.TextArea.
 * We may add more features to the TextArea in the future.
 * @see Form
 */
function TextArea(props) {
  var rest = (0, _lib.getUnhandledProps)(TextArea, props);
  var ElementType = (0, _lib.getElementType)(TextArea, props);

  return _react2.default.createElement(ElementType, rest);
}

TextArea._meta = {
  name: 'TextArea',
  type: _lib.META.TYPES.ADDON
};

TextArea.propTypes = {
  /** An element type to render as (string or function). */
  as: _lib.customPropTypes.as
};

TextArea.defaultProps = {
  as: 'textarea'
};

exports.default = TextArea;