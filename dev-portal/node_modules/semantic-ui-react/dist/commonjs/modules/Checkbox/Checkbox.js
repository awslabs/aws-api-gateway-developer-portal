'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _lib = require('../../lib');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var debug = (0, _lib.makeDebugger)('checkbox');

var _meta = {
  name: 'Checkbox',
  type: _lib.META.TYPES.MODULE,
  props: {
    type: ['checkbox', 'radio']
  }
};

/**
 * A checkbox allows a user to select a value from a small set of options, often binary
 * @see Form
 * @see Radio
 */

var Checkbox = function (_Component) {
  _inherits(Checkbox, _Component);

  function Checkbox() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, Checkbox);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = Checkbox.__proto__ || Object.getPrototypeOf(Checkbox)).call.apply(_ref, [this].concat(args))), _this), _this.state = {}, _this.canToggle = function () {
      var _this$props = _this.props,
          disabled = _this$props.disabled,
          radio = _this$props.radio,
          readOnly = _this$props.readOnly;
      var checked = _this.state.checked;


      return !disabled && !readOnly && !(radio && checked);
    }, _this.handleClick = function (e) {
      debug('handleClick()');
      var _this$props2 = _this.props,
          onChange = _this$props2.onChange,
          onClick = _this$props2.onClick,
          name = _this$props2.name,
          value = _this$props2.value;
      var checked = _this.state.checked;

      debug('  name:       ' + name);
      debug('  value:      ' + value);
      debug('  checked:    ' + checked);

      if (_this.canToggle()) {
        if (onClick) onClick(e, { name: name, value: value, checked: !!checked });
        if (onChange) onChange(e, { name: name, value: value, checked: !checked });

        _this.trySetState({ checked: !checked });
      }
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(Checkbox, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          className = _props.className,
          label = _props.label,
          name = _props.name,
          radio = _props.radio,
          slider = _props.slider,
          toggle = _props.toggle,
          type = _props.type,
          value = _props.value,
          disabled = _props.disabled,
          readOnly = _props.readOnly;
      var checked = this.state.checked;

      var classes = (0, _classnames2.default)('ui', (0, _lib.useKeyOnly)(checked, 'checked'),
      // auto apply fitted class to compact white space when there is no label
      // http://semantic-ui.com/modules/checkbox.html#fitted
      (0, _lib.useKeyOnly)(!label, 'fitted'), (0, _lib.useKeyOnly)(radio, 'radio'), (0, _lib.useKeyOnly)(slider, 'slider'), (0, _lib.useKeyOnly)(toggle, 'toggle'), (0, _lib.useKeyOnly)(disabled, 'disabled'), (0, _lib.useKeyOnly)(readOnly, 'read-only'), 'checkbox', className);
      var rest = (0, _lib.getUnhandledProps)(Checkbox, this.props);
      var ElementType = (0, _lib.getElementType)(Checkbox, this.props);

      return _react2.default.createElement(
        ElementType,
        _extends({}, rest, { className: classes, onClick: this.handleClick, onChange: this.handleClick }),
        _react2.default.createElement('input', {
          type: type,
          name: name,
          checked: checked,
          className: 'hidden',
          readOnly: true,
          tabIndex: 0,
          value: value
        }),
        _react2.default.createElement(
          'label',
          null,
          label
        )
      );
    }
  }]);

  return Checkbox;
}(_lib.AutoControlledComponent);

Checkbox.propTypes = {
  /** An element type to render as (string or function). */
  as: _lib.customPropTypes.as,

  /** Additional classes. */
  className: _react.PropTypes.string,

  /** Whether or not checkbox is checked. */
  checked: _react.PropTypes.bool,

  /** The initial value of checked. */
  defaultChecked: _react.PropTypes.bool,

  /** Format to emphasize the current selection state */
  slider: _lib.customPropTypes.every([_react.PropTypes.bool, _lib.customPropTypes.disallow(['radio', 'toggle'])]),

  /** Format as a radio element. This means it is an exclusive option.*/
  radio: _lib.customPropTypes.every([_react.PropTypes.bool, _lib.customPropTypes.disallow(['slider', 'toggle'])]),

  /** Format to show an on or off choice */
  toggle: _lib.customPropTypes.every([_react.PropTypes.bool, _lib.customPropTypes.disallow(['radio', 'slider'])]),

  /** A checkbox can appear disabled and be unable to change states */
  disabled: _react.PropTypes.bool,

  /** Removes padding for a label. Auto applied when there is no label. */
  fitted: _react.PropTypes.bool,

  /** The text of the associated label element. */
  label: _react.PropTypes.string,

  /** HTML input type, either checkbox or radio. */
  type: _react.PropTypes.oneOf(_meta.props.type),

  /** The HTML input name. */
  name: _react.PropTypes.string,

  /** Called with (event, { name, value, checked }) when the user attempts to change the value. */
  onChange: _react.PropTypes.func,

  /** Called with (event, { name, value, checked }) when the checkbox or label is clicked. */
  onClick: _react.PropTypes.func,

  /** A checkbox can be read-only and unable to change states */
  readOnly: _react.PropTypes.bool,

  /** The HTML input value. */
  value: _react.PropTypes.string
};
Checkbox.defaultProps = {
  type: 'checkbox'
};
Checkbox.autoControlledProps = ['checked'];
Checkbox._meta = _meta;
exports.default = Checkbox;