/**
 * BeamQR — tiny, self-contained QR code generator (no third-party calls, so
 * transfer links never leave your server). Byte mode, ECC level M, auto version.
 * Algorithm: Reed–Solomon + masking per ISO/IEC 18004 (canonical qrcode-generator
 * by Kazuhiko Arase, MIT — condensed). Exposes window.BeamQR.render(el, text, size).
 */
(function (global) {
  // ---- Galois field math (GF(256)) ----
  var EXP = [], LOG = [];
  for (var i = 0; i < 256; i++) EXP[i] = i < 8 ? 1 << i : 0;
  for (var i = 8; i < 256; i++) EXP[i] = EXP[i - 4] ^ EXP[i - 5] ^ EXP[i - 6] ^ EXP[i - 8];
  for (var i = 0; i < 255; i++) LOG[EXP[i]] = i;
  function gexp(n) { while (n < 0) n += 255; while (n >= 256) n -= 255; return EXP[n]; }
  function glog(n) { return LOG[n]; }

  function Poly(num, shift) {
    var offset = 0; while (offset < num.length && num[offset] === 0) offset++;
    this.num = [];
    for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    for (var i = 0; i < shift; i++) this.num.push(0);
  }
  Poly.prototype.get = function (i) { return this.num[i]; };
  Poly.prototype.len = function () { return this.num.length; };
  Poly.prototype.multiply = function (e) {
    var num = new Array(this.len() + e.len() - 1).fill(0);
    for (var i = 0; i < this.len(); i++)
      for (var j = 0; j < e.len(); j++)
        num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
    return new Poly(num, 0);
  };
  Poly.prototype.mod = function (e) {
    if (this.len() - e.len() < 0) return this;
    var ratio = glog(this.get(0)) - glog(e.get(0));
    var num = this.num.slice();
    for (var i = 0; i < e.len(); i++) num[i] ^= gexp(glog(e.get(i)) + ratio);
    return new Poly(num, 0).mod(e);
  };
  function rsPoly(count) {
    var p = new Poly([1], 0);
    for (var i = 0; i < count; i++) p = p.multiply(new Poly([1, gexp(i)], 0));
    return p;
  }

  // ---- Bit buffer ----
  function Bits() { this.buf = []; this.len = 0; }
  Bits.prototype.put = function (num, length) {
    for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
  };
  Bits.prototype.putBit = function (bit) {
    var bufIndex = Math.floor(this.len / 8);
    if (this.buf.length <= bufIndex) this.buf.push(0);
    if (bit) this.buf[bufIndex] |= 0x80 >>> (this.len % 8);
    this.len++;
  };

  // ---- ECC blocks (level M) for versions 1..10 ----
  // [totalCodewords, ecCodewordsPerBlock, [ [numBlocks, dataCodewordsPerBlock], ... ] ]
  var RS_M = {
    1: [26, 10, [[1, 16]]], 2: [44, 16, [[1, 28]]], 3: [70, 26, [[1, 44]]],
    4: [100, 18, [[2, 32]]], 5: [134, 24, [[2, 43]]], 6: [172, 16, [[4, 27]]],
    7: [196, 18, [[4, 31]]], 8: [242, 22, [[2, 38], [2, 39]]],
    9: [292, 22, [[3, 36], [2, 37]]], 10: [346, 26, [[4, 43], [1, 44]]]
  };
  // total data codewords available (level M) per version
  function dataCodewords(ver) {
    var spec = RS_M[ver], n = 0;
    spec[2].forEach(function (b) { n += b[0] * b[1]; });
    return n;
  }

  function makeData(ver, dataBytes) {
    var bits = new Bits();
    bits.put(4, 4);                               // byte mode
    bits.put(dataBytes.length, ver < 10 ? 8 : 16); // char count
    for (var i = 0; i < dataBytes.length; i++) bits.put(dataBytes[i], 8);
    var totalData = dataCodewords(ver) * 8;
    if (bits.len + 4 <= totalData) bits.put(0, 4); // terminator
    while (bits.len % 8 !== 0) bits.putBit(false);
    var pad = [0xEC, 0x11], pi = 0;
    while (bits.buf.length < dataCodewords(ver)) { bits.buf.push(pad[pi % 2]); pi++; }
    return bits.buf;
  }

  function makeBlocks(ver, data) {
    var spec = RS_M[ver], ecCount = spec[1], blocks = [], offset = 0, maxData = 0, maxEc = 0;
    spec[2].forEach(function (b) {
      for (var k = 0; k < b[0]; k++) {
        var dcCount = b[1];
        var dc = data.slice(offset, offset + dcCount); offset += dcCount;
        var rs = rsPoly(ecCount);
        var raw = new Poly(dc, rs.len() - 1);
        var mod = raw.mod(rs);
        var ec = [];
        for (var i = 0; i < rs.len() - 1; i++) {
          var idx = i + mod.len() - (rs.len() - 1);
          ec[i] = idx >= 0 ? mod.get(idx) : 0;
        }
        blocks.push({ dc: dc, ec: ec });
        maxData = Math.max(maxData, dc.length); maxEc = Math.max(maxEc, ec.length);
      }
    });
    var out = [];
    for (var i = 0; i < maxData; i++) blocks.forEach(function (b) { if (i < b.dc.length) out.push(b.dc[i]); });
    for (var i = 0; i < maxEc; i++) blocks.forEach(function (b) { if (i < b.ec.length) out.push(b.ec[i]); });
    return out;
  }

  // ---- Matrix ----
  function Matrix(ver) {
    this.ver = ver; this.size = ver * 4 + 17;
    this.m = []; for (var r = 0; r < this.size; r++) this.m.push(new Array(this.size).fill(null));
  }
  function setupFinder(mat, row, col) {
    for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
      var rr = row + r, cc = col + c;
      if (rr < 0 || rr >= mat.size || cc < 0 || cc >= mat.size) continue;
      var on = (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
               (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
               (2 <= r && r <= 4 && 2 <= c && c <= 4);
      mat.m[rr][cc] = on;
    }
  }
  var ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
                7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
  function setupAlignment(mat) {
    var pos = ALIGN[mat.ver];
    for (var i = 0; i < pos.length; i++) for (var j = 0; j < pos.length; j++) {
      var row = pos[i], col = pos[j];
      if (mat.m[row][col] !== null) continue;
      for (var r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++)
        mat.m[row + r][col + c] = (Math.max(Math.abs(r), Math.abs(c)) !== 1);
    }
  }
  function setupTiming(mat) {
    for (var i = 8; i < mat.size - 8; i++) {
      if (mat.m[i][6] === null) mat.m[i][6] = (i % 2 === 0);
      if (mat.m[6][i] === null) mat.m[6][i] = (i % 2 === 0);
    }
  }
  // BCH format info for level M + mask
  function formatBits(mask) {
    var data = (0 << 3) | mask;           // 00 = level M
    var d = data << 10, g = 0x537;
    for (var i = 14; i >= 10; i--) if ((d >> i) & 1) d ^= g << (i - 10);
    return ((data << 10) | d) ^ 0x5412;
  }
  function setupFormat(mat, mask) {
    var bits = formatBits(mask), size = mat.size;
    for (var i = 0; i < 15; i++) {
      var bit = ((bits >> i) & 1) === 1;
      if (i < 6) mat.m[i][8] = bit; else if (i < 8) mat.m[i + 1][8] = bit; else mat.m[size - 15 + i][8] = bit;
      if (i < 8) mat.m[8][size - i - 1] = bit; else if (i < 9) mat.m[8][15 - i - 1 + 1] = bit; else mat.m[8][15 - i - 1] = bit;
    }
    mat.m[size - 8][8] = true; // dark module
  }
  function maskFn(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
    return false;
  }
  function mapData(mat, bytes, mask) {
    var inc = -1, row = mat.size - 1, bitIndex = 7, byteIndex = 0;
    for (var col = mat.size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (var c = 0; c < 2; c++) {
          var cc = col - c;
          if (mat.m[row][cc] === null) {
            var dark = false;
            if (byteIndex < bytes.length) dark = ((bytes[byteIndex] >>> bitIndex) & 1) === 1;
            if (maskFn(mask, row, cc)) dark = !dark;
            mat.m[row][cc] = dark;
            bitIndex--;
            if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
          }
        }
        row += inc;
        if (row < 0 || mat.size <= row) { row -= inc; inc = -inc; break; }
      }
    }
  }
  function penalty(mat) {
    var size = mat.size, score = 0, m = mat.m;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) {
      var same = 1, dark = m[r][c];
      for (var cc = c + 1; cc < size && m[r][cc] === dark; cc++) same++;
      if (same >= 5) { score += 3 + (same - 5); c += same - 1; }
    }
    for (var c = 0; c < size; c++) for (var r = 0; r < size; r++) {
      var same = 1, dark = m[r][c];
      for (var rr = r + 1; rr < size && m[rr][c] === dark; rr++) same++;
      if (same >= 5) { score += 3 + (same - 5); r += same - 1; }
    }
    var dark = 0; for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (m[r][c]) dark++;
    var ratio = Math.abs((dark * 100) / (size * size) - 50) / 5;
    score += ratio * 10;
    return score;
  }

  function build(text) {
    var bytes = []; // UTF-8 encode
    for (var i = 0; i < text.length; i++) {
      var cc = text.charCodeAt(i);
      if (cc < 0x80) bytes.push(cc);
      else if (cc < 0x800) { bytes.push(0xc0 | (cc >> 6), 0x80 | (cc & 0x3f)); }
      else { bytes.push(0xe0 | (cc >> 12), 0x80 | ((cc >> 6) & 0x3f), 0x80 | (cc & 0x3f)); }
    }
    var ver = 0;
    for (var v = 1; v <= 10; v++) {
      var headerBits = 4 + (v < 10 ? 8 : 16);
      if (Math.ceil((headerBits + bytes.length * 8) / 8) <= dataCodewords(v)) { ver = v; break; }
    }
    if (!ver) throw new Error('Data too large for BeamQR (max ~270 bytes).');
    var data = makeData(ver, bytes);
    var all = makeBlocks(ver, data);

    var best = null, bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      var mat = new Matrix(ver);
      setupFinder(mat, 0, 0); setupFinder(mat, mat.size - 7, 0); setupFinder(mat, 0, mat.size - 7);
      setupAlignment(mat); setupTiming(mat); setupFormat(mat, mask);
      mapData(mat, all, mask);
      var sc = penalty(mat);
      if (sc < bestScore) { bestScore = sc; best = mat; }
    }
    return best;
  }

  function render(el, text, sizePx) {
    var mat = build(text);
    var n = mat.size, quiet = 4, total = n + quiet * 2;
    var scale = Math.max(1, Math.floor((sizePx || 150) / total));
    var dim = total * scale;
    var canvas = document.createElement('canvas');
    canvas.width = dim; canvas.height = dim;
    canvas.style.width = canvas.style.height = dim + 'px';
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = '#0E0F12';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (mat.m[r][c]) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
    }
    el.innerHTML = '';
    el.appendChild(canvas);
    return canvas;
  }

  global.BeamQR = { render: render, build: build };
})(window);
