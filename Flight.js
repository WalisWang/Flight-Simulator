/**
 * @fileoverview Utilities for handling textareas.
 * @author wwang128
 */

var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

var vertexColorBuffer;

// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;

//Create a place to store the traingle edges
var tIndexEdgeBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0,2.0,4.0);
var viewDir = vec3.fromValues(0.0,-0.2,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);
var forward = 0;
// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();
var mvMatrixStack = [];

//quaternion for keeping tack of view quaternion and normal quaternion
var Pview=quat.fromValues(0,0,-1,1);
var Pnormal=quat.fromValues(0,1,0,1);

//for puporse of moving forward
var forward = 0;

//----------------------------------------------------------------------------------
/**
 * Setup the vertex array, face array, normal array, edge array and color array of 
 * the terain and specify position buffer, color buffer, normal buffer, face buffer and edge
 * buffer.
 */
function setupTerrainBuffers() {
    
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var cTerrain=[];
    var gridN = 64;    

    var numT = terrainFromIteration(gridN, -4,4,-4,4, vTerrain, fTerrain, nTerrain, cTerrain);
    
    // Specify positions of the terrain
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);

    // Specify colors of the terrain
    vertexColorBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexColorBuffer);    
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(cTerrain),gl.STATIC_DRAW);
    vertexColorBuffer.itemSize=4;
    vertexColorBuffer.numItems=(gridN+1)*(gridN+1);

    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;
    
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;
    
     
}

//----------------------------------------------------------------------------------
/**
 * Bind position buffer, color buffer and normal buffer and draw terrain.
 */
function drawTerrain(){
 gl.polygonOffset(0,0);
    
 // Bind position buffer 
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind color buffer    
 gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
 
 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);  
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
/**
 * Upload model view matrix to shader.
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Upload projection matrix to shader.
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Upload normal matrix to shader.
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Push matrix to mvMatrix stack.
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

//----------------------------------------------------------------------------------
/**
 * Pop matrix from mvMatrix stack.
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Set matrix uniforms.
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Transform degrees to radians.
 * @param {degrees} The degree to be transformed.
 * @return {degrees * Math.PI / 180} The radian after the transformation.
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Initialize the WebGL context for the canvas.
 * @param {canvas} The canvas.
 * @return {context} The WebGL context obtained for the canvas.
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Load shader. Look up the specified shader script in the DOM using the id and then 
 * build a JavaScript string containing text read via the DOM.
 * @param {id} The id for a shader.
 * @return {shader} The appropriate shader created.
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Set up shaders.
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}


//-------------------------------------------------------------------------
/**
 * Upload lights to shader.
 */
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Set up shaders.
 */
function setupBuffers() {
    setupTerrainBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Set the viewpoint, perspective, lookat matrix, forward speed and light shader and 
 * draw the terrrain.
 */
function draw() { 
    var transformVec = vec3.create();
    
    //Use viewport
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //Use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 900.0);
       
    vec3.add(viewPt, eyePt, viewDir);
    
    //Generate the lookat matrix
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
 
    //Draw Terrain   
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,forward);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-90));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(0));     
    setMatrixUniforms();
    
    //Set forward speed
    forward = forward+0.0013;
   
    //Set light shader 
    uploadLightsToShader([30,60,100],[0.0,0.0,0.0],[0.47,0.47,0.47],[0.0,0.0,0.0]);
    
    //Draw terrian 
    drawTerrain();
    mvPopMatrix();
    
}

//----------------------------------------------------------------------------------
/**
 * Do animations. Press the left (right) arrow key will make the plane roll to its left (right).
 * Pressing the up (down) arrow key will cause the airplane to pitch up (down). 
 */
function animate() {
   //When keydone event happens 
   document.onkeydown = function(){
       var e = e || window.event;
       var theta;
       var rad;
       var out = quat.create();
       var xAxis = vec3.fromValues(0,0,0);
        if(e.which === 38){
            //When click up arrow
            var qx = quat.create();
            //Set xAxis as the cross product of view direction and up
            vec3.cross(xAxis, viewDir, up);
            quat.setAxisAngle(qx, xAxis,0.3*Math.PI/180);
            var qx1 = quat.create();
            quat.conjugate(qx1,qx);
            quat.multiply(out, Pview, qx1);
            quat.multiply(Pview, qx, out);
            quat.multiply(out, Pnormal, qx1);
            quat.multiply(Pnormal, qx, out);
            viewDir = vec3.fromValues(Pview[0], Pview[1], Pview[2]);
            up = vec3.fromValues(Pnormal[0], Pnormal[1], Pnormal[2]);
        }
        else if(e.which === 40){
            //When click down arrow
            var qx = quat.create();
            //Set xAxis as the cross product of view direction and up
            vec3.cross(xAxis, viewDir, up);
            quat.setAxisAngle(qx, xAxis,-0.3*Math.PI/180);
            var qx1 = quat.create();
            quat.conjugate(qx1,qx);
            quat.multiply(out, Pview, qx1);
            quat.multiply(Pview, qx, out);
            quat.multiply(out, Pnormal, qx1);
            quat.multiply(Pnormal, qx, out);
            viewDir = vec3.fromValues(Pview[0], Pview[1], Pview[2]);
            up = vec3.fromValues(Pnormal[0], Pnormal[1], Pnormal[2]); 
        }
        else if(e.which === 37){
            //When click left arrow
            var qy = quat.create();
            //Set zAxis as the view direction
            var zAxis = viewDir;
            quat.setAxisAngle(qy, zAxis, 0.6*Math.PI/180);
            var qy1 = quat.create();
            quat.conjugate(qy1,qy);
            quat.multiply(out, Pnormal, qy1);
            quat.multiply(Pnormal, qy, out);
            up = vec3.fromValues(Pnormal[0], Pnormal[1], Pnormal[2]);
           
        }
        else if(e.which === 39){
            //When click right arrow
            var qy = quat.create();
            //Set zAxis as the view direction
            var zAxis = viewDir;
            quat.setAxisAngle(qy, zAxis, -0.6*Math.PI/180);
            var qy1 = quat.create();
            quat.conjugate(qy1,qy);
            quat.multiply(out, Pnormal, qy1);
            quat.multiply(Pnormal, qy, out);
            up = vec3.fromValues(Pnormal[0], Pnormal[1], Pnormal[2]);      
       }
       
   }
    
}

//----------------------------------------------------------------------------------
/**
 * Start up to set the canvas, shaders, buffers and set the clear color.
 * Request animation frame, draw and do animations.
 */
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

//----------------------------------------------------------------------------------
/**
 * Request animation frame to tell the broswer to animate and give it a function to 
 * call before the the next repaint. Then draw and animate.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}


