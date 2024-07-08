'use strict';
const {Clutter, GObject, St} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {VectorImages} = Me.imports.lib.vectorImages;

// Credits: to https://github.com/Deminder for this https://github.com/Deminder/battery-indicator-icon/blob/main/src/modules/drawicon.js

function addVectorImage(cr, path)  {
    cr.translate(0, 0);
    let currentX = 0;
    let currentY = 0;
    const vectorPath = path.split(' ');
    for (let i = 0; i < vectorPath.length; i++) {
        if (vectorPath[i] === 'M') {
            currentX = vectorPath[i + 1];
            currentY = vectorPath[i + 2];
            cr.moveTo(currentX, currentY);
            i += 2;
        } else if (vectorPath[i] === 'L') {
            currentX = vectorPath[i + 1];
            currentY = vectorPath[i + 2];
            cr.lineTo(currentX, currentY);
            i += 2;
        } else if (vectorPath[i] === 'H') {
            currentX = vectorPath[i + 1];
            cr.lineTo(currentX, currentY);
            i += 1;
        } else if (vectorPath[i] === 'V') {
            currentY = vectorPath[i + 1];
            cr.lineTo(currentX, currentY);
            i += 1;
        } else if (vectorPath[i] === 'C') {
            const x1 = vectorPath[i + 1];
            const y1 = vectorPath[i + 2];
            const x2 = vectorPath[i + 3];
            const y2 = vectorPath[i + 4];
            const x3 = vectorPath[i + 5];
            const y3 = vectorPath[i + 6];
            cr.curveTo(x1, y1, x2, y2, x3, y3);
            currentX = x3;
            currentY = y3;
            i += 6;
        } else if (vectorPath[i] === 'Z') {
            cr.closePath();
        }
    }
}

var BatteryIcon = GObject.registerClass(
class BatteryIcon extends St.DrawingArea {
    _init(modelIconSize, modelPathName, {style_class}) {
        super._init({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            style_class,
        });
        this.width = modelIconSize;
        this.height = modelIconSize;
        this._modelPathName = modelPathName;
    }

    updateValues(percentage, charging) {
        this._charging = charging;
        this._percentage = percentage;
        this.queue_repaint();
    }

    _circle(cr, style) {
        const {w, h, p, foregroundColor, chargingColor, disconnectedColor, strokeWidth} = style;
        const size = h;
        const radius = (size - strokeWidth) / 2;
        const [cw, ch] = [w / 2, h / 2];
        const bColor = foregroundColor.copy();
        bColor.alpha *= 0.3;

        cr.save();
        Clutter.cairo_set_source_color(cr, bColor);
        cr.setLineWidth(strokeWidth);
        cr.translate(cw, ch);
        cr.scale(w / size, h / size);
        cr.arc(0, 0, radius, 0, 2 * Math.PI);
        cr.stroke();

        Clutter.cairo_set_source_color(cr, chargingColor);
        const angleOffset = -0.5 * Math.PI;
        cr.arc(0, 0, radius, angleOffset, angleOffset + p * 2 * Math.PI);
        cr.stroke();
        cr.restore();

        const sw = (w / 250);
        const sh = (h / 250);
        cr.scale(sw, sh);

        const modelPath = VectorImages[this._modelPathName];
        const chargingPath = VectorImages['charging-bolt'];
        const disconnectedPath = VectorImages['disconnected'];

        Clutter.cairo_set_source_color(cr, foregroundColor);
        addVectorImage(cr, modelPath);

        if (this._percentage === -1) {
            cr.fill();
            Clutter.cairo_set_source_color(cr, disconnectedColor);
            addVectorImage(cr, disconnectedPath);
        } else if (this._charging) {
            Clutter.cairo_set_source_color(cr, foregroundColor);
            addVectorImage(cr, chargingPath);
        }
        cr.fill();
    }

    get iconColors() {
        return this.get_theme_node().get_icon_colors();
    }

    vfunc_repaint() {
        const iconColors = this.iconColors;
        const foregroundColor = iconColors.foreground;
        const chargingColor = this._percentage > 10 || this._charging ? iconColors.success : iconColors.warning;
        const disconnectedColor = iconColors.error;
        const cr = this.get_context();
        const [w, h] = this.get_surface_size();
        const one = h / 16;
        const strokeWidth = 1.8 * one;
        const p = this._percentage <= 0 ? 0 : this._percentage / 100;
        const style = {w, h, p, foregroundColor, chargingColor, disconnectedColor, strokeWidth};
        this._circle(cr, style);
        cr.$dispose();
    }
}
);


