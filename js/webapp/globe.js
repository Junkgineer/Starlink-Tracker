/**
 * dat.globe Javascript WebGL Globe Toolkit
 * https://github.com/dataarts/webgl-globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import * as THREE from '../lib/THREE/three.module.js';
import { Constellation, CallOut } from './satellite.js'
import { EarthMesh, AtmosphereMesh } from './coremesh.js'

var clock = new THREE.Clock();
class Globe {
    constructor(globesettings = new GlobeSettings()) {
        this.GlobeSettings = globesettings;
        this.camera;
        this.scene;
        this.renderer;
        this.cameralight;
        this.globemesh;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params = { Line: { threshold: 1 }, Point: { threshold: 1 } }
        this.intersectedObject;
        this.intersectedCategory;
        this.callout = new CallOut();
        this.textureLoader = new THREE.TextureLoader();
        this.mesh;
        this.mouse = new THREE.Vector2();
        this.atmosphere;
        this.width;
        this.height;
        this.zoomSpeed = 50;
        this.curZoomSpeed = 0;
        this.mouseOnDown = { x: 0, y: 0 };
        this.point
        this.rotation = { x: 0, y: 0 };
        this.target = { x: Math.PI * 3 / 2, y: Math.PI / 6.0 };
        this.targetOnDown = { x: 0, y: 0 };
        this.distance = 100000;
        this.distanceTarget = 100000;

        this.colorFn = function (x) {
            var c = new THREE.Color();
            c.setHSL((0.6 - (x * 0.5)), 1.0, 0.5);
            return c;
        };

        this.__defineGetter__('time', function () {
            return this._time || 0;
        });

        this.__defineSetter__('time', function (t) {
            var validMorphs = [];
            var morphDict = this.points.morphTargetDictionary;
            for (var k in morphDict) {
                if (k.indexOf('morphPadding') < 0) {
                    validMorphs.push(morphDict[k]);
                }
            }
            validMorphs.sort();
            var l = validMorphs.length - 1;
            var scaledt = t * l + 1;
            var index = Math.floor(scaledt);
            for (i = 0; i < validMorphs.length; i++) {
                this.points.morphTargetInfluences[validMorphs[i]] = 0;
            }
            var lastIndex = index - 1;
            var leftover = scaledt - index;
            if (lastIndex >= 0) {
                this.points.morphTargetInfluences[lastIndex] = 1 - leftover;
            }
            this.points.morphTargetInfluences[index] = leftover;
            this._time = t;
        });
    };
    init = () => {
        console.log('Running globe...');
        this.GlobeSettings.Container.style.color = '#fff';
        this.GlobeSettings.Container.style.font = '13px/20px Arial, sans-serif';

        this.width = this.GlobeSettings.Container.offsetWidth || window.innerWidth;
        this.height = this.GlobeSettings.Container.offsetHeight || window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(30, this.width / this.height, 1, 10000);
        this.camera.position.z = this.distance;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        this.scene = new THREE.Scene();
        this.scene.name = 'mainscene'

        this.globemesh = EarthMesh();

        this.scene.add(this.globemesh);
        this.mesh = AtmosphereMesh();
        this.scene.add(this.mesh);
        
        this.cameralight = new THREE.DirectionalLight(0xffffff, 1);
        this.scene.add(this.cameralight)

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setClearColor(0x000000, 0);

        this.renderer.setSize(this.width, this.height);

        this.renderer.domElement.style.position = 'absolute';

        this.GlobeSettings.Container.appendChild(this.renderer.domElement);
        this.GlobeSettings.Container.addEventListener('mousemove', this.onMouseMove, false)
        this.GlobeSettings.Container.addEventListener('mousedown', this.onMouseDown, false);
        this.GlobeSettings.Container.addEventListener('mousewheel', this.onMouseWheel, false);
        document.addEventListener('keydown', this.onDocumentKeyDown, false);
        window.addEventListener('resize', this.onWindowResize, false);

        this.GlobeSettings.Container.addEventListener('mouseover', function () {
            this.renderer = true;
        }, false);
        this.GlobeSettings.Container.addEventListener('mouseout', function () {
            this.renderer = false;
        }, false);
        this.GlobeSettings.Constellation.init(this.scene, this.camera);
    }
    begin = () => {
        this.GlobeSettings.Constellation.CompileTLE();
        this.animate();
    }
    getOffset(el) {
        const rect = el.getBoundingClientRect(),
            scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
            scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
    }    
    onMouseMove = (event) => {
        clock.start();
        // Change the mouse coords to range -1 1 for raycaster.
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Only check the hitboxes for intersections
        // this.GlobeSettings.Constellation.HitBoxes.add(this.globemesh)
        const intersects = this.raycaster.intersectObjects(this.GlobeSettings.Constellation.HitBoxes.children);
        if (intersects.length) {
            if (intersects[0].Category != 'globe') {
                this.callout.Canvas.style.visibility = 'visible'
                const offset = this.getOffset(this.GlobeSettings.Container),
                    relPos = {
                        x: event.pageX - offset.left,
                        y: event.pageY - offset.top
                    };
                this.mouse.x = (relPos.x / this.width) * 2 - 1;
                this.mouse.y = -(relPos.y / this.height) * 2 + 1;

                // Move the callout
                this.callout.Canvas.style.top = (relPos.y - 45) + 'px';
                this.callout.Canvas.style.left = (relPos.x - 10) + 'px';
                this.callout.Latitude = intersects[0].object.Latitude;
                this.callout.Longitude = intersects[0].object.Longitude;
                this.callout.Altitude = intersects[0].object.Altitude;
                this.callout.ID = intersects[0].object.ID;
                if (intersects[0].object.Category == 'Satellite') {
                    this.callout.Create(intersects[0].object.name, intersects[0].object.Category);
                } else if (intersects[0].object.Category == 'BaseStation') {
                    this.callout.Country = intersects[0].object.Country
                    this.callout.Description = intersects[0].object.Description;
                    this.callout.Create(intersects[0].object.Town, intersects[0].object.Category, intersects[0].object.Description);
                }
                this.GlobeSettings.Container.appendChild(this.callout.Canvas);
            } else {
                console.log('GLOBE')
            }


        } else {
            // this.callout.FadeOut();
            // this.reticle.FadeOut();
            // this.reticle.Canvas.style.visibility = 'hidden';
            this.callout.Canvas.style.visibility = 'hidden';
        }
    }
    onMouseDown = (event) => {
        const intersects = this.raycaster.intersectObjects(this.GlobeSettings.Constellation.HitBoxes.children);
        if (intersects.length && intersects[0].Category != 'globe') {
            console.log(intersects[0].object.Category)
            this.GlobeSettings.Constellation.Clicked(intersects[0].object.name, intersects[0].object.Category);
        } else {
            event.preventDefault();
            // Firstly, remove the standard mouse handler (for doing the callouts)
            this.GlobeSettings.Container.removeEventListener('mousemove', this.onMouseMove, false)
            // And add the globe dragger
            this.GlobeSettings.Container.addEventListener('mousemove', this.onMouseDownMove, false);
            this.GlobeSettings.Container.addEventListener('mouseup', this.onMouseUp, false);
            this.GlobeSettings.Container.addEventListener('mouseout', this.onMouseOut, false);

            this.mouseOnDown.x = - event.clientX;
            this.mouseOnDown.y = event.clientY;

            this.targetOnDown.x = this.target.x;
            this.targetOnDown.y = this.target.y;

            this.GlobeSettings.Container.style.cursor = 'move';
        }

    }
    onMouseDownMove = (event) => {
        this.mouse.x = - event.clientX;
        this.mouse.y = event.clientY;

        var zoomDamp = this.distance / 1000;

        this.target.x = this.targetOnDown.x + (this.mouse.x - this.mouseOnDown.x) * 0.005 * zoomDamp;
        this.target.y = this.targetOnDown.y + (this.mouse.y - this.mouseOnDown.y) * 0.005 * zoomDamp;

        this.target.y = this.target.y > this.PI_HALF ? this.PI_HALF : this.target.y;
        this.target.y = this.target.y < - this.PI_HALF ? - this.PI_HALF : this.target.y;

        // console.log('autorotation stopped.');
        this.idle = false;
        clock.start();
    }
    onMouseUp = (event) => {
        // Add back in the standard mouse handler...
        this.GlobeSettings.Container.addEventListener('mousemove', this.onMouseMove, false)
        // ...and remove the globe dragger
        this.GlobeSettings.Container.removeEventListener('mousemove', this.onMouseDownMove, false);
        this.GlobeSettings.Container.removeEventListener('mouseup', this.onMouseUp, false);
        this.GlobeSettings.Container.removeEventListener('mouseout', this.onMouseOut, false);
        this.GlobeSettings.Container.style.cursor = 'auto';
    }
    onMouseOut = (event) => {
        this.GlobeSettings.Container.removeEventListener('mousemove', this.onMouseDownMove, false);
        this.GlobeSettings.Container.removeEventListener('mouseup', this.onMouseUp, false);
        this.GlobeSettings.Container.removeEventListener('mouseout', this.onMouseOut, false);
    }
    onMouseWheel = (event) => {
        event.preventDefault();
        if (this.renderer) {
            this.zoom(event.wheelDeltaY * 0.6);
        }
        return false;
    }
    onDocumentKeyDown = (event) => {
        switch (event.keyCode) {
            case 38:
                zoom(100);
                event.preventDefault();
                break;
            case 40:
                zoom(-100);
                event.preventDefault();
                break;
        }
    }
    onWindowResize = (event) => {
        this.camera.aspect = this.GlobeSettings.Container.offsetWidth / this.GlobeSettings.Container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.GlobeSettings.Container.offsetWidth, this.GlobeSettings.Container.offsetHeight);
    }
    zoom = (delta) => {
        this.distanceTarget -= delta;
        this.distanceTarget = this.distanceTarget > 1000 ? 1000 : this.distanceTarget;
        this.distanceTarget = this.distanceTarget < 350 ? 350 : this.distanceTarget;
    }
    autoRotate = () => {
        if (clock.getElapsedTime() > 10) {
            this.target.x -= 0.001;
            this.idle = true;
        }
    }
    render = () => {
        this.zoom(this.curZoomSpeed);

        this.rotation.x += (this.target.x - this.rotation.x) * 0.1;
        this.rotation.y += (this.target.y - this.rotation.y) * 0.1;
        this.distance += (this.distanceTarget - this.distance) * 0.3;

        this.camera.position.x = this.distance * Math.sin(this.rotation.x) * Math.cos(this.rotation.y);
        this.camera.position.y = this.distance * Math.sin(this.rotation.y);
        this.camera.position.z = this.distance * Math.cos(this.rotation.x) * Math.cos(this.rotation.y);

        // Slowly spin the globe if IdleRotate is enabled, and there's been no mouse movement.
        if (this.GlobeSettings.IdleRotate === true) {
            this.autoRotate();
        }
        // Run the animation function for each selected object.
        this.GlobeSettings.Constellation.SelectedObjects.forEach(sat => {
            sat.Animate();
        })
        this.cameralight.position.x = this.camera.position.x;
        this.cameralight.position.y = this.camera.position.y;
        this.cameralight.position.z = this.camera.position.z + 500;
        this.camera.lookAt(this.mesh.position);
        this.renderer.render(this.scene, this.camera);
    }
    animate = () => {
        requestAnimationFrame(this.animate);
        TWEEN.update();
        this.render();
    };
}
// GlobeSettings is a class to hold the runtime environment variables and settings.
class GlobeSettings {
    constructor(container = document.createElement('div'), constellation = new Constellation()){
        this.Container = container;
        this.Constellation = constellation;
        this.IdleRotate = true;
        this.IdleRotateTimeOut;
    }
}
export { Globe, GlobeSettings };