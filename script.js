/* ==========================================================
   MediCare - Hospital Management System (Frontend Demo)
   Pure vanilla JavaScript. Data is stored in localStorage.
   NOTE: This is DEMO data only - there is no real backend.
   ========================================================== */

/* ---------------- EMAILJS CONFIG (real appointment confirmation emails) ----------------
   This page has no server, so it can't send email on its own the way a backend
   (Node/PHP/etc. with an SMTP account) could. EmailJS is a service that accepts
   a send request straight from browser JavaScript and relays it through a mail
   provider you connect - no backend and no exposed SMTP password required.

   One-time setup (free tier is enough for this):
     1. Create an account at https://www.emailjs.com and, in "Email Services",
        connect an inbox (e.g. Gmail) - this gives you a SERVICE ID.
     2. Under "Email Templates", create a template and paste this in as the
        body (the {{...}} tokens are filled in automatically from the code
        below - no further editing needed):

          Your appointment has been successfully scheduled and confirmed.
          Below are the details of your upcoming visit:

          🗓️ Appointment Summary
          Patient Name: {{patient_name}}
          Doctor/Specialist: {{doctor_name}}
          Department: {{department}}
          Date: {{appointment_date}}
          Time: {{appointment_time}}
          Location/Room: {{location}}

          We look forward to providing you with exceptional care.

          Warm regards,
          Shivansh Sinha
          Patient Coordination Team
          {{hospital_name}}
          {{hospital_website}}
          {{hospital_address}}

        Set the template's "To email" field to {{to_email}} and the "From
        name" to {{hospital_name}}. Save it - this gives you a TEMPLATE ID.
     3. Under "Account" > "General", copy your PUBLIC KEY.
     4. Paste all three values below. That's it - sendConfirmationEmail()
        already calls EmailJS with the appointment details on every booking.

   Until real values are filled in, the app safely falls back to the toast-only
   simulation it used before, so nothing breaks. */
var EMAILJS_SERVICE_ID = "service_0jgezqa";
var EMAILJS_TEMPLATE_ID = "template_rkepzcb";
var EMAILJS_PUBLIC_KEY = "UpL6s8lN-BGsHu0Lh";

/* Two more templates power the OTP-related emails used by Sign Up
   verification and Forgot Password. The OTP code template below has its
   own Service ID / Public Key (a separate EmailJS service); the
   password-reset confirmation template still shares the Service ID /
   Public Key configured above:

     - EMAILJS_OTP_TEMPLATE_ID ("one-time password" template): sends the
       6-digit code itself. Used both when a new user verifies their email
       during Sign Up, and when an existing user requests a password reset.
       Suggested body:

         Your MediCare verification code is: {{otp_code}}
         This code is for: {{purpose}}
         It expires in 5 minutes. If you didn't request this, you can
         safely ignore this email.

         {{hospital_name}}

       Set the template's "To email" field to {{to_email}}.

     - EMAILJS_PASSWORD_RESET_TEMPLATE_ID ("password reset" template): a
       confirmation notice sent AFTER a password has actually been changed
       via the Forgot Password flow, so the user gets a record of it even
       if they weren't the one who changed it. Suggested body:

         Your MediCare account password was changed on {{reset_time}}.
         If this wasn't you, please contact us immediately.

         {{hospital_name}}

       Set the template's "To email" field to {{to_email}}.

   Paste your two template IDs below once created - both flows already
   fall back to a toast-only demo simulation (which surfaces the OTP
   directly in the toast) until then, so nothing breaks in the meantime. */
var EMAILJS_OTP_SERVICE_ID = "service_syzb7bn";
var EMAILJS_OTP_TEMPLATE_ID = "template_bl3wpjc";
var EMAILJS_OTP_PUBLIC_KEY = "MdCQzUuc7vX8KXUE3";
var EMAILJS_PASSWORD_RESET_TEMPLATE_ID = "cs160sc";
var EMAILJS_PASSWORD_RESET_FALLBACK_TEMPLATE_ID = "template_okx69zr";

if (
  typeof emailjs !== "undefined" &&
  EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY"
) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

/* ---------------- 0. EMBEDDED QR CODE LIBRARY ----------------
   QRCode.js by davidshimjs (MIT License), bundled directly here instead
   of loaded from a CDN <script> tag, so the appointment receipt's QR code
   still renders even with no internet access or a blocked CDN. Untouched
   from upstream other than being pasted inline. */
(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? (module.exports = factory())
    : typeof define === "function" && define.amd
      ? define(factory)
      : ((global = typeof globalThis !== "undefined" ? globalThis : global || self),
        (global.QRCode = factory()));
})(this, function () {
  //---------------------------------------------------------------------
  // QRCode for JavaScript
  //
  // Copyright (c) 2009 Kazuhiko Arase
  //
  // URL: http://www.d-project.com/
  //
  // Licensed under the MIT license:
  //   http://www.opensource.org/licenses/mit-license.php
  //
  // The word "QR Code" is registered trademark of
  // DENSO WAVE INCORPORATED
  //   http://www.denso-wave.com/qrcode/faqpatent-e.html
  //---------------------------------------------------------------------
  function QR8bitByte(data) {
    this.mode = QRMode.MODE_8BIT_BYTE;
    this.data = data;
    this.parsedData = [];
    for (var i = 0, l = this.data.length; i < l; i++) {
      var byteArray = [];
      var code = this.data.charCodeAt(i);
      if (code > 0x10000) {
        byteArray[0] = 0xf0 | ((code & 0x1c0000) >>> 18);
        byteArray[1] = 0x80 | ((code & 0x3f000) >>> 12);
        byteArray[2] = 0x80 | ((code & 0xfc0) >>> 6);
        byteArray[3] = 0x80 | (code & 0x3f);
      } else if (code > 0x800) {
        byteArray[0] = 0xe0 | ((code & 0xf000) >>> 12);
        byteArray[1] = 0x80 | ((code & 0xfc0) >>> 6);
        byteArray[2] = 0x80 | (code & 0x3f);
      } else if (code > 0x80) {
        byteArray[0] = 0xc0 | ((code & 0x7c0) >>> 6);
        byteArray[1] = 0x80 | (code & 0x3f);
      } else {
        byteArray[0] = code;
      }
      this.parsedData.push(byteArray);
    }
    this.parsedData = Array.prototype.concat.apply([], this.parsedData);
    if (this.parsedData.length != this.data.length) {
      this.parsedData.unshift(191);
      this.parsedData.unshift(187);
      this.parsedData.unshift(239);
    }
  }
  QR8bitByte.prototype = {
    getLength: function (buffer) { return this.parsedData.length; },
    write: function (buffer) {
      for (var i = 0, l = this.parsedData.length; i < l; i++) buffer.put(this.parsedData[i], 8);
    }
  };
  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }
  QRCodeModel.prototype = {
    addData: function (data) {
      var newData = new QR8bitByte(data);
      this.dataList.push(newData);
      this.dataCache = null;
    },
    isDark: function (row, col) {
      if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) throw new Error(row + "," + col);
      return this.modules[row][col];
    },
    getModuleCount: function () { return this.moduleCount; },
    make: function () { this.makeImpl(false, this.getBestMaskPattern()); },
    makeImpl: function (test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (var row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (var col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      if (this.typeNumber >= 7) this.setupTypeNumber(test);
      if (this.dataCache == null) this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
      this.mapData(this.dataCache, maskPattern);
    },
    setupPositionProbePattern: function (row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    getBestMaskPattern: function () {
      var minLostPoint = 0;
      var pattern = 0;
      for (var i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        var lostPoint = QRUtil.getLostPoint(this);
        if (i == 0 || minLostPoint > lostPoint) { minLostPoint = lostPoint; pattern = i; }
      }
      return pattern;
    },
    setupTimingPattern: function () {
      for (var r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] != null) continue;
        this.modules[r][6] = r % 2 == 0;
      }
      for (var c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] != null) continue;
        this.modules[6][c] = c % 2 == 0;
      }
    },
    setupPositionAdjustPattern: function () {
      var pos = QRUtil.getPatternPosition(this.typeNumber);
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i], col = pos[j];
          if (this.modules[row][col] != null) continue;
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) this.modules[row + r][col + c] = true;
              else this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    },
    setupTypeNumber: function (test) {
      var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
      for (var i = 0; i < 18; i++) {
        var mod = !test && ((bits >> i) & 1) == 1;
        this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
      }
      for (var i = 0; i < 18; i++) {
        var mod = !test && ((bits >> i) & 1) == 1;
        this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    },
    setupTypeInfo: function (test, maskPattern) {
      var data = (this.errorCorrectLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);
      for (var i = 0; i < 15; i++) {
        var mod = !test && ((bits >> i) & 1) == 1;
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;
      }
      for (var i = 0; i < 15; i++) {
        var mod = !test && ((bits >> i) & 1) == 1;
        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },
    mapData: function (data, maskPattern) {
      var inc = -1, row = this.moduleCount - 1, bitIndex = 7, byteIndex = 0;
      for (var col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col--;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              var dark = false;
              if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) == 1;
              var mask = QRUtil.getMask(maskPattern, row, col - c);
              if (mask) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex == -1) { byteIndex++; bitIndex = 7; }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) { row -= inc; inc = -inc; break; }
        }
      }
    }
  };
  QRCodeModel.PAD0 = 0xec;
  QRCodeModel.PAD1 = 0x11;
  QRCodeModel.createData = function (typeNumber, errorCorrectLevel, dataList) {
    var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    var buffer = new QRBitBuffer();
    for (var i = 0; i < dataList.length; i++) {
      var data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }
    var totalDataCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    if (buffer.getLengthInBits() > totalDataCount * 8) throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")");
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 != 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(QRCodeModel.PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(QRCodeModel.PAD1, 8);
    }
    return QRCodeModel.createBytes(buffer, rsBlocks);
  };
  QRCodeModel.createBytes = function (buffer, rsBlocks) {
    var offset = 0, maxDcCount = 0, maxEcCount = 0;
    var dcdata = new Array(rsBlocks.length), ecdata = new Array(rsBlocks.length);
    for (var r = 0; r < rsBlocks.length; r++) {
      var dcCount = rsBlocks[r].dataCount, ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (var i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      offset += dcCount;
      var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      var modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (var i = 0; i < ecdata[r].length; i++) {
        var modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }
    var totalCodeCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
    var data = new Array(totalCodeCount), index = 0;
    for (var i = 0; i < maxDcCount; i++) for (var r = 0; r < rsBlocks.length; r++) if (i < dcdata[r].length) data[index++] = dcdata[r][i];
    for (var i = 0; i < maxEcCount; i++) for (var r = 0; r < rsBlocks.length; r++) if (i < ecdata[r].length) data[index++] = ecdata[r][i];
    return data;
  };
  var QRMode = { MODE_NUMBER: 1 << 0, MODE_ALPHA_NUM: 1 << 1, MODE_8BIT_BYTE: 1 << 2, MODE_KANJI: 1 << 3 };
  var QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
  var QRMaskPattern = { PATTERN000: 0, PATTERN001: 1, PATTERN010: 2, PATTERN011: 3, PATTERN100: 4, PATTERN101: 5, PATTERN110: 6, PATTERN111: 7 };
  var QRUtil = {
    PATTERN_POSITION_TABLE: [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]],
    G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
    getBCHTypeInfo: function (data) {
      var d = data << 10;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) d ^= QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15));
      return ((data << 10) | d) ^ QRUtil.G15_MASK;
    },
    getBCHTypeNumber: function (data) {
      var d = data << 12;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) d ^= QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18));
      return (data << 12) | d;
    },
    getBCHDigit: function (data) { var digit = 0; while (data != 0) { digit++; data >>>= 1; } return digit; },
    getPatternPosition: function (typeNumber) { return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1]; },
    getMask: function (maskPattern, i, j) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000: return (i + j) % 2 == 0;
        case QRMaskPattern.PATTERN001: return i % 2 == 0;
        case QRMaskPattern.PATTERN010: return j % 3 == 0;
        case QRMaskPattern.PATTERN011: return (i + j) % 3 == 0;
        case QRMaskPattern.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
        case QRMaskPattern.PATTERN101: return ((i * j) % 2) + ((i * j) % 3) == 0;
        case QRMaskPattern.PATTERN110: return (((i * j) % 2) + ((i * j) % 3)) % 2 == 0;
        case QRMaskPattern.PATTERN111: return (((i * j) % 3) + ((i + j) % 2)) % 2 == 0;
        default: throw new Error("bad maskPattern:" + maskPattern);
      }
    },
    getErrorCorrectPolynomial: function (errorCorrectLength) {
      var a = new QRPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i++) a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      return a;
    },
    getLengthInBits: function (mode, type) {
      if (1 <= type && type < 10) {
        switch (mode) { case QRMode.MODE_NUMBER: return 10; case QRMode.MODE_ALPHA_NUM: return 9; case QRMode.MODE_8BIT_BYTE: return 8; case QRMode.MODE_KANJI: return 8; default: throw new Error("mode:" + mode); }
      } else if (type < 27) {
        switch (mode) { case QRMode.MODE_NUMBER: return 12; case QRMode.MODE_ALPHA_NUM: return 11; case QRMode.MODE_8BIT_BYTE: return 16; case QRMode.MODE_KANJI: return 10; default: throw new Error("mode:" + mode); }
      } else if (type < 41) {
        switch (mode) { case QRMode.MODE_NUMBER: return 14; case QRMode.MODE_ALPHA_NUM: return 13; case QRMode.MODE_8BIT_BYTE: return 16; case QRMode.MODE_KANJI: return 12; default: throw new Error("mode:" + mode); }
      } else { throw new Error("type:" + type); }
    },
    getLostPoint: function (qrCode) {
      var moduleCount = qrCode.getModuleCount(), lostPoint = 0;
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount; col++) {
          var sameCount = 0, dark = qrCode.isDark(row, col);
          for (var r = -1; r <= 1; r++) {
            if (row + r < 0 || moduleCount <= row + r) continue;
            for (var c = -1; c <= 1; c++) {
              if (col + c < 0 || moduleCount <= col + c) continue;
              if (r == 0 && c == 0) continue;
              if (dark == qrCode.isDark(row + r, col + c)) sameCount++;
            }
          }
          if (sameCount > 5) lostPoint += 3 + sameCount - 5;
        }
      }
      for (var row = 0; row < moduleCount - 1; row++) {
        for (var col = 0; col < moduleCount - 1; col++) {
          var count = 0;
          if (qrCode.isDark(row, col)) count++;
          if (qrCode.isDark(row + 1, col)) count++;
          if (qrCode.isDark(row, col + 1)) count++;
          if (qrCode.isDark(row + 1, col + 1)) count++;
          if (count == 0 || count == 4) lostPoint += 3;
        }
      }
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount - 6; col++) {
          if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) lostPoint += 40;
        }
      }
      for (var col = 0; col < moduleCount; col++) {
        for (var row = 0; row < moduleCount - 6; row++) {
          if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) lostPoint += 40;
        }
      }
      var darkCount = 0;
      for (var col = 0; col < moduleCount; col++) for (var row = 0; row < moduleCount; row++) if (qrCode.isDark(row, col)) darkCount++;
      var ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    }
  };
  var QRMath = {
    glog: function (n) { if (n < 1) throw new Error("glog(" + n + ")"); return QRMath.LOG_TABLE[n]; },
    gexp: function (n) { while (n < 0) n += 255; while (n >= 256) n -= 255; return QRMath.EXP_TABLE[n]; },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
  };
  for (var i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
  for (var i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
  for (var i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
  function QRPolynomial(num, shift) {
    if (num.length == undefined) throw new Error(num.length + "/" + shift);
    var offset = 0;
    while (offset < num.length && num[offset] == 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  }
  QRPolynomial.prototype = {
    get: function (index) { return this.num[index]; },
    getLength: function () { return this.num.length; },
    multiply: function (e) {
      var num = new Array(this.getLength() + e.getLength() - 1);
      for (var i = 0; i < this.getLength(); i++) for (var j = 0; j < e.getLength(); j++) num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) return this;
      var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
      var num = new Array(this.getLength());
      for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
      for (var i = 0; i < e.getLength(); i++) num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
      return new QRPolynomial(num, 0).mod(e);
    }
  };
  function QRRSBlock(totalCount, dataCount) { this.totalCount = totalCount; this.dataCount = dataCount; }
  QRRSBlock.RS_BLOCK_TABLE = [[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9], [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16], [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13], [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9], [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12], [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15], [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14], [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15], [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13], [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16], [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13], [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15], [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12], [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13], [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12], [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16], [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15], [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15], [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14], [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16], [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17], [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13], [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16], [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17], [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16], [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17], [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16], [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16], [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16], [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16], [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16], [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16], [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16], [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17], [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16], [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16], [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16], [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16], [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16], [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]];
  QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
    var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
    if (rsBlock == undefined) throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
    var length = rsBlock.length / 3, list = [];
    for (var i = 0; i < length; i++) {
      var count = rsBlock[i * 3 + 0], totalCount = rsBlock[i * 3 + 1], dataCount = rsBlock[i * 3 + 2];
      for (var j = 0; j < count; j++) list.push(new QRRSBlock(totalCount, dataCount));
    }
    return list;
  };
  QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {
    switch (errorCorrectLevel) {
      case QRErrorCorrectLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default: return undefined;
    }
  };
  function QRBitBuffer() { this.buffer = []; this.length = 0; }
  QRBitBuffer.prototype = {
    get: function (index) { var bufIndex = Math.floor(index / 8); return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) == 1; },
    put: function (num, length) { for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) == 1); },
    getLengthInBits: function () { return this.length; },
    putBit: function (bit) {
      var bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
      this.length++;
    }
  };
  var QRCodeLimitLength = [[17, 14, 11, 7], [32, 26, 20, 14], [53, 42, 32, 24], [78, 62, 46, 34], [106, 84, 60, 44], [134, 106, 74, 58], [154, 122, 86, 64], [192, 152, 108, 84], [230, 180, 130, 98], [271, 213, 151, 119], [321, 251, 177, 137], [367, 287, 203, 155], [425, 331, 241, 177], [458, 362, 258, 194], [520, 412, 292, 220], [586, 450, 322, 250], [644, 504, 364, 280], [718, 560, 394, 310], [792, 624, 442, 338], [858, 666, 482, 382], [929, 711, 509, 403], [1003, 779, 565, 439], [1091, 857, 611, 461], [1171, 911, 661, 511], [1273, 997, 715, 535], [1367, 1059, 751, 593], [1465, 1125, 805, 625], [1528, 1190, 868, 658], [1628, 1264, 908, 698], [1732, 1370, 982, 742], [1840, 1452, 1030, 790], [1952, 1538, 1112, 842], [2068, 1628, 1168, 898], [2188, 1722, 1228, 958], [2303, 1809, 1283, 983], [2431, 1911, 1351, 1051], [2563, 1989, 1423, 1093], [2699, 2099, 1499, 1139], [2809, 2213, 1579, 1219], [2953, 2331, 1663, 1273]];
  function _isSupportCanvas() { return typeof CanvasRenderingContext2D != "undefined"; }
  function _getAndroid() {
    var android = false;
    var sAgent = navigator.userAgent;
    if (/android/i.test(sAgent)) {
      android = true;
      var aMat = sAgent.toString().match(/android ([0-9]\.[0-9])/i);
      if (aMat && aMat[1]) android = parseFloat(aMat[1]);
    }
    return android;
  }
  var svgDrawer = (function () {
    var Drawing = function (el, htOption) { this._el = el; this._htOption = htOption; };
    Drawing.prototype.draw = function (oQRCode) {
      var _htOption = this._htOption, _el = this._el;
      var nCount = oQRCode.getModuleCount();
      this.clear();
      function makeSVG(tag, attrs) {
        var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (var k in attrs) if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
        return el;
      }
      var svg = makeSVG("svg", { viewBox: "0 0 " + String(nCount) + " " + String(nCount), width: "100%", height: "100%", fill: _htOption.colorLight });
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
      _el.appendChild(svg);
      svg.appendChild(makeSVG("rect", { fill: _htOption.colorLight, width: "100%", height: "100%" }));
      svg.appendChild(makeSVG("rect", { fill: _htOption.colorDark, width: "1", height: "1", id: "template" }));
      for (var row = 0; row < nCount; row++) {
        for (var col = 0; col < nCount; col++) {
          if (oQRCode.isDark(row, col)) {
            var child = makeSVG("use", { x: String(col), y: String(row) });
            child.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#template");
            svg.appendChild(child);
          }
        }
      }
    };
    Drawing.prototype.clear = function () { while (this._el.hasChildNodes()) this._el.removeChild(this._el.lastChild); };
    return Drawing;
  })();
  var useSVG = document.documentElement.tagName.toLowerCase() === "svg";
  var Drawing = useSVG ? svgDrawer : !_isSupportCanvas() ? (function () {
    var Drawing = function (el, htOption) { this._el = el; this._htOption = htOption; };
    Drawing.prototype.draw = function (oQRCode) {
      var _htOption = this._htOption, _el = this._el;
      var nCount = oQRCode.getModuleCount();
      var nWidth = Math.floor(_htOption.width / nCount), nHeight = Math.floor(_htOption.height / nCount);
      var aHTML = ['<table style="border:0;border-collapse:collapse;">'];
      for (var row = 0; row < nCount; row++) {
        aHTML.push("<tr>");
        for (var col = 0; col < nCount; col++) {
          aHTML.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:' + nWidth + "px;height:" + nHeight + "px;background-color:" + (oQRCode.isDark(row, col) ? _htOption.colorDark : _htOption.colorLight) + ';"></td>');
        }
        aHTML.push("</tr>");
      }
      aHTML.push("</table>");
      _el.innerHTML = aHTML.join("");
      var elTable = _el.childNodes[0];
      var nLeftMarginTable = (_htOption.width - elTable.offsetWidth) / 2;
      var nTopMarginTable = (_htOption.height - elTable.offsetHeight) / 2;
      if (nLeftMarginTable > 0 && nTopMarginTable > 0) elTable.style.margin = nTopMarginTable + "px " + nLeftMarginTable + "px";
    };
    Drawing.prototype.clear = function () { this._el.innerHTML = ""; };
    return Drawing;
  })() : (function () {
    function _onMakeImage() {
      this._elImage.src = this._elCanvas.toDataURL("image/png");
      this._elImage.style.display = "block";
      this._elCanvas.style.display = "none";
    }
    if (this && this._android && this._android <= 2.1) {
      var factor = 1 / window.devicePixelRatio;
      var drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
        if ("nodeName" in image && /img/i.test(image.nodeName)) {
          for (var i = arguments.length - 1; i >= 1; i--) arguments[i] = arguments[i] * factor;
        } else if (typeof dw == "undefined") {
          arguments[1] *= factor; arguments[2] *= factor; arguments[3] *= factor; arguments[4] *= factor;
        }
        drawImage.apply(this, arguments);
      };
    }
    function _safeSetDataURI(fSuccess, fFail) {
      var self = this;
      self._fFail = fFail;
      self._fSuccess = fSuccess;
      if (self._bSupportDataURI === null) {
        var el = document.createElement("img");
        var fOnError = function () { self._bSupportDataURI = false; if (self._fFail) self._fFail.call(self); };
        var fOnSuccess = function () { self._bSupportDataURI = true; if (self._fSuccess) self._fSuccess.call(self); };
        el.onabort = fOnError; el.onerror = fOnError; el.onload = fOnSuccess;
        el.src = "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
        return;
      } else if (self._bSupportDataURI === true && self._fSuccess) {
        self._fSuccess.call(self);
      } else if (self._bSupportDataURI === false && self._fFail) {
        self._fFail.call(self);
      }
    }
    var Drawing = function (el, htOption) {
      this._bIsPainted = false;
      this._android = _getAndroid();
      this._htOption = htOption;
      this._elCanvas = document.createElement("canvas");
      this._elCanvas.width = htOption.width;
      this._elCanvas.height = htOption.height;
      el.appendChild(this._elCanvas);
      this._el = el;
      this._oContext = this._elCanvas.getContext("2d");
      this._bIsPainted = false;
      this._elImage = document.createElement("img");
      this._elImage.alt = "Scan me!";
      this._elImage.style.display = "none";
      this._el.appendChild(this._elImage);
      this._bSupportDataURI = null;
    };
    Drawing.prototype.draw = function (oQRCode) {
      var _elImage = this._elImage, _oContext = this._oContext, _htOption = this._htOption;
      var nCount = oQRCode.getModuleCount();
      var nWidth = _htOption.width / nCount, nHeight = _htOption.height / nCount;
      var nRoundedWidth = Math.round(nWidth), nRoundedHeight = Math.round(nHeight);
      _elImage.style.display = "none";
      this.clear();
      for (var row = 0; row < nCount; row++) {
        for (var col = 0; col < nCount; col++) {
          var bIsDark = oQRCode.isDark(row, col);
          var nLeft = col * nWidth, nTop = row * nHeight;
          _oContext.strokeStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
          _oContext.lineWidth = 1;
          _oContext.fillStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
          _oContext.fillRect(nLeft, nTop, nWidth, nHeight);
          _oContext.strokeRect(Math.floor(nLeft) + 0.5, Math.floor(nTop) + 0.5, nRoundedWidth, nRoundedHeight);
          _oContext.strokeRect(Math.ceil(nLeft) - 0.5, Math.ceil(nTop) - 0.5, nRoundedWidth, nRoundedHeight);
        }
      }
      this._bIsPainted = true;
    };
    Drawing.prototype.makeImage = function () { if (this._bIsPainted) _safeSetDataURI.call(this, _onMakeImage); };
    Drawing.prototype.isPainted = function () { return this._bIsPainted; };
    Drawing.prototype.clear = function () { this._oContext.clearRect(0, 0, this._elCanvas.width, this._elCanvas.height); this._bIsPainted = false; };
    Drawing.prototype.round = function (nNumber) { if (!nNumber) return nNumber; return Math.floor(nNumber * 1000) / 1000; };
    return Drawing;
  })();
  function _getTypeNumber(sText, nCorrectLevel) {
    var nType = 1;
    var length = _getUTF8Length(sText);
    for (var i = 0, len = QRCodeLimitLength.length; i < len; i++) {
      var nLimit = 0;
      switch (nCorrectLevel) {
        case QRErrorCorrectLevel.L: nLimit = QRCodeLimitLength[i][0]; break;
        case QRErrorCorrectLevel.M: nLimit = QRCodeLimitLength[i][1]; break;
        case QRErrorCorrectLevel.Q: nLimit = QRCodeLimitLength[i][2]; break;
        case QRErrorCorrectLevel.H: nLimit = QRCodeLimitLength[i][3]; break;
      }
      if (length <= nLimit) break; else nType++;
    }
    if (nType > QRCodeLimitLength.length) throw new Error("Too long data");
    return nType;
  }
  function _getUTF8Length(sText) {
    var replacedText = encodeURI(sText).toString().replace(/\%[0-9a-fA-F]{2}/g, "a");
    return replacedText.length + (replacedText.length != sText ? 3 : 0);
  }
  var QRCode = function (el, vOption) {
    this._htOption = { width: 256, height: 256, typeNumber: 4, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRErrorCorrectLevel.H };
    if (typeof vOption === "string") vOption = { text: vOption };
    if (vOption) for (var i in vOption) this._htOption[i] = vOption[i];
    if (typeof el == "string") el = document.getElementById(el);
    if (this._htOption.useSVG) Drawing = svgDrawer;
    this._android = _getAndroid();
    this._el = el;
    this._oQRCode = null;
    this._oDrawing = new Drawing(this._el, this._htOption);
    if (this._htOption.text) this.makeCode(this._htOption.text);
  };
  QRCode.prototype.makeCode = function (sText) {
    this._oQRCode = new QRCodeModel(_getTypeNumber(sText, this._htOption.correctLevel), this._htOption.correctLevel);
    this._oQRCode.addData(sText);
    this._oQRCode.make();
    this._el.title = sText;
    this._oDrawing.draw(this._oQRCode);
    this.makeImage();
  };
  QRCode.prototype.makeImage = function () {
    if (typeof this._oDrawing.makeImage == "function" && (!this._android || this._android >= 3)) this._oDrawing.makeImage();
  };
  QRCode.prototype.clear = function () { this._oDrawing.clear(); };
  QRCode.CorrectLevel = QRErrorCorrectLevel;
  return QRCode;
});
/* ==========================================================
   MediCare - Hospital Management System
   Full-stack Vanilla JavaScript frontend with PHP & MySQL backend.
   ========================================================== */

/* ---------------- 1. STATE & CONSTANTS ---------------- */

var today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

var currentUser = null;
var patients = [];
var doctors = [];
var appointments = [];
var bills = [];
var staff = [];
var dashboardStats = {};

var settings = {
  name: "MediCare Multi-Speciality Hospital",
  phone: "1800-123-4567",
  fee: 600,
  address: "Ring Road, New Delhi - 110001"
};

var titles = {
  dashboard: "Dashboard",
  patients: "Patient Management",
  doctors: "Doctor Management",
  appointments: "Appointment Scheduling",
  billing: "Billing & Invoice",
  staff: "Staff Management",
  contact: "Contact Us",
  account: "My Account"
};

var PROTECTED_SECTIONS = [
  "dashboard",
  "patients",
  "billing"
];

var FEE_POOL = [
  500, 600, 650, 700, 750, 800, 850, 900, 1000, 1200, 1500
];

var SLOT_POOL = [
  "08:00 - 12:00",
  "09:00 - 13:00",
  "09:30 - 13:30",
  "10:00 - 14:00",
  "10:30 - 14:30",
  "11:00 - 15:00",
  "12:00 - 16:00",
  "13:00 - 17:00",
  "14:00 - 18:00",
  "15:00 - 19:00",
  "16:00 - 20:00",
  "17:00 - 21:00"
];

var PROBLEM_SPEC_MAP = [
  { label: "Chest pain / Heart issues", spec: "Cardiology" },
  { label: "Child health / Fever in a child", spec: "Pediatrics" },
  { label: "Bone / Joint / Fracture pain", spec: "Orthopedics" },
  { label: "Skin rash / Allergy", spec: "Dermatology" },
  { label: "Headache / Neurological issue", spec: "Neurology" },
  { label: "Women's health / Pregnancy", spec: "Gynecology" },
  { label: "Ear / Nose / Throat issue", spec: "ENT (Ear, Nose & Throat)" },
  { label: "Toothache / Dental issue", spec: "Dentistry" },
  { label: "Eye problem", spec: "Ophthalmology" },
  { label: "Stress / Mental health", spec: "Psychiatry" },
  { label: "Kidney / Urinary issue", spec: "Urology" },
  { label: "General checkup / Fever / Cold", spec: "General Medicine" }
];

/* ---------------- 2. API REQUEST HELPER ---------------- */

async function apiRequest(endpoint, method, data) {
  method = method || "GET";
  var options = {
    method: method,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Accept": "application/json"
    }
  };

  if (data && (method === "POST" || method === "PUT" || method === "DELETE")) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(data);
  }

  try {
    var response = await fetch(endpoint, options);
    var result = await response.json();
    return result;
  } catch (err) {
    console.error("API error for " + endpoint + ":", err);
    return {
      success: false,
      message: "Server or database error. Please verify the backend connection and database settings."
    };
  }
}

/* ---------------- 3. UI HELPERS ---------------- */

function $(id) {
  return document.getElementById(id);
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toast(message, type) {
  var box = document.createElement("div");
  box.className = "toast" + (type === "error" ? " error" : "");
  box.innerHTML =
    '<i class="fa-solid ' +
    (type === "error" ? "fa-circle-exclamation" : "fa-circle-check") +
    '"></i><span>' +
    message +
    "</span>";

  $("toastWrap").appendChild(box);

  setTimeout(function () {
    box.remove();
  }, type === "error" ? 6000 : 2800);
}

function openModal(title, html) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = html;
  $("modalBackdrop").classList.remove("hidden");
}

function closeModal() {
  if (typeof cleanResetUrl === "function" && $("fpTokenResetForm")) {
    cleanResetUrl();
  }
  $("modalBackdrop").classList.add("hidden");
}

$("modalClose").onclick = closeModal;

$("modalBackdrop").onclick = function (e) {
  if (e.target === $("modalBackdrop")) {
    closeModal();
  }
};

function badge(status) {
  var map = {
    "Admitted": "blue",
    "Outpatient": "amber",
    "Discharged": "grey",
    "Active": "green",
    "On Leave": "amber",
    "Inactive": "grey",
    "Scheduled": "blue",
    "Completed": "green",
    "Cancelled": "red",
    "Paid": "green",
    "Pending": "amber"
  };

  return (
    '<span class="badge ' +
    (map[status] || "grey") +
    '">' +
    status +
    "</span>"
  );
}

function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function esc(s) {
  return String(s === undefined || s === null ? "" : s).replace(/"/g, "&quot;");
}

function formatAccountDate(iso, withTime) {
  if (!iso) return "—";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "—";

  var dateStr = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  if (!withTime) return dateStr;

  var timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  var isToday = d.toDateString() === new Date().toDateString();
  return (isToday ? "Today" : dateStr) + ", " + timeStr;
}

/* ---------------- 3b. OTP HELPERS (client-side demo) ----------------
   Generates a 6-digit code kept only in memory (never sent to the PHP
   backend as part of this demo) and time-limited to OTP_TTL_MS. This is
   intentionally a frontend-only mechanism per the feature spec - a
   production build would have the backend generate/verify the OTP
   server-side instead, since anything validated purely in the browser
   can be bypassed by a determined user calling the API directly. */
var OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isValidEmailFormat(v) {
  return /^\S+@\S+\.\S+$/.test(String(v || "").trim());
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createOtpSession(email) {
  return {
    email: email,
    code: generateOtp(),
    expiresAt: Date.now() + OTP_TTL_MS,
    verified: false
  };
}

function isOtpExpired(session) {
  return !session || Date.now() > session.expiresAt;
}

/* Sends the 6-digit code itself. Shared by Sign Up email verification and
   the Forgot Password flow - "purpose" only changes the wording inside
   the email template. Returns a Promise so callers can chain the next
   step (e.g. reveal the OTP input) after the send settles. */
function sendOtpEmail(email, code, purpose) {
  var configured =
    typeof emailjs !== "undefined" &&
    EMAILJS_OTP_SERVICE_ID !== "YOUR_OTP_SERVICE_ID" &&
    EMAILJS_OTP_TEMPLATE_ID !== "YOUR_OTP_TEMPLATE_ID" &&
    EMAILJS_OTP_PUBLIC_KEY !== "YOUR_OTP_PUBLIC_KEY";

  if (!configured) {
    /* EmailJS OTP template hasn't been filled in yet (see the config
       block near the top of this file) - fall back to a demo-only toast
       that surfaces the code directly, so the flow stays fully testable. */
    toast("Demo mode: your verification code is " + code, "error");
    return Promise.resolve();
  }

  var params = {
    to_email: email,
    otp_code: code,
    purpose: purpose === "reset" ? "password reset" : "email verification",
    hospital_name: settings.name
  };

  return emailjs
    .send(EMAILJS_OTP_SERVICE_ID, EMAILJS_OTP_TEMPLATE_ID, params, {
      publicKey: EMAILJS_OTP_PUBLIC_KEY
    })
    .then(function () {
      toast("Verification code sent to " + email);
    })
    .catch(function (err) {
      console.warn("EmailJS OTP send failed, displaying verification code via toast:", err);
      toast("Verification code: " + code);
      return Promise.resolve();
    });
}

/* Confirmation notice sent AFTER a password has actually been changed via
   Forgot Password. Best-effort only - the password is already saved by
   the time this runs, so a failure here doesn't need to block anything. */
function sendPasswordResetConfirmation(email) {
  var configured =
    typeof emailjs !== "undefined" &&
    EMAILJS_SERVICE_ID !== "YOUR_SERVICE_ID" &&
    EMAILJS_PASSWORD_RESET_TEMPLATE_ID !== "YOUR_PASSWORD_RESET_TEMPLATE_ID" &&
    EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY";

  if (!configured) {
    return;
  }

  var params = {
    to_email: email,
    hospital_name: settings.name,
    reset_time: new Date().toLocaleString("en-IN")
  };

  emailjs
    .send(EMAILJS_SERVICE_ID, EMAILJS_PASSWORD_RESET_TEMPLATE_ID, params)
    .catch(function (err) {
      console.error("EmailJS password-reset confirmation failed:", err);
    });
}

/* Sends the Password Reset Link email via EmailJS with full fallback support */
function sendResetLinkEmail(email, resetLink, fullName) {
  var params = {
    to_email: email,
    email: email,
    reset_link: resetLink,
    link: resetLink,
    url: resetLink,
    reset_url: resetLink,
    password_reset_link: resetLink,
    to_name: fullName || "User",
    hospital_name: (typeof settings !== "undefined" && settings.name) ? settings.name : "MediCare HMS"
  };

  var configured =
    typeof emailjs !== "undefined" &&
    EMAILJS_PASSWORD_RESET_TEMPLATE_ID &&
    EMAILJS_PASSWORD_RESET_TEMPLATE_ID !== "YOUR_TEMPLATE_ID";

  if (!configured) {
    console.log("EmailJS not configured. Password Reset Link:", resetLink);
    toast("Demo mode: Password reset link generated! Check console.", "error");
    return Promise.resolve();
  }

  return emailjs
    .send(EMAILJS_SERVICE_ID, EMAILJS_PASSWORD_RESET_TEMPLATE_ID, params, {
      publicKey: EMAILJS_PUBLIC_KEY
    })
    .catch(function (err1) {
      console.warn("Primary EmailJS service send failed, attempting secondary OTP service:", err1);
      if (EMAILJS_OTP_SERVICE_ID && EMAILJS_OTP_PUBLIC_KEY) {
        return emailjs.send(EMAILJS_OTP_SERVICE_ID, EMAILJS_PASSWORD_RESET_TEMPLATE_ID, params, {
          publicKey: EMAILJS_OTP_PUBLIC_KEY
        });
      }
      throw err1;
    })
    .catch(function (err2) {
      console.warn("Secondary service failed, trying fallback template:", err2);
      if (
        EMAILJS_PASSWORD_RESET_FALLBACK_TEMPLATE_ID &&
        EMAILJS_PASSWORD_RESET_FALLBACK_TEMPLATE_ID !== EMAILJS_PASSWORD_RESET_TEMPLATE_ID
      ) {
        return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_PASSWORD_RESET_FALLBACK_TEMPLATE_ID, params, {
          publicKey: EMAILJS_PUBLIC_KEY
        });
      }
      throw err2;
    })
    .then(function () {
      toast("Password reset link sent to " + email);
    })
    .catch(function (err) {
      console.error("EmailJS reset link send failed:", err);
      var detail = (err && (err.text || err.message)) || "unknown error";
      var status = err && err.status ? " (" + err.status + ")" : "";
      toast("Couldn't send the reset email" + status + ": " + detail, "error");
      console.log("Direct Password Reset Link (for testing):", resetLink);
      throw err;
    });
}

/* ---------------- 4. AUTHENTICATION & SESSIONS ---------------- */

$("tabLoginBtn").onclick = function () {
  $("tabLoginBtn").classList.add("active");
  $("tabSignupBtn").classList.remove("active");
  $("loginForm").classList.add("active");
  $("signupForm").classList.remove("active");
};

$("tabSignupBtn").onclick = function () {
  $("tabSignupBtn").classList.add("active");
  $("tabLoginBtn").classList.remove("active");
  $("signupForm").classList.add("active");
  $("loginForm").classList.remove("active");
};

$("goToLoginLink").onclick = function (e) {
  e.preventDefault();
  $("tabLoginBtn").click();
};

$("togglePassword").onclick = function () {
  var input = $("password");
  var isText = input.type === "text";
  input.type = isText ? "password" : "text";
  this.innerHTML =
    '<i class="fa-regular ' +
    (isText ? "fa-eye" : "fa-eye-slash") +
    '"></i>';
};

function wireSignupPasswordToggle(toggleId, inputId) {
  var toggleBtn = $(toggleId);
  var input = $(inputId);
  if (!toggleBtn || !input) return;

  toggleBtn.onclick = function () {
    var isText = input.type === "text";
    input.type = isText ? "password" : "text";
    toggleBtn.innerHTML =
      '<i class="fa-regular ' +
      (isText ? "fa-eye" : "fa-eye-slash") +
      '"></i>';
  };
}

wireSignupPasswordToggle("toggleSuPassword", "suPassword");
wireSignupPasswordToggle("toggleSuConfirmPassword", "suConfirmPassword");

$("loginForm").onsubmit = async function (e) {
  e.preventDefault();

  var u = $("username").value.trim();
  var p = $("password").value.trim();

  $("usernameError").textContent = "";
  $("passwordError").textContent = "";

  if (!u) {
    $("usernameError").textContent = "Username or email is required";
    return;
  }

  if (!p) {
    $("passwordError").textContent = "Password is required";
    return;
  }

  if (p.length < 5) {
    $("passwordError").textContent = "Password must be at least 5 characters";
    return;
  }

  var res = await apiRequest("/api/login", "POST", {
    username: u,
    password: p
  });

  if (res && res.success) {
    currentUser = res.data.user;
    try { localStorage.setItem("medicareWasLoggedIn", "1"); } catch (e) {}
    showApp();
    toast("Welcome back, " + currentUser.fullName + "!");
  } else {
    toast(res ? res.message : "Invalid credentials", "error");
  }
};

/* Holds the in-progress email-verification OTP session for the signup
   form: { email, code, expiresAt, verified }, or null before "Verify
   Email" has been clicked. Reset whenever the email field changes or
   the account is successfully created. */
var suEmailVerification = null;

function resetSignupEmailVerification() {
  suEmailVerification = null;
  $("suOtpRow").classList.remove("show");
  $("suOtp").value = "";
  $("suOtp").disabled = false;
  $("suOtpError").textContent = "";
  $("suEmailVerifiedBadge").classList.remove("show");
  $("suVerifyEmailBtn").classList.remove("hidden");
  $("suVerifyEmailBtn").disabled = !isValidEmailFormat($("suEmail").value.trim());
  $("suVerifyEmailBtn").innerHTML =
    '<i class="fa-regular fa-paper-plane"></i> Verify Email';
}

$("suEmail").addEventListener("input", function () {
  var email = $("suEmail").value.trim();

  /* Changing the email after verifying invalidates that verification -
     the OTP was only ever proof of control over the previous address. */
  if (suEmailVerification && suEmailVerification.email !== email) {
    resetSignupEmailVerification();
  } else if (!suEmailVerification) {
    $("suVerifyEmailBtn").disabled = !isValidEmailFormat(email);
  }
});

$("suVerifyEmailBtn").onclick = function () {
  var email = $("suEmail").value.trim();
  $("suEmailError").textContent = "";

  if (!isValidEmailFormat(email)) {
    $("suEmailError").textContent = "Enter a valid email address first";
    return;
  }

  suEmailVerification = createOtpSession(email);

  var btn = $("suVerifyEmailBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

  sendOtpEmail(email, suEmailVerification.code, "signup")
    .then(function () {
      $("suOtpRow").classList.add("show");
      $("suOtp").disabled = false;
      $("suOtp").value = "";
      $("suOtp").focus();
      btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Resend Code';
      btn.disabled = false;
    })
    .catch(function () {
      suEmailVerification = null;
      btn.innerHTML = '<i class="fa-regular fa-paper-plane"></i> Verify Email';
      btn.disabled = false;
    });
};

$("suResendOtpBtn").onclick = function () {
  if (!suEmailVerification) return;

  suEmailVerification = createOtpSession(suEmailVerification.email);
  $("suOtp").value = "";
  $("suOtpError").textContent = "";

  sendOtpEmail(suEmailVerification.email, suEmailVerification.code, "signup");
};

$("suOtp").addEventListener("input", function () {
  $("suOtpError").textContent = "";

  var entered = $("suOtp").value.trim();
  if (!suEmailVerification || entered.length < 6) {
    return;
  }

  if (isOtpExpired(suEmailVerification)) {
    $("suOtpError").textContent = "Code expired - tap Resend";
    return;
  }

  if (entered !== suEmailVerification.code) {
    $("suOtpError").textContent = "Incorrect code";
    return;
  }

  suEmailVerification.verified = true;
  $("suOtp").disabled = true;
  $("suVerifyEmailBtn").classList.add("hidden");
  $("suEmailVerifiedBadge").classList.add("show");
});

$("signupForm").onsubmit = async function (e) {
  e.preventDefault();

  var fields = [
    "suFullName",
    "suEmail",
    "suAge",
    "suPassword",
    "suConfirmPassword"
  ];

  fields.forEach(function (id) {
    $(id + "Error").textContent = "";
  });

  var fullName = $("suFullName").value.trim();
  var email = $("suEmail").value.trim();
  var age = $("suAge").value.trim();
  var password = $("suPassword").value;
  var confirmPassword = $("suConfirmPassword").value;

  var valid = true;

  if (!fullName) {
    $("suFullNameError").textContent = "Full name is required";
    valid = false;
  }

  if (!isValidEmailFormat(email)) {
    $("suEmailError").textContent = "Enter a valid email address";
    valid = false;
  } else if (
    !suEmailVerification ||
    suEmailVerification.email !== email ||
    !suEmailVerification.verified
  ) {
    $("suEmailError").textContent = "Please verify your email first";
    valid = false;
  }

  if (!age || Number(age) < 1 || Number(age) > 120) {
    $("suAgeError").textContent = "Enter a valid age";
    valid = false;
  }

  if (!password || password.length < 5) {
    $("suPasswordError").textContent = "Password must be at least 5 characters";
    valid = false;
  }

  if (password !== confirmPassword) {
    $("suConfirmPasswordError").textContent = "Passwords do not match";
    valid = false;
  }

  if (!valid) {
    return;
  }

  var res = await apiRequest("/api/signup", "POST", {
    fullName: fullName,
    email: email,
    age: Number(age),
    password: password,
    confirmPassword: confirmPassword,
    emailVerified: true
  });

  if (res && res.success) {
    toast("Account created! Please log in.");
    $("signupForm").reset();
    resetSignupEmailVerification();
    $("username").value = email;
    $("tabLoginBtn").click();
  } else {
    toast(res ? res.message : "Signup failed", "error");
  }
};

$("forgotLink").onclick = function (e) {
  e.preventDefault();
  fpSession = null;
  openForgotPasswordEmailStep();
};

$("logoutBtn").onclick = async function () {
  if (confirm("Are you sure you want to logout?")) {
    await apiRequest("/api/logout", "POST");
    currentUser = null;

    if (notifPollTimer) {
      clearInterval(notifPollTimer);
      notifPollTimer = null;
    }

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}

    if ($("topProfileName")) $("topProfileName").textContent = "—";
    if ($("topProfileRole")) $("topProfileRole").textContent = "—";
    if ($("topAvatar")) $("topAvatar").innerHTML = '<i class="fa-regular fa-user"></i>';
    if ($("acctName")) $("acctName").textContent = "—";
    if ($("acctEmail")) $("acctEmail").textContent = "—";
    if ($("acctAge")) $("acctAge").textContent = "—";
    if ($("acctCreated")) $("acctCreated").textContent = "—";
    if ($("acctLastLogin")) $("acctLastLogin").textContent = "—";

    $("app").classList.add("hidden");
    $("loginPage").classList.remove("hidden");
    $("password").value = "";

    toast("Logged out successfully");
  }
};

function showApp() {
  $("loginPage").classList.add("hidden");
  $("app").classList.remove("hidden");
  syncRoleUI();
  renderAll();
  if (isAdminUser()) {
    goTo("dashboard");
  } else {
    goTo("account");
  }
  if (isStaffOrAdmin()) startNotificationPolling();
}

/* ---------------- 4a. FORGOT PASSWORD (Link recovery via EmailJS) ----------------
   1) User enters registered email
   2) Backend generates a secure 64-char token (valid for 1 hour)
   3) EmailJS sends password reset email containing the link
   4) Clicking the link opens the website with ?reset_token=...
   5) App auto-detects token, validates it, and opens "Set a New Password" modal
   6) User saves new password and is redirected to login
*/

function cleanResetUrl() {
  if (window.history && window.history.replaceState) {
    var url = new URL(window.location.href);
    url.searchParams.delete("reset_token");
    window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : "") + url.hash);
  }
}

function openForgotPasswordEmailStep() {
  openModal(
    "Reset Your Password",
    '<form id="fpEmailForm">' +
    '<p class="muted" style="margin-bottom:14px">Enter the email address on your account and we\'ll send you a password reset link.</p>' +
    '<label for="fpEmail">Registered Email</label>' +
    '<div class="field">' +
    '<i class="fa-regular fa-envelope"></i>' +
    '<input type="text" id="fpEmail" placeholder="jane@example.com" autocomplete="email">' +
    '</div>' +
    '<small class="error" id="fpEmailError"></small>' +
    '<div class="modal-actions">' +
    '<button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" type="submit"><i class="fa-regular fa-paper-plane"></i> Send Reset Link</button>' +
    '</div></form>'
  );

  $("fpEmail").focus();

  $("fpEmailForm").onsubmit = async function (e) {
    e.preventDefault();

    var email = $("fpEmail").value.trim();
    $("fpEmailError").textContent = "";

    if (!isValidEmailFormat(email)) {
      $("fpEmailError").textContent = "Enter a valid email address";
      return;
    }

    var submitBtn = $("fpEmailForm").querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

    var res = await apiRequest("/api/forgot-password", "POST", {
      action: "request_reset_link",
      email: email
    });

    if (!res || !res.success) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-regular fa-paper-plane"></i> Send Reset Link';
      $("fpEmailError").textContent = res ? res.message : "No account found with that email";
      return;
    }

    // Build absolute reset URL
    var resetLink = window.location.origin + window.location.pathname + "?reset_token=" + encodeURIComponent(res.data.token);

    sendResetLinkEmail(email, resetLink, res.data.fullName)
      .then(function () {
        openModal(
          "Check Your Email",
          '<div style="text-align:center;padding:16px 8px;">' +
          '<div style="font-size:3.5rem;color:var(--primary);margin-bottom:16px;"><i class="fa-regular fa-envelope-open"></i></div>' +
          '<h3 style="margin-bottom:8px;font-size:1.2rem;">Password Reset Link Sent!</h3>' +
          '<p class="muted" style="margin-bottom:14px;line-height:1.5;">We have sent a reset link to <strong>' + esc(email) + '</strong>.</p>' +
          '<p class="muted" style="font-size:0.85rem;margin-bottom:20px;line-height:1.4;">Please check your inbox (and spam folder). Click the <strong>Reset</strong> link inside the email to set a new password. The link will expire in 1 hour.</p>' +
          '<div class="modal-actions" style="justify-content:center;">' +
          '<button type="button" class="btn btn-primary" onclick="closeModal()">Back to Login</button>' +
          '</div>' +
          '</div>'
        );
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-regular fa-paper-plane"></i> Send Reset Link';
      });
  };
}

function openPasswordResetWithTokenModal(token, email) {
  openModal(
    "Set a New Password",
    '<form id="fpTokenResetForm">' +
    '<p class="muted" style="margin-bottom:14px">Create a new password for <strong>' + esc(email) + '</strong>.</p>' +
    '<label for="fpNewPassword">New Password</label>' +
    '<div class="field">' +
    '<i class="fa-solid fa-lock"></i>' +
    '<input type="password" id="fpNewPassword" autocomplete="new-password" placeholder="At least 5 characters">' +
    '</div>' +
    '<small class="error" id="fpNewPasswordError"></small>' +
    '<label for="fpConfirmPassword">Confirm New Password</label>' +
    '<div class="field">' +
    '<i class="fa-solid fa-lock"></i>' +
    '<input type="password" id="fpConfirmPassword" autocomplete="new-password" placeholder="Re-enter new password">' +
    '</div>' +
    '<small class="error" id="fpConfirmPasswordError"></small>' +
    '<div class="modal-actions">' +
    '<button type="button" class="btn btn-outline" onclick="cleanResetUrl(); closeModal();">Cancel</button>' +
    '<button class="btn btn-primary" type="submit"><i class="fa-solid fa-key"></i> Save New Password</button>' +
    '</div></form>'
  );

  $("fpNewPassword").focus();

  $("fpTokenResetForm").onsubmit = async function (e) {
    e.preventDefault();

    var next = $("fpNewPassword").value;
    var confirmNext = $("fpConfirmPassword").value;

    $("fpNewPasswordError").textContent = "";
    $("fpConfirmPasswordError").textContent = "";

    var valid = true;
    if (!next || next.length < 5) {
      $("fpNewPasswordError").textContent = "Password must be at least 5 characters";
      valid = false;
    }
    if (next !== confirmNext) {
      $("fpConfirmPasswordError").textContent = "Passwords do not match";
      valid = false;
    }

    if (!valid) return;

    var submitBtn = $("fpTokenResetForm").querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    var res = await apiRequest("/api/forgot-password", "POST", {
      action: "reset_with_token",
      token: token,
      newPassword: next
    });

    if (!res || !res.success) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-key"></i> Save New Password';
      toast(res ? res.message : "Couldn't reset your password. Please try again.", "error");
      return;
    }

    cleanResetUrl();
    closeModal();

    if ($("username")) {
      $("username").value = email;
    }
    if ($("password")) {
      $("password").value = "";
    }
    toast("Password reset successfully! Please log in with your new password.");
  };
}

async function checkResetTokenInUrl() {
  var urlParams = new URLSearchParams(window.location.search);
  var token = urlParams.get("reset_token");
  if (!token) return;

  var res = await apiRequest("/api/forgot-password", "POST", {
    action: "verify_token",
    token: token
  });

  if (!res || !res.success) {
    cleanResetUrl();
    toast(res ? res.message : "Password reset link is invalid or has expired.", "error");
    return;
  }

  openPasswordResetWithTokenModal(token, res.data.email);
}

async function checkSession() {
  var wasLoggedIn = false;
  try { wasLoggedIn = localStorage.getItem("medicareWasLoggedIn") === "1"; } catch (e) {}

  var res = await apiRequest("/api/session");
  if (res && res.success && res.data && res.data.loggedIn && res.data.user) {
    currentUser = res.data.user;
    try { localStorage.setItem("medicareWasLoggedIn", "1"); } catch (e) {}
    showApp();
  } else {
    currentUser = null;
    try { localStorage.removeItem("medicareWasLoggedIn"); } catch (e) {}
    if ($("topProfileName")) $("topProfileName").textContent = "—";
    if ($("topProfileRole")) $("topProfileRole").textContent = "—";
    if ($("topAvatar")) $("topAvatar").innerHTML = '<i class="fa-regular fa-user"></i>';
    if ($("acctName")) $("acctName").textContent = "—";
    if ($("acctEmail")) $("acctEmail").textContent = "—";
    $("app").classList.add("hidden");
    $("loginPage").classList.remove("hidden");

    if (wasLoggedIn) {
      openModal(
        "Session Expired",
        '<p style="padding:4px 2px 12px">Your session has ended, so you\'ve been logged out. Please log in again to continue.</p>' +
        '<div class="modal-actions"><button class="btn btn-primary" type="button" onclick="closeModal()">OK</button></div>'
      );
    }
  }
}

/* ---------------- 5. NAVIGATION ---------------- */

function isAdminUser() {
  return !!(currentUser && currentUser.role === "admin");
}

function syncRoleUI() {
  var admin = isAdminUser();
  document.querySelectorAll(".menu-item[data-section]").forEach(function (btn) {
    var sec = btn.dataset.section;
    if (PROTECTED_SECTIONS.indexOf(sec) !== -1) {
      btn.style.display = admin ? "" : "none";
    }
  });
}

function checkAdminAccess(section) {
  if (PROTECTED_SECTIONS.indexOf(section) === -1) {
    return true;
  }

  // If user is admin, grant access automatically
  if (isAdminUser()) {
    return true;
  }

  // If user is not admin, reject access
  toast("Access restricted to Administrators.", "error");
  return false;
}

function goTo(section) {
  if (!checkAdminAccess(section)) {
    return false;
  }

  document.querySelectorAll(".section").forEach(function (s) {
    s.classList.remove("active");
  });

  if ($(section)) {
    $(section).classList.add("active");
  }

  document.querySelectorAll(".menu-item[data-section]").forEach(function (b) {
    b.classList.toggle("active", b.dataset.section === section);
  });

  $("pageTitle").textContent = titles[section] || "MediCare";

  document.querySelectorAll(".dashboard-only").forEach(function (el) {
    el.classList.toggle("hidden", section !== "dashboard");
  });

  document.querySelectorAll(".non-dashboard-only").forEach(function (el) {
    el.classList.toggle("hidden", section === "dashboard");
  });

  closeSidebar();
  window.scrollTo(0, 0);

  // Refresh section data
  if (section === "dashboard") loadDashboard();
  if (section === "patients") loadPatients();
  if (section === "doctors") loadDoctors();
  if (section === "billing") loadBills();
  if (section === "staff") loadStaff();
  if (section === "account") renderAccount();
  if (section === "appointments") loadAppointmentsSection();

  return true;
}

document.querySelectorAll(".menu-item[data-section]").forEach(function (btn) {
  btn.onclick = function () {
    goTo(btn.dataset.section);
  };
});

function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("overlay").classList.remove("show");
}

$("menuToggle").onclick = function () {
  $("sidebar").classList.add("open");
  $("overlay").classList.add("show");
};

$("overlay").onclick = closeSidebar;

document.querySelectorAll("[data-quick]").forEach(function (btn) {
  btn.onclick = function () {
    var s = btn.dataset.quick;
    var opened = goTo(s);
    if (!opened) return;

    if (s === "patients") patientForm();
    if (s === "doctors") doctorForm();
    if (s === "appointments") bookAppointmentForm();
    if (s === "billing") billForm();
  };
});

$("globalSearch").oninput = function () {
  var q = this.value.trim();
  if (!q) return;

  $("patientSearch").value = q;
  loadPatients();

  $("doctorSearch").value = q;
  loadDoctors();
};

/* ---- Notification Center (admin/staff): reschedule & cancellation activity ---- */

var notifItems = [];
var notifUnread = 0;
var notifPollTimer = null;

function startNotificationPolling() {
  refreshNotifications();
  if (notifPollTimer) clearInterval(notifPollTimer);
  notifPollTimer = setInterval(refreshNotifications, 20000);
}

async function refreshNotifications() {
  if (!isStaffOrAdmin()) return;

  var res = await apiRequest("/api/notifications");
  if (!res || !res.success) return;

  notifItems = (res.data && res.data.items) || [];
  notifUnread = (res.data && res.data.unread) || 0;
  updateNotifDot();
}

function updateNotifDot() {
  var dot = $("notifDot");
  if (!dot) return;
  dot.classList.toggle("hidden", notifUnread === 0);
}

async function markAllNotificationsRead() {
  var res = await apiRequest("/api/notifications", "PUT", { markAllRead: true });
  if (res && res.success) {
    notifItems.forEach(function (n) { n.is_read = 1; });
    notifUnread = 0;
    updateNotifDot();
    renderNotificationsModal();
  }
}

function renderNotificationsModal() {
  var pending = dashboardStats.pendingInvoices || 0;
  var todays = dashboardStats.todayAppointments || 0;
  var onLeave = dashboardStats.doctorsOnLeave || 0;

  var summary =
    '<ul style="line-height:2;list-style:none">' +
    '<li><i class="fa-regular fa-calendar-check"></i> ' + todays + ' appointment(s) scheduled today</li>' +
    '<li><i class="fa-solid fa-file-invoice-dollar"></i> ' + pending + ' invoice(s) pending payment</li>' +
    '<li><i class="fa-solid fa-user-doctor"></i> ' + onLeave + ' doctor(s) on leave</li>' +
    "</ul>";

  var feed = notifItems.length
    ? notifItems.map(function (n) {
        return (
          '<div class="notif-item' + (Number(n.is_read) ? "" : " unread") + '">' +
          '<i class="fa-solid ' + (n.type === "cancel" ? "fa-calendar-xmark" : "fa-calendar-days") + '"></i>' +
          "<div><p>" + esc(n.message) + "</p>" +
          '<span class="muted">' + formatAccountDate(n.created_at, true) + "</span></div>" +
          "</div>"
        );
      }).join("")
    : '<p class="muted" style="padding:10px 2px">No reschedule or cancellation activity yet.</p>';

  openModal(
    "Notifications",
    summary +
    '<div class="notif-feed-head">' +
    "<h4>Recent Activity</h4>" +
    (notifUnread
      ? '<button class="btn btn-sm btn-outline" onclick="markAllNotificationsRead()">Mark all read</button>'
      : "") +
    "</div>" +
    '<div class="notif-feed">' + feed + "</div>"
  );
}

$("notifBtn").onclick = async function () {
  await refreshNotifications();
  renderNotificationsModal();
};

/* ---------------- 6. DASHBOARD & CHARTS ---------------- */

async function loadDashboard() {
  var res = await apiRequest("/api/dashboard");
  if (!res || !res.success || !res.data) return;

  dashboardStats = res.data;

  $("statPatients").textContent = dashboardStats.totalPatients;
  $("statDoctors").textContent = dashboardStats.totalDoctors;
  $("statAppointments").textContent = dashboardStats.todayAppointments;
  $("statRevenue").textContent = money(dashboardStats.totalRevenue);

  var recent = dashboardStats.recentPatients || [];
  $("recentPatients").innerHTML = recent.length
    ? recent.map(function (p) {
        return (
          "<tr><td>" +
          p.id +
          "</td><td>" +
          esc(p.name) +
          "</td><td>" +
          esc(p.doctor || "Unassigned") +
          "</td><td>" +
          badge(p.status) +
          "</td></tr>"
        );
      }).join("")
    : '<tr><td colspan="4" class="empty">No patients yet</td></tr>';

  var todayList = dashboardStats.todayAppointmentsList || [];
  $("todayAppointments").innerHTML = todayList.length
    ? todayList.map(function (a) {
        return (
          "<tr><td>" +
          a.id +
          "</td><td>" +
          esc(a.patient) +
          "</td><td>" +
          esc(a.time) +
          "</td><td>" +
          apptStatusControl(a.id, a.status) +
          "</td></tr>"
        );
      }).join("")
    : '<tr><td colspan="4" class="empty">No appointments today</td></tr>';

  drawCharts(
    dashboardStats.chartLabels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    dashboardStats.chartAppointments || [0, 0, 0, 0, 0, 0, 0],
    dashboardStats.chartRevenue || [0, 0, 0, 0, 0, 0, 0]
  );
}

// Renders an inline status control for a Today's Appointments row. Scheduled/Completed
// are the two states the admin can actively toggle between; any other status (e.g.
// Cancelled) is shown as a plain read-only badge since it's outside this control's scope.
function apptStatusControl(id, status) {
  if (status !== "Scheduled" && status !== "Completed") {
    return badge(status);
  }

  var colorClass = status === "Completed" ? "status-completed" : "status-scheduled";

  return (
    '<select class="status-select ' +
    colorClass +
    '" data-appt-id="' +
    id +
    '" data-prev-status="' +
    status +
    '" onchange="updateApptStatus(this)">' +
    '<option value="Scheduled"' + (status === "Scheduled" ? " selected" : "") + '>Scheduled</option>' +
    '<option value="Completed"' + (status === "Completed" ? " selected" : "") + '>Completed</option>' +
    "</select>"
  );
}

// Persists an appointment status change made from the dashboard's Today's Appointments
// control, then refreshes the dashboard so the card, table, and charts stay in sync.
async function updateApptStatus(selectEl) {
  var id = selectEl.dataset.apptId;
  var newStatus = selectEl.value;
  var previousStatus = selectEl.dataset.prevStatus || "Scheduled";

  selectEl.disabled = true;
  var res = await apiRequest("/api/appointments", "PUT", { id: id, status: newStatus });
  selectEl.disabled = false;

  if (res && res.success) {
    selectEl.dataset.prevStatus = newStatus;
    selectEl.classList.toggle("status-completed", newStatus === "Completed");

    var item = (dashboardStats.todayAppointmentsList || []).find(function (a) { return a.id === id; });
    if (item) item.status = newStatus;

    var allItem = (allAppointments || []).find(function (a) { return a.id === id; });
    if (allItem) allItem.status = newStatus;

    toast("Appointment " + id + " marked as " + newStatus);
    loadDashboard();
  } else {
    selectEl.value = previousStatus;
    toast(res ? res.message : "Failed to update appointment status", "error");
  }
}

// Opens a modal breaking Total Revenue down into 7 Days / 1 Month / 6 Months / 1 Year,
// using the pre-aggregated figures the backend computed from paid invoices.
function showRevenueBreakdown() {
  var b = dashboardStats.revenueBreakdown || {};
  var periods = [
    { label: "Last 7 Days", value: b.days7 },
    { label: "Last 1 Month", value: b.month1 },
    { label: "Last 6 Months", value: b.months6 },
    { label: "Last 1 Year", value: b.year1 }
  ];

  var html =
    '<div class="revenue-breakdown">' +
    periods.map(function (p) {
      return (
        '<div class="revenue-row">' +
        '<span class="rev-label">' + p.label + "</span>" +
        '<span class="rev-amount">' + money(p.value) + "</span>" +
        "</div>"
      );
    }).join("") +
    "</div>";

  openModal("Total Revenue Breakdown", html);
}

if ($("statCardPatients")) {
  $("statCardPatients").onclick = function () { goTo("patients"); };
  $("statCardPatients").onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo("patients"); }
  };
}

if ($("statCardDoctors")) {
  $("statCardDoctors").onclick = function () { goTo("doctors"); };
  $("statCardDoctors").onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo("doctors"); }
  };
}

if ($("statCardRevenue")) {
  $("statCardRevenue").onclick = showRevenueBreakdown;
  $("statCardRevenue").onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showRevenueBreakdown(); }
  };
}

function drawCharts(labels, apptData, revData) {
  function bars(el, data, max, alt, format) {
    if (!el) return;
    max = Math.max(max, 1);
    el.innerHTML = data.map(function (v, i) {
      var h = Math.round((v / max) * 100);
      if (h > 100) h = 100;
      if (h < 5 && v > 0) h = 5;

      return (
        '<div class="bar-col">' +
        '<div class="bar' +
        (alt ? " alt" : "") +
        '" style="height:' +
        h +
        '%" data-value="' +
        format(v) +
        '"></div>' +
        '<div class="bar-label">' +
        (labels[i] || "") +
        "</div></div>"
      );
    }).join("");
  }

  var maxAppt = Math.max.apply(null, apptData);
  if (maxAppt < 10) maxAppt = 10;

  var maxRev = Math.max.apply(null, revData);
  if (maxRev < 10000) maxRev = 10000;

  bars(
    $("chartAppointments"),
    apptData,
    maxAppt,
    false,
    function (v) {
      return v + " appts";
    }
  );

  bars(
    $("chartRevenue"),
    revData,
    maxRev,
    true,
    function (v) {
      return money(v);
    }
  );
}

/* ---------------- 7. PATIENTS MODULE ---------------- */

async function loadPatients() {
  var q = $("patientSearch") ? $("patientSearch").value.trim() : "";
  var f = $("patientFilter") ? $("patientFilter").value : "";

  var url = "/api/patients?search=" + encodeURIComponent(q) + "&status=" + encodeURIComponent(f);
  var res = await apiRequest(url);

  if (!res || !res.success) return;
  patients = res.data || [];

  $("patientTable").innerHTML = patients.length
    ? patients.map(function (p) {
        return (
          "<tr><td>" +
          p.id +
          "</td><td>" +
          esc(p.name) +
          "</td><td>" +
          p.age +
          "</td><td>" +
          p.gender +
          "</td><td>" +
          esc(p.phone) +
          "</td><td>" +
          esc(p.doctor || "Unassigned") +
          "</td><td>" +
          badge(p.status) +
          "</td>" +
          '<td><div class="row-actions">' +
          '<button class="mini" onclick="patientForm(\'' +
          p.id +
          '\')" title="Edit"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="mini del" onclick="deletePatient(\'' +
          p.id +
          '\')" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
          "</div></td></tr>"
        );
      }).join("")
    : '<tr><td colspan="8" class="empty">No patients found</td></tr>';
}

if ($("patientSearch")) $("patientSearch").oninput = loadPatients;
if ($("patientFilter")) $("patientFilter").onchange = loadPatients;
if ($("addPatientBtn")) $("addPatientBtn").onclick = function () { patientForm(); };

async function patientForm(id) {
  var p = {};
  if (id) {
    p = patients.find(function (x) { return x.id === id; }) || {};
  }

  // Ensure doctors list is available
  if (!doctors.length) {
    var docRes = await apiRequest("/api/doctors");
    if (docRes && docRes.success) doctors = docRes.data || [];
  }

  var docOptions = '<option value="">-- Assign Doctor --</option>' +
    doctors.map(function (d) {
      return (
        '<option value="' +
        esc(d.name) +
        '" ' +
        (p.doctor === d.name ? "selected" : "") +
        ">" +
        esc(d.name) +
        " (" +
        esc(d.spec) +
        ")</option>"
      );
    }).join("");

  openModal(
    id ? "Edit Patient" : "Add Patient",
    '<form id="pForm"><div class="form-grid">' +

    '<div class="full"><label>Full Name *</label>' +
    '<input id="pName" value="' +
    esc(p.name) +
    '" required></div>' +

    '<div><label>Age *</label>' +
    '<input id="pAge" type="number" min="0" max="120" value="' +
    esc(p.age) +
    '" required></div>' +

    '<div><label>Gender</label>' +
    '<select id="pGender">' +
    '<option ' + (p.gender === "Male" ? "selected" : "") + '>Male</option>' +
    '<option ' + (p.gender === "Female" ? "selected" : "") + '>Female</option>' +
    '<option ' + (p.gender === "Other" ? "selected" : "") + '>Other</option>' +
    '</select></div>' +

    '<div><label>Date of Birth</label>' +
    '<input id="pDob" type="date" value="' +
    esc(p.dob) +
    '"></div>' +

    '<div><label>Phone * (10 Digits)</label>' +
    '<input id="pPhone" value="' +
    esc(p.phone) +
    '" placeholder="9876543210" required></div>' +

    '<div><label>Blood Group</label>' +
    '<select id="pBlood">' +
    ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(function (b) {
      return '<option ' + (p.blood === b ? "selected" : "") + ">" + b + "</option>";
    }).join("") +
    '</select></div>' +

    '<div><label>Assigned Doctor</label>' +
    '<select id="pDoctor">' +
    docOptions +
    '</select></div>' +

    '<div><label>Status</label>' +
    '<select id="pStatus">' +
    '<option ' + (p.status === "Admitted" ? "selected" : "") + '>Admitted</option>' +
    '<option ' + (p.status === "Outpatient" || !p.status ? "selected" : "") + '>Outpatient</option>' +
    '<option ' + (p.status === "Discharged" ? "selected" : "") + '>Discharged</option>' +
    '</select></div>' +

    '<div class="full"><label>Address</label>' +
    '<input id="pAddress" value="' +
    esc(p.address) +
    '"></div>' +

    '<div class="full"><label>Symptoms / Notes</label>' +
    '<textarea id="pNotes" rows="2">' +
    esc(p.notes) +
    '</textarea></div>' +

    '</div><div class="modal-actions">' +
    '<button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" type="submit">Save Patient</button>' +
    '</div></form>'
  );

  $("pForm").onsubmit = async function (e) {
    e.preventDefault();

    var name = $("pName").value.trim();
    var age = $("pAge").value;
    var phone = $("pPhone").value.trim();

    if (!name) return toast("Patient name is required", "error");
    if (!age || age < 0) return toast("Enter a valid age", "error");
    if (!/^\d{10}$/.test(phone)) return toast("Phone must be 10 digits", "error");

    var record = {
      id: id || undefined,
      name: name,
      age: Number(age),
      gender: $("pGender").value,
      dob: $("pDob").value || null,
      phone: phone,
      email: p.email || "",
      address: $("pAddress").value.trim(),
      blood: $("pBlood").value,
      doctor: $("pDoctor").value,
      notes: $("pNotes").value.trim(),
      status: $("pStatus").value
    };

    var res = await apiRequest("/api/patients", id ? "PUT" : "POST", record);
    if (res && res.success) {
      closeModal();
      loadPatients();
      loadDashboard();
      toast(id ? "Patient updated successfully" : "Patient added successfully");
    } else {
      toast(res ? res.message : "Failed to save patient", "error");
    }
  };
}

async function deletePatient(id) {
  if (!confirm("Delete this patient record? This cannot be undone.")) return;

  var res = await apiRequest("/api/patients", "DELETE", { id: id });
  if (res && res.success) {
    loadPatients();
    loadDashboard();
    toast("Patient deleted");
  } else {
    toast(res ? res.message : "Failed to delete patient", "error");
  }
}

/* ---------------- 8. DOCTORS MODULE ---------------- */

function doctorStatus(doc) {
  if (!doc || !doc.time) return "On Leave";

  var parts = doc.time.split("-").map(function (s) { return s.trim(); });
  function toMin(t) {
    var hm = t.split(":").map(Number);
    return hm[0] * 60 + (hm[1] || 0);
  }

  var start = toMin(parts[0]);
  var end = toMin(parts[1]);
  if (isNaN(start) || isNaN(end)) return doc.status || "Active";

  var now = new Date();
  var cur = now.getHours() * 60 + now.getMinutes();

  if (end < start) {
    return (cur >= start || cur <= end) ? "Active" : "On Leave";
  }
  return (cur >= start && cur <= end) ? "Active" : "On Leave";
}

function doctorOptionsForSpec(spec) {
  var list = doctors.filter(function (d) { return d.spec === spec; });
  if (!list.length) list = doctors;

  return list.map(function (d) {
    return (
      '<option value="' +
      esc(d.name) +
      '">' +
      esc(d.name) +
      " — " +
      money(d.fee) +
      " — " +
      doctorStatus(d) +
      "</option>"
    );
  }).join("");
}

function slotOptionsForDoctor(doc) {
  if (!doc || !doc.time) return "";

  var parts = doc.time.split("-").map(function (s) { return s.trim(); });
  function toMin(t) {
    var hm = t.split(":").map(Number);
    return hm[0] * 60 + (hm[1] || 0);
  }

  function toLabel(m) {
    var h = Math.floor(m / 60);
    var mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  var s = toMin(parts[0]);
  var e = toMin(parts[1]);
  var slots = [];

  for (var t = s; t + 60 <= e; t += 60) {
    slots.push(toLabel(t) + " - " + toLabel(t + 60));
  }

  if (!slots.length) slots.push(doc.time);

  return slots.map(function (sl) {
    return "<option>" + sl + "</option>";
  }).join("");
}

function renderDoctorSummary() {
  var specs = {};
  doctors.forEach(function (d) {
    specs[d.spec] = (specs[d.spec] || 0) + 1;
  });

  var specNames = Object.keys(specs).sort();
  var activeCount = doctors.filter(function (d) {
    return doctorStatus(d) === "Active";
  }).length;

  var currentFilter = $("doctorSearch") ? $("doctorSearch").value : "";

  var chips = specNames.map(function (s) {
    return (
      '<button type="button" class="spec-chip' +
      (currentFilter === s ? " active" : "") +
      '" data-spec="' +
      esc(s) +
      '">' +
      s +
      " <span>" +
      specs[s] +
      "</span></button>"
    );
  }).join("");

  if ($("doctorOverview")) {
    $("doctorOverview").innerHTML =
      '<div class="doctor-overview-head">' +
      "<div><h4>" +
      doctors.length +
      " Doctors on Staff</h4>" +
      '<p class="muted">Spread across ' +
      specNames.length +
      " specializations · " +
      activeCount +
      " available right now</p></div>" +
      "</div>" +
      '<div class="spec-chip-row">' +
      chips +
      "</div>";

    document.querySelectorAll(".spec-chip").forEach(function (chip) {
      chip.onclick = function () {
        $("doctorSearch").value =
          chip.dataset.spec === $("doctorSearch").value ? "" : chip.dataset.spec;
        loadDoctors();
      };
    });
  }
}

async function loadDoctors() {
  var q = $("doctorSearch") ? $("doctorSearch").value.trim() : "";
  var f = $("doctorFilter") ? $("doctorFilter").value : "";

  var url = "/api/doctors?search=" + encodeURIComponent(q) + "&status=" + encodeURIComponent(f);
  var res = await apiRequest(url);

  if (!res || !res.success) return;
  doctors = res.data || [];

  renderDoctorSummary();

  $("doctorGrid").innerHTML = doctors.length
    ? doctors.map(function (d) {
        var st = doctorStatus(d);
        var initials = d.name
          .replace("Dr. ", "")
          .split(" ")
          .map(function (w) { return w[0]; })
          .join("")
          .slice(0, 2);

        return (
          '<div class="doc-card">' +
          '<div class="doc-top">' +
          '<div class="doc-avatar">' +
          initials +
          "</div>" +
          "<div><h5>" +
          esc(d.name) +
          "</h5><p>" +
          esc(d.spec) +
          " · " +
          d.id +
          "</p></div></div>" +
          "<p><i class='fa-solid fa-phone'></i> " +
          esc(d.phone) +
          "</p>" +
          "<p><i class='fa-regular fa-envelope'></i> " +
          esc(d.email) +
          "</p>" +
          "<p><i class='fa-regular fa-clock'></i> " +
          esc(d.days) +
          ", " +
          esc(d.time) +
          "</p>" +
          "<p><i class='fa-solid fa-indian-rupee-sign'></i> Consultation Fee: <strong>" +
          money(d.fee) +
          "</strong></p>" +
          '<div class="doc-foot">' +
          badge(st) +
          "</div></div>"
        );
      }).join("")
    : '<p class="empty">No doctors found</p>';
}

if ($("doctorSearch")) $("doctorSearch").oninput = loadDoctors;
if ($("doctorFilter")) $("doctorFilter").onchange = loadDoctors;

function doctorForm(id) {
  var d = {};
  if (id) {
    d = doctors.find(function (x) { return x.id === id; }) || {};
  }

  var feeDefault = d.fee !== undefined ? d.fee : randomPick(FEE_POOL);
  var timeDefault = d.time || randomPick(SLOT_POOL);

  openModal(
    id ? "Edit Doctor" : "Add Doctor",
    '<form id="dForm"><div class="form-grid">' +

    '<div><label>Name *</label>' +
    '<input id="dName" value="' +
    esc(d.name) +
    '" placeholder="Dr. Jane Smith" required></div>' +

    '<div><label>Specialization *</label>' +
    '<input id="dSpec" value="' +
    esc(d.spec) +
    '" placeholder="Cardiology" required></div>' +

    '<div><label>Phone *</label>' +
    '<input id="dPhone" value="' +
    esc(d.phone) +
    '" placeholder="9876543210" required></div>' +

    '<div><label>Email *</label>' +
    '<input id="dEmail" type="email" value="' +
    esc(d.email) +
    '" placeholder="doctor@medicare.in" required></div>' +

    '<div><label>Available Days</label>' +
    '<input id="dDays" placeholder="Mon-Fri" value="' +
    esc(d.days || "Mon-Sat") +
    '"></div>' +

    '<div><label>Available Time Slot *</label>' +
    '<input id="dTime" placeholder="09:00 - 14:00" value="' +
    esc(timeDefault) +
    '" required></div>' +

    '<div><label>Consultation Fee (₹) *</label>' +
    '<input id="dFee" type="number" min="0" step="50" value="' +
    feeDefault +
    '" required></div>' +

    '<div class="full"><p class="muted">' +
    '<i class="fa-regular fa-circle-question"></i> ' +
    'Active / On Leave status is calculated automatically from the clock time slot above.' +
    "</p></div>" +

    '</div><div class="modal-actions">' +
    '<button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" type="submit">Save Doctor</button>' +
    '</div></form>'
  );

  $("dForm").onsubmit = async function (e) {
    e.preventDefault();

    var name = $("dName").value.trim();
    var spec = $("dSpec").value.trim();
    var phone = $("dPhone").value.trim();
    var email = $("dEmail").value.trim();
    var time = $("dTime").value.trim();
    var fee = Number($("dFee").value || 0);

    if (!name) return toast("Doctor name is required", "error");
    if (!spec) return toast("Specialization is required", "error");
    if (!/^\d{10}$/.test(phone)) return toast("Phone must be 10 digits", "error");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Enter a valid email", "error");
    if (!/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(time)) return toast("Time slot must look like 09:00 - 14:00", "error");
    if (fee < 0) return toast("Fee cannot be negative", "error");

    var record = {
      id: id || undefined,
      name: name.startsWith("Dr.") ? name : "Dr. " + name,
      spec: spec,
      phone: phone,
      email: email,
      days: $("dDays").value.trim() || "Mon-Fri",
      time: time,
      fee: fee
    };

    var res = await apiRequest("/api/doctors", id ? "PUT" : "POST", record);
    if (res && res.success) {
      closeModal();
      loadDoctors();
      loadDashboard();
      toast(id ? "Doctor updated" : "Doctor added successfully");
    } else {
      toast(res ? res.message : "Failed to save doctor", "error");
    }
  };
}

async function deleteDoctor(id) {
  if (!confirm("Delete this doctor?")) return;

  var res = await apiRequest("/api/doctors", "DELETE", { id: id });
  if (res && res.success) {
    loadDoctors();
    loadDashboard();
    toast("Doctor deleted");
  } else {
    toast(res ? res.message : "Failed to delete doctor", "error");
  }
}

/* ---------------- 9. APPOINTMENTS MODULE ---------------- */

if ($("addApptBtn")) {
  $("addApptBtn").onclick = function () {
    bookAppointmentForm();
  };
}

function isStaffOrAdmin() {
  return !!(currentUser && (currentUser.role === "admin" || currentUser.role === "staff"));
}

// Entry point called whenever the Appointments section is opened: refreshes the
// logged-in user's own bookings, and the full admin table when applicable.
function loadAppointmentsSection() {
  var adminWrap = $("adminApptWrap");
  var staffAdmin = isStaffOrAdmin();

  if (adminWrap) adminWrap.style.display = staffAdmin ? "" : "none";
  if (staffAdmin) loadAllAppointments();

  loadMyAppointments();
}

/* ---- My Appointments (patient-facing cards) ---- */

var myAppointments = [];

async function loadMyAppointments() {
  var wrap = $("myApptCards");
  if (!wrap) return;

  if (!currentUser) {
    wrap.innerHTML = '<p class="muted" style="padding:16px 4px">Log in to see your booked appointments here.</p>';
    return;
  }

  wrap.innerHTML = '<p class="muted" style="padding:16px 4px">Loading your appointments...</p>';

  var res = await apiRequest("/api/appointments?mine=1");
  if (!res || !res.success) {
    wrap.innerHTML = '<p class="muted" style="padding:16px 4px">Couldn\'t load your appointments right now.</p>';
    return;
  }

  myAppointments = res.data || [];
  renderMyAppointments();
}

function renderMyAppointments() {
  var wrap = $("myApptCards");
  if (!wrap) return;

  wrap.innerHTML = myAppointments.length
    ? myAppointments.map(apptCardHtml).join("")
    : '<p class="muted" style="padding:16px 4px">You haven\'t booked any appointments yet.</p>';
}

function dateOnly(v) {
  return String(v || "").slice(0, 10);
}

function apptCardHtml(a) {
  var canAct = a.status === "Scheduled";

  return (
    '<div class="appt-card">' +
    '<div class="appt-card-top">' +
    "<strong>" + esc(a.id) + "</strong>" +
    badge(a.status) +
    "</div>" +
    '<div class="appt-card-body">' +
    '<div><i class="fa-regular fa-calendar"></i> ' + esc(dateOnly(a.date)) + "</div>" +
    '<div><i class="fa-regular fa-clock"></i> ' + esc(a.time) + "</div>" +
    '<div><i class="fa-solid fa-user-doctor"></i> ' + esc(a.doctor || "—") + "</div>" +
    '<div><i class="fa-solid fa-notes-medical"></i> ' + esc(a.problem || a.notes || "—") + "</div>" +
    "</div>" +
    (canAct
      ? '<div class="appt-card-actions">' +
        '<button class="btn btn-sm btn-outline" onclick="rescheduleAppointment(\'' + a.id + '\')">' +
        '<i class="fa-regular fa-calendar-days"></i> Reschedule</button>' +
        '<button class="btn btn-sm btn-danger" onclick="cancelAppointment(\'' + a.id + '\')">' +
        '<i class="fa-regular fa-circle-xmark"></i> Cancel</button>' +
        "</div>"
      : "") +
    "</div>"
  );
}

async function cancelAppointment(id) {
  if (!confirm("Cancel appointment " + id + "? This cannot be undone.")) return;

  var res = await apiRequest("/api/appointments", "PUT", { id: id, action: "cancel" });
  if (res && res.success) {
    toast("Appointment " + id + " cancelled");
    loadMyAppointments();
    if (isStaffOrAdmin()) loadAllAppointments();
  } else {
    toast(res ? res.message : "Couldn't cancel this appointment", "error");
  }
}

async function rescheduleAppointment(id) {
  var appt = (myAppointments || []).concat(allAppointments || []).find(function (a) { return a.id === id; });
  if (!appt) return;

  if (!doctors.length) {
    var docRes = await apiRequest("/api/doctors");
    if (docRes && docRes.success) doctors = docRes.data || [];
  }

  var doc = doctors.find(function (d) { return d.name === appt.doctor; });
  var slotOpts = doc ? slotOptionsForDoctor(doc) : '<option value="' + esc(appt.time) + '">' + esc(appt.time) + "</option>";

  openModal(
    "Reschedule Appointment " + id,
    '<form id="rescheduleForm"><div class="form-grid">' +

    '<div><label>New Date *</label>' +
    '<input id="rsDate" type="date" min="' + today + '" value="' +
    (dateOnly(appt.date) >= today ? dateOnly(appt.date) : today) +
    '" required></div>' +

    '<div><label>New Time Slot *</label>' +
    '<select id="rsSlot" required>' +
    '<option value="">Select a time...</option>' +
    slotOpts +
    "</select></div>" +

    '</div><div class="modal-actions">' +
    '<button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" type="submit">' +
    '<i class="fa-regular fa-calendar-check"></i> Confirm Reschedule' +
    "</button></div></form>"
  );

  $("rescheduleForm").onsubmit = async function (e) {
    e.preventDefault();

    var newDate = $("rsDate").value;
    var newSlot = $("rsSlot").value;

    if (!newDate) return toast("Please select a new date", "error");
    if (!newSlot) return toast("Please select a new time slot", "error");

    var res = await apiRequest("/api/appointments", "PUT", {
      id: id,
      action: "reschedule",
      date: newDate,
      time: newSlot
    });

    if (res && res.success) {
      closeModal();
      toast("Appointment " + id + " rescheduled to " + newDate + ", " + newSlot);
      loadMyAppointments();
      if (isStaffOrAdmin()) loadAllAppointments();
    } else {
      toast(res ? res.message : "Couldn't reschedule this appointment", "error");
    }
  };
}

/* ---- All Appointments (admin/staff management table) ---- */

var allAppointments = [];

async function loadAllAppointments() {
  var tbody = $("adminApptTable");
  if (!tbody) return;

  var search = $("apptSearch") ? $("apptSearch").value.trim() : "";
  var status = $("apptFilter") ? $("apptFilter").value : "";

  var url = "/api/appointments?search=" + encodeURIComponent(search) + "&status=" + encodeURIComponent(status);
  var res = await apiRequest(url);
  if (!res || !res.success) return;

  allAppointments = res.data || [];

  tbody.innerHTML = allAppointments.length
    ? allAppointments.map(function (a) {
        return (
          "<tr><td>" + a.id + "</td><td>" + esc(a.patient) + "</td><td>" +
          esc(a.doctor || "—") + "</td><td>" + esc(dateOnly(a.date)) + "</td><td>" + esc(a.time) +
          "</td><td>" + apptStatusControl(a.id, a.status) + "</td>" +
          '<td><div class="row-actions">' +
          (a.status !== "Cancelled"
            ? '<button class="mini del" onclick="cancelAppointment(\'' + a.id + '\')" title="Cancel">' +
              '<i class="fa-regular fa-circle-xmark"></i></button>'
            : "—") +
          "</div></td></tr>"
        );
      }).join("")
    : '<tr><td colspan="7" class="empty">No appointments found</td></tr>';
}

if ($("apptSearch")) $("apptSearch").oninput = loadAllAppointments;
if ($("apptFilter")) $("apptFilter").onchange = loadAllAppointments;

async function bookAppointmentForm() {
  if (!doctors.length) {
    var docRes = await apiRequest("/api/doctors");
    if (docRes && docRes.success) doctors = docRes.data || [];
  }

  var problemOpts = PROBLEM_SPEC_MAP.map(function (p, i) {
    return '<option value="' + i + '">' + p.label + "</option>";
  }).join("");

  openModal(
    "Book an Appointment",
    '<form id="bkForm"><div class="form-grid">' +

    '<div><label>Full Name *</label>' +
    '<input id="bkName" placeholder="Patient full name" value="' +
    (currentUser ? esc(currentUser.fullName) : "") +
    '" required></div>' +

    '<div><label>Age *</label>' +
    '<input id="bkAge" type="number" min="0" max="120" value="' +
    (currentUser && currentUser.age ? esc(currentUser.age) : "") +
    '" required></div>' +

    '<div><label>Gender</label>' +
    '<select id="bkGender">' +
    '<option>Male</option>' +
    '<option>Female</option>' +
    '<option>Other</option>' +
    '</select></div>' +

    '<div><label>Email (for confirmation) *</label>' +
    '<input id="bkEmail" type="email" placeholder="you@example.com" value="' +
    (currentUser ? esc(currentUser.email) : "") +
    '" required></div>' +

    '<div class="full"><label>Problem / Symptom *</label>' +
    '<select id="bkProblem" required>' +
    '<option value="">Select a problem...</option>' +
    problemOpts +
    '</select></div>' +

    '<div><label>Doctor *</label>' +
    '<select id="bkDoctor" disabled required>' +
    '<option value="">Select a problem first</option>' +
    '</select></div>' +

    '<div><label>Time Slot *</label>' +
    '<select id="bkSlot" disabled required>' +
    '<option value="">Select a doctor first</option>' +
    '</select></div>' +

    '<div><label>Preferred Date *</label>' +
    '<input id="bkDate" type="date" min="' +
    today +
    '" value="' +
    today +
    '" required></div>' +

    '<div><label>Mode of Payment</label>' +
    '<input value="Cash Only" disabled></div>' +

    '</div><div class="modal-actions">' +
    '<button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" type="submit">' +
    '<i class="fa-regular fa-calendar-check"></i> Confirm Booking' +
    '</button></div></form>'
  );

  $("bkProblem").onchange = function () {
    var idx = this.value;
    var docSel = $("bkDoctor");
    var slotSel = $("bkSlot");

    slotSel.innerHTML = '<option value="">Select a doctor first</option>';
    slotSel.disabled = true;

    if (idx === "") {
      docSel.innerHTML = '<option value="">Select a problem first</option>';
      docSel.disabled = true;
      return;
    }

    docSel.innerHTML =
      '<option value="">Select a doctor...</option>' +
      doctorOptionsForSpec(PROBLEM_SPEC_MAP[idx].spec);
    docSel.disabled = false;
  };

  $("bkDoctor").onchange = function () {
    var docName = this.value;
    var slotSel = $("bkSlot");

    if (!docName) {
      slotSel.innerHTML = '<option value="">Select a doctor first</option>';
      slotSel.disabled = true;
      return;
    }

    var doc = doctors.find(function (d) { return d.name === docName; });
    slotSel.innerHTML =
      '<option value="">Select a time...</option>' +
      slotOptionsForDoctor(doc);
    slotSel.disabled = false;
  };

  $("bkForm").onsubmit = async function (e) {
    e.preventDefault();

    var name = $("bkName").value.trim();
    var age = $("bkAge").value;
    var email = $("bkEmail").value.trim();
    var problemIdx = $("bkProblem").value;
    var docName = $("bkDoctor").value;
    var slot = $("bkSlot").value;
    var date = $("bkDate").value;

    if (!name) return toast("Full name is required", "error");
    if (!age || age <= 0) return toast("Enter a valid age", "error");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Enter a valid email address", "error");
    if (problemIdx === "") return toast("Please select your problem", "error");
    if (!docName) return toast("Please select a doctor", "error");
    if (!slot) return toast("Please select a time slot", "error");
    if (!date) return toast("Please select a preferred date", "error");

    var doc = doctors.find(function (d) { return d.name === docName; });

    var record = {
      patient: name,
      age: Number(age),
      gender: $("bkGender").value,
      email: email,
      problem: PROBLEM_SPEC_MAP[problemIdx].label,
      doctor: docName,
      dept: doc ? doc.spec : "General",
      fee: doc ? doc.fee : settings.fee,
      date: date,
      time: slot,
      paymentMode: "Cash Only",
      status: "Scheduled",
      notes: PROBLEM_SPEC_MAP[problemIdx].label
    };

    var res = await apiRequest("/api/appointments", "POST", record);
    if (res && res.success && res.data) {
      var savedAppt = res.data;
      loadDashboard();
      loadMyAppointments();
      if (isStaffOrAdmin()) loadAllAppointments();
      sendConfirmationEmail(savedAppt);
      showReceipt(savedAppt);
    } else {
      toast(res ? res.message : "Booking failed", "error");
    }
  };
}

function sendConfirmationEmail(a) {
  var configured =
    typeof emailjs !== "undefined" &&
    EMAILJS_SERVICE_ID !== "YOUR_SERVICE_ID" &&
    EMAILJS_TEMPLATE_ID !== "YOUR_TEMPLATE_ID" &&
    EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY";

  if (!configured) {
    toast("Email sent to " + a.email + " - your slot is " + a.time);
    return;
  }

  var params = {
    to_email: a.email,
    patient_name: a.patient,
    doctor_name: a.doctor,
    department: a.dept,
    appointment_date: a.date,
    appointment_time: a.time,
    location: settings.address,
    hospital_name: settings.name,
    hospital_website: "www.medicarehms.in",
    hospital_address: settings.address
  };

  emailjs
    .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
    .then(function () {
      toast("Confirmation email sent to " + a.email);
    })
    .catch(function (err) {
      console.error("EmailJS send failed:", err);
      toast("Couldn't send the confirmation email - appointment is still booked.", "error");
    });
}

function buildQrPayload(a) {
  return (
    "MediCare Hospital - Appointment Confirmation\n" +
    "Appointment ID: " + a.id + "\n" +
    "Patient: " + a.patient + " (" + a.age + ", " + a.gender + ")\n" +
    "Problem: " + a.problem + "\n" +
    "Doctor: " + a.doctor + " (" + a.dept + ")\n" +
    "Date: " + a.date + "\n" +
    "Time Slot: " + a.time + "\n" +
    "Fee: " + money(a.fee) + "\n" +
    "Payment Mode: " + a.paymentMode
  );
}

function showReceipt(a) {
  openModal(
    "Appointment Confirmed",
    '<div class="receipt" id="printArea">' +
    '<div class="receipt-head">' +
    '<i class="fa-solid fa-house-medical"></i>' +
    '<div><h3>' + settings.name + '</h3><p class="muted">' + settings.address + ' · ' + settings.phone + '</p></div>' +
    '</div>' +
    '<div class="receipt-status">' +
    '<i class="fa-solid fa-circle-check"></i> ' +
    'Confirmed — Appointment ' + a.id +
    '</div>' +
    '<div class="receipt-grid">' +
    '<div><span>Patient : </span><strong>' + esc(a.patient) + '</strong></div>' +
    '<div><span>Age / Gender : </span><strong>' + a.age + ' / ' + a.gender + '</strong></div>' +
    '<div><span>Problem : </span><strong>' + esc(a.problem) + '</strong></div>' +
    '<div><span>Doctor : </span><strong>' + esc(a.doctor) + ' (' + esc(a.dept) + ')</strong></div>' +
    '<div><span>Date : </span><strong>' + a.date + '</strong></div>' +
    '<div><span>Time Slot : </span><strong>' + a.time + '</strong></div>' +
    '<div><span>Consultation Fee : </span><strong>' + money(a.fee) + '</strong></div>' +
    '<div><span>Payment Mode : </span><strong>' + a.paymentMode + '</strong></div>' +
    '<br/></div>' +
    '<div class="receipt-qr">' +
    '<div id="qrCodeBox"></div>' +
    '<p class="muted">Scan to view the appointment details above</p>' +
    '</div>' +
    '</div>' +
    '<div class="email-preview">' +
    '<i class="fa-regular fa-envelope"></i>' +
    '<div><strong>Confirmation email sent to ' + esc(a.email) + '</strong></div>' +
    '</div>' +
    '<div class="modal-actions">' +
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>' +
    '<button class="btn btn-primary" onclick="window.print()">' +
    '<i class="fa-solid fa-print"></i> Print / Save as PDF' +
    '</button></div>'
  );

  new QRCode(document.getElementById("qrCodeBox"), {
    text: buildQrPayload(a),
    width: 130,
    height: 130,
    colorDark: "#0f2942",
    colorLight: "#ffffff"
  });
}

/* ---------------- 10. BILLING & INVOICES MODULE ---------------- */

async function loadBills() {
  var q = $("billSearch") ? $("billSearch").value.trim() : "";
  var f = $("billFilter") ? $("billFilter").value : "";

  var url = "/api/invoices?search=" + encodeURIComponent(q) + "&status=" + encodeURIComponent(f);
  var res = await apiRequest(url);

  if (!res || !res.success) return;
  bills = res.data || [];

  $("billTable").innerHTML = bills.length
    ? bills.map(function (b) {
        return (
          "<tr><td>" +
          b.id +
          "</td><td>" +
          esc(b.patient) +
          "</td><td>" +
          b.date +
          "</td><td>" +
          money(b.fee) +
          "</td><td>" +
          money(b.other) +
          "</td><td><strong>" +
          money(b.total) +
          "</strong></td><td>" +
          badge(b.status) +
          "</td>" +
          '<td><div class="row-actions">' +
          '<button class="mini" onclick="viewInvoice(\'' +
          b.id +
          '\')" title="View / Print"><i class="fa-regular fa-eye"></i></button>' +
          '<button class="mini" onclick="togglePaid(\'' +
          b.id +
          '\')" title="Mark Paid/Pending"><i class="fa-solid fa-money-bill-wave"></i></button>' +
          '<button class="mini del" onclick="deleteBill(\'' +
          b.id +
          '\')" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
          "</div></td></tr>"
        );
      }).join("")
    : '<tr><td colspan="8" class="empty">No invoices found</td></tr>';
}

if ($("billSearch")) $("billSearch").oninput = loadBills;
if ($("billFilter")) $("billFilter").onchange = loadBills;
if ($("addBillBtn")) $("addBillBtn").onclick = function () { billForm(); };

async function togglePaid(id) {
  var res = await apiRequest("/api/invoices", "PUT", { id: id, toggle_status: true });
  if (res && res.success) {
    loadBills();
    loadDashboard();
    toast(res.message);
  } else {
    toast(res ? res.message : "Failed to toggle invoice status", "error");
  }
}

function billForm(id) {
  var b = {};
  if (id) {
    b = bills.find(function (x) { return x.id === id; }) || {};
  }

  openModal(
    id ? "Edit Invoice" : "Create Invoice",
    '<form id="bForm"><div class="form-grid">' +

    '<div><label>Patient *</label>' +
    '<input id="bPatient" type="text" value="' +
    esc(b.patient) +
    '" placeholder="Enter patient name" required></div>' +

    '<div><label>Date</label>' +
    '<input id="bDate" type="date" value="' +
    (b.date || today) +
    '" required></div>' +

    '<div><label>Consultation Fee (₹)</label>' +
    '<input id="bFee" type="number" min="0" value="' +
    (b.fee !== undefined ? b.fee : settings.fee) +
    '"></div>' +

    '<div><label>Other Charges (₹)</label>' +
    '<input id="bOther" type="number" min="0" value="' +
    (b.other !== undefined ? b.other : 0) +
    '"></div>' +

    '<div><label>Total Amount (auto)</label>' +
    '<input id="bTotal" readonly value="0"></div>' +

    '<div><label>Payment Status</label>' +
    '<select id="bStatus">' +
    '<option ' + (b.status === "Pending" ? "selected" : "") + '>Pending</option>' +
    '<option ' + (b.status === "Paid" ? "selected" : "") + '>Paid</option>' +
    '</select></div>' +

    '</div><div class="modal-actions">' +
    '<button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" type="submit">Save Invoice</button>' +
    '</div></form>'
  );

  function calcTotal() {
    var feeVal = Number($("bFee").value || 0);
    var otherVal = Number($("bOther").value || 0);
    var t = feeVal + otherVal;
    $("bTotal").value = money(t);
    return t;
  }

  $("bFee").oninput = calcTotal;
  $("bOther").oninput = calcTotal;
  calcTotal();

  $("bForm").onsubmit = async function (e) {
    e.preventDefault();

    var patientName = $("bPatient").value.trim();
    if (!patientName) return toast("Patient name is required", "error");

    var fee = Number($("bFee").value || 0);
    var other = Number($("bOther").value || 0);
    if (fee < 0 || other < 0) return toast("Charges cannot be negative", "error");

    var record = {
      id: id || undefined,
      patient: patientName,
      date: $("bDate").value,
      fee: fee,
      other: other,
      total: fee + other,
      status: $("bStatus").value
    };

    var res = await apiRequest("/api/invoices", id ? "PUT" : "POST", record);
    if (res && res.success) {
      closeModal();
      loadBills();
      loadDashboard();
      toast(id ? "Invoice updated" : "Invoice created successfully");
    } else {
      toast(res ? res.message : "Failed to save invoice", "error");
    }
  };
}

function viewInvoice(id) {
  var b = bills.find(function (x) { return x.id === id; });
  if (!b) return;

  openModal(
    "Invoice " + b.id,
    '<div class="invoice-view" id="printArea">' +
    "<h2>" + settings.name + "</h2>" +
    '<p class="muted">' + settings.address + " · " + settings.phone + "</p>" +
    "<hr style='margin:12px 0'>" +
    "<p><strong>Invoice ID:</strong> " + b.id + "</p>" +
    "<p><strong>Patient:</strong> " + esc(b.patient) + "</p>" +
    "<p><strong>Date:</strong> " + b.date + "</p>" +
    "<table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>" +
    "<tr><td>Consultation Fee</td><td>" + money(b.fee) + "</td></tr>" +
    "<tr><td>Other Charges (tests, medicines, room)</td><td>" + money(b.other) + "</td></tr>" +
    "<tr><td><strong>Total</strong></td><td><strong>" + money(b.total) + "</strong></td></tr>" +
    "</tbody></table>" +
    "<p style='margin-top:12px'><strong>Payment Status:</strong> " + b.status + "</p>" +
    "<p style='margin-top:8px'><strong>Mode of Payment:</strong> Cash</p>" +
    "<p style='margin-top:8px'><strong>Received By:</strong> Anita Desai (Accountant)</p>" +
    "</div>" +
    '<div class="modal-actions">' +
    '<button class="btn btn-outline" onclick="closeModal()">Close</button>' +
    '<button class="btn btn-primary" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>' +
    "</div>"
  );
}

async function deleteBill(id) {
  if (!confirm("Delete this invoice?")) return;

  var res = await apiRequest("/api/invoices", "DELETE", { id: id });
  if (res && res.success) {
    loadBills();
    loadDashboard();
    toast("Invoice deleted");
  } else {
    toast(res ? res.message : "Failed to delete invoice", "error");
  }
}

/* ---------------- 11. STAFF MODULE ---------------- */

async function loadStaff() {
  var q = $("staffSearch") ? $("staffSearch").value.trim() : "";
  var f = $("staffFilter") ? $("staffFilter").value : "";

  var url = "/api/staff?search=" + encodeURIComponent(q) + "&status=" + encodeURIComponent(f);
  var res = await apiRequest(url);

  if (!res || !res.success) return;
  staff = res.data || [];

  var canManage = isAdminUser();

  if ($("addStaffBtn")) $("addStaffBtn").classList.toggle("hidden", !canManage);

  $("staffTable").innerHTML = staff.length
    ? staff.map(function (s) {
        return (
          "<tr><td>" +
          s.id +
          "</td><td>" +
          esc(s.name) +
          "</td><td>" +
          esc(s.role) +
          "</td><td>" +
          esc(s.phone) +
          "</td><td>" +
          esc(s.email) +
          "</td><td>" +
          badge(s.status) +
          "</td><td>" +
          (canManage
            ? '<div class="row-actions">' +
              '<button class="mini" onclick="staffForm(\'' +
              s.id +
              '\')" title="Edit"><i class="fa-solid fa-pen"></i></button>' +
              '<button class="mini del" onclick="deleteStaff(\'' +
              s.id +
              '\')" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
              "</div>"
            : '<span class="muted">Admin only</span>') +
          "</td></tr>"
        );
      }).join("")
    : '<tr><td colspan="7" class="empty">No staff found</td></tr>';
}

if ($("staffSearch")) $("staffSearch").oninput = loadStaff;
if ($("staffFilter")) $("staffFilter").onchange = loadStaff;
if ($("addStaffBtn")) $("addStaffBtn").onclick = function () { staffForm(); };

function staffForm(id) {
  if (!isAdminUser()) {
    toast("Access restricted to Administrators.", "error");
    return;
  }

  var s = {};
  if (id) {
    s = staff.find(function (x) { return x.id === id; }) || {};
  }

  var roles = [
    "Head Nurse",
    "Nurse",
    "Receptionist",
    "Lab Technician",
    "Pharmacist",
    "Ward Boy",
    "Accountant",
    "Security Guard",
    "Housekeeping",
    "IT Support",
    "Driver",
    "Dietician"
  ];

  openModal(
    id ? "Edit Staff" : "Add Staff",
    '<form id="sForm"><div class="form-grid">' +

    '<div><label>Name *</label>' +
    '<input id="sName" value="' +
    esc(s.name) +
    '" placeholder="Staff full name" required></div>' +

    '<div><label>Role</label>' +
    '<select id="sRole">' +
    roles.map(function (r) {
      return '<option ' + (s.role === r ? "selected" : "") + ">" + r + "</option>";
    }).join("") +
    '</select></div>' +

    '<div><label>Phone *</label>' +
    '<input id="sPhone" value="' +
    esc(s.phone) +
    '" placeholder="9876543210" required></div>' +

    '<div><label>Email *</label>' +
    '<input id="sEmail" type="email" value="' +
    esc(s.email) +
    '" placeholder="staff@medicare.in" required></div>' +

    '<div><label>Username</label>' +
    '<input id="sUser" value="' +
    esc(s.username) +
    '" placeholder="staff_user"></div>' +

    '<div><label>Status</label>' +
    '<select id="sStatus">' +
    '<option ' + (s.status === "Active" || !s.status ? "selected" : "") + '>Active</option>' +
    '<option ' + (s.status === "Inactive" ? "selected" : "") + '>Inactive</option>' +
    '</select></div>' +

    '</div><div class="modal-actions">' +
    '<button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" type="submit">Save Staff</button>' +
    '</div></form>'
  );

  $("sForm").onsubmit = async function (e) {
    e.preventDefault();

    var name = $("sName").value.trim();
    var phone = $("sPhone").value.trim();
    var email = $("sEmail").value.trim();
    var user = $("sUser").value.trim();

    if (!name) return toast("Staff name is required", "error");
    if (!/^\d{10}$/.test(phone)) return toast("Phone must be 10 digits", "error");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Enter a valid email", "error");

    var record = {
      id: id || undefined,
      name: name,
      role: $("sRole").value,
      phone: phone,
      email: email,
      username: user,
      status: $("sStatus").value
    };

    var res = await apiRequest("/api/staff", id ? "PUT" : "POST", record);
    if (res && res.success) {
      closeModal();
      loadStaff();
      toast(id ? "Staff updated" : "Staff added successfully");
    } else {
      toast(res ? res.message : "Failed to save staff member", "error");
    }
  };
}

async function deleteStaff(id) {
  if (!isAdminUser()) {
    toast("Access restricted to Administrators.", "error");
    return;
  }

  if (!confirm("Delete this staff member?")) return;

  var res = await apiRequest("/api/staff", "DELETE", { id: id });
  if (res && res.success) {
    loadStaff();
    toast("Staff deleted");
  } else {
    toast(res ? res.message : "Failed to delete staff member", "error");
  }
}

/* ---------------- 12. CONTACT US FORM ---------------- */

var contactFormEl = $("contactForm");
if (contactFormEl) {
  contactFormEl.onsubmit = async function (e) {
    e.preventDefault();

    ["cNameError", "cEmailError", "cSubjectError", "cMessageError"].forEach(function (id) {
      if ($(id)) $(id).textContent = "";
    });

    var name = $("cName") ? $("cName").value.trim() : "";
    var email = $("cEmail") ? $("cEmail").value.trim() : "";
    var subject = $("cSubject") ? $("cSubject").value.trim() : "";
    var message = $("cMessage") ? $("cMessage").value.trim() : "";

    var valid = true;
    if (!name) {
      if ($("cNameError")) $("cNameError").textContent = "Your name is required";
      valid = false;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      if ($("cEmailError")) $("cEmailError").textContent = "Valid email is required";
      valid = false;
    }
    if (!subject) {
      if ($("cSubjectError")) $("cSubjectError").textContent = "Subject is required";
      valid = false;
    }
    if (!message) {
      if ($("cMessageError")) $("cMessageError").textContent = "Message cannot be empty";
      valid = false;
    }

    if (!valid) return;

    var res = await apiRequest("/api/contacts", "POST", {
      name: name,
      email: email,
      subject: subject,
      message: message
    });

    if (res && res.success) {
      toast(res.message);
      contactFormEl.reset();
    } else {
      toast(res ? res.message : "Failed to submit contact message", "error");
    }
  };
}

/* ---------------- 13. MY ACCOUNT / PROFILE ---------------- */

function renderAccount() {
  syncRoleUI();
  if (!currentUser) return;

  var initials = currentUser.fullName
    .split(" ")
    .map(function (part) { return part[0]; })
    .join("")
    .slice(0, 2)
    .toUpperCase();

  var avatarHtml = currentUser.photo
    ? '<img src="' + currentUser.photo + '" alt="Profile photo">'
    : initials;

  if ($("acctAvatar")) $("acctAvatar").innerHTML = avatarHtml;
  if ($("topAvatar")) $("topAvatar").innerHTML = avatarHtml;
  if ($("acctPhotoRemoveBtn")) {
    $("acctPhotoRemoveBtn").classList.toggle("show", !!currentUser.photo);
  }
  if ($("topProfileName")) $("topProfileName").textContent = currentUser.fullName;
  if ($("topProfileRole")) {
    $("topProfileRole").textContent =
      currentUser.role === "admin" ? "Administrator" : (currentUser.role === "staff" ? "Hospital Staff" : "User");
  }
  if ($("acctName")) $("acctName").textContent = currentUser.fullName;
  if ($("acctEmail")) $("acctEmail").textContent = currentUser.email;
  if ($("acctAge")) $("acctAge").textContent = currentUser.age || "—";
  if ($("acctCreated")) $("acctCreated").textContent = formatAccountDate(currentUser.createdAt, false);
  if ($("acctLastLogin")) $("acctLastLogin").textContent = formatAccountDate(currentUser.lastLogin, true);
}

if ($("acctPhotoBtn")) {
  $("acctPhotoBtn").onclick = function () {
    $("acctPhotoInput").click();
  };
}

if ($("acctPhotoInput")) {
  $("acctPhotoInput").onchange = function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.match(/^image\//)) {
      return toast("Please choose an image file", "error");
    }
    if (file.size > 3 * 1024 * 1024) {
      return toast("Please choose an image smaller than 3 MB", "error");
    }

    var reader = new FileReader();
    reader.onload = async function (evt) {
      if (!currentUser) return;
      var dataUrl = evt.target.result;

      var res = await apiRequest("/api/session", "POST", {
        action: "update_photo",
        photo: dataUrl
      });

      if (res && res.success) {
        currentUser.photo = dataUrl;
        renderAccount();
        toast("Profile photo updated");
      } else {
        toast(res ? res.message : "Failed to update photo", "error");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
}

if ($("acctPhotoRemoveBtn")) {
  $("acctPhotoRemoveBtn").onclick = async function () {
    if (!currentUser || !currentUser.photo) return;

    if (!confirm("Remove your profile photo?")) return;

    var res = await apiRequest("/api/session", "POST", {
      action: "update_photo",
      photo: null
    });

    if (res && res.success) {
      currentUser.photo = null;
      renderAccount();
      toast("Profile photo removed");
    } else {
      toast(res ? res.message : "Failed to remove photo", "error");
    }
  };
}

if ($("changePasswordForm")) {
  $("changePasswordForm").onsubmit = async function (e) {
    e.preventDefault();

    ["cpCurrent", "cpNew", "cpConfirm"].forEach(function (id) {
      $(id + "Error").textContent = "";
    });

    var current = $("cpCurrent").value;
    var next = $("cpNew").value;
    var confirmNext = $("cpConfirm").value;

    var valid = true;
    if (!current) {
      $("cpCurrentError").textContent = "Current password is required";
      valid = false;
    }
    if (!next || next.length < 5) {
      $("cpNewError").textContent = "New password must be at least 5 characters";
      valid = false;
    }
    if (next !== confirmNext) {
      $("cpConfirmError").textContent = "New passwords do not match";
      valid = false;
    }

    if (!valid) return;

    var res = await apiRequest("/api/session", "POST", {
      action: "change_password",
      currentPassword: current,
      newPassword: next,
      confirmPassword: confirmNext
    });

    if (res && res.success) {
      $("changePasswordForm").reset();
      toast("Password updated successfully");
    } else {
      toast(res ? res.message : "Failed to update password", "error");
    }
  };
}

/* ---------------- 14. RENDER ALL & INIT ---------------- */

function renderAll() {
  if (isAdminUser()) {
    loadDashboard();
    loadPatients();
    loadDoctors();
    loadBills();
    loadStaff();
  } else {
    loadDoctors();
  }
  renderAccount();
}

// Initial session check on page load
checkSession();
checkResetTokenInUrl();