var Util = {

    getfullDay: function (day) {
        var fullDay;
        switch(day) {
            case 'Mon':
                fullDay = 'Monday, ';
                break;
            case 'Tue':
                fullDay = 'Tuesday, ';
                break;
            case 'Wed':
                fullDay = 'Wednesday, ';
                break;
            case 'Thu':
                fullDay = 'Thursday, ';
                break;
            case 'Fri':
                fullDay = 'Friday, ';
                break;
            case 'Sat':
                fullDay = 'Saturday, ';
                break;
            default:
                fullDay = 'Sunday, ';
        }

        return fullDay;
    },

    getfullMonth: function (month) {
        var fullMonth;
        switch(month) {
            case 'Jan':
                fullMonth = "January ";
                break;
            case 'Feb':
                fullMonth = "February ";
                break;
            case 'Mar':
                fullMonth = "March ";
                break;
            case 'Apr':
                fullMonth = "April ";
                break;
            case 'May':
                fullMonth = "May ";
                break;
            case 'Jun':
                fullMonth = "June ";
                break;
            case 'Jul':
                fullMonth = "July ";
                break;
            case 'Aug':
                fullMonth = "August ";
                break;
            case 'Sep':
                fullMonth = "September ";
                break;
            case 'Oct':
                fullMonth = "October ";
                break;
            case 'Nov':
                fullMonth = "November ";
                break;
            default:
                fullMonth = "December ";
                break;
        }
        return fullMonth;
    },

    hex2rgb: function(hex){
        hex = hex.replace('#','');
        var r = parseInt(hex.substring(0,2), 16),
            g = parseInt(hex.substring(2,4), 16),
            b = parseInt(hex.substring(4,6), 16);

        return [r, g, b];
    },

    rgb2hsl: function(r, g, b){
        r /= 255, g /= 255, b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if(max == min){
            h = s = 0; // achromatic
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h, s, l];
    },

    hsl2rgb: function(h, s, l){
        var r, g, b;

        if(s == 0){
            r = g = b = l; // achromatic
        } else {
            function hue2rgb(p, q, t){
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            }

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [r * 255, g * 255, b * 255];
    },


    rgb2hex: function(rgba){
      var values = rgba
        .replace(/rgba?\(/, '')
        .replace(/\)/, '')
        .replace(/[\s+]/g, '')
        .split(',');
      var a = parseFloat(values[3] || 1),
          r = Math.floor(a * parseInt(values[0]) + (1 - a) * 255),
          g = Math.floor(a * parseInt(values[1]) + (1 - a) * 255),
          b = Math.floor(a * parseInt(values[2]) + (1 - a) * 255);
      return "#" + ("0" + r.toString(16)).slice(-2) + ("0" + g.toString(16)).slice(-2) + ("0" + b.toString(16)).slice(-2);
    }


};


module.exports = Util;
