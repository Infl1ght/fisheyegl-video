module.exports = "\
#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec2 uSize;\n\
uniform vec3 uDistortion;\n\
uniform float uScale;\n\
uniform float uZoom;\n\
uniform vec2 uZoomAnchor;\n\
uniform sampler2D uSampler;\n\
varying vec3 vPosition;\n\
varying vec2 vTextureCoord;\n\
vec2 GLCoord2TextureCoord(vec2 glCoord) {\n\
	return glCoord * vec2(1.0, -1.0) / 2.0 + vec2(0.5, 0.5);\n\
}\n\
void main(void){\n\
	float scale = uScale;\n\
  float zoom = uZoom;\n\
  vec2 zoomAnchor = uZoomAnchor;\n\
	vec3 vPos;\n\
  vPos[0] = (vPosition[0]) / zoom + 2.0 * (zoomAnchor[0] - 0.5);\n\
  vPos[1] = (vPosition[1]) / zoom + 2.0 * (zoomAnchor[1] - 0.5);\n\
  float ratio = uSize[0] / uSize[1];\n\
  float k3 = uDistortion[0] / 100.0;\n\
  float k5 = uDistortion[1] / 100.0;\n\
  float k7 = uDistortion[2] / 100.0;\n\
	vec2 vMapping = vPos.xy;\n\
  vMapping.x *= uSize[0] / 2.0; \n\
  vMapping.y *= uSize[1] / 2.0; \n\
  float off_x = vMapping.x;\n\
  float off_y = vMapping.y;\n\
  float r2 = (off_x * off_x) + (off_y * off_y);\n\
  r2 *= 4.0 / (uSize[0] * uSize[0] + uSize[1] * uSize[1]);;\n\
  float r4 = r2 * r2;\n\
  float r6 = r2 * r2 * r2;\n\
  float rescale = pow(2.0, - scale / 100.0);\n\
  float radius_mult = rescale * (k3 * r2 + k5 * r4 + k7 * r6 + 1.0);\n\
	vMapping.x = radius_mult * off_x / uSize[0] * 2.0;\n\
	vMapping.y = radius_mult * off_y / uSize[1] * 2.0;\n\
	vMapping = GLCoord2TextureCoord(vMapping);\n\
	vec4 texture = texture2D(uSampler, vMapping);\n\
	if(vMapping.x > 0.9999 || vMapping.x < 0.0001 || vMapping.y > 0.9999 || vMapping.y < 0.0001){\n\
		texture = vec4(0.0, 0.0, 0.0, 1.0);\n\
	}\n\
	gl_FragColor = texture;\n\
}\n\
";