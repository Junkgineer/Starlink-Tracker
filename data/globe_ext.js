window.ENCOM = (window.ENCOM || {});
window.ENCOM.Globe = require(['js/app/globe.js']);

// var TWEEN = require(['js/lib/Tween.js'])
// THREE = require('js/lib/three')
// Satellite = require('js/satellite.js')

require([
'js/lib/jquery',
'js/app/globe.js',
'js/lib/Tween.js',
'js/lib/three.min.js',
'js/app/satellite.js'], function($, ENCOM, TWEEN, Globe, Satellite) {

    var createParticles = function(){

        if(this.hexGrid){
            this.scene.remove(this.hexGrid);
        }
    
        var pointVertexShader = [
            "#define PI 3.141592653589793238462643",
            "#define DISTANCE 500.0",
            "#define INTRODURATION " + (parseFloat(this.introLinesDuration) + .00001),
            "#define INTROALTITUDE " + (parseFloat(this.introLinesAltitude) + .00001),
            "attribute float lng;",
            "uniform float currentTime;",
            "varying vec4 vColor;",
            "",
            "void main()",
            "{",
            "   vec3 newPos = position;",
            "   float opacityVal = 0.0;",
            "   float introStart = INTRODURATION * ((180.0 + lng)/360.0);",
            "   if(currentTime > introStart){",
            "      opacityVal = 1.0;",
            "   }",
            "   if(currentTime > introStart && currentTime < introStart + INTRODURATION / 8.0){",
            "      newPos = position * INTROALTITUDE;",
            "      opacityVal = .3;",
            "   }",
            "   if(currentTime > introStart + INTRODURATION / 8.0 && currentTime < introStart + INTRODURATION / 8.0 + 200.0){",
            "      newPos = position * (1.0 + ((INTROALTITUDE-1.0) * (1.0-(currentTime - introStart-(INTRODURATION/8.0))/200.0)));",
            "   }",
            "   vColor = vec4( color, opacityVal );", //     set color associated to vertex; use later in fragment shader.
            "   gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);",
            "}"
        ].join("\n");
    
        var pointFragmentShader = [
            "varying vec4 vColor;",     
            "void main()", 
            "{",
            "   gl_FragColor = vColor;",
            "   float depth = gl_FragCoord.z / gl_FragCoord.w;",
            "   float fogFactor = smoothstep(" + parseInt(this.cameraDistance) +".0," + (parseInt(this.cameraDistance+300)) +".0, depth );",
            "   vec3 fogColor = vec3(0.0);",
            "   gl_FragColor = mix( vColor, vec4( fogColor, gl_FragColor.w ), fogFactor );",
            "}"
        ].join("\n");
    
        var pointAttributes = {
            lng: {type: 'f', value: null}
        };
    
        this.pointUniforms = {
            currentTime: { type: 'f', value: 0.0}
        }
    
        var pointMaterial = new THREE.ShaderMaterial( {
            uniforms:       this.pointUniforms,
            attributes:     pointAttributes,
            vertexShader:   pointVertexShader,
            fragmentShader: pointFragmentShader,
            transparent:    true,
            vertexColors: THREE.VertexColors,
            side: THREE.DoubleSide
        });
    
        var triangles = this.tiles.length * 4;
    
        var geometry = new THREE.BufferGeometry();
    
        geometry.addAttribute( 'index', Uint16Array, triangles * 3, 1 );
        geometry.addAttribute( 'position', Float32Array, triangles * 3, 3 );
        geometry.addAttribute( 'normal', Float32Array, triangles * 3, 3 );
        geometry.addAttribute( 'color', Float32Array, triangles * 3, 3 );
        geometry.addAttribute( 'lng', Float32Array, triangles * 3, 1 );
    
        var lng_values = geometry.attributes.lng.array;
    
        var baseColorSet = pusherColor(this.baseColor).hueSet();
        var myColors = [];
        for(var i = 0; i< baseColorSet.length; i++){
            myColors.push(baseColorSet[i].shade(Math.random()/3.0));
        }
    
        // break geometry into
        // chunks of 21,845 triangles (3 unique vertices per triangle)
        // for indices to fit into 16 bit integer number
        // floor(2^16 / 3) = 21845
    
        var chunkSize = 21845;
    
        var indices = geometry.attributes.index.array;
    
        for ( var i = 0; i < indices.length; i ++ ) {
    
            indices[ i ] = i % ( 3 * chunkSize );
    
        }
    
        var positions = geometry.attributes.position.array;
        var colors = geometry.attributes.color.array;
    
    
        var n = 800, n2 = n/2;  // triangles spread in the cube
        var d = 12, d2 = d/2;   // individual triangle size
    
        var addTriangle = function(k, ax, ay, az, bx, by, bz, cx, cy, cz, lat, lng, color){
            var p = k * 3;
            var i = p * 3;
            var colorIndex = Math.floor(Math.random()*myColors.length);
            var colorRGB = myColors[colorIndex].rgb();
    
            lng_values[p] = lng;
            lng_values[p+1] = lng;
            lng_values[p+2] = lng;
    
            positions[ i ]     = ax;
            positions[ i + 1 ] = ay;
            positions[ i + 2 ] = az;
    
            positions[ i + 3 ] = bx;
            positions[ i + 4 ] = by;
            positions[ i + 5 ] = bz;
    
            positions[ i + 6 ] = cx;
            positions[ i + 7 ] = cy;
            positions[ i + 8 ] = cz;
    
            colors[ i ]     = color.r;
            colors[ i + 1 ] = color.g;
            colors[ i + 2 ] = color.b;
    
            colors[ i + 3 ] = color.r;
            colors[ i + 4 ] = color.g;
            colors[ i + 5 ] = color.b;
    
            colors[ i + 6 ] = color.r;
            colors[ i + 7 ] = color.g;
            colors[ i + 8 ] = color.b;
    
        };
    
        for(var i =0; i< this.tiles.length; i++){
            var t = this.tiles[i];
            var k = i * 4;
    
            var colorIndex = Math.floor(Math.random()*myColors.length);
            var colorRGB = myColors[colorIndex].rgb();
            var color = new THREE.Color();
    
            color.setRGB(colorRGB[0]/255.0, colorRGB[1]/255.0, colorRGB[2]/255.0);
    
            addTriangle(k, t.b[0].x, t.b[0].y, t.b[0].z, t.b[1].x, t.b[1].y, t.b[1].z, t.b[2].x, t.b[2].y, t.b[2].z, t.lat, t.lon, color);
            addTriangle(k+1, t.b[0].x, t.b[0].y, t.b[0].z, t.b[2].x, t.b[2].y, t.b[2].z, t.b[3].x, t.b[3].y, t.b[3].z, t.lat, t.lon, color);
            addTriangle(k+2, t.b[0].x, t.b[0].y, t.b[0].z, t.b[3].x, t.b[3].y, t.b[3].z, t.b[4].x, t.b[4].y, t.b[4].z, t.lat, t.lon, color);
    
            if(t.b.length > 5){ // for the occasional pentagon that i have to deal with
                addTriangle(k+3, t.b[0].x, t.b[0].y, t.b[0].z, t.b[5].x, t.b[5].y, t.b[5].z, t.b[4].x, t.b[4].y, t.b[4].z, t.lat, t.lon, color);
            }
    
        }
    
        geometry.offsets = [];
    
        var offsets = triangles / chunkSize;
    
        for ( var i = 0; i < offsets; i ++ ) {
    
            var offset = {
                start: i * chunkSize * 3,
                index: i * chunkSize * 3,
                count: Math.min( triangles - ( i * chunkSize ), chunkSize ) * 3
            };
    
            geometry.offsets.push( offset );
    
        }
    
        geometry.computeBoundingSphere();
    
        this.hexGrid = new THREE.Mesh( geometry, pointMaterial );
        this.scene.add( this.hexGrid );
    
    };
    
    function Globe(width, height, opts){
        var baseSampleMultiplier = .7;
    
        if(!opts){
            opts = {};
        }
    
        this.width = width;
        this.height = height;
        // this.smokeIndex = 0;
        this.points = [];
        this.satelliteAnimations = [];
        this.satelliteMeshes = [];
        this.satellites = {};
        this.active = true;
    
        var defaults = {
            font: "Inconsolata",
            baseColor: "#ffcc00",
            markerColor: "#ffcc00",
            pinColor: "#00eeee",
            satelliteColor: "#ff0000",
            blankPercentage: 0,
            thinAntarctica: .01, // only show 1% of antartica... you can't really see it on the map anyhow
            mapUrl: "resources/equirectangle_projection.png",
            scale: 1.0,
            dayLength: 28000,
            pointsPerDegree: 1.1,
            pointSize: .6,
            pointsVariance: .2,
            maxPins: 2000,
            maxMarkers: 2000,
            data: [],
            tiles: [],
            viewAngle: 0
        };
    
        for(var i in defaults){
            if(!this[i]){
                this[i] = defaults[i];
                if(opts[i]){
                    this[i] = opts[i];
                }
            }
        }
        this.setScale(this.scale);
    
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setSize( this.width, this.height);
    
        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;
    
        this.domElement = this.renderer.domElement;
    
        for(var i = 0; i< this.data.length; i++){
            this.data[i].when = this.introLinesDuration*((180+this.data[i].lng)/360.0) + 500; 
        }
    
    
    }
    
    /* public globe functions */
    
    Globe.prototype.init = function(cb){
    
        // create the camera
        this.camera = new THREE.PerspectiveCamera( 50, this.width / this.height, 1, this.cameraDistance + 300 );
        this.camera.position.z = this.cameraDistance;
    
        this.cameraAngle=(Math.PI);
    
        // create the scene
        this.scene = new THREE.Scene();
    
        this.scene.fog = new THREE.Fog( 0x000000, this.cameraDistance, this.cameraDistance+300 );
    
        createIntroLines.call(this);
    
        // create the smoke particles
    
        // this.smokeProvider = new SmokeProvider(this.scene);
    
        createParticles.call(this);
        setTimeout(cb, 500);
    };
    Globe.prototype.destroy = function(callback){
    
        var _this = this;
        this.active = false;
    
        setTimeout(function(){
            while(_this.scene.children.length > 0){
                _this.scene.remove(_this.scene.children[0]);
            }
            if(typeof callback == "function"){
                callback();
            }
    
        }, 1000);
    
    };
    Globe.prototype.addSatellite = function(lat, lon, altitude, opts, texture, animator){
        /* texture and animator are optimizations so we don't have to regenerate certain 
            * redundant assets */
    
        if(!opts){
            opts = {};
        }
    
        if(opts.coreColor == undefined){
            opts.coreColor = this.satelliteColor;
        }
    
        var satellite = new Satellite(lat, lon, altitude, this.scene, opts, texture, animator);
    
        if(!this.satellites[satellite.toString()]){
            this.satellites[satellite.toString()] = satellite;
        }
    
        satellite.onRemove(function(){
                delete this.satellites[satellite.toString()];
                }.bind(this));
    
        return satellite;
    
    };
    Globe.prototype.addConstellation = function(sats, opts){
    
        /* TODO: make it so that when you remove the first in a constellation it removes all others */
    
        var texture,
        animator,
        satellite,
        constellation = [];
    
        for(var i = 0; i< sats.length; i++){
            if(i === 0){
                satellite = this.addSatellite(sats[i].lat, sats[i].lon, sats[i].altitude, opts);
            } else {
                satellite = this.addSatellite(sats[i].lat, sats[i].lon, sats[i].altitude, opts, constellation[0].canvas, constellation[0].texture);
            }
            constellation.push(satellite);
    
        }
    
        return constellation;
    
    }
    Globe.prototype.setScale = function(_scale){
        this.scale = _scale;
        this.cameraDistance = 1700/_scale;
        if(this.scene && this.scene.fog){
            this.scene.fog.near = this.cameraDistance;
            this.scene.fog.far = this.cameraDistance + 300;
            createParticles.call(this);
            this.camera.far = this.cameraDistance + 300;
            this.camera.updateProjectionMatrix();
        }
    };
    Globe.prototype.tick = function(){
    
        if(!this.camera){
            return;
        }
    
        if(!this.firstRunTime){
            this.firstRunTime = Date.now();
        }
        addInitialData.call(this);
        TWEEN.update();
    
        if(!this.lastRenderDate){
            this.lastRenderDate = new Date();
        }
    
        if(!this.firstRenderDate){
            this.firstRenderDate = new Date();
        }
    
        this.totalRunTime = new Date() - this.firstRenderDate;
    
        var renderTime = new Date() - this.lastRenderDate;
        this.lastRenderDate = new Date();
        var rotateCameraBy = (2 * Math.PI)/(this.dayLength/renderTime);
    
        this.cameraAngle += rotateCameraBy;
    
        if(!this.active){
            this.cameraDistance += (1000 * renderTime/1000);
        }
    
    
        this.camera.position.x = this.cameraDistance * Math.cos(this.cameraAngle) * Math.cos(this.viewAngle);
        this.camera.position.y = Math.sin(this.viewAngle) * this.cameraDistance;
        this.camera.position.z = this.cameraDistance * Math.sin(this.cameraAngle) * Math.cos(this.viewAngle);
    
    
        for(var i in this.satellites){
            this.satellites[i].tick(this.camera.position, this.cameraAngle, renderTime);
        }
    
        for(var i = 0; i< this.satelliteMeshes.length; i++){
            var mesh = this.satelliteMeshes[i];
            mesh.lookAt(this.camera.position);
            mesh.rotateZ(mesh.tiltDirection * Math.PI/2);
            mesh.rotateZ(Math.sin(this.cameraAngle + (mesh.lon / 180) * Math.PI) * mesh.tiltMultiplier * mesh.tiltDirection * -1);
    
        }
    
        if(this.introLinesDuration > this.totalRunTime){
            if(this.totalRunTime/this.introLinesDuration < .1){
                this.introLines.children[0].material.opacity = (this.totalRunTime/this.introLinesDuration) * (1 / .1) - .2;
            }if(this.totalRunTime/this.introLinesDuration > .8){
                this.introLines.children[0].material.opacity = Math.max(1-this.totalRunTime/this.introLinesDuration,0) * (1 / .2);
            } else {
                this.introLines.children[0].material.opacity = 1;
            }
            this.introLines.rotateY((2 * Math.PI)/(this.introLinesDuration/renderTime));
        } else if(this.introLines){
            this.scene.remove(this.introLines);
            delete[this.introLines];
        }
    
        // do the shaders
    
        this.pointUniforms.currentTime.value = this.totalRunTime;
    
        this.smokeProvider.tick(this.totalRunTime);
    
        this.camera.lookAt( this.scene.position );
        this.renderer.render( this.scene, this.camera );
    
    }
    module.exports = Globe;
});