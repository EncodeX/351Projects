var VSHADER_SOURCE =
    'uniform mat4 u_ModelMatrix;\n' +
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_Position = u_ModelMatrix * a_Position;\n' +
    '  gl_PointSize = 1.0;\n' +
    '  v_Color = a_Color;\n' +
    '}\n';


var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'varying vec4 v_Color;\n' +
    // 'float counter = 0.3;\n' +
    // 'float adder = 0.01;\n' +
    'void main() {\n' +
    // '  if(counter > 1.0){\n' +
    // '    adder = -0.1;\n' +
    // '  }else if(counter < 0.3){\n' +
    // '    adder = 0.1;\n' +
    // '  }\n' +
    // '  counter = counter + adder;\n' +
    // '  gl_FragColor = vec4(v_Color.x * counter, v_Color.y * counter, v_Color.z * counter, 1.0);\n' +
    '  gl_FragColor = v_Color;\n' +
    '}\n';


var ANGLE_STEP_ORIGIN = 80.0;
var ANGLE_STEP = 80.0;
var ANGLE_STEP_ORBIT = 80.0;
var floatsPerVertex = 7;

var bgR = 0;
var bgG = 0;
var bgB = 0;
var bgA = 1;

// Global vars for mouse click-and-drag for rotation.
var isMouseDown = false; // mouse-drag: true when user holds down mouse button
var isDrag = false;
var isPaused = false;
var xMclik = 0.0; // last mouse button-down position (in CVV coords)
var yMclik = 0.0;
var xCclik = 0.0; // last mouse button-down position (in CVV coords)
var yCclik = 0.0;
var xMdragTot = 0.0; // total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot = 0.0;
var xCdragTot = 0.0; // total (accumulated) mouse-drag amounts (in CVV coords).
var yCdragTot = 0.0;

var birdPosX = 0.4;
var birdPosY = 0.6;
var birdTPosX = 0.4;
var birdTPosY = 0.6;
var birdSPosX = 0.4;
var birdSPosY = 0.6;

var cylCtrColr = new Float32Array([0.2, 0.2, 0.2]); // dark gray
var cylTopColr = new Float32Array([0.4, 0.7, 0.4]); // light green
var cylBotColr = new Float32Array([0.5, 0.5, 1.0]); // light blue
var cylColrFlag = [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1]
];
var cylTopRadius = 1.0; // radius of top of cylinder (top always 1.0)
var cylBotRadius = 1.6; // radius of bottom of cylinder (top always 1.0)
var cylRFlag = 1;

var isRunning = false;
var step = 0.3;
var stepper = 0.1;
var moveCrane = false;
var orbitAngle = 0;

function main() {
    //==============================================================================
    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Write the positions of vertices into an array, transfer
    // array contents to a Vertex Buffer Object created in the
    // graphics hardware.
    var n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to set the positions of the vertices');
        return;
    }


    canvas.onmousedown = function(ev) {
        myMouseDown(ev, gl, canvas)
    };

    // when user's mouse button goes down call mouseDown() function
    canvas.onmousemove = function(ev) {
        myMouseMove(ev, gl, canvas)
    };

    // call mouseMove() function
    canvas.onmouseup = function(ev) {
        myMouseUp(ev, gl, canvas)
    };

    window.addEventListener("keydown", myKeyDown, false);
    window.addEventListener("keyup", myKeyUp, false);
    window.addEventListener("keypress", myKeyPress, false);


    // Specify the color for clearing <canvas>
    gl.clearColor(0, 0, 0, 1);

    // NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel
    // unless the new Z value is closer to the eye than the old one..
    // gl.depthFunc(gl.LESS);
    // gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Get storage location of u_ModelMatrix
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }

    // Explain on console:
    // console.log('\ndraw() fcn, line 152: NO transforms. \nDraw box.\n');

    // Current rotation angle
    var currentAngle = 0.0;
    // Model matrix
    var modelMatrix = new Matrix4();

    // Start drawing
    var tick = function() {
        // initVertexBuffers(gl);
        if (!isPaused) {
            for (i = 0; i < 3; i++) {
                var r = Math.random() * 0.01;
                cylColrFlag[0][i] = Math.abs(cylCtrColr[i] + r * cylColrFlag[0][i] - 0.5) > 0.5 ? -cylColrFlag[0][i] : cylColrFlag[0][i];
                cylCtrColr[i] = cylCtrColr[i] + r * cylColrFlag[0][i];
                r = Math.random() * 0.01;
                cylColrFlag[1][i] = Math.abs(cylTopColr[i] + r * cylColrFlag[1][i] - 0.5) > 0.5 ? -cylColrFlag[1][i] : cylColrFlag[1][i];
                cylTopColr[i] = cylTopColr[i] + r * cylColrFlag[1][i];
                r = Math.random() * 0.01;
                cylColrFlag[2][i] = Math.abs(cylBotColr[i] + r * cylColrFlag[2][i] - 0.5) > 0.5 ? -cylColrFlag[2][i] : cylColrFlag[2][i];
                cylBotColr[i] = cylBotColr[i] + r * cylColrFlag[2][i];
            }
            r = Math.random() * 0.01;
            cylRFlag = Math.abs(cylTopRadius - 1.3) > 0.3 ? -cylRFlag : cylRFlag;
            cylTopRadius += r * cylRFlag;
            cylBotRadius -= r * cylRFlag;
            // console.log(cylTopRadius, cylBotRadius);
            makeCylinder(cylCtrColr, cylTopColr, cylBotColr, cylTopRadius, cylBotRadius);
            rebindShapes(gl);
        }
        currentAngle = isRunning ? animateDouble(currentAngle) : animate(currentAngle); // Update the rotation angle
        draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix); // Draw the triangle
        requestAnimationFrame(tick, canvas); // Request that the browser ?calls tick
    };
    tick();
}

function initVertexBuffers(gl) {
    //==============================================================================

    makeCylinder(cylCtrColr, cylTopColr, cylBotColr, cylTopRadius, cylBotRadius); // create, fill the cylVerts array
    // makeSphere(new Float32Array([
    //   1, 1, 1,
    //   1, 1, 1,
    //   1, 1, 1
    // ]));						// create, fill the sphVerts array
    makeSphere(new Float32Array([
        0.7, 0.7, 0.7,
        0.3, 0.7, 0.3,
        0.9, 0.9, 0.9
    ])); // create, fill the sphVerts array
    makeBox();
    makeSpiderTooth();
    makeSpiderBody();

    mySiz = cylVerts.length + sphVerts.length + box.length + spiderTooth.length + spiderBody.length + 7;

    var n = mySiz / floatsPerVertex; // The number of vertices

    rebindShapes(gl);

    var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

    //Get graphics system's handle for our Vertex Shader's position-input variable:
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    // Use handle to specify how to retrieve position data from our VBO:
    gl.vertexAttribPointer(
        a_Position, // choose Vertex Shader attribute to fill with data
        4, // how many values? 1,2,3 or 4.  (we're using x,y,z,w)
        gl.FLOAT, // data type for each value: usually gl.FLOAT
        false, // did we supply fixed-point data AND it needs normalizing?
        FSIZE * 7, // Stride -- how many bytes used to store each vertex?
        // (x,y,z,w, r,g,b) * bytes/value
        0); // Offset -- now many bytes from START of buffer to the
    // value we will actually use?
    gl.enableVertexAttribArray(a_Position);
    // Enable assignment of vertex buffer object's position data
    // Enable assignment of vertex buffer object's position data

    // var u_Width = gl.getUniformLocation(gl.program, 'u_Width');
    // if (!u_Width) {
    //   console.log('Failed to get the storage location of u_Width');
    //   return;
    // }
    //
    // var u_Height = gl.getUniformLocation(gl.program, 'u_Height');
    // if (!u_Height) {
    //   console.log('Failed to get the storage location of u_Height');
    //   return;
    // }

    // // Pass the width and hight of the <canvas>
    // gl.uniform1f(u_Width, gl.drawingBufferWidth);
    // gl.uniform1f(u_Height, gl.drawingBufferHeight);

    //--------------------------------DONE!
    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return n;
}

function rebindShapes(gl) {
    // if(step > 0.9999){
    //   stepper = -0.01;
    // }else if(step < 0.30001){
    //   stepper = 0.01;
    // }
    // step += stepper;


    colorShapes = new Float32Array(mySiz);
    // Copy them:  remember where to start for each shape:
    cylStart = 0; // we stored the cylinder first.
    for (i = 0, j = 0; j < cylVerts.length; i++, j++) {
        colorShapes[i] = cylVerts[j];
    }
    sphStart = i; // next, we'll store the sphere;
    for (j = 0; j < sphVerts.length; i++, j++) { // don't initialize i -- reuse it!
        // if(j % 7 >3){
        // colorShapes[i] = sphVerts[j] * step;
        // }else{
        colorShapes[i] = sphVerts[j];
        // }
    }
    boxStart = i;
    for (j = 0; j < box.length; i++, j++) { // don't initialize i -- reuse it!
        // if(j % 7 >3){
        // colorShapes[i] = box[j] * step;
        // }else{
        colorShapes[i] = box[j];
        // }
    }
    spiderStart = i;
    for (j = 0; j < spiderTooth.length; i++, j++) { // don't initialize i -- reuse it!
        // if(j % 7 >3){
        // colorShapes[i] = box[j] * step;
        // }else{
        colorShapes[i] = spiderTooth[j];
        // }
    }
    bodyStart = i;
    for (j = 0; j < spiderBody.length; i++, j++) { // don't initialize i -- reuse it!
        // if(j % 7 >3){
        // colorShapes[i] = box[j] * step;
        // }else{
        colorShapes[i] = spiderBody[j];
        // }
    }
    pointStart = i;
    for (j = 0; j < 7; i++, j++) { // don't initialize i -- reuse it!
        colorShapes[i] = 0.0;
    }

    var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?
    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

    // Get graphics system's handle for our Vertex Shader's color-input variable;
    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }
    // Use handle to specify how to retrieve color data from our VBO:
    gl.vertexAttribPointer(
        a_Color, // choose Vertex Shader attribute to fill with data
        3, // how many values? 1,2,3 or 4. (we're using R,G,B)
        gl.FLOAT, // data type for each value: usually gl.FLOAT
        false, // did we supply fixed-point data AND it needs normalizing?
        FSIZE * 7, // Stride -- how many bytes used to store each vertex?
        // (x,y,z,w, r,g,b) * bytes/value
        FSIZE * 4); // Offset -- how many bytes from START of buffer to the
    // value we will actually use?  Need to skip over x,y,z,w

    gl.enableVertexAttribArray(a_Color);
}

function draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix) {
    //==============================================================================
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(bgR, bgG, bgB, bgA);

    drawSpider(gl, n, currentAngle, modelMatrix, u_ModelMatrix);
    drawCrane(gl, n, currentAngle, modelMatrix, u_ModelMatrix);
}

function drawCrane(gl, n, currentAngle, modelMatrix, u_ModelMatrix) {
    if (!isPaused) calcCurrentPosition();
    var angle = currentAngle + 32.5;

    modelMatrix.setTranslate(birdPosX + 0.1 * Math.sin(Math.PI * angle / 360), birdPosY, 0);
    modelMatrix.scale(1, 1, -1);

    var dist = Math.sqrt(xCdragTot * xCdragTot + yCdragTot * yCdragTot);
    modelMatrix.rotate(dist * 120.0, -yCdragTot + 0.0001, +xCdragTot + 0.0001, 0.0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.POINTS, pointStart / floatsPerVertex, 1);

    // pushMatrix(modelMatrix);

    // var angle = angle > 0 ? -angle + 26.25 : angle + 26.25;
    modelMatrix.translate(0, 0, 0);

    modelMatrix.rotate(-65, 0, 1, 0);
    modelMatrix.rotate(25, 1, 0, 0);
    modelMatrix.rotate(-30, 0, 0, 1);

    modelMatrix.scale(0.2, 0.1, 0.1);
    // modelMatrix.rotate(angle * 0.6, 0, 0, 1);
    // modelMatrix.translate(0, 1.5, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, sphStart / floatsPerVertex, sphVerts.length / floatsPerVertex);

    // modelMatrix = popMatrix();
    pushMatrix(modelMatrix);

    modelMatrix.scale(5, 10, 10);
    modelMatrix.translate(0, -0.08, 0.03);
    angle = currentAngle;
    // modelMatrix.rotate(180, 0, 0, 1);
    modelMatrix.rotate(180 + angle * 0.4, 0, 0, 1);
    modelMatrix.scale(0.02, 0.625, 0.02);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);

    modelMatrix.scale(50, 1.6, 50);
    modelMatrix.translate(0, 0.25, 0);
    angle = currentAngle - 20;
    // // modelMatrix.rotate(angle * 0.6, 0, 0, 1);
    modelMatrix.rotate(-angle * 0.4, 0, 0, 1);
    modelMatrix.scale(0.02, 0.5, 0.02);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);

    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);

    modelMatrix.scale(5, 10, 10);
    modelMatrix.translate(0, -0.08, -0.03);
    angle = currentAngle;
    // modelMatrix.rotate(180, 0, 0, 1);
    modelMatrix.rotate(160 - angle * 0.4, 0, 0, 1);
    modelMatrix.scale(0.02, 0.625, 0.02);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);

    modelMatrix.scale(50, 1.6, 50);
    modelMatrix.translate(0, 0.25, 0);
    angle = currentAngle - 20;
    // // modelMatrix.rotate(angle * 0.6, 0, 0, 1);
    modelMatrix.rotate(angle * 0.4 + 40, 0, 0, 1);
    modelMatrix.scale(0.02, 0.5, 0.02);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);

    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);

    modelMatrix.scale(5, 10, 10);
    modelMatrix.translate(0.3, 0, 0);
    modelMatrix.rotate(90, 0, 1, 0);
    var angle = currentAngle + 32.5;
    modelMatrix.scale(0.05, 0.05, 0.05 + 0.05 * Math.sin(Math.PI * angle / 360));

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, cylStart / floatsPerVertex, cylVerts.length / floatsPerVertex);


    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);

    orbitAngle = rotate(orbitAngle);

    modelMatrix.scale(5, 10, 10);
    modelMatrix.translate(0.3, 0, 0);
    modelMatrix.rotate(-orbitAngle, 1, 0, 0);
    modelMatrix.scale(0.03, 0.03, 0.03);
    modelMatrix.translate(0, 6, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, sphStart / floatsPerVertex, sphVerts.length / floatsPerVertex);

    modelMatrix = popMatrix();

    modelMatrix.scale(5, 10, 10);
    modelMatrix.translate(0.3, 0, 0);
    modelMatrix.rotate(-orbitAngle, 1, 0, 0);
    modelMatrix.scale(0.03, 0.03, 0.03);
    modelMatrix.translate(0, -6, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, sphStart / floatsPerVertex, sphVerts.length / floatsPerVertex);
}

function drawSpider(gl, n, currentAngle, modelMatrix, u_ModelMatrix) {
    modelMatrix.setTranslate(-0.4, -0.3, 0); // 'set' means DISCARD old matrix,
    // (drawing axes centered in CVV), and then make new
    // drawing axes moved to the lower-left corner of CVV.
    modelMatrix.rotate(-35, 0, 1, 0);
    modelMatrix.rotate(-25, 1, 0, 0);
    modelMatrix.rotate(10, 0, 0, 1);
    modelMatrix.scale(1, 1, -1);
    modelMatrix.scale(0.5, 0.5, 0.5);
    // modelMatrix.rotate(90, 0, 1, 0);
    // modelMatrix.rotate(currentAngle, 0, 1, 0);  // Make new drawing axes that
    // that spin around z axis (0,0,1) of the previous
    // drawing axes, using the same origin.
    //modelMatrix.rotate(3*currentAngle, 0,1,0);  // SPIN ON Y AXIS!!!
    // modelMatrix.translate(-0.1, 0,0);						// Move box so that we pivot
    // around the MIDDLE of it's lower edge, and not the left corner.

    // DRAW BOX:  Use this matrix to transform & draw our VBo's contents:
    // Pass our current matrix to the vertex shaders:

    // rotate on axis perpendicular to the mouse-drag direction:
    var dist = Math.sqrt(xMdragTot * xMdragTot + yMdragTot * yMdragTot);
    // why add 0.001? avoids divide-by-zero in next statement
    // in cases where user didn't drag the mouse.)
    modelMatrix.rotate(dist * 120.0, -yMdragTot + 0.0001, +xMdragTot + 0.0001, 0.0);

    modelMatrix.translate(-0.2, -0.2, -0.2);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Draw the rectangle held in the VBO we created in initVertexBuffers().
    gl.drawArrays(gl.TRIANGLES, bodyStart / floatsPerVertex, spiderBody.length / floatsPerVertex);

    pushMatrix(modelMatrix);

    modelMatrix.translate(0.0, 0.15, 0.4);
    // modelMatrix.rotate(55 + currentAngle * 0.2, 0, 0, 1);
    // modelMatrix.rotate(currentAngle * 0.3 - 20, 0, 1, 0);
    // modelMatrix.scale(1.6, 0.1, 0.1);
    // modelMatrix.translate(0.0, -0.01, -0.01);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, spiderStart / floatsPerVertex, spiderTooth.length / floatsPerVertex);

    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);

    modelMatrix.translate(0.4, 0.15, 0.4);
    modelMatrix.rotate(180, 0, 0, 1);
    // modelMatrix.rotate(currentAngle * 0.3 - 20, 0, 1, 0);
    // modelMatrix.scale(1, -1, 1);
    modelMatrix.translate(0.0, -0.1, 0.0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, spiderStart / floatsPerVertex, spiderTooth.length / floatsPerVertex);

    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);

    modelMatrix.translate(0.4, 0.2, 0.3);
    modelMatrix.rotate(55 + currentAngle * 0.2, 0, 0, 1);
    modelMatrix.rotate(currentAngle * 0.3 - 20, 0, 1, 0);
    modelMatrix.scale(1.6, 0.1, 0.1);
    modelMatrix.translate(0.0, -0.01, -0.01);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);

    modelMatrix.translate(0.4, 0.01, 0.01);
    modelMatrix.scale(0.625, 10, 10);
    modelMatrix.rotate(-125 - currentAngle * 0.2, 0, 0, 1);
    modelMatrix.rotate(currentAngle * 0.4 + 20, 0, 1, 0);
    modelMatrix.scale(3.2, 0.1, 0.1);
    modelMatrix.translate(-0.003, -0.2, 0);
    // //
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);


    modelMatrix.translate(0.4, 0.2, 0);
    modelMatrix.scale(0.3125, 10, 10);
    modelMatrix.rotate(60 - currentAngle * 0.3, 0, 0, 1);
    modelMatrix.scale(0.3, 0.1, 0.1);
    modelMatrix.translate(-0.02, -0.2, 0);
    // //
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);

    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);

    modelMatrix.translate(0.01, 0.2, 0.1);
    modelMatrix.rotate(125 + currentAngle * 0.2, 0, 0, 1);
    modelMatrix.rotate(-currentAngle * 0.3 + 20, 0, 1, 0);
    modelMatrix.scale(1.6, 0.1, 0.1);
    modelMatrix.translate(-0.03, -0.03, -0.1);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);


    modelMatrix.translate(0.4, 0, 0);
    modelMatrix.scale(0.625, 10, 10);
    modelMatrix.rotate(125 - currentAngle * 0.2, 0, 0, 1);
    modelMatrix.rotate(currentAngle * 0.4 + 20, 0, 1, 0);
    modelMatrix.scale(3.2, 0.1, 0.1);
    modelMatrix.translate(0.003, -0.15, 0);
    // //
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);


    modelMatrix.translate(0.4, 0.0, 0);
    modelMatrix.scale(0.3125, 10, 10);
    modelMatrix.rotate(-60 - currentAngle * 0.3, 0, 0, 1);
    modelMatrix.scale(0.3, 0.1, 0.1);
    modelMatrix.translate(-0.05, -0.15, 0);
    // //
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);

    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);

    modelMatrix.translate(0.4, 0.2, 0.1);
    modelMatrix.rotate(55 - currentAngle * 0.2, 0, 0, 1);
    modelMatrix.rotate(-currentAngle * 0.3 + 20, 0, 1, 0);
    modelMatrix.scale(1.6, 0.1, 0.1);
    modelMatrix.translate(0.0, -0.01, -0.01);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);


    modelMatrix.translate(0.4, 0, 0);
    modelMatrix.scale(0.625, 10, 10);
    modelMatrix.rotate(-115 + currentAngle * 0.2, 0, 0, 1);
    modelMatrix.rotate(-currentAngle * 0.4 + 20, 0, 1, 0);
    modelMatrix.scale(3.2, 0.1, 0.1);
    modelMatrix.translate(-0.005, -0.1, 0);
    // //
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);


    modelMatrix.translate(0.4, 0, 0);
    modelMatrix.scale(0.3125, 10, 10);
    modelMatrix.rotate(60 - currentAngle * 0.3, 0, 0, 1);
    modelMatrix.scale(0.3, 0.1, 0.1);
    modelMatrix.translate(0.05, -0.05, 0);
    // //
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);

    modelMatrix = popMatrix();

    modelMatrix.translate(0.01, 0.2, 0.3);
    modelMatrix.rotate(125 + currentAngle * 0.2, 0, 0, 1);
    modelMatrix.rotate(currentAngle * 0.3 - 20, 0, 1, 0);
    modelMatrix.scale(1.6, 0.1, 0.1);
    modelMatrix.translate(-0.03, -0.03, -0.1);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);


    modelMatrix.translate(0.4, 0, 0);
    modelMatrix.scale(0.625, 10, 10);
    modelMatrix.rotate(125 - currentAngle * 0.2, 0, 0, 1);
    modelMatrix.rotate(-currentAngle * 0.4 - 40, 0, 1, 0);
    modelMatrix.scale(3.2, 0.1, 0.1);
    modelMatrix.translate(0.01, -0.3, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);


    modelMatrix.translate(0.4, 0.0, 0);
    modelMatrix.scale(0.3125, 10, 10);
    modelMatrix.rotate(-60 - currentAngle * 0.3, 0, 0, 1);
    modelMatrix.scale(0.3, 0.1, 0.1);
    modelMatrix.translate(-0.05, -0.15, 0);
    // //
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, boxStart / floatsPerVertex, box.length / floatsPerVertex);
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();
var g_last_orbit = Date.now();

function animate(angle) {
    //==============================================================================
    // Calculate the elapsed time
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;

    if (isPaused)
        return angle;

    // Update the current rotation angle (adjusted by the elapsed time)
    //  limit the angle to move smoothly between +20 and -85 degrees:
    if (angle > 20.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
    if (angle < -85.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;

    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle %= 360;
}

function animateDouble(angle) {
    //==============================================================================
    // Calculate the elapsed time
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;

    if (isPaused)
        return angle;

    // Update the current rotation angle (adjusted by the elapsed time)
    //  limit the angle to move smoothly between +20 and -85 degrees:
    if (angle > 20.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
    if (angle < -85.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;

    var newAngle = angle + (ANGLE_STEP * elapsed * 2) / 1000.0;
    return newAngle %= 360;
}

function moreCCW() {
    //==============================================================================

    ANGLE_STEP += 10;
}

function lessCCW() {
    //==============================================================================
    ANGLE_STEP -= 10;
}


function rotate(angle) {
    //==============================================================================
    // Calculate the elapsed time
    var now = Date.now();
    var elapsed = now - g_last_orbit;
    g_last_orbit = now;

    if (isPaused)
        return angle;

    // Update the current rotation angle (adjusted by the elapsed time)
    //  limit the angle to move smoothly between +20 and -85 degrees:
    //  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
    //  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;

    var newAngle = angle + (ANGLE_STEP_ORBIT * elapsed) / 1000.0;
    return newAngle %= 360;
}



function makeCylinder(ctrColr, topColr, botColr, topRadius, botRadius) {
    //==============================================================================
    // Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
    // 'stepped spiral' design described in notes.
    // Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
    //
    var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
    // var botRadius = 1.6;		// radius of bottom of cylinder (top always 1.0)

    // Create a (global) array to hold this cylinder's vertices;
    cylVerts = new Float32Array(((capVerts * 6) - 2) * floatsPerVertex);
    // # of vertices * # of elements needed to store them.

    // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
    // v counts vertices: j counts array elements (vertices * elements per vertex)
    for (v = 1, j = 0; v < 2 * capVerts; v++, j += floatsPerVertex) {
        // skip the first vertex--not needed.
        if (v % 2 == 0) { // put even# vertices at center of cylinder's top cap:
            cylVerts[j] = 0.0; // x,y,z,w == 0,0,1,1
            cylVerts[j + 1] = 0.0;
            cylVerts[j + 2] = 1.0;
            cylVerts[j + 3] = 1.0; // r,g,b = topColr[]
            cylVerts[j + 4] = ctrColr[0];
            cylVerts[j + 5] = ctrColr[1];
            cylVerts[j + 6] = ctrColr[2];
        } else { // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            // 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
            cylVerts[j] = topRadius * Math.cos(Math.PI * (v - 1) / capVerts); // x
            cylVerts[j + 1] = topRadius * Math.sin(Math.PI * (v - 1) / capVerts); // y
            //	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
            //	 can simplify cos(2*PI * (v-1)/(2*capVerts))
            cylVerts[j + 2] = 1.0; // z
            cylVerts[j + 3] = 1.0; // w.
            // r,g,b = topColr[]
            cylVerts[j + 4] = topColr[0];
            cylVerts[j + 5] = topColr[1];
            cylVerts[j + 6] = topColr[2];
        }
    }
    // Create the cylinder side walls, made of 2*capVerts vertices.
    // v counts vertices within the wall; j continues to count array elements
    for (v = 0; v < 2 * capVerts; v++, j += floatsPerVertex) {
        if (v % 2 == 0) // position all even# vertices along top cap:
        {
            cylVerts[j] = topRadius * Math.cos(Math.PI * (v) / capVerts); // x
            cylVerts[j + 1] = topRadius * Math.sin(Math.PI * (v) / capVerts); // y
            cylVerts[j + 2] = 1.0; // z
            cylVerts[j + 3] = 1.0; // w.
            // r,g,b = topColr[]
            cylVerts[j + 4] = topColr[0];
            cylVerts[j + 5] = topColr[1];
            cylVerts[j + 6] = topColr[2];
        } else // position all odd# vertices along the bottom cap:
        {
            cylVerts[j] = botRadius * Math.cos(Math.PI * (v - 1) / capVerts); // x
            cylVerts[j + 1] = botRadius * Math.sin(Math.PI * (v - 1) / capVerts); // y
            cylVerts[j + 2] = -1.0; // z
            cylVerts[j + 3] = 1.0; // w.
            // r,g,b = topColr[]
            cylVerts[j + 4] = botColr[0];
            cylVerts[j + 5] = botColr[1];
            cylVerts[j + 6] = botColr[2];
        }
    }
    // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
    // v counts the vertices in the cap; j continues to count array elements
    for (v = 0; v < (2 * capVerts - 1); v++, j += floatsPerVertex) {
        if (v % 2 == 0) { // position even #'d vertices around bot cap's outer edge
            cylVerts[j] = botRadius * Math.cos(Math.PI * (v) / capVerts); // x
            cylVerts[j + 1] = botRadius * Math.sin(Math.PI * (v) / capVerts); // y
            cylVerts[j + 2] = -1.0; // z
            cylVerts[j + 3] = 1.0; // w.
            // r,g,b = topColr[]
            cylVerts[j + 4] = botColr[0];
            cylVerts[j + 5] = botColr[1];
            cylVerts[j + 6] = botColr[2];
        } else { // position odd#'d vertices at center of the bottom cap:
            cylVerts[j] = 0.0; // x,y,z,w == 0,0,-1,1
            cylVerts[j + 1] = 0.0;
            cylVerts[j + 2] = -1.0;
            cylVerts[j + 3] = 1.0; // r,g,b = botColr[]
            cylVerts[j + 4] = botColr[0];
            cylVerts[j + 5] = botColr[1];
            cylVerts[j + 6] = botColr[2];
        }
    }
}


function makeSphere(colors) {
    //==============================================================================
    // Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like
    // equal-lattitude 'slices' of the sphere (bounded by planes of constant z),
    // and connect them as a 'stepped spiral' design (see makeCylinder) to build the
    // sphere from one triangle strip.
    var slices = 13; // # of slices of the sphere along the z axis. >=3 req'd
    // (choose odd # or prime# to avoid accidental symmetry)
    var sliceVerts = 27; // # of vertices around the top edge of the slice
    // (same number of vertices on bottom of slice, too)
    var topColr = new Float32Array([colors[0], colors[1], colors[2]]); // North Pole: light gray
    var equColr = new Float32Array([colors[3], colors[4], colors[5]]); // Equator:    bright green
    var botColr = new Float32Array([colors[6], colors[7], colors[8]]); // South Pole: brightest gray.
    var sliceAngle = Math.PI / slices; // lattitude angle spanned by one slice.

    // Create a (global) array to hold this sphere's vertices:
    sphVerts = new Float32Array(((slices * 2 * sliceVerts) - 2) * floatsPerVertex);
    // # of vertices * # of elements needed to store them.
    // each slice requires 2*sliceVerts vertices except 1st and
    // last ones, which require only 2*sliceVerts-1.

    // Create dome-shaped top slice of sphere at z=+1
    // s counts slices; v counts vertices;
    // j counts array elements (vertices * elements per vertex)
    var cos0 = 0.0; // sines,cosines of slice's top, bottom edge.
    var sin0 = 0.0;
    var cos1 = 0.0;
    var sin1 = 0.0;
    var j = 0; // initialize our array index
    var isLast = 0;
    var isFirst = 1;
    for (s = 0; s < slices; s++) { // for each slice of the sphere,
        // find sines & cosines for top and bottom of this slice
        if (s == 0) {
            isFirst = 1; // skip 1st vertex of 1st slice.
            cos0 = 1.0; // initialize: start at north pole.
            sin0 = 0.0;
        } else { // otherwise, new top edge == old bottom edge
            isFirst = 0;
            cos0 = cos1;
            sin0 = sin1;
        } // & compute sine,cosine for new bottom edge.
        cos1 = Math.cos((s + 1) * sliceAngle);
        sin1 = Math.sin((s + 1) * sliceAngle);
        // go around the entire slice, generating TRIANGLE_STRIP verts
        // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
        if (s == slices - 1) isLast = 1; // skip last vertex of last slice.
        for (v = isFirst; v < 2 * sliceVerts - isLast; v++, j += floatsPerVertex) {
            if (v % 2 == 0) { // put even# vertices at the the slice's top edge
                // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
                // and thus we can simplify cos(2*PI(v/2*sliceVerts))
                sphVerts[j] = sin0 * Math.cos(Math.PI * (v) / sliceVerts);
                sphVerts[j + 1] = sin0 * Math.sin(Math.PI * (v) / sliceVerts);
                sphVerts[j + 2] = cos0;
                sphVerts[j + 3] = 1.0;
            } else { // put odd# vertices around the slice's lower edge;
                // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                // 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
                sphVerts[j] = sin1 * Math.cos(Math.PI * (v - 1) / sliceVerts); // x
                sphVerts[j + 1] = sin1 * Math.sin(Math.PI * (v - 1) / sliceVerts); // y
                sphVerts[j + 2] = cos1; // z
                sphVerts[j + 3] = 1.0; // w.
            }
            if (s == 0) { // finally, set some interesting colors for vertices:
                sphVerts[j + 4] = topColr[0];
                sphVerts[j + 5] = topColr[1];
                sphVerts[j + 6] = topColr[2];
            } else if (s == slices - 1) {
                sphVerts[j + 4] = botColr[0];
                sphVerts[j + 5] = botColr[1];
                sphVerts[j + 6] = botColr[2];
            } else {
                sphVerts[j + 4] = Math.random(); // equColr[0];
                sphVerts[j + 5] = Math.random(); // equColr[1];
                sphVerts[j + 6] = Math.random(); // equColr[2];
                // sphVerts[j+4]=equColr[0];// equColr[0];
                // sphVerts[j+5]=equColr[1];// equColr[1];
                // sphVerts[j+6]=equColr[2];// equColr[2];
            }
        }
    }
}

function makeBox() {
    box = new Float32Array([
        // z -
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        0.0, 0.0, 0.4, 1.0, 0.0, 1.0, 0.0, // node b
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        // z +
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.4, 0.4, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
        // x -
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        0.4, 0.4, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        // x +
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.0, 0.4, 1.0, 0.0, 1.0, 0.0, // node b
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        // y -
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.4, 0.4, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        // y +
        0.0, 0.0, 0.4, 1.0, 0.0, 1.0, 0.0, // node b
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
    ]);
}

function makeSpiderBody() {
    spiderBody = new Float32Array([
        // z -
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        0.0, 0.0, 0.4, 1.0, 0.0, 1.0, 0.0, // node b
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        // z +
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.4, 0.4, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
        // x -
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        0.4, 0.4, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        // x +
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.0, 0.4, 1.0, 0.0, 1.0, 0.0, // node b
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        // yx -
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.2, 0.5, 0.5, 1.0, 0.6, 0.6, 0.2, // node j
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.2, 0.5, -0.1, 1.0, 0.3, 0.4, 0.7, // node i
        0.2, 0.5, 0.5, 1.0, 0.6, 0.6, 0.2, // node j
        // yz -
        0.2, 0.5, -0.1, 1.0, 0.3, 0.4, 0.7, // node i
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        0.2, 0.5, 0.5, 1.0, 0.6, 0.6, 0.2, // node j
        0.2, 0.5, -0.1, 1.0, 0.3, 0.4, 0.7, // node i
        0.4, 0.4, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        // yx +
        0.0, 0.0, 0.4, 1.0, 0.0, 1.0, 0.0, // node b
        0.2, -0.1, 0.5, 1.0, 0.9, 0.1, 0.7, // node k
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.2, -0.1, 0.5, 1.0, 0.9, 0.1, 0.7, // node k
        0.2, -0.1, -0.1, 1.0, 0.8, 0.8, 0.2, // node l
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        // yz +
        0.2, -0.1, 0.5, 1.0, 0.9, 0.1, 0.7, // node k
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        0.2, -0.1, -0.1, 1.0, 0.8, 0.8, 0.2, // node l
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.2, -0.1, -0.1, 1.0, 0.8, 0.8, 0.2, // node l
        // zx -
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.2, -0.1, 0.5, 1.0, 0.9, 0.1, 0.7, // node k
        0.0, 0.0, 0.4, 1.0, 0.0, 1.0, 0.0, // node b
        0.0, 0.4, 0.4, 1.0, 1.0, 0.8, 0.0, // node a
        0.2, 0.5, 0.5, 1.0, 0.6, 0.6, 0.2, // node j
        0.2, -0.1, 0.5, 1.0, 0.9, 0.1, 0.7, // node k
        // zy -
        0.2, 0.5, 0.5, 1.0, 0.6, 0.6, 0.2, // node j
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        0.2, -0.1, 0.5, 1.0, 0.9, 0.1, 0.7, // node k
        0.2, 0.5, 0.5, 1.0, 0.6, 0.6, 0.2, // node j
        0.4, 0.4, 0.4, 1.0, 0.0, 0.5, 0.0, // node d
        0.4, 0.0, 0.4, 1.0, 1.0, 0.0, 1.0, // node c
        // zx +
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.2, 0.2, -0.2, 1.0, 0.4, 1.0, 1.0, // node m
        0.2, 0.2, -0.2, 1.0, 0.4, 1.0, 1.0, // node m
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.2, -0.1, -0.1, 1.0, 0.8, 0.8, 0.2, // node l
        0.0, 0.4, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.2, 0.2, -0.2, 1.0, 0.4, 1.0, 1.0, // node m
        0.2, 0.5, -0.1, 1.0, 0.3, 0.4, 0.7, // node i
        // zy +
        0.2, 0.2, -0.2, 1.0, 0.4, 1.0, 1.0, // node m
        0.2, -0.1, -0.1, 1.0, 0.8, 0.8, 0.2, // node l
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.2, 0.2, -0.2, 1.0, 0.4, 1.0, 1.0, // node m
        0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.4, 0.4, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
        0.2, 0.5, -0.1, 1.0, 0.3, 0.4, 0.7, // node i
        0.2, 0.2, -0.2, 1.0, 0.4, 1.0, 1.0, // node m
        0.4, 0.4, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
    ]);
}

function makeSpiderTooth() {
    spiderTooth = new Float32Array([
        // teeth left (first)
        // z -
        0.0, 0.1, 0.1, 1.0, 1.0, 0.8, 0.0, // node a
        0.08, 0.0, 0.1, 1.0, 1.0, 0.0, 1.0, // node c
        0.0, 0.0, 0.1, 1.0, 0.0, 1.0, 0.0, // node b
        0.0, 0.1, 0.1, 1.0, 1.0, 0.8, 0.0, // node a
        0.08, 0.1, 0.1, 1.0, 0.0, 0.5, 0.0, // node d
        0.08, 0.0, 0.1, 1.0, 1.0, 0.0, 1.0, // node c
        // z +
        0.0, 0.1, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.1, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.0, 0.1, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.1, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.1, 0.1, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
        // x -
        0.08, 0.1, 0.1, 1.0, 0.0, 0.5, 0.0, // node d
        0.1, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.08, 0.0, 0.1, 1.0, 1.0, 0.0, 1.0, // node c
        0.08, 0.1, 0.1, 1.0, 0.0, 0.5, 0.0, // node d
        0.1, 0.1, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
        0.1, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        // x +
        0.0, 0.1, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.0, 0.1, 0.1, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.0, 0.1, 0.1, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.0, 0.1, 1.0, 0.0, 1.0, 0.0, // node b
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        // y -
        0.0, 0.1, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.08, 0.1, 0.1, 1.0, 0.0, 0.5, 0.0, // node d
        0.0, 0.1, 0.1, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.1, 0.0, 1.0, 1.0, 0.0, 0.0, // node e
        0.1, 0.1, 0.0, 1.0, 0.2, 0.9, 0.4, // node h
        0.08, 0.1, 0.1, 1.0, 0.0, 0.5, 0.0, // node d
        // y +
        0.0, 0.0, 0.1, 1.0, 0.0, 1.0, 0.0, // node b
        0.08, 0.0, 0.1, 1.0, 1.0, 0.0, 1.0, // node c
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        0.08, 0.0, 0.1, 1.0, 1.0, 0.0, 1.0, // node c
        0.1, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // node g
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, // node f
        // teeth left (second)
        // z -
        0.01, 0.1, 0.2, 1.0, 1.0, 0.8, 0.0, // node a
        0.08, 0.0, 0.2, 1.0, 1.0, 0.0, 1.0, // node c
        0.01, 0.0, 0.2, 1.0, 0.0, 1.0, 0.0, // node b
        0.01, 0.1, 0.2, 1.0, 1.0, 0.8, 0.0, // node a
        0.08, 0.1, 0.2, 1.0, 0.0, 0.5, 0.0, // node d
        0.08, 0.0, 0.2, 1.0, 1.0, 0.0, 1.0, // node c
        // z +
        0.0, 0.1, 0.1, 1.0, 1.0, 0.0, 0.0, // node e
        0.0, 0.0, 0.1, 1.0, 1.0, 1.0, 1.0, // node f
        0.08, 0.0, 0.1, 1.0, 0.0, 0.0, 1.0, // node g
        0.0, 0.1, 0.1, 1.0, 1.0, 0.0, 0.0, // node e
        0.08, 0.0, 0.1, 1.0, 0.0, 0.0, 1.0, // node g
        0.08, 0.1, 0.1, 1.0, 0.2, 0.9, 0.4, // node h
        // x -
        0.08, 0.1, 0.2, 1.0, 0.0, 0.5, 0.0, // node d
        0.08, 0.0, 0.1, 1.0, 0.0, 0.0, 1.0, // node g
        0.08, 0.0, 0.2, 1.0, 1.0, 0.0, 1.0, // node c
        0.08, 0.1, 0.2, 1.0, 0.0, 0.5, 0.0, // node d
        0.08, 0.1, 0.1, 1.0, 0.2, 0.9, 0.4, // node h
        0.08, 0.0, 0.1, 1.0, 0.0, 0.0, 1.0, // node g
        // x +
        0.0, 0.1, 0.1, 1.0, 1.0, 0.0, 0.0, // node e
        0.01, 0.1, 0.2, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.0, 0.1, 1.0, 1.0, 1.0, 1.0, // node f
        0.01, 0.1, 0.2, 1.0, 1.0, 0.8, 0.0, // node a
        0.01, 0.0, 0.2, 1.0, 0.0, 1.0, 0.0, // node b
        0.0, 0.0, 0.1, 1.0, 1.0, 1.0, 1.0, // node f
        // y -
        0.0, 0.1, 0.1, 1.0, 1.0, 0.0, 0.0, // node e
        0.08, 0.1, 0.2, 1.0, 0.0, 0.5, 0.0, // node d
        0.01, 0.1, 0.2, 1.0, 1.0, 0.8, 0.0, // node a
        0.0, 0.1, 0.1, 1.0, 1.0, 0.0, 0.0, // node e
        0.08, 0.1, 0.1, 1.0, 0.2, 0.9, 0.4, // node h
        0.08, 0.1, 0.2, 1.0, 0.0, 0.5, 0.0, // node d
        // y +
        0.01, 0.0, 0.2, 1.0, 0.0, 1.0, 0.0, // node b
        0.08, 0.0, 0.2, 1.0, 1.0, 0.0, 1.0, // node c
        0.0, 0.0, 0.1, 1.0, 1.0, 1.0, 1.0, // node f
        0.08, 0.0, 0.2, 1.0, 1.0, 0.0, 1.0, // node c
        0.08, 0.0, 0.1, 1.0, 0.0, 0.0, 1.0, // node g
        0.0, 0.0, 0.1, 1.0, 1.0, 1.0, 1.0, // node f
        // teeth left (third)
        // z +
        0.01, 0.1, 0.2, 1.0, 1.0, 0.0, 0.0, // node e
        0.01, 0.0, 0.2, 1.0, 1.0, 1.0, 1.0, // node f
        0.08, 0.0, 0.2, 1.0, 0.0, 0.0, 1.0, // node g
        0.01, 0.1, 0.2, 1.0, 1.0, 0.0, 0.0, // node e
        0.08, 0.0, 0.2, 1.0, 0.0, 0.0, 1.0, // node g
        0.08, 0.1, 0.2, 1.0, 0.2, 0.9, 0.4, // node h
        // x -
        0.14, 0.05, 0.3, 1.0, 1.0, 0.8, 0.0, // node a
        0.08, 0.1, 0.2, 1.0, 0.2, 0.9, 0.4, // node h
        0.08, 0.0, 0.2, 1.0, 0.0, 0.0, 1.0, // node g
        // x +
        0.01, 0.1, 0.2, 1.0, 1.0, 0.0, 0.0, // node e
        0.14, 0.05, 0.3, 1.0, 1.0, 0.8, 0.0, // node a
        0.01, 0.0, 0.2, 1.0, 1.0, 1.0, 1.0, // node f
        // y -
        0.01, 0.1, 0.2, 1.0, 1.0, 0.0, 0.0, // node e
        0.08, 0.1, 0.2, 1.0, 0.2, 0.9, 0.4, // node h
        0.14, 0.05, 0.3, 1.0, 1.0, 0.8, 0.0, // node a
        // y +
        0.14, 0.05, 0.3, 1.0, 1.0, 0.8, 0.0, // node a
        0.08, 0.0, 0.2, 1.0, 0.0, 0.0, 1.0, // node g
        0.01, 0.0, 0.2, 1.0, 1.0, 1.0, 1.0, // node f
    ]);
}

function calcCurrentPosition() {
    var x = birdPosX - birdTPosX;
    var absX = birdSPosX - birdTPosX;
    var speed = (Math.sin(Math.PI - Math.abs(x) / Math.abs(absX) * Math.PI) * 2.25 + 0.25) * 0.004;
    if (Math.abs(x) > 0.005) {
        console.log(Math.abs(x) / 4 * Math.PI);
        if (x > 0) {
            birdPosX = birdPosX - speed;
        } else {
            birdPosX = birdPosX + speed;
        }
    }
    var y = birdPosY - birdTPosY;
    var absY = birdSPosY - birdTPosY;
    speed = (Math.sin(Math.PI - Math.abs(y) / Math.abs(absY) * Math.PI) * 2.25 + 0.25) * 0.004;
    if (Math.abs(y) > 0.005) {
        if (y > 0) {
            birdPosY = birdPosY - speed;
        } else {
            birdPosY = birdPosY + speed;
        }
    }
    document.getElementById('position').innerHTML =
        'MWC position: (' + Math.round(birdPosX * 100) / 100 + ',' + Math.round(birdPosY * 100) / 100 + ')';
}


//===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev, gl, canvas) {
    //==============================================================================
    // Called when user PRESSES down any mouse button;
    // 									(Which button?    console.log('ev.button='+ev.button);   )
    // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
    //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
    var xp = ev.clientX - rect.left; // x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
    //  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);

    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width / 2) / // move origin to center of canvas and
        (canvas.width / 2); // normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height / 2) / //										 -1 <= y < +1.
        (canvas.height / 2);
    //	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);

    isMouseDown = true; // set our mouse-dragging flag
    if (!moveCrane) {
        xMclik = x; // record where mouse-dragging began
        yMclik = y;
    } else {
        xCclik = x; // record where mouse-dragging began
        yCclik = y;
    }
};


function myMouseMove(ev, gl, canvas) {
    //==============================================================================
    // Called when user MOVES the mouse with a button already pressed down.
    // 									(Which button?   console.log('ev.button='+ev.button);    )
    // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
    //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

    if (isMouseDown == false) return; // IGNORE all mouse-moves except 'dragging'
    isDrag = true;

    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
    var xp = ev.clientX - rect.left; // x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
    //  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);

    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width / 2) / // move origin to center of canvas and
        (canvas.width / 2); // normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height / 2) / //										 -1 <= y < +1.
        (canvas.height / 2);
    //	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

    if (!moveCrane) {
        // find how far we dragged the mouse:
        xMdragTot += (x - xMclik); // Accumulate change-in-mouse-position,&
        yMdragTot += (y - yMclik);
        xMclik = x; // Make next drag-measurement from here.
        yMclik = y;
    } else {
        // find how far we dragged the mouse:
        xCdragTot += (x - xCclik); // Accumulate change-in-mouse-position,&
        yCdragTot += (y - yCclik);
        xCclik = x; // Make next drag-measurement from here.
        yCclik = y;
    }
};

function myMouseUp(ev, gl, canvas) {
    //==============================================================================
    // Called when user RELEASES mouse button pressed previously.
    // 									(Which button?   console.log('ev.button='+ev.button);    )
    // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
    //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)
    isMouseDown = false; // CLEAR our mouse-dragging flag, and

    if (isDrag) {
        isDrag = false;
        console.log('mouse drag');
        return;
    }

    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
    var xp = ev.clientX - rect.left; // x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
    //  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);

    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width / 2) / // move origin to center of canvas and
        (canvas.width / 2); // normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height / 2) / //										 -1 <= y < +1.
        (canvas.height / 2);
    console.log('myMouseUp  (CVV coords  ):  x, y=\t', x, ',\t', y);

    // accumulate any final bit of mouse-dragging we did:
    if (!moveCrane) {
        xMdragTot += (x - xMclik);
        yMdragTot += (y - yMclik);
        console.log('myMouseUp: xMdragTot,yMdragTot =', xMdragTot, ',\t', yMdragTot);
    } else {
        xCdragTot += (x - xCclik);
        yCdragTot += (y - yCclik);
        console.log('myMouseUp: xMdragTot,yMdragTot =', xCdragTot, ',\t', yCdragTot);
    }

    birdTPosX = x;
    birdTPosY = y + 0.53;
    birdSPosX = birdPosX;
    birdSPosY = birdPosY;
};


function myKeyDown(ev) {
    //===============================================================================
    // Called when user presses down ANY key on the keyboard, and captures the
    // keyboard's scancode or keycode(varies for different countries and alphabets).
    //  CAUTION: You may wish to avoid 'keydown' and 'keyup' events: if you DON'T
    // need to sense non-ASCII keys (arrow keys, function keys, pgUp, pgDn, Ins,
    // Del, etc), then just use the 'keypress' event instead.
    //	 The 'keypress' event captures the combined effects of alphanumeric keys and // the SHIFT, ALT, and CTRL modifiers.  It translates pressed keys into ordinary
    // ASCII codes; you'll get the ASCII code for uppercase 'S' if you hold shift
    // and press the 's' key.
    // For a light, easy explanation of keyboard events in JavaScript,
    // see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
    // For a thorough explanation of the messy way JavaScript handles keyboard events
    // see:    http://javascript.info/tutorial/keyboard-events
    //

    switch (ev.keyCode) { // keycodes !=ASCII, but are very consistent for
        //	nearly all non-alphanumeric keys for nearly all keyboards in all countries.
        case 37: // left-arrow key
            // print in console:
            console.log(' left-arrow.');
            // and print on webpage in the <div> element with id='Result':
            // document.getElementById('Result').innerHTML =
            // 	' Left Arrow:keyCode='+ev.keyCode;
            birdPosX -= 0.005;
            birdTPosX -= 0.005;
            break;
        case 38: // up-arrow key
            console.log('   up-arrow.');
            // document.getElementById('Result').innerHTML =
            // 	'   Up Arrow:keyCode='+ev.keyCode;
            birdPosY += 0.005;
            birdTPosY += 0.005;
            break;
        case 39: // right-arrow key
            console.log('right-arrow.');
            // document.getElementById('Result').innerHTML =
            // 	'Right Arrow:keyCode='+ev.keyCode;
            birdPosX += 0.005;
            birdTPosX += 0.005;
            break;
        case 40: // down-arrow key
            console.log(' down-arrow.');
            // document.getElementById('Result').innerHTML =
            // 	' Down Arrow:keyCode='+ev.keyCode;
            birdPosY -= 0.005;
            birdTPosY -= 0.005;
            break;
        case 32: // down-arrow key
            console.log(' space.');
            // document.getElementById('Result').innerHTML =
            // 	' Down Arrow:keyCode='+ev.keyCode;
            isPaused = !isPaused;
            break;
        case 90: // down-arrow key
            console.log(' z.');
            // document.getElementById('Result').innerHTML =
            // 	' Down Arrow:keyCode='+ev.keyCode;
            moveCrane = true;
            break;
        default:
            console.log('myKeyDown()--keycode=', ev.keyCode, ', charCode=', ev.charCode);
            // document.getElementById('Result').innerHTML =
            // 	'myKeyDown()--keyCode='+ev.keyCode;
            break;
    }
}

function myKeyUp(ev) {
    //===============================================================================
    // Called when user releases ANY key on the keyboard; captures scancodes well

    switch (ev.keyCode) { // keycodes !=ASCII, but are very consistent for
        //	nearly all non-alphanumeric keys for nearly all keyboards in all countries.
        case 90: // down-arrow key
            console.log(' z.');
            // document.getElementById('Result').innerHTML =
            // 	' Down Arrow:keyCode='+ev.keyCode;
            moveCrane = false;
            break;
        default:
            // console.log('myKeyDown()--keycode=', ev.keyCode, ', charCode=', ev.charCode);
            // document.getElementById('Result').innerHTML =
            // 	'myKeyDown()--keyCode='+ev.keyCode;
            break;
    }
    console.log('myKeyUp()--keyCode=' + ev.keyCode + ' released.');
}

function myKeyPress(ev) {
    //===============================================================================
    // Best for capturing alphanumeric keys and key-combinations such as
    // CTRL-C, alt-F, SHIFT-4, etc.
    console.log('myKeyPress():keyCode=' + ev.keyCode + ', charCode=' + ev.charCode +
        ', shift=' + ev.shiftKey + ', ctrl=' + ev.ctrlKey +
        ', altKey=' + ev.altKey +
        ', metaKey(Command key or Windows key)=' + ev.metaKey);
}

function changeSpeed() {
    // console.log(v);
    var v = document.getElementById('speed').value;
    ANGLE_STEP = ANGLE_STEP_ORIGIN * v;
    document.getElementById('speedtext').innerHTML =
        'Walking Speed: ' + v + 'x';
}

function changeR(v) {
    bgR = v / 255;
    document.getElementById('red').innerHTML = v;
}

function changeG(v) {
    bgG = v / 255;
    document.getElementById('green').innerHTML = v;
}

function changeB(v) {
    bgB = v / 255;
    document.getElementById('blue').innerHTML = v;
}

function changeA(v) {
    bgA = v / 100;
    document.getElementById('alpha').innerHTML = v + '%';
}
