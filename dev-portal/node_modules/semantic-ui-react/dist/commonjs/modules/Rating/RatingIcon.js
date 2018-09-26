'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _lib = require('../../lib');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * An internal icon sub-component for Rating component
 */
var RatingIcon = function (_Component) {
  _inherits(RatingIcon, _Component);

  function RatingIcon() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, RatingIcon);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = RatingIcon.__proto__ || Object.getPrototypeOf(RatingIcon)).call.apply(_ref, [this].concat(args))), _this), _this.handleClick = function (e) {
      var _this$props = _this.props,
          onClick = _this$props.onClick,
          index = _this$props.index;


      if (onClick) onClick(e, index);
    }, _this.handleMouseEnter = function () {
      var _this$props2 = _this.props,
          onMouseEnter = _this$props2.onMouseEnter,
          index = _this$props2.index;


      if (onMouseEnter) onMouseEnter(index);
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(RatingIcon, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          active = _props.active,
          selected = _props.selected;

      var classes = (0, _classnames2.default)((0, _lib.useKeyOnly)(active, 'active'), (0, _lib.useKeyOnly)(selected, 'selected'), 'icon');

      return _react2.default.createElement('i', { className: classes, onClick: this.handleClick, onMouseEnter: this.handleMouseEnter });
    }
  }]);

  return RatingIcon;
}(_react.Component);

RatingIcon.propTypes = {
  /** Indicates activity of an icon. */
  active: _react.PropTypes.bool,

  /** An index of icon inside Rating. */
  index: _react.PropTypes.number,

  /** Called with (event, index) after user clicked on an icon. */
  onClick: _react.PropTypes.func,

  /** Called with (index) after user move cursor to an icon. */
  onMouseEnter: _react.PropTypes.func,

  /** Indicates selection of an icon. */
  selected: _react.PropTypes.bool
};
RatingIcon._meta = {
  name: 'RatingIcon',
  parent: 'Rating',
  type: _lib.META.TYPES.MODULE
};
exports.default = RatingIcon;