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

  const { glContext } = options;

  const program = compileShader(glContext, shaders.vertex, shaders.fragment3);
  glContext.useProgram(program);

  const aVertexPosition = glContext.getAttribLocation(program, 'aVertexPosition');
  const aTextureCoord = glContext.getAttribLocation(program, 'aTextureCoord');
  const uSampler = glContext.getUniformLocation(program, 'uSampler');
  const uLensS = glContext.getUniformLocation(program, 'uLensS');
  const uLensF = glContext.getUniformLocation(program, 'uLensF');
  const uFov = glContext.getUniformLocation(program, 'uFov');

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

    glContext.uniform3fv(uLensS, [lens.a, lens.b, lens.scale]);
    glContext.uniform2fv(uLensF, [lens.Fx, lens.Fy]);
    glContext.uniform2fv(uFov, [fov.x, fov.y]);

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
    lens,
    fov,
    applyDistortion,
    updateVideoFrame,
  };

  return distorter;
};

if (typeof (document) !== 'undefined') {
  window.FisheyeGl = FisheyeGl;
} else {
  module.exports = FisheyeGl;
}
