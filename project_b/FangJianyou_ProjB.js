// Vertex shader program:
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec3 a_Color;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'attribute vec3 a_Normal;\n' +
  'void main() {\n' +
  '  vec4 transVec = u_NormalMatrix * vec4(a_Normal, 0.0);\n' +
  '  vec3 normVec = normalize(transVec.xyz);\n' +
  '  vec3 lightVec = vec3(-1.0, 0.0, -1.0);\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  // '  v_Color = a_Color;\n' +
  '  v_Color = vec4(0.8*a_Color + 0.2*dot(normVec,lightVec), 1.0);\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

//Global vars (so we can call draw() without arguments)
// var canvas;
var mvpMatrix = new Matrix4();
var normalMatrix = new Matrix4();
var n, u_MvpMatrix, u_NormalMatrix;
var floatsPerVertex = 10;

var nuCanvas;
var gl;

var prevTime = Date.now();
var currentTime = Date.now();
var elapsedTime = 0;

function main() {
  nuCanvas = document.getElementById('webgl');

  gl = getWebGLContext(nuCanvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  var uints_for_indices = gl.getExtension("OES_element_index_uint");

  n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  gl.clearColor(0.05, 0.2, 0.05, 0.5);
  gl.enable(gl.DEPTH_TEST);

  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) {
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
	if(!u_NormalMatrix) {
		console.log('Failed to get GPU storage location for u_NormalMatrix');
		return
	}

  initFrustum(gl);

	// NEW! -- make new canvas to fit the browser-window size;
  drawResize();   // On this first call, Chrome browser seems to use the
  								// initial fixed canvas size we set in the HTML file;
  								// But by default Chrome opens its browser at the same
  								// size & location where you last closed it, so
  drawResize();   // Call drawResize() a SECOND time to re-size canvas to
  								// match the current browser size.

  initFrustum(gl);
  // Don't Worry!
  // The program only does this 'double-call' when the program begins.
  // All subsequent screen re-drawing is done when user re-sizes the browser,
  // which is  done by this line in the HTML file:
  //         <body onload="main()" onresize="drawResize()">

  // CHALLENGE:  Suppose we draw something ANIMATED (e.g. Week3, BasicShapes);
  //						How can you do this double-call when the program starts, but
  //						call drawResize() only once for all subsequent re-drawing?


  window.addEventListener("keydown", keyDownHandler, false);
  window.addEventListener("keyup", keyUpHandler, false);

  var tick = function() {
    var time = Date.now();
    prevTime = currentTime;
    currentTime = time;
    elapsedTime = (currentTime - prevTime) * 0.001;

    draw(gl);
    // document.getElementById('frame').innerHTML = "Running at " + Math.round(1 / elapsedTime) + " FPS";
    requestAnimationFrame(tick, nuCanvas);
  };
  tick();
}

function initVertexBuffers(gl) {

  cubes = [];
  cubes.push(makeCube({r:0.8, g:0.8, b:0.0}));
  cubes.push(makeCube({r:0.1, g:0.4, b:0.1}));
  cubes.push(makeCube({r:0.5, g:0.4, b:0.1}));
  cubes.push(makeCube({r:1.0, g:1.0, b:1.0}));

  var cubeVertSize = 0;
  var cubeIndicesSize = 0;
  for(i=0;i<cubes.length;i++){
    cubeVertSize += cubes[i].verts.length;
    cubeIndicesSize += cubes[i].indices.length;
  }

  makeGroundGrid();
  makeCoord();


  var vertSize = cubeVertSize + gndVerts.length + coordVerts.length;
  var indicesSize = cubeIndicesSize + gndIndices.length + coordIndices.length;
  var verticesColors = new Float32Array(vertSize);
  var indices = new Uint16Array(indicesSize);

  i = 0;
  cubeVertStart = [];
  for(k = 0; k < cubes.length; k++){
    cubeVertStart.push(i);
    for (j = 0; j < cubes[k].verts.length; i++, j++) {
        verticesColors[i] = cubes[k].verts[j];
    }
  }
  gndVertStart = i;
  for (j = 0; j < gndVerts.length; i++, j++) {
      verticesColors[i] = gndVerts[j];
  }
  coordVertStart = i;
  for (j = 0; j < coordVerts.length; i++, j++) {
      verticesColors[i] = coordVerts[j];
  }

  i = 0;
  cubeIndicesStart = [];
  for(k = 0; k < cubes.length; k++){
    cubeIndicesStart.push(i);
    for (j = 0; j < cubes[k].indices.length; i++, j++) {
        indices[i] = cubes[k].indices[j] + cubeVertStart[k]/floatsPerVertex;
    }
  }
  gndIndicesStart = i;
  for (j = 0; j < gndIndices.length; i++, j++) {
      indices[i] = gndIndices[j] + gndVertStart / floatsPerVertex;
  }
  coordIndicesStart = i;
  for (j = 0; j < coordIndices.length; i++, j++) {
      indices[i] = coordIndices[j] + coordVertStart / floatsPerVertex;
  }

  var vertexColorBuffer = gl.createBuffer();
  var indexBuffer = gl.createBuffer();
  if (!vertexColorBuffer || !indexBuffer) {
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, FSIZE * 10, 0);
  gl.enableVertexAttribArray(a_Position);
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 10, FSIZE * 4);
  gl.enableVertexAttribArray(a_Color);

  // Get graphics system's handle for our Vertex Shader's normal-vec-input variable;
  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Normal, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using x,y,z)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 10, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
  	FSIZE * 7);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w,r,g,b

  gl.enableVertexAttribArray(a_Normal);
  									// Enable assignment of vertex buffer object's position data

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

var isAnimPaused = false;
var pauseCorrection = 1;
function calcAnim(){
  if(isAnimPaused){
    pauseCorrection = 0;
  }else{
    pauseCorrection = 1;
  }
  calcTrainAngle();
  calcBarrierAngle();
}

var trainAnimTime = 8;
var trainCurrentTime = 0;
var trainAngle = 0;
var trainCamPos = [0, 0, 0.3];
var trainCamAtVec = [0, 0, 0];
var trainLookPos = [0, 0, 0];
function calcTrainAngle(){
  trainCurrentTime += elapsedTime * pauseCorrection;
  trainCurrentTime = trainCurrentTime >= trainAnimTime ? trainCurrentTime - 8 : trainCurrentTime;
  trainAngle = trainCurrentTime / trainAnimTime * 360;

  var rad = trainAngle * Math.PI / 180;
  trainCamPos[0] = Math.sin(rad) * 2.5 + 0.6 * Math.cos(rad);
  trainCamPos[1] = - (Math.cos(rad) * 2.5 - 0.2 * Math.sin(rad));
  // console.log(camPos);
  trainCamAtVec[0] = Math.cos(rad) * 2.5;
  trainCamAtVec[1] = Math.sin(rad) * 2.5;
  trainLookPos[0] = trainCamPos[0] + trainCamAtVec[0];
  trainLookPos[1] = trainCamPos[1] + trainCamAtVec[1];
}

var barrierAnimTime = 8;
var barrierCurrentTime = 0;
var barrierAngles = [0, 0];

var barrierCamPos = [0, 3.5, 0];
var barrierCamAtVec = [0, -1, 0];
var barrierLookPos = [0, 3.5, 0];
function calcBarrierAngle(){
  barrierCurrentTime += elapsedTime * pauseCorrection;
  barrierCurrentTime = barrierCurrentTime >= barrierAnimTime ? barrierCurrentTime - 8 : barrierCurrentTime;
  var temp = Math.abs(barrierCurrentTime - 4);
  if(temp >= 2 && temp <= 3){
    barrierAngles[0] = 3 - temp;
  }else if(temp >= 3 && temp <= 4){
    barrierAngles[0] = 0;
  }else{
    barrierAngles[0] = 1;
  }
  if(temp <= 2 && temp >= 1){
    barrierAngles[1] = temp - 1;
  }else if(temp <= 1){
    barrierAngles[1] = 0;
  }else{
    barrierAngles[1] = 1;
  }

  barrierCamPos[0] =  -1.0 + Math.cos(barrierAngles[1] / 4 * Math.PI) * 0.25 +
                        Math.cos(barrierAngles[1] / 8 * Math.PI) * 0.5;
  barrierCamPos[2] =  0.7 + Math.sin(barrierAngles[1] / 4 * Math.PI) * 0.25 +
                        Math.sin(barrierAngles[1] / 8 * Math.PI) * 0.5;
  if(currentCameraIndex == 2){
    barrierCamAtVec = [0, -1, 0];
  }else if(currentCameraIndex == 3){
    barrierCamAtVec = [1, 0, 0];
  }
  barrierLookPos[0] = barrierCamPos[0] + barrierCamAtVec[0];
  barrierLookPos[1] = barrierCamPos[1] + barrierCamAtVec[1];
  barrierLookPos[2] = barrierCamPos[2] + barrierCamAtVec[2];
}

function draw(gl) {
  // Calculate angle & speed first
  calculateQuaternions();
  calcAnim();


  // Clear color and depth buffer for ENTIRE canvas:
  // (careful! clears contents of ALL viewports!)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	//----------------------Create, fill LEFT viewport------------------------
	gl.viewport(0, 0, gl.drawingBufferWidth / 2, gl.drawingBufferHeight);

	vpAspect = (gl.drawingBufferWidth / 2) / gl.drawingBufferHeight;

  mvpMatrix.setPerspective(yfov, vpAspect, pnear, pfar);
  switch(currentCameraIndex){
    case 0:
      mvpMatrix.lookAt(	cameraPos.elements[0], cameraPos.elements[1], cameraPos.elements[2],
      									cameraLookPos.elements[0], cameraLookPos.elements[1], cameraLookPos.elements[2],
      									cHead.elements[0], cHead.elements[1], cHead.elements[2]);
      break;
    case 1:
      mvpMatrix.lookAt(	trainCamPos[0], trainCamPos[1], trainCamPos[2],
                        trainLookPos[0], trainLookPos[1], trainLookPos[2],
                        0, 0, 1);
      break;
    case 2:
    case 3:
      mvpMatrix.lookAt(	barrierCamPos[0], barrierCamPos[1], barrierCamPos[2],
                        barrierLookPos[0], barrierLookPos[1], barrierLookPos[2],
                        0, 0, 1);
      break;
  }
  // mvpMatrix.concat(quatMatrix);
  drawScene(gl, mvpMatrix);

	//----------------------Create, fill RIGHT viewport------------------------
	gl.viewport(gl.draz

	//----------------------Create, fill RIGHT viewport------------------------
	// gl.viewport(gl.drawingBufferWidth * 2 / 3, 0, gl.drawingBufferWidth * 1 / 3, gl.drawingBufferHeight / 2);
  //
	// vpAspect = (gl.drawingBufferWidth * 1 / 3) / (gl.drawingBufferHeight / 2);
  //
  // mvpMatrix.setPerspective(35, vpAspect, 1, 100);
  // train head
  // mvpMatrix.lookAt(	trainCamPos[0], trainCamPos[1], trainCamPos[2],
  // 									trainLookPos[0], trainLookPos[1], trainLookPos[2],
  // 									0, 0, 1);
  // mvpMatrix.lookAt(	barrierCamPos[0], barrierCamPos[1], barrierCamPos[2],
  // 									barrierLookPos[0], barrierLookPos[1], barrierLookPos[2],
  // 									0, 0, 1);
  //
  // drawScene(gl, mvpMatrix);
}

function drawScene(gl, mvpMatrix){
  pushMatrix(mvpMatrix);

  drawTrain(mvpMatrix, 0, -2.5, 0);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  drawTrain(mvpMatrix, 0, -2.5, 30);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  drawTrain(mvpMatrix, 0, -2.5, 60);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(-1, 3.5, 0);
  mvpMatrix.scale(-0.7, 0.7, 0.7);
  drawBarrier(mvpMatrix, 1);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(1, -3.5, 0);
  mvpMatrix.scale(0.7, 0.7, 0.7);
  drawBarrier(mvpMatrix, 0);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(-3.0, -1.5, 0);
  // mvpMatrix.scale(0.7, 0.7, 0.7);
  drawTree(mvpMatrix);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(-2, -5, 0);
  mvpMatrix.scale(0.7, 0.7, 1.5);
  drawTree(mvpMatrix);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(3.5, -2, 0);
  mvpMatrix.scale(1.0, 1.0, 1.2);
  drawTree(mvpMatrix);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  // mvpMatrix.translate(0.0, -2, 0);
  mvpMatrix.scale(0.5, 0.5, 1.0);
  drawTree(mvpMatrix);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(1.0, 4.5, 0.0);
  // mvpMatrix.scale(0.5, 0.5, 1.0);
  drawTree(mvpMatrix);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  mvpMatrix.translate(2.0, 3.5, 0.0);
  // mvpMatrix.scale(0.5, 0.5, 1.0);
  drawTree(mvpMatrix);

  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);

  drawGround(mvpMatrix);

  mvpMatrix = popMatrix();

  mvpMatrix.scale(3.0, 3.0, 3.0);
  drawCoord(mvpMatrix);
}

function drawCoord(mvpMatrix){
  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.LINES, coordIndices.length, gl.UNSIGNED_SHORT, coordIndicesStart * 2);
}

function drawTree(mvpMatrix){
  mvpMatrix.translate(0.0, 0.0, 0.1);
  mvpMatrix.scale(0.1, 0.1, 0.1);      // 1 unit : (10, 10, 10)

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[2].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[2] * 2);

  mvpMatrix.scale(10, 10, 10);
  mvpMatrix.translate(0.0, 0.0, 0.225);
  mvpMatrix.scale(0.4, 0.4, 0.125);  // 1 unit : (2.5, 2.5, 8)

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[1].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[1] * 2);

  mvpMatrix.scale(2.5, 2.5, 8);
  mvpMatrix.translate(0.0, 0.0, 0.25);
  mvpMatrix.scale(0.3, 0.3, 0.125);  // 1 unit : (1/0.3, 1/0.3, 8)

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[1].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[1] * 2);

  mvpMatrix.scale(1/0.3, 1/0.3, 8);
  mvpMatrix.translate(0.0, 0.0, 0.25);
  mvpMatrix.scale(0.2, 0.2, 0.125);  // 1 unit : (5, 5, 8)

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[1].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[1] * 2);
}

function drawTrain(mvpMatrix, x, y, angleOffset){
  mvpMatrix.rotate(trainAngle - angleOffset, 0, 0, 1);
  gl.drawElements(gl.POINTS, 0, gl.UNSIGNED_SHORT, 0);

  mvpMatrix.translate(x, y, 0.2);
  mvpMatrix.scale(0.6, 0.2, 0.2);

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  console.log(normalMatrix.elements);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[1].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[1] * 2);

  pushMatrix(mvpMatrix);

  mvpMatrix.scale(1 / 0.6, 1 / 0.2, 1 / 0.2);
  mvpMatrix.translate(0.42, 0.12, -0.04);
  mvpMatrix.scale(0.1, 0.1, 0.16);

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[3].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[3] * 2);

  mvpMatrix.scale(1 / 0.1, 1 / 0.1, 1 / 0.16);
  mvpMatrix.translate(-0.28, 0.0, 0.06);
  mvpMatrix.scale(0.1, 0.1, 0.1);

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[3].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[3] * 2);

  mvpMatrix.scale(1 / 0.1, 1 / 0.1, 1 / 0.1);
  mvpMatrix.translate(-0.28, 0.0, 0.0);
  mvpMatrix.scale(0.1, 0.1, 0.1);

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[3].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[3] * 2);

  mvpMatrix.scale(1 / 0.1, 1 / 0.1, 1 / 0.1);
  mvpMatrix.translate(-0.28, 0.0, -0.06);
  mvpMatrix.scale(0.1, 0.1, 0.16);

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[3].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[3] * 2);

  mvpMatrix = popMatrix();

  mvpMatrix.scale(1 / 0.6, 1 / 0.2, 1 / 0.2);
  mvpMatrix.translate(0.42, -0.12, -0.04);
  mvpMatrix.scale(0.1, 0.1, 0.16);

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[3].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[3] * 2);

  mvpMatrix.scale(1 / 0.1, 1 / 0.1, 1 / 0.16);
  mvpMatrix.translate(-0.28, 0.0, 0.06);
  mvpMatrix.scale(0.1, 0.1, 0.1);

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[3].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[3] * 2);

  mvpMatrix.scale(1 / 0.1, 1 / 0.1, 1 / 0.1);
  mvpMatrix.translate(-0.28, 0.0, 0.0);
  mvpMatrix.scale(0.1, 0.1, 0.1);

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[3].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[3] * 2);

  mvpMatrix.scale(1 / 0.1, 1 / 0.1, 1 / 0.1);
  mvpMatrix.translate(-0.28, 0.0, -0.06);
  mvpMatrix.scale(0.1, 0.1, 0.16);

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[3].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[3] * 2);
}

function drawBarrier(mvpMatrix, index){
  mvpMatrix.translate(0.0, 0.0, 0.4);
  mvpMatrix.scale(0.1, 0.1, 0.4);      // 1 unit : (10, 10, 2.5)

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[0].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[0] * 2);

  mvpMatrix.scale(10, 10, 2.5);
  mvpMatrix.translate(0.0, 0.0, 0.3);
  mvpMatrix.rotate(90 * barrierAngles[index], 0, 1, 0);
  mvpMatrix.translate(-0.25, 0, 0);
  mvpMatrix.scale(0.25, 0.02, 0.02);  // 1 unit : (4, 50, 50)

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[0].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[0] * 2);

  mvpMatrix.scale(4, 50, 50);
  mvpMatrix.translate(-0.25, 0.0, 0.0);
  mvpMatrix.rotate(-45 * barrierAngles[index], 0, 1, 0);
  mvpMatrix.translate(-0.25, 0, 0);
  mvpMatrix.scale(0.25, 0.02, 0.02);  // 1 unit : (4, 50, 50)

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[0].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[0] * 2);

  mvpMatrix.scale(4, 50, 50);
  mvpMatrix.translate(-0.25, 0.0, 0.0);
  mvpMatrix.rotate(-45 * barrierAngles[index], 0, 1, 0);
  mvpMatrix.translate(-0.25, 0, 0);
  mvpMatrix.scale(0.25, 0.02, 0.02);  // 1 unit : (4, 50, 50)

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.TRIANGLES, cubes[0].indices.length, gl.UNSIGNED_SHORT, cubeIndicesStart[0] * 2);

  mvpMatrix.scale(4, 50, 50);
  // mvpMatrix.translate(-0.25, 0.0, 0.0);
  // mvpMatrix.rotate(-45 * barrierAngles[index], 0, 1, 0);
  // mvpMatrix.translate(-0.25, 0, 0);
  mvpMatrix.scale(0.5, 0.5, 0.5);  // 1 unit : (4, 50, 50)

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.LINES, coordIndices.length, gl.UNSIGNED_SHORT, coordIndicesStart * 2);
}

function drawGround(mvpMatrix){
  mvpMatrix.scale(0.1, 0.1, 0.1);

  normalMatrix.setInverseOf(mvpMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawElements(gl.LINES, gndIndices.length, gl.UNSIGNED_SHORT, gndIndicesStart * 2);
}

///////////

function makeCoord(){
  coordVerts = new Float32Array([
    0.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 1.0, 0.0,
    0.0, 1.0, 1.0,
    0.0, 0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 1.0,
    1.0, 0.0, 0.0,
  ]);
  coordIndices = new Uint16Array([
    0, 1,
    2, 3,
    4, 5
  ]);
}

function makeCube(color){
    //==============================================================================
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3
    var sq3 = Math.sqrt(3);

    var cubeVerts = new Float32Array([
      // Vertex coordinates and color
       1.0,  1.0,  1.0,  1.0,
       color.r, color.g, color.b,  // v0 White
       sq3,  sq3,  sq3,
      -1.0,  1.0,  1.0,  1.0,
       color.r, color.g, color.b,  // v1 Magenta
      -sq3,  sq3,  sq3,
      -1.0, -1.0,  1.0,  1.0,
       color.r, color.g, color.b,  // v2 Red
      -sq3, -sq3,  sq3,
       1.0, -1.0,  1.0,  1.0,
       color.r, color.g, color.b,  // v3 Yellow
       sq3, -sq3,  sq3,
       1.0, -1.0, -1.0,  1.0,
       color.r, color.g, color.b,  // v4 Green
       sq3, -sq3, -sq3,
       1.0,  1.0, -1.0,  1.0,
       color.r, color.g, color.b,  // v5 Cyan
       sq3,  sq3, -sq3,
      -1.0,  1.0, -1.0,  1.0,
       color.r, color.g, color.b,  // v6 Blue
      -sq3,  sq3, -sq3,
      -1.0, -1.0, -1.0,  1.0,
       color.r, color.g, color.b,  // v7 Black
      -sq3, -sq3, -sq3,
    ]);

    // Indices of the vertices
    var cubeIndices = new Uint16Array([
      0, 1, 2,   0, 2, 3,    // front
      0, 3, 4,   0, 4, 5,    // right
      0, 5, 6,   0, 6, 1,    // up
      1, 6, 7,   1, 7, 2,    // left
      7, 4, 3,   7, 3, 2,    // down
      4, 7, 6,   4, 6, 5     // back
    ]);

    return {verts: cubeVerts, indices: cubeIndices};
}

function makeGroundGrid() {

    var xcount = 500;
    var ycount = 500;
    var xymax = 1500.0;
    var xColr = new Float32Array([0.9, 0.9, 0.9]);
    var yColr = new Float32Array([0.9, 0.9, 0.9]);
    gndVerts = new Float32Array(floatsPerVertex * 2 * (xcount + ycount));

    var xgap = xymax / (xcount - 1);
    var ygap = xymax / (ycount - 1);

    var counter = 0;
    gndIndices = new Uint16Array(xcount * 2 + ycount * 2);

    for (v = 0, j = 0; v < 2 * xcount; v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            gndVerts[j] = -xymax + (v) * xgap;
            gndVerts[j + 1] = -xymax;
            gndVerts[j + 2] = 0.0;
            gndVerts[j + 3] = 1.0;
        } else {
            gndVerts[j] = -xymax + (v - 1) * xgap;
            gndVerts[j + 1] = xymax;
            gndVerts[j + 2] = 0.0;
            gndVerts[j + 3] = 1.0;
        }
        gndVerts[j + 4] = xColr[0];
        gndVerts[j + 5] = xColr[1];
        gndVerts[j + 6] = xColr[2];

        gndVerts[j + 7] = 0.0;
        gndVerts[j + 8] = 0.0;
        gndVerts[j + 9] = 1.0;

        gndIndices[counter] = counter;
        counter = counter + 1;
    }
    for (v = 0; v < 2 * ycount; v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            gndVerts[j] = -xymax;
            gndVerts[j + 1] = -xymax + (v) * ygap;
            gndVerts[j + 2] = 0.0;
            gndVerts[j + 3] = 1.0;
        } else {
            gndVerts[j] = xymax;
            gndVerts[j + 1] = -xymax + (v - 1) * ygap;
            gndVerts[j + 2] = 0.0;
            gndVerts[j + 3] = 1.0;
        }
        gndVerts[j + 4] = yColr[0];
        gndVerts[j + 5] = yColr[1];
        gndVerts[j + 6] = yColr[2];

        gndVerts[j + 7] = 0.0;
        gndVerts[j + 8] = 0.0;
        gndVerts[j + 9] = 1.0;

        gndIndices[counter] = counter;
        counter = counter + 1;
    }
}

/////

var directionControl = [0, 0];
var cameraControl = [0, 0, 0];
var qNew = new Quaternion(0, 0, 0, 1);
var qTot = new Quaternion(0, 0, 0, 1);
var quatMatrix = new Matrix4();

var xDeg = 0;
var zDeg = 0;

var cameraLookVec = new Vector3([0, -8, -3]).normalize();
var cameraRightVec = new Vector3([-1, 0, 0]);
var cameraHeadVec = cross(cameraRightVec, cameraLookVec).normalize();
var cameraPos = new Vector3([0, 8, 3]);
var cameraLookPos = getLookAtPos(cameraPos, cameraLookVec);

var cLook = new Vector3([0, -8, -3]).normalize();
var cRight = new Vector3([-1, 0, 0]);
var cHead = cross(cameraRightVec, cameraLookVec).normalize();

var rotateSpeed = 10; // degree per sec
var moveSpeed = 2; // unit per sec

function calculateQuaternions(){
  var qTemp;

  if(directionControl[1] != 0){
    qTemp = new Quaternion(0, 0, 0, 1);
    qNew.setFromAxisAngle(-1.0, 0.0, 0.0, rotateSpeed * elapsedTime * directionControl[1]);

    qTemp.multiply(qNew, qTot);
    qTot.copy(qTemp);

    // TODO why this not working as considered?
    xDeg -= rotateSpeed * elapsedTime * directionControl[1];
    xDeg = xDeg < 0 ? xDeg + 360 : xDeg;
    cLook.elements[0] = cameraLookVec[0];
    cLook.elements[1] = cameraLookVec[1];
    cLook.elements[2] = cameraLookVec[2];
  }

  if(directionControl[0] != 0){
    qTemp = new Quaternion(0, 0, 0, 1);
    qNew.setFromAxisAngle(0.0, 0.0, -1.0, rotateSpeed * elapsedTime * directionControl[0]);

    qTemp.multiply(qNew, qTot);
    qTot.copy(qTemp);

    zDeg -= rotateSpeed * elapsedTime * directionControl[0];
    zDeg = zDeg < 0 ? zDeg + 360 : zDeg;
  }

  multiplyVec3(qTot, cameraLookVec, cLook);
  multiplyVec3(qTot, cameraHeadVec, cHead);
  multiplyVec3(qTot, cameraRightVec, cRight);

  // qTot.printMe();
  // console.log(cameraLookVec);

  if(cameraControl[1] != 0){
    cameraPos.elements[0] += cLook.elements[0] * moveSpeed * elapsedTime * cameraControl[1];
    cameraPos.elements[1] += cLook.elements[1] * moveSpeed * elapsedTime * cameraControl[1];
    cameraPos.elements[2] += cLook.elements[2] * moveSpeed * elapsedTime * cameraControl[1];
  }

  if(cameraControl[0] != 0){
    cameraPos.elements[0] += cRight.elements[0] * moveSpeed * elapsedTime * cameraControl[0];
    cameraPos.elements[1] += cRight.elements[1] * moveSpeed * elapsedTime * cameraControl[0];
    cameraPos.elements[2] += cRight.elements[2] * moveSpeed * elapsedTime * cameraControl[0];
  }

  if(cameraControl[2] != 0){
    cameraPos.elements[0] += cHead.elements[0] * moveSpeed * elapsedTime * cameraControl[2];
    cameraPos.elements[1] += cHead.elements[1] * moveSpeed * elapsedTime * cameraControl[2];
    cameraPos.elements[2] += cHead.elements[2] * moveSpeed * elapsedTime * cameraControl[2];
  }

  cameraLookPos = getLookAtPos(cameraPos, cLook);
}

function keyDownHandler(e){
  switch(e.keyCode){
    case 87:           // w
      directionControl[1] = directionControl[1] == 0? 1 : directionControl[1];
      break;
    case 83:           // s
      directionControl[1] = directionControl[1] == 0? -1 : directionControl[1];
      break;
    case 65:           // a
      directionControl[0] = directionControl[0] == 0? -1 : directionControl[0];
      break;
    case 68:           // d
      directionControl[0] = directionControl[0] == 0? 1 : directionControl[0];
      break;
    case 89:           // y
      cameraControl[1] = cameraControl[1] == 0? 1 : cameraControl[1];
      break;
    case 72:           // h
      cameraControl[1] = cameraControl[1] == 0? -1 : cameraControl[1];
      break;
    case 37:           // ←
    case 74:           // j
      cameraControl[0] = cameraControl[0] == 0? -1 : cameraControl[0];
      break;
    case 39:           // →
    case 76:           // l
      cameraControl[0] = cameraControl[0] == 0? 1 : cameraControl[0];
      break;
    case 40:           // ↓
    case 75:           // k
      cameraControl[2] = cameraControl[2] == 0? -1 : cameraControl[2];
      break;
    case 38:           // ↑
    case 73:           // i
      cameraControl[2] = cameraControl[2] == 0? 1 : cameraControl[2];
      break;
  }
}

function keyUpHandler(e){
  // console.log(cameraPos);
  switch(e.keyCode){
    case 87:           // w
      directionControl[1] = 0;
      break;
    case 83:           // s
      directionControl[1] = 0;
      break;
    case 65:           // a
      directionControl[0] = 0;
      break;
    case 68:           // d
      directionControl[0] = 0;
      break;
    case 72:           // h
      cameraControl[1] = 0;
      break;
    case 89:           // y
      cameraControl[1] = 0;
      break;
    case 37:           // ←
    case 74:           // j
      cameraControl[0] = 0;
      break;
    case 39:           // →
    case 76:           // l
      cameraControl[0] = 0;
      break;
    case 38:           // ↑
    case 73:           // i
      cameraControl[2] = 0;
      break;
    case 40:           // ↓
    case 75:           // k
      cameraControl[2] = 0;
      break;
  }
}

/////


// var g_last = Date.now();
//
// function animate(angle) {
//     var now = Date.now();
//     var elapsed = now - g_last;
//     g_last = now;
//
//     var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
//     return newAngle %= 360;
// }

function drawResize() {
  gl = getWebGLContext(nuCanvas);
	nuCanvas.width = innerWidth;
	nuCanvas.height = innerHeight*3/4;
 //  console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);
 // console.log('Browser window: innerWidth,innerHeight=',
	// 															innerWidth, innerHeight);
	draw(gl);
}

function dot(v1, v2){
  return v1.elements[0] * v2.elements[0] + v1.elements[1] * v2.elements[1] +
          v1.elements[2] * v2.elements[2];
}

function cross(v1, v2){
  return new Vector3(
    [
      v1.elements[1] * v2.elements[2] - v1.elements[2] * v2.elements[1],
      v1.elements[2] * v2.elements[0] - v1.elements[0] * v2.elements[2],
      v1.elements[0] * v2.elements[1] - v1.elements[1] * v1.elements[0]
    ]
  );
}

function getLookAtPos(cp, lv){
  return new Vector3([
    cp.elements[0] + lv.elements[0],
    cp.elements[1] + lv.elements[1],
    cp.elements[2] + lv.elements[2]
  ]);
}

function multiplyVec3(q, vec, result){
  var tempVec = q.multiplyVector3({
    x: vec.elements[0],
    y: vec.elements[1],
    z: vec.elements[2]
  });
  result.elements[0] = tempVec.x;
  result.elements[1] = tempVec.y;
  result.elements[2] = tempVec.z;
}

////////////////

function onPauseClicked(e){
  isAnimPaused = !isAnimPaused;
}

var currentCameraIndex = 0;
function switchCamera(e){
  currentCameraIndex += 1;
  currentCameraIndex = currentCameraIndex > 3 ? currentCameraIndex - 4 : currentCameraIndex;
}

var vpAspect;
var yfov = 35;
var onear = 1;
var ofar = 100;
var otop =  0;      // Math.tan(yfov / 2 / 360 * Math.PI) * 33;
var obottom = 0;        // height * vpAspect
var oleft = 0;
var oright = 0;
var pnear = 1;
var pfar = 100;
function initFrustum(gl){
  vpAspect = (gl.drawingBufferWidth / 2) / (gl.drawingBufferHeight);
  var fheight = Math.tan(yfov / 2 / 360 * Math.PI) * ((ofar-onear) / 3 + onear);
  var fwidth = fheight * vpAspect;

  oright = fwidth;
  oleft = -fwidth;
  otop = fheight;
  obottom = -fheight;

  document.getElementById('near').value = onear;
  document.getElementById('far').value = ofar;
  document.getElementById('right').value = fwidth;
  document.getElementById('left').value = -fwidth;
  document.getElementById('top').value = fheight;
  document.getElementById('bottom').value = -fheight;
  document.getElementById('yfov').value = yfov;
  document.getElementById('pnear').value = pnear;
  document.getElementById('pfar').value = pfar;
}

function applyOrthoFrustum(){
  onear = parseFloat(document.getElementById('near').value);
  ofar = parseFloat(document.getElementById('far').value);
  oright = parseFloat(document.getElementById('right').value);
  oleft = parseFloat(document.getElementById('left').value);
  otop = parseFloat(document.getElementById('top').value);
  obottom = parseFloat(document.getElementById('bottom').value);
}

function applyPerspectiveFrustum(){
  pnear = parseFloat(document.getElementById('pnear').value);
  pfar = parseFloat(document.getElementById('pfar').value);
  yfov = parseFloat(document.getElementById('yfov').value);
}
