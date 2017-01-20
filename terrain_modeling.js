/**
 * @fileoverview Utilities for handling textareas.
 * @author wwang128
 */

//-------------------------------------------------------------------------
/**
 * Operates on an instance of MyClass and returns something.
 * @param {n} Number of the grid.
 * @param {minX} Minimum value of points on X axis.
 * @param {maxX} Maximum value of points on X axis.
 * @param {minY} Minimum value of points on Y axis.
 * @param {maxY} Maximum value of points on Y axis.
 * @param {vertexArray} Array of vertices to be set up.
 * @param {faceArray} Array of faces to be set up.
 * @param {normalArray} Array of normals to be set up.
 * @param {colorArray} Array of colors to be set up.
 * @return {numT} Number of triangles.
 */
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray,colorArray){
    
    //Set up vertex position values 
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(minY+deltaY*i);
           vertexArray.push(0);
           
           normalArray.push(0);
           normalArray.push(0);
           normalArray.push(1);

       }

    //Set up face values 
    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    
    //Update vertexArray z value and normalArray
    heightMapCreate(n,vertexArray, faceArray, normalArray, colorArray);
    return numT;
}

//-------------------------------------------------------------------------
/**
 * Generate lines from indexed triangles.
 * @param {faceArray} The face array.
 * @param {lineArray} The line array.
 */
function generateLinesFromIndexedTriangles(faceArray,lineArray){
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}

//-------------------------------------------------------------------------
/**
 * Creat height map by using diamond square algorithm
 * @param {min} The minimum value.
 * @param {max} The maximum value.
 * @return {Math.random() * (max - min)} The random value in the range between 
 * the min and max values.
 */
function getRandom(min, max) {
    return Math.random() * (max - min);
}

//-------------------------------------------------------------------------
/**
 * Creat height map by using diamond square algorithm
 * @param {n} Number of the grid.
 * @param {vertexArray} Array of vertices to be set up.
 * @param {faceArray} Array of faces to be set up.
 * @param {normalArray} Array of normals to be set up.
 * @param {colorArray} Array of colors to be set up.
 */
function heightMapCreate( n,vertexArray, faceArray, normalArray,colorArray){
    var heights = [];
    var maxIndex = n;
    for(var i=0; i<=n; i++){
        var columns = [];
        for(var j=0; j<=n; j++)
            columns[j] = 0;
        heights[i] = columns;
    }
    var roughness = 11;
    diamondsquarestep(0,0,maxIndex, maxIndex, heights, roughness/2.5, maxIndex);
    updates(vertexArray, heights, faceArray, n,normalArray,colorArray);
}

//-------------------------------------------------------------------------
/**
 * Diamond square steps using breadth-first method.
 * @param {startX} Minimum value of X.
 * @param {startY} Minimum value of Y.
 * @param {endX} Maximum value of X.
 * @param {endY} Maximum value of Y.
 * @param {heights} The height map.
 * @param {roughness} Range between max and min.
 * @param {diff} Maximum difference between the start point and the end point.
 */
function diamondsquarestep(startX, startY, endX, endY, heights, roughness, diff){
    
    if(diff > 1){
        
        for(var i=startX+diff; i<endX; i+=diff)
            for(var i=startY+diff; i<endX; i+=diff)
                {
                    var topleft = heights[i-diff][j-diff];
                    var botleft = heights[i][j-diff];
                    var topright = heights[i-diff][j];
                    var botright = heights[i][j];
                    var mid = (topleft+botleft+topright+botright)/4 + getRandom(0, roughness);
                    heights[i-diff/2][j-diff/2]= mid;
                }
        for(var i=startX+2*diff; i<endX; i+=diff)
            for(var j=startY+2*diff; j<endY; j+=diff)
                {
                    var topleft = heights[i-diff][j-diff];
                    var botleft = heights[i][j-diff];
                    var topright = heights[i-diff][j];
                    var botright = heights[i][j];
                    var e = heights[i-diff/2][j-diff/2];
                    
                    var f = heights[i - diff][j - diff/ 2] = (topleft + topright + e + heights[i - 3 * diff / 2][j - diff / 2]) / 4 + getRandom(0, roughness);
                    var g = heights[i - diff/ 2][j - diff] = (topleft + botleft + e + heights[i - diff / 2][j - 3 * diff / 2]) / 4 + getRandom(0, roughness);
                }
        
        diamondsquarestep(startX, startX, endX, endY, heights, roughness/ 2, diff / 2);  
        
    }
}

//-------------------------------------------------------------------------
/**
 * Update z value and normal value for each vertex.
 * @param {vertexArray} Array of vertices to be set up.
 * @param {heights} The height map.
 * @param {faceArray} Array of faces to be set up.
 * @param {n} The max vertex index.
 * @param {normalArray} Array of normals to be set up.
 * @param {colorArray} Array of colors to be set up.
 */
function updates(vertexArray, heights, faceArray, n, normalArray, colorArray){
    //Updates z value for vertexArray
    var len = vertexArray.length;
    var k=0;
    
    for(var i=0; i<=n; i++){
        for(var j=0; j<=n; j++){
            
            vertexArray[k+2] = heights[i][j];
            
            k=k+3;
            
            //Set different color according to the height
            if(heights[i][j]<0.003)
               {
                    colorArray.push(0.94);
                    colorArray.push(1.82);
                    colorArray.push(2.30);
                    colorArray.push(1);       
               }
            else if (heights[i][j]<0.013)
                {
                    colorArray.push(0.78);
                    colorArray.push(1.97);
                    colorArray.push(2.11);
                    colorArray.push(1);
                }
            else if(heights[i][j]<0.31)
                {
                    colorArray.push(0.52);
                    colorArray.push(1.32);
                    colorArray.push(2.17);
                    colorArray.push(1);
                }
            else if(heights[i][j]<0.61)
                {
                    colorArray.push(0.51);
                    colorArray.push(1.24);
                    colorArray.push(2.18);
                    colorArray.push(1);    
                }
            else
                {
                    colorArray.push(0.42);
                    colorArray.push(0.55);
                    colorArray.push(1.13);
                    colorArray.push(100); 
                }
        }
    }
   
    //Create triangle normal
    len = faceArray.length;
    var triangleNormal = [];
    var i =0;
    while(i+3<=len){
        //Index for three points
        var p1 = faceArray[i];
        var p2 = faceArray[i+1];
        var p3 = faceArray[i+2];
        
        //Find three vectors for triangle
        var x1 = vertexArray[p1*3];
        var y1 = vertexArray[p1*3+1];
        var z1 = vertexArray[p1*3+2];
        var point1 = vec3.fromValues(x1, y1, z1);
        var x2 = vertexArray[p2*3];
        var y2 = vertexArray[p2*3+1];
        var z2 = vertexArray[p2*3+2];
        var point2 = vec3.fromValues(x2, y2, z2);
        var x3 = vertexArray[p3*3];
        var y3 = vertexArray[p3*3+1];
        var z3 = vertexArray[p3*3+2];
        var point3 = vec3.fromValues(x3, y3, z3);
        
        //Calculate normal for triangle
        var v1 = vec3.create();
        var v2 = vec3.create();
        vec3.subtract(v1, point3, point1);
        vec3.subtract(v2, point2, point1);
        vec3.cross(v2, v2,v1);
        vec3.normalize(v2, v2);
        
        //Put in triangleNormal array
        triangleNormal.push(v2);
    
        i = i+3;
    }
    
    //Find triangle that share every vertex and calculate normal for each vertex
    var len = vertexArray.length;
    i=0;
    while(i+3<=len){
        var normal =vec3.fromValues(0,0,0);
        var numNormal = 0;
        for(var k=0; k<faceArray.length; k++){
            if(i/3 == faceArray[k]){
                var normalIndex = Math.floor(k/3);
                vec3.add(normal, normal, triangleNormal[normalIndex]);
                numNormal++;
            }
            if(numNormal == 6)
                break;
        }
        vec3.normalize(normal,normal);
        //Update normal
        normalArray[i] = normal[0]/numNormal;
        normalArray[i+1] = normal[1]/numNormal;
        normalArray[i+2] = normal[2]/numNormal;
        i = i+3;
    }
    var i = 0;
}




