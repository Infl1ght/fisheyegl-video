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

  const model = options.model || {
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
  const image = options.image || 'images/barrel-distortion.png';

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

  function loadImage(gl, img, callback, texture) {
    texture = texture || gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); // gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // Prevents s-coordinate wrapping (repeating).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); // Prevents t-coordinate wrapping (repeating).
    // gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);

    if (callback) callback(null, texture);
    return texture;
  }

  function loadImageFromUrl(gl, url, callback) {
    const texture = gl.createTexture();
    const img = new Image();
    img.addEventListener('load', () => {
      loadImage(gl, img, callback, texture);
      options.width = img.width;
      options.height = img.height;
      resize(
        options.width,
        options.height,
      );
    });
    img.src = url;
    return texture;
  }

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

  function resize(w, h) {
    gl.viewport(0, 0, w, h);
    gl.canvas.width = w;
    gl.canvas.height = h;
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

  function setImage(imageUrl, callback) {
    texture = loadImageFromUrl(gl, imageUrl, () => {
      run(options.animate, callback);
    });
  }

  setImage(image);

  // asynchronous!
  function getImage(format) {
    const img = new Image();

    img.src = gl.canvas.toDataURL(format || 'image/jpeg');

    return img;
  }

  function getSrc(format) {
    return gl.canvas.toDataURL(format || 'image/jpeg');
  }

  // external API:
  const distorter = {
    options,
    gl,
    lens,
    fov,
    run,
    getImage,
    setImage,
    getSrc,
  };

  return distorter;
};

if (typeof (document) !== 'undefined') {window.FisheyeGl = FisheyeGl;}
else {module.exports = FisheyeGl;}
