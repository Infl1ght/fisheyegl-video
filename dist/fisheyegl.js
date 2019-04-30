(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const shaders = require('./shaders');

function getGLContext(canvas) {
  if (canvas == null) {
    throw new Error('there is no canvas on this page');
  }
  const names = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];
  for (let i = 0; i < names.length; i += 1) {
    let glContext;
    try {
      glContext = canvas.getContext(names[i], { preserveDrawingBuffer: true });
    } catch (e) {
      // continue regardless of error
    }
    if (glContext) return glContext;
  }
  throw new Error('WebGL is not supported!');
}

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

const FisheyeGl = function FisheyeGl(opts) {
  const options = opts || {};

  options.width = options.width || 800;
  options.height = options.height || 600;

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

  const lens = options.lens || {
    a: 1.0,
    b: 1.0,
    Fx: 0.0,
    Fy: 0.0,
    scale: 1.5,
  };
  const fov = options.fov || {
    x: 1.0,
    y: 1.0,
  };

  const gl = getGLContext(options.canvas);

  const program = compileShader(gl, shaders.vertex, shaders.fragment3);
  gl.useProgram(program);

  const aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
  const aTextureCoord = gl.getAttribLocation(program, 'aTextureCoord');
  const uSampler = gl.getUniformLocation(program, 'uSampler');
  const uLensS = gl.getUniformLocation(program, 'uLensS');
  const uLensF = gl.getUniformLocation(program, 'uLensF');
  const uFov = gl.getUniformLocation(program, 'uFov');

  let vertexBuffer;
  let indexBuffer;
  let textureBuffer;
  let texture;

  function createBuffers() {
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertex), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.textureCoords), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  createBuffers();

  function run(animate, callback) {
    const f = window.requestAnimationFrame || window.mozRequestAnimationFrame
      || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

    // ugh
    if (animate === true) {
      if (f) {
        f(on);
      } else {
        throw new Error("do not support 'requestAnimationFram'");
      }
    } else {
      f(on);
    }

    let current = null;
    function on(t) {
      if (!current) current = t;
      const dt = t - current;
      current = t;
      options.runner(dt);
      if (callback) callback();
      if (animate === true) f(on);
    }
  }

  options.runner = options.runner || function runner() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enableVertexAttribArray(aVertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(aTextureCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.vertexAttribPointer(aTextureCoord, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uSampler, 0);

    gl.uniform3fv(uLensS, [lens.a, lens.b, lens.scale]);
    gl.uniform2fv(uLensF, [lens.Fx, lens.Fy]);
    gl.uniform2fv(uFov, [fov.x, fov.y]);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);
  };

  function setVideo(video) {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Because video has to be download over the internet
    // they might take a moment until it's ready so
    // put a single pixel in the texture so we can
    // use it immediately.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
      width, height, border, srcFormat, srcType,
      pixel);

    // Turn off mips and set  wrapping to clamp to edge so it
    // will work regardless of the dimensions of the video.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, video);
  }

  if (options.video) {
    setInterval(() => {
      setVideo(options.video);
      run();
    }, 100);
  }

  const distorter = {
    options,
    gl,
    lens,
    fov,
    run,
    setVideo,
  };

  return distorter;
};

if (typeof (document) !== 'undefined') {
  window.FisheyeGl = FisheyeGl;
} else {
  module.exports = FisheyeGl;
}

},{"./shaders":2}],2:[function(require,module,exports){
module.exports = {
  fragment: require('./shaders/fragment.glfs'),
  fragment2: require('./shaders/fragment2.glfs'),
  fragment3: require('./shaders/fragment3.glfs'),
  method1: require('./shaders/method1.glfs'),
  method2: require('./shaders/method2.glfs'),
  vertex: require('./shaders/vertex.glvs')
};

},{"./shaders/fragment.glfs":3,"./shaders/fragment2.glfs":4,"./shaders/fragment3.glfs":5,"./shaders/method1.glfs":6,"./shaders/method2.glfs":7,"./shaders/vertex.glvs":8}],3:[function(require,module,exports){
module.exports = "\
#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec4 uLens;\n\
uniform vec2 uFov;\n\
uniform sampler2D uSampler;\n\
varying vec3 vPosition;\n\
varying vec2 vTextureCoord;\n\
vec2 GLCoord2TextureCoord(vec2 glCoord) {\n\
	return glCoord  * vec2(1.0, -1.0)/ 2.0 + vec2(0.5, 0.5);\n\
}\n\
void main(void){\n\
	float scale = uLens.w;\n\
	float F = uLens.z;\n\
	\n\
	float L = length(vec3(vPosition.xy/scale, F));\n\
	vec2 vMapping = vPosition.xy * F / L;\n\
	vMapping = vMapping * uLens.xy;\n\
	vMapping = GLCoord2TextureCoord(vMapping/scale);\n\
	vec4 texture = texture2D(uSampler, vMapping);\n\
	if(vMapping.x > 0.99 || vMapping.x < 0.01 || vMapping.y > 0.99 || vMapping.y < 0.01){\n\
		texture = vec4(0.0, 0.0, 0.0, 1.0);\n\
	} \n\
	gl_FragColor = texture;\n\
}\n\
";
},{}],4:[function(require,module,exports){
module.exports = "\
#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec4 uLens;\n\
uniform vec2 uFov;\n\
uniform sampler2D uSampler;\n\
varying vec3 vPosition;\n\
varying vec2 vTextureCoord;\n\
vec2 TextureCoord2GLCoord(vec2 textureCoord) {\n\
	return (textureCoord - vec2(0.5, 0.5)) * 2.0;\n\
}\n\
vec2 GLCoord2TextureCoord(vec2 glCoord) {\n\
	return glCoord / 2.0 + vec2(0.5, 0.5);\n\
}\n\
void main(void){\n\
	float correctionRadius = 0.5;\n\
	float distance = sqrt(vPosition.x * vPosition.x + vPosition.y * vPosition.y) / correctionRadius;\n\
	float theta = 1.0;\n\
	if(distance != 0.0){\n\
		theta = atan(distance);\n\
	}\n\
	vec2 vMapping = theta * vPosition.xy;\n\
	vMapping = GLCoord2TextureCoord(vMapping);\n\
		\n\
	vec4 texture = texture2D(uSampler, vMapping);\n\
	if(vMapping.x > 0.99 || vMapping.x < 0.01 || vMapping.y > 0.99 || vMapping.y < 0.01){\n\
		texture = vec4(0.0, 0.0, 0.0, 1.0);\n\
	} \n\
	gl_FragColor = texture;\n\
}\n\
";
},{}],5:[function(require,module,exports){
module.exports = "\
#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec3 uLensS;\n\
uniform vec2 uLensF;\n\
uniform vec2 uFov;\n\
uniform sampler2D uSampler;\n\
varying vec3 vPosition;\n\
varying vec2 vTextureCoord;\n\
vec2 GLCoord2TextureCoord(vec2 glCoord) {\n\
	return glCoord  * vec2(1.0, -1.0)/ 2.0 + vec2(0.5, 0.5);\n\
}\n\
void main(void){\n\
	float scale = uLensS.z;\n\
	vec3 vPos = vPosition;\n\
	float Fx = uLensF.x;\n\
	float Fy = uLensF.y;\n\
	vec2 vMapping = vPos.xy;\n\
	vMapping.x = vMapping.x + ((pow(vPos.y, 2.0)/scale)*vPos.x/scale)*-Fx;\n\
	vMapping.y = vMapping.y + ((pow(vPos.x, 2.0)/scale)*vPos.y/scale)*-Fy;\n\
	vMapping = vMapping * uLensS.xy;\n\
	vMapping = GLCoord2TextureCoord(vMapping/scale);\n\
	vec4 texture = texture2D(uSampler, vMapping);\n\
	if(vMapping.x > 0.99 || vMapping.x < 0.01 || vMapping.y > 0.99 || vMapping.y < 0.01){\n\
		texture = vec4(0.0, 0.0, 0.0, 1.0);\n\
	}\n\
	gl_FragColor = texture;\n\
}\n\
";
},{}],6:[function(require,module,exports){
module.exports = "\
#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec4 uLens;\n\
uniform vec2 uFov;\n\
uniform sampler2D uSampler;\n\
varying vec3 vPosition;\n\
varying vec2 vTextureCoord;\n\
vec2 TextureCoord2GLCoord(vec2 textureCoord) {\n\
	return (textureCoord - vec2(0.5, 0.5)) * 2.0;\n\
}\n\
vec2 GLCoord2TextureCoord(vec2 glCoord) {\n\
	return glCoord / 2.0 + vec2(0.5, 0.5);\n\
}\n\
void main(void){\n\
	vec2 vMapping = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y);\n\
	vMapping = TextureCoord2GLCoord(vMapping);\n\
	//TODO insert Code\n\
	float F = uLens.x/ uLens.w;\n\
	float seta = length(vMapping) / F;\n\
	vMapping = sin(seta) * F / length(vMapping) * vMapping;\n\
	vMapping *= uLens.w * 1.414;\n\
	vMapping = GLCoord2TextureCoord(vMapping);\n\
	vec4 texture = texture2D(uSampler, vMapping);\n\
	if(vMapping.x > 0.99 || vMapping.x < 0.01 || vMapping.y > 0.99 || vMapping.y < 0.01){\n\
		texture = vec4(0.0, 0.0, 0.0, 1.0);\n\
	} \n\
	gl_FragColor = texture;\n\
}\n\
";
},{}],7:[function(require,module,exports){
module.exports = "\
#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec4 uLens;\n\
uniform vec2 uFov;\n\
uniform sampler2D uSampler;\n\
varying vec3 vPosition;\n\
varying vec2 vTextureCoord;\n\
vec2 TextureCoord2GLCoord(vec2 textureCoord) {\n\
	return (textureCoord - vec2(0.5, 0.5)) * 2.0;\n\
}\n\
vec2 GLCoord2TextureCoord(vec2 glCoord) {\n\
	return glCoord / 2.0 + vec2(0.5, 0.5);\n\
}\n\
void main(void){\n\
	vec2 vMapping = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y);\n\
	vMapping = TextureCoord2GLCoord(vMapping);\n\
	//TOD insert Code\n\
	float F = uLens.x/ uLens.w;\n\
	float seta = length(vMapping) / F;\n\
	vMapping = sin(seta) * F / length(vMapping) * vMapping;\n\
	vMapping *= uLens.w * 1.414;\n\
	vMapping = GLCoord2TextureCoord(vMapping);\n\
	vec4 texture = texture2D(uSampler, vMapping);\n\
	if(vMapping.x > 0.99 || vMapping.x < 0.01 || vMapping.y > 0.99 || vMapping.y < 0.01){\n\
		texture = vec4(0.0, 0.0, 0.0, 1.0);\n\
	} \n\
	gl_FragColor = texture;\n\
}\n\
";
},{}],8:[function(require,module,exports){
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
