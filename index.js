/* vim: set shiftwidth=2 tabstop=2 noexpandtab textwidth=80 wrap : */
"use strict";

import translate from 'component/translate@0';
import events from 'component/events@1';
import Emitter from 'component/emitter@1';
import autoscale from 'component/autoscale-canvas@0';

export default VirtualJoystick;

function VirtualJoystick(options) {
	options = options || {};
	this._checkValid       = options.checkValid || () => true;
	this._container        = options.container || document.body;
	this._strokeStyle      = options.strokeStyle || 'cyan';
	this._stickEl          = options.stickElement || this._buildJoystickStick();
	this._baseEl           = options.baseElement || this._buildJoystickBase();
	this._stationaryBase   = options.stationaryBase || false;
	this._baseX            = this._stickX = options.baseX || 0;
	this._baseY            = this._stickY = options.baseY || 0;
	this._limitStickTravel = options.limitStickTravel || false;
	this._stickRadius      = options.stickRadius !== undefined ? options.stickRadius : 100;

	this._container.appendChild(this._baseEl);
	this._baseEl.style.position = "absolute";
	this._baseEl.style.display = "none";
	this._container.appendChild(this._stickEl);
	this._stickEl.style.position = "absolute";
	this._stickEl.style.display = "none";

	this._pressed = false;
	this._touchIdx = null;

	if (this._stationaryBase) {
		this._baseEl.style.display = "block";
		this._baseEl.style.left = (this._baseX - this._baseEl.width  / 2) + "px";
		this._baseEl.style.top  = (this._baseY - this._baseEl.height / 2) + "px";
	}

	var events = this._events = events(this._container, this);
	events.bind('mousedown' , '_onMouseDown');
	events.bind('mousemove' , '_onMouseMove');
	events.bind('mouseup'   , '_onMouseUp');
	events.bind('touchstart', '_onTouchStart');
	events.bind('touchend'  , '_onTouchEnd');
	events.bind('touchmove' , '_onTouchMove');
}

Emitter(VirtualJoystick.prototype);

VirtualJoystick.prototype.destroy = function () {
	this._container.removeChild(this._baseEl);
	this._container.removeChild(this._stickEl);
	this._events.unbind();
}

VirtualJoystick.prototype.deltaX = function () { return this._stickX - this._baseX; };
VirtualJoystick.prototype.deltaY = function () { return this._stickY - this._baseY; };


VirtualJoystick.prototype._onUp = function () {
	this.emit('end');
	this._pressed = false;
	this._stickEl.style.display = "none";

	if (!this._stationaryBase) {
		this._baseEl.style.display	= "none";

		this._baseX  = this._baseY  = 0;
		this._stickX = this._stickY = 0;
	}
}

VirtualJoystick.prototype._onDown = function (x, y) {
	if (!this._checkValid(x, y)) return;

	this.emit('start', x, y);
	this._pressed = true;
	if (!this._stationaryBase) {
		this._baseX = x;
		this._baseY = y;
		this._baseEl.style.display = "block";
		translate(this._baseEl.style,
		          this._baseX - this._baseEl.width  / 2,
		          this._baseY - this._baseEl.height / 2);
	}

	this._stickX = x;
	this._stickY = y;

	if (this._limitStickTravel) {
		var deltaX = this.deltaX();
		var deltaY = this.deltaY();
		var stickDistance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
		if (stickDistance > this._stickRadius) {
			var stickNormalizedX = deltaX / stickDistance;
			var stickNormalizedY = deltaY / stickDistance;

			this._stickX = stickNormalizedX * this._stickRadius + this._baseX;
			this._stickY = stickNormalizedY * this._stickRadius + this._baseY;
		}
	}

	this._stickEl.style.display = "block";
	translate(this._stickEl.style,
	          this._stickX - this._stickEl.width  / 2,
	          this._stickY - this._stickEl.height / 2);
}

VirtualJoystick.prototype._onMove = function (x, y) {
	if (!this._pressed) return;

	this.emit('move', x, y);
	this._stickX = x;
	this._stickY = y;

	if (this._limitStickTravel) {
		var deltaX = this.deltaX();
		var deltaY = this.deltaY();
		var stickDistance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
		if (stickDistance > this._stickRadius) {
			var stickNormalizedX = deltaX / stickDistance;
			var stickNormalizedY = deltaY / stickDistance;

			this._stickX = stickNormalizedX * this._stickRadius + this._baseX;
			this._stickY = stickNormalizedY * this._stickRadius + this._baseY;
		}
	}
	translate(this._stickEl.style,
	          this._stickX - this._stickEl.width  / 2,
	          this._stickY - this._stickEl.height / 2);
}

VirtualJoystick.prototype._onMouseUp = function (event) {
	return this._onUp();
}

VirtualJoystick.prototype._onMouseDown = function (event) {
	event.preventDefault();
	var x = event.clientX;
	var y = event.clientY;
	return this._onDown(x, y);
}

VirtualJoystick.prototype._onMouseMove = function (event) {
	var x = event.clientX;
	var y = event.clientY;
	return this._onMove(x, y);
}

VirtualJoystick.prototype._onTouchStart = function (event) {
	// if there is already a touch inprogress do nothing
	if (this._touchIdx !== null) return;

	event.preventDefault();
	// get the first who changed
	var touch = event.changedTouches[0];
	// set the touchIdx of this joystick
	this._touchIdx = touch.identifier;

	// forward the action
	var x = touch.pageX;
	var y = touch.pageY;
	return this._onDown(x, y);
}

VirtualJoystick.prototype._onTouchEnd = function (event) {
	// if there is no touch in progress, do nothing
	if (this._touchIdx === null) return;

	// try to find our touch event
	var touchList = event.changedTouches;
	for (var i = 0; i < touchList.length && touchList[i].identifier !== this._touchIdx; i++);
	// if touch event isnt found,
	if (i === touchList.length) return;

	// reset touchIdx - mark it as no-touch-in-progress
	this._touchIdx = null;

	//??????
	// no preventDefault to get click event on ios
	event.preventDefault();

	return this._onUp();
}

VirtualJoystick.prototype._onTouchMove = function (event) {
	// if there is no touch in progress, do nothing
	if (this._touchIdx === null) return;

	// try to find our touch event
	var touchList = event.changedTouches;
	for (var i = 0; i < touchList.length && touchList[i].identifier !== this._touchIdx; i++ );
	// if touch event with the proper identifier isnt found, do nothing
	if (i === touchList.length) return;
	var touch = touchList[i];

	event.preventDefault();

	var x = touch.pageX;
	var y = touch.pageY;
	return this._onMove(x, y);
}

function circle(ctx, style, width, x, y, r) {
	ctx.beginPath();
	ctx.strokeStyle = style;
	ctx.lineWidth = width;
	ctx.arc(x, y, r, 0, Math.PI * 2, true);
	ctx.stroke();
}

VirtualJoystick.prototype._buildJoystickBase = function () {
	var canvas = autoscale(document.createElement('canvas'));
	canvas.width = canvas.height = 126;
	var ctx = canvas.getContext('2d');

	circle(ctx, this._strokeStyle, 6, 63, 63, 40);
	circle(ctx, this._strokeStyle, 2, 63, 63, 60);

	return canvas;
}

VirtualJoystick.prototype._buildJoystickStick = function () {
	var canvas = autoscale(document.createElement('canvas'));
	canvas.width = canvas.height = 86;
	var ctx = canvas.getContext('2d');

	circle(ctx, this._strokeStyle, 6, 43, 43, 40);

	return canvas;
}

