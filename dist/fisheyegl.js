(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const shaders = require('./shaders');

function compileShader(gl, vertexSrc, fragmentSrc) {
  function checkCompile(shader) {
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
  }

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSrc);
  gl.compileShader(vertexShader);

  checkCompile(vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentSrc);
  gl.compileShader(fragmentShader);

  checkCompile(fragmentShader);

  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  return program;
}

function createTexture(glContext) {
  const texture = glContext.createTexture();
  glContext.bindTexture(glContext.TEXTURE_2D, texture);
  // Because video has to be download over the internet
  // they might take a moment until it's ready so
  // put a single pixel in the texture so we can
  // use it immediately.
  const level = 0;
  const internalFormat = glContext.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = glContext.RGBA;
  const srcType = glContext.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
  glContext.texImage2D(glContext.TEXTURE_2D, level, internalFormat,
    width, height, border, srcFormat, srcType,
    pixel);

  // Turn off mips and set  wrapping to clamp to edge so it
  // will work regardless of the dimensions of the video.
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.LINEAR);

  glContext.bindTexture(glContext.TEXTURE_2D, texture);

  return texture;
}

const FisheyeGl = function FisheyeGl(opts) {
  const options = opts || {};

  const model = {
    vertex: [
      -1.0, -1.0, 0.0,
      1.0, -1.0, 0.0,
      1.0, 1.0, 0.0,
      -1.0, 1.0, 0.0,
    ],
    indices: [
      0, 1, 2,
      0, 2, 3,
      2, 1, 0,
      3, 2, 0,
    ],
    textureCoords: [
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
    ],
  };

  const dist = options.dist || {
    scale: 0,
    zoom: 1,
    zoomAnchor: { x: 0.5, y: 0.5 },
    shift: { x: 0.0, y: 0.0 },
    k3: 0,
    k5: 0,
    k7: 0,
  };

  const { glContext } = options;

  const program = compileShader(glContext, shaders.vertex, shaders.fragment4);
  glContext.useProgram(program);

  const aVertexPosition = glContext.getAttribLocation(program, 'aVertexPosition');
  const aTextureCoord = glContext.getAttribLocation(program, 'aTextureCoord');
  const uSampler = glContext.getUniformLocation(program, 'uSampler');
  const uScale = glContext.getUniformLocation(program, 'uScale');
  const uZoom = glContext.getUniformLocation(program, 'uZoom');
  const uZoomAnchor = glContext.getUniformLocation(program, 'uZoomAnchor');
  const uShift = glContext.getUniformLocation(program, 'uShift');
  const uSize = glContext.getUniformLocation(program, 'uSize');
  const uDistortion = glContext.getUniformLocation(program, 'uDistortion');

  let vertexBuffer;
  let indexBuffer;
  let textureBuffer;

  function createBuffers() {
    vertexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(model.vertex), glContext.STATIC_DRAW);
    glContext.bindBuffer(glContext.ARRAY_BUFFER, null);

    indexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
    glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), glContext.STATIC_DRAW);
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, null);

    textureBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, textureBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(model.textureCoords), glContext.STATIC_DRAW);
    glContext.bindBuffer(glContext.ARRAY_BUFFER, null);
  }

  createBuffers();

  const texture = createTexture(glContext);

  function applyDistortion() {
    glContext.clearColor(0.0, 0.0, 0.0, 1.0);
    glContext.enable(glContext.DEPTH_TEST);

    glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

    glContext.enableVertexAttribArray(aVertexPosition);

    glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
    glContext.vertexAttribPointer(aVertexPosition, 3, glContext.FLOAT, false, 0, 0);

    glContext.enableVertexAttribArray(aTextureCoord);

    glContext.bindBuffer(glContext.ARRAY_BUFFER, textureBuffer);
    glContext.vertexAttribPointer(aTextureCoord, 2, glContext.FLOAT, false, 0, 0);

    glContext.activeTexture(glContext.TEXTURE0);
    glContext.bindTexture(glContext.TEXTURE_2D, texture);
    glContext.uniform1i(uSampler, 0);

    glContext.uniform1f(uScale, dist.scale);
    glContext.uniform1f(uZoom, dist.zoom);
    glContext.uniform2fv(uZoomAnchor, [dist.zoomAnchor.x, dist.zoomAnchor.y]);
    glContext.uniform2fv(uShift, [dist.shift.x, dist.shift.y]);
    glContext.uniform2fv(uSize, [glContext.drawingBufferWidth, glContext.drawingBufferHeight]);
    glContext.uniform3fv(uDistortion, [dist.k3, dist.k5, dist.k7]);

    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
    glContext.drawElements(glContext.TRIANGLES, model.indices.length, glContext.UNSIGNED_SHORT, 0);
  }


  function updateVideoFrame(video) {
    const level = 0;
    const internalFormat = glContext.RGBA;
    const srcFormat = glContext.RGBA;
    const srcType = glContext.UNSIGNED_BYTE;
    glContext.texImage2D(glContext.TEXTURE_2D, level, internalFormat, srcFormat, srcType, video);

    applyDistortion();
  }

  const distorter = {
    options,
    dist,
    applyDistortion,
    updateVideoFrame,
  };

  return distorter;
};

if (typeof (document) !== 'undefined') {
  window.FisheyeGl = FisheyeGl;
}

module.exports = FisheyeGl;

},{"./shaders":2}],2:[function(require,module,exports){
module.exports = {
  fragment4: require('./shaders/fragment4.glfs'),
  vertex: require('./shaders/vertex.glvs')
};

},{"./shaders/fragment4.glfs":3,"./shaders/vertex.glvs":4}],3:[function(require,module,exports){
module.exports = "\
#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec2 uSize;\n\
uniform vec3 uDistortion;\n\
uniform float uScale;\n\
uniform float uZoom;\n\
uniform vec2 uZoomAnchor;\n\
uniform vec2 uShift;\n\
uniform sampler2D uSampler;\n\
varying vec3 vPosition;\n\
varying vec2 vTextureCoord;\n\
vec2 GLCoord2TextureCoord(vec2 glCoord) {\n\
	return glCoord * vec2(1.0, -1.0) + vec2(0.5, 0.5);\n\
}\n\
void main(void){\n\
	float scale = uScale;\n\
  float zoom = uZoom;\n\
  vec2 zoomAnchor = uZoomAnchor;\n\
  vec2 shift = uShift;\n\
	vec3 vPos;\n\
  vPos[0] = vPosition[0] / zoom + 2.0 * (zoomAnchor[0] - 0.5);\n\
  vPos[1] = vPosition[1] / zoom - 2.0 * (zoomAnchor[1] - 0.5);\n\
  float k3 = uDistortion[0] / 200.0;\n\
  float k5 = uDistortion[1] / 200.0;\n\
  float k7 = uDistortion[2] / 200.0;\n\
	vec2 vMapping = vPos.xy;\n\
  vMapping.x *= uSize[0] / 2.0; \n\
  vMapping.y *= uSize[1] / 2.0; \n\
  float centerX = uSize[0] * (shift.x / 200.0);\n\
  float centerY = - uSize[1] * (shift.y / 200.0);\n\
  float off_x = vMapping.x - centerX;\n\
  float off_y = vMapping.y - centerY;\n\
  float r2 = (off_x * off_x) + (off_y * off_y);\n\
  r2 *= 4.0 / (uSize[0] * uSize[0] + uSize[1] * uSize[1]);\n\
  float r4 = r2 * r2;\n\
  float r6 = r2 * r2 * r2;\n\
  float rescale = pow(2.0, - scale / 100.0);\n\
  float radius_mult = rescale * (k3 * r2 + k5 * r4 + k7 * r6 + 1.0);\n\
	vMapping.x = (centerX + radius_mult * off_x) / uSize[0];\n\
	vMapping.y = (centerY + radius_mult * off_y) / uSize[1];\n\
	vMapping = GLCoord2TextureCoord(vMapping);\n\
	vec4 texture = texture2D(uSampler, vMapping);\n\
	if(vMapping.x > 0.9999 || vMapping.x < 0.0001 || vMapping.y > 0.9999 || vMapping.y < 0.0001){\n\
		texture = vec4(0.0, 0.0, 0.0, 1.0);\n\
	}\n\
	gl_FragColor = texture;\n\
}\n\
";
},{}],4:[function(require,module,exports){
module.exports = "\
#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
attribute vec3 aVertexPosition;\n\
attribute vec2 aTextureCoord;\n\
varying vec3 vPosition;\n\
varying vec2 vTextureCoord;\n\
void main(void){\n\
	vPosition = aVertexPosition;\n\
	vTextureCoord = aTextureCoord;\n\
	gl_Position = vec4(vPosition,1.0);\n\
}\n\
";
},{}]},{},[1]);
