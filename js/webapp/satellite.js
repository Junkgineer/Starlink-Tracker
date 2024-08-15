import * as THREE from '../lib/THREE/three.module.js';
import * as SatelliteJS from '../lib/satellite.es.js';

export class Constellation {
    constructor() {
        this.Satellites = [];
        this.TLESatellites = [];
        this.TLESatelliteError = [];
        this.SatelliteModels = new THREE.Group();
        this.Basestations = [];
        this.BasestationModels = new THREE.Group();
        this.SelectedNames = [];
        this.SelectedObjects = [];
        this.HitBoxes = new THREE.Group();
        this.MinAltitude = 10000;
        this.MaxAltitude = 0;
        this.Name;
        this.Scene;
        this.Camera;
        this.TimeClock = setInterval(this.UpdateTime, 1000)
        this.Time = new Date(Date.now());
        this.LiveTrack = false;
        this.UpdateInterval = 60000;
        this.DOMElements = {
            titleElement: document.createElement('div'),
            satCountElement: document.createElement('div'),
            baseCountElement: document.createElement('div'),
            timeElement: document.createElement('div'),
            dateElement: document.createElement('div'),
            trackingElement: document.createElement('div'),
            minAltitudeElement: document.createElement('div'),
            maxAltitudeElement: document.createElement('div')
        }
    }
    init = (scene, camera) => {
        if (scene == undefined) {
            console.error('The given scene is undefined!')
            return;
        }
        if (camera == undefined) {
            console.error('The given camera is undefined!')
            return;
        }
        this.Scene = scene;
        this.Camera = camera;
    }
    AddSatellite = (name = 'None', id = 0, tle1, tle2, liveupdate = false, lighting = false, unk = false) => {
        let sat = new TLESatellite(name, id, tle1, tle2, liveupdate, this.Camera, lighting, unk);
        this.TLESatellites.push(sat);
    }
    AddUnknownSatellite = (lat = 0, lon = 0, alt = 0, id = 0, name = 'None', lighting = false) => {
        this.Satellites.push(new Satellite(lat, lon, alt, id, name, true, lighting));
    }
    AddBasestation = (lat, lon, town = 'None', country = 'Unknown', desc, id = 0, name = 'None', lighting = false) => {
        this.Basestations.push(new BaseStation(lat, lon, town, country, desc, id, name, this.Camera, lighting))
    }
    AddSunlight = () => {
        const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
        this.Scene.add(light);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.Scene.add(directionalLight);
    }
    Compile = () => {
        for (var i = 0; i < this.Satellites.length; i++) {
            this.Satellites[i].AniDuration = this.UpdateInterval
            this.Satellites[i].Create();
            this.SatelliteModels.add(this.Satellites[i].Model)
            this.HitBoxes.add(this.Satellites[i].HitBox)
        }
        this.Scene.add(this.SatelliteModels)

        for (var i = 0; i < this.Basestations.length; i++) {
            this.Basestations[i].Create();
            this.BasestationModels.add(this.Basestations[i].Model);
            this.HitBoxes.add(this.Basestations[i].HitBox);
        }
        this.Scene.add(this.BasestationModels)
        this.Scene.add(this.HitBoxes);
    }
    CompileTLE = () => {
        for (var i = 0; i < this.TLESatellites.length; i++) {
            this.TLESatellites[i].Create();

            if (this.TLESatellites[i].Altitude == 'NaN') {
                this.TLESatellites[i].isSelected = true;

                this.TLESatellites[i].isError = true;
            }
            if (this.TLESatellites[i].Altitude < this.MinAltitude && this.TLESatellites[i].Altitude != 'NaN') {
                this.MinAltitude = this.TLESatellites[i].Altitude;
            }
            if (this.TLESatellites[i].Altitude > this.MaxAltitude && this.TLESatellites[i].Altitude != 'NaN') {
                this.MaxAltitude = this.TLESatellites[i].Altitude;
            }

            if (this.TLESatellites[i].isError == false) {
                this.SatelliteModels.add(this.TLESatellites[i].Model)
                this.HitBoxes.add(this.TLESatellites[i].HitBox)
            } else {
                this.TLESatelliteError.push(this.TLESatellites[i].Name)
            }
        }
        console.warn(`Skipped ${this.TLESatelliteError.length} errored satellite records.`)
        this.Scene.add(this.SatelliteModels)

        for (var i = 0; i < this.Basestations.length; i++) {
            this.Basestations[i].Create();
            this.BasestationModels.add(this.Basestations[i].Model);
            this.HitBoxes.add(this.Basestations[i].HitBox); 
        }
        this.Scene.add(this.BasestationModels)
        this.Scene.add(this.HitBoxes);
        this.DOMElements.satCountElement.innerHTML = `${this.TLESatellites.length}`
        this.DOMElements.baseCountElement.innerHTML = `${this.Basestations.length}`
        this.DOMElements.minAltitudeElement.innerHTML = `${this.MinAltitude} KM`;
        this.DOMElements.maxAltitudeElement.innerHTML = `${this.MaxAltitude} KM`;
        this.DOMElements.timeElement.innerHTML = `${this.Time.toLocaleTimeString()}`;
        this.DOMElements.dateElement.innerHTML = `${this.Time.toLocaleDateString()}`;
        console.log(`Satellite LiveTrack Enabled: ${this.LiveTrack}`)
        if (this.LiveTrack === true) {
            console.log(`Update Interval: ${this.UpdateInterval / 1000} Seconds`)
            setInterval(this.Update, this.UpdateInterval);
        }
    }
    Update = () => {
        this.TLESatellites.forEach(tlesat => {
            if (tlesat.LiveUpdate === true) {
                tlesat.AniDuration = this.UpdateInterval;
                tlesat.LiveTrack();
            }
        });
    }
    UpdateTime = () => {
        this.Time = new Date(Date.now());
        this.DOMElements.timeElement.innerText = `${this.Time.toLocaleTimeString()}`;
    }
    Clicked = (name, category) => {
        if (category == 'Satellite') {
            if (this.SelectedNames.includes(name)) {
                let hold = [];
                this.SelectedObjects.forEach(obj => {
                    if (obj.Name == name) {
                        obj.Clicked();
                    } else {
                        hold.push(obj);
                    }
                })
                this.SelectedObjects = hold;
                this.SelectedNames.splice(this.SelectedNames.indexOf(name), 1);
                console.log(`Deselected Satellite ${name}`)
            } else {
                
                this.TLESatellites.forEach(obj => { 
                    if (obj.Name == name) {
                        this.SelectedObjects.push(obj);
                        this.SelectedNames.push(name);
                        obj.Clicked();
                        console.log(`Selected Satellite ${name}`);
                    }
                })
            }
        } else if (category == 'BaseStation') {
            if (this.SelectedNames.includes(name)) {
                let hold = [];
                this.SelectedObjects.forEach(obj => {
                    if (obj.Name == name) {
                        obj.Clicked();
                    } else {
                        hold.push(obj);
                    }
                })
                this.SelectedObjects = hold;
                this.SelectedNames.splice(this.SelectedNames.indexOf(name), 1);
                console.log(`Deselected Basestation ${name}`)
            } else {
                this.Basestations.forEach(obj => { 
                    if (obj.Name == name) {
                        this.SelectedObjects.push(obj);
                        this.SelectedNames.push(name);
                        obj.Clicked();
                        console.log(`Selected Basestation ${name}`);
                    }
                })
            }
        }

    }
}
export class BaseStation {
    #PIXEL_RATIO = (function () {
        var ctx = document.createElement('canvas').getContext('2d'),
            dpr = window.devicePixelRatio || 1,
            bsr = ctx.webkitBackingStorePixelRatio ||
                  ctx.mozBackingStorePixelRatio ||
                  ctx.msBackingStorePixelRatio ||
                  ctx.oBackingStorePixelRatio ||
                  ctx.backingStorePixelRatio || 1;
        return dpr / bsr;
      })();    
    constructor(lat, lon, town = 'None', country = 'Unknown', description = 'None', id = 0, name = 'None', camera, lighting = false) {
        this.ID = id;
        this.Category = 'BaseStation';
        this.Latitude = lat;
        this.Longitude = lon;
        this.Altitude = 0;
        this.BasX;
        this.BasY;
        this.BasZ;
        this.Name = name;
        this.Town = town;
        this.Country = country;
        this.Description = description;
        this.IsLit = lighting;
        this.Geometry;
        this.Material;
        this.Model;
        this.HitBox;
        // this.RangeFan;
        this.Camera = camera;
    }
    Create = () => {
        if (this.Latitude == undefined || this.Latitude == 0) {
            console.warn('Warning: Basestation ', this.id, 'has no latitude!');
        }
        if (this.Longitude == undefined || this.Longitude == 0) {
            console.warn('Warning: Basestation ', this.id, 'has no longitude!');
        }
        this.Geometry = new THREE.BoxGeometry(1, 1, 1);
        if (this.IsLit) {
            this.Material = new THREE.MeshPhongMaterial({ color: 0xFFFF00 });
        } else {
            this.Material = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        }

        let cube = new THREE.Mesh(this.Geometry, this.Material);
        this.GetCartesion();
        cube.position.x = this.BasX;
        cube.position.y = this.BasY;
        cube.position.z = this.BasZ;
        cube.Category = this.Category;

        this.Model = cube;

        let hitbox_geometry = new THREE.BoxGeometry(3,3,3);
        let hitbox_material = new THREE.MeshBasicMaterial({
            depthTest: false,
            transparent: true,
            opacity: 0
        });
        this.HitBox = new THREE.Mesh(hitbox_geometry, hitbox_material);
        this.HitBox.position.x = this.BasX;
        this.HitBox.position.y = this.BasY;
        this.HitBox.position.z = this.BasZ;
        this.HitBox.Category = this.Category;
        this.HitBox.name = this.Name;
        this.HitBox.Latitude = this.Latitude;
        this.HitBox.Longitude = this.Longitude;
        this.HitBox.Altitude = this.Altitude;
        this.HitBox.Town = this.Town;
        this.HitBox.Country = this.Country;
        this.HitBox.Description = this.Description;
        return this.Model;
    }
    Flag = () => {
        if (this.isFlagged) {
            if (this.Model.children.length) {
                this.Model.children = [];
            }
            this.isFlagged = false;
        } else {
            let flag = new Flag(this.Name);
            flag.Create();
            var flagTexture = new THREE.Texture(flag.Canvas) 
            flagTexture.needsUpdate = true;
            var flagGeometry = new THREE.PlaneGeometry( 100, 20 );
            var flagMaterial = new THREE.MeshBasicMaterial( { map: flagTexture, transparent: true, side: THREE.DoubleSide } );
            var flagPlane = new THREE.Mesh( flagGeometry, flagMaterial );
            flagPlane.type = 'flag';
            this.Model.add(flagPlane)
            this.isFlagged = true;
        }
    }
    Select = () => {
        if (this.isSelected) {
            if (this.Model.children.length) {
                this.Model.children = [];
            }
            this.isSelected = false;
        } else {
            const ratio = this.#PIXEL_RATIO;
            let selected = new Selected();
            selected.Create();
            var texture = new THREE.Texture(selected.Canvas) 
            texture.needsUpdate = true;
            var geometry = new THREE.PlaneGeometry( 7, 7 );
            var material = new THREE.MeshBasicMaterial( { map: texture, transparent: true, side: THREE.DoubleSide } );
            var plane = new THREE.Mesh( geometry, material );
            plane.type = 'select';
            this.Model.add(plane)
            this.isSelected = true;
        }
    }
    Clicked = () => {
        this.Flag();
    }
    Animate = () => {
        if (this.isSelected) {
            for (let i=0; i<this.Model.children.length; i++) {
                if (this.Model.children[i].type == 'select') {
                    this.Model.children[0].scale.set(1, 1, 1)
                }
            }
        } else if (this.isFlagged) {

        }
        for (let i=0; i<this.Model.children.length; i++) {
            this.Model.children[i].quaternion.copy(this.Camera.quaternion);
        }
    }
    GetCartesion = () => {
        let cart = utils.mapPoint(this.Latitude, this.Longitude, 200)
        this.BasX = cart.x;
        this.BasY = cart.y;
        this.BasZ = cart.z;
        return cart;
    }
}
export class TLESatellite {
    #ScaleRate = 0;
    #Growing = true;
    #PIXEL_RATIO = (function () {
        var ctx = document.createElement('canvas').getContext('2d'),
            dpr = window.devicePixelRatio || 1,
            bsr = ctx.webkitBackingStorePixelRatio ||
                  ctx.mozBackingStorePixelRatio ||
                  ctx.msBackingStorePixelRatio ||
                  ctx.oBackingStorePixelRatio ||
                  ctx.backingStorePixelRatio || 1;
        return dpr / bsr;
      })();
    constructor(name, id, tle1, tle2, liveupdate, camera, lighting = false, unk = false) {
        this.ID = id;
        this.Name = name;
        this.Category = 'Satellite';
        this.Unknown = '';
        this.LiveUpdate = liveupdate;
        this.isSelected = false;
        this.isHighlighted = false;
        this.isFlagged = false;
        this.TLE1 = tle1;
        this.TLE2 = tle2;
        this.TimeStamp;
        this.Latitude;
        this.Longitude;
        this.Altitude;
        this.SatX;
        this.SatY;
        this.SatZ;
        this.PositionHistory = [];
        this.MaxHistoryLength = 5
        this.IsLit = lighting;
        this.geometry;
        this.material;
        this.Model;
        this.SelectedModel;
        this.HitBox;
        this.Ani;
        this.AniDuration = 60000;
        this.Camera = camera;
        this.isError = false;
    }

    Create = () => {
        this.StandardSat();

        this.GetLLAfromTLE();
        this.GetCartesion();
        this.Model.position.x = this.SatX;
        this.Model.position.y = this.SatY;
        this.Model.position.z = this.SatZ;
        this.Model.Category = this.Category;
        this.Model.name = this.Name;
        this.Model.lat = this.Latitude;
        this.Model.lon = this.Longitude;
        this.Model.alt = this.Altitude;

        // Add an invisible, slightly larger sphere around the visible one
        //  to make it easier to hover/click
        let hitbox_geometry = new THREE.SphereGeometry(3, 8, 8);
        let hitbox_material = new THREE.MeshBasicMaterial({
            depthTest: false,
            transparent: true,
            opacity: 0
        });
        this.HitBox = new THREE.Mesh(hitbox_geometry, hitbox_material);
        this.HitBox.position.x = this.SatX;
        this.HitBox.position.y = this.SatY;
        this.HitBox.position.z = this.SatZ;
        this.HitBox.Category = this.Category;
        this.HitBox.name = this.Name;
        this.HitBox.Latitude = this.Latitude;
        this.HitBox.Longitude = this.Longitude;
        this.HitBox.Altitude = this.Altitude;
        this.HitBox.ID = this.ID;

        return this.Model;
    }
    Flag = () => {
        if (this.isFlagged) {
            if (this.Model.children.length) {
                this.Model.children = [];
            }
            this.isFlagged = false;
        } else {
            let flag = new Flag(this.Name);
            flag.Create();
            var flagTexture = new THREE.Texture(flag.Canvas) 
            flagTexture.needsUpdate = true;
            var flagGeometry = new THREE.PlaneGeometry( 100, 20 );
            var flagMaterial = new THREE.MeshBasicMaterial( { map: flagTexture, transparent: true, side: THREE.DoubleSide } );
            var flagPlane = new THREE.Mesh( flagGeometry, flagMaterial );
            flagPlane.type = 'flag';
            this.Model.add(flagPlane)
            this.isFlagged = true;
        }

    }
    Select = () => {
        if (this.isSelected) {
            if (this.Model.children.length) {
                this.Model.children = [];
            }
            this.isSelected = false;
        } else {
            const ratio = this.#PIXEL_RATIO;
            let selected = new Selected();
            selected.Create();
            var texture = new THREE.Texture(selected.Canvas) 
            texture.needsUpdate = true;
            var geometry = new THREE.PlaneGeometry( 7, 7 );
            var material = new THREE.MeshBasicMaterial( { map: texture, transparent: true, side: THREE.DoubleSide } );
            var plane = new THREE.Mesh( geometry, material );
            plane.type = 'select';
            this.Model.add(plane)
            this.isSelected = true;
        }
    }
    Clicked = () => {
        this.Flag();
    }
    Animate = () => {
        if (this.isHighlighted) {
            if (this.#Growing) {
                if (this.#ScaleRate >= 1.5) {
                    this.#Growing = false;
                }
                this.#ScaleRate += .025;
            } else {
                if (this.#ScaleRate <= 0.5) {
                    this.#Growing = true;
                }
                this.#ScaleRate -= .025;
            }
            for (let i=0; i<this.Model.children.length; i++) {
                if (this.Model.children[i].type == 'select') {
                    this.Model.children[i].scale.set(this.#ScaleRate, this.#ScaleRate, this.#ScaleRate)
                    this.Model.children[i].quaternion.copy(this.Camera.quaternion);
                }
            }
        } else if (this.isSelected) {
            for (let i=0; i<this.Model.children.length; i++) {
                if (this.Model.children[i].type == 'select') {
                    this.Model.children[0].scale.set(1, 1, 1)
                }
            }
        } else if (this.isFlagged) {

        }
        for (let i=0; i<this.Model.children.length; i++) {
            this.Model.children[i].quaternion.copy(this.Camera.quaternion);
        }
    }
    StandardSat = () => {
        this.geometry = new THREE.SphereGeometry(.5, 8, 8);
        if (this.Unknown) {
            if (this.IsLit) {
                this.material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            } else {
                this.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            }

        } else {
            if (this.IsLit) {
                this.material = new THREE.MeshPhongMaterial({ color: 0x00B0A9 });
            } else {
                this.material = new THREE.MeshBasicMaterial({ color: 0x00B0A9 });
            }
        }
        this.Model = new THREE.Mesh(this.geometry, this.material);

        this.Model.position.x = this.SatX;
        this.Model.position.y = this.SatY;
        this.Model.position.z = this.SatZ;
        this.Model.Category = this.Category;
        this.Model.name = this.Name;
        this.Model.lat = this.Latitude;
        this.Model.lon = this.Longitude;
        this.Model.alt = this.Altitude;
    }
    LiveTrack = () => {
        this.GetLLAfromTLE();
        this.GetCartesion();

        this.Ani = new TWEEN.Tween(this.Model.position)
            .to({
                x: this.SatX,
                y: this.SatY,
                z: this.SatZ
            }, this.AniDuration)
        this.HitBoxAni = new TWEEN.Tween(this.HitBox.position)
            .to({
                x: this.SatX,
                y: this.SatY,
                z: this.SatZ
            }, this.AniDuration)

        this.Ani.start();
        this.HitBoxAni.start();
    }
    MoveTo = (lat, lon, alt) => {
        this.Latitude = lat;
        this.Longitude = lon;
        this.Altitude = alt;
        this.GetCartesion();
        this.Ani = new TWEEN.Tween(this.Model.position)
            .to({
                x: this.SatX,
                y: this.SatY,
                z: this.SatZ
            }, this.AniDuration)
        this.HitBoxAni = new TWEEN.Tween(this.HitBox.position)
            .to({
                x: this.SatX,
                y: this.SatY,
                z: this.SatZ
            }, this.AniDuration)

        this.Ani.start();
        this.HitBoxAni.start();

        if (this.PositionHistory.Length < this.MaxHistoryLength) {
            this.PositionHistory.push((this.Satx, this.SatY, this.SatZ))
        } else {
            this.PositionHistory.shift();
            this.PositionHistory.push((this.Satx, this.SatY, this.SatZ))
        }
    }
    SetTimeStampFromSatRec = (satrec) => {
        const date = new Date(satrec.epochyr, 0);
        const timestamp = new Date();
        const hoursdec = `.${satrec.epochdays.toString().split('.')[1]}` * 24;
        timestamp.setHours(hoursdec.toString().split('.')[0]);
        const minutesdec = (`.${hoursdec.toString().split('.')[1]}` * 60);
        timestamp.setMinutes(minutesdec.toString().split('.')[0])
        const secondsdec = (`.${minutesdec.toString().split('.')[1]}` * 60);
        timestamp.setSeconds(secondsdec.toString().split('.')[0]);
        this.TimeStamp = timestamp;
        return timestamp;
    }
    GetLLAfromTLE = () => {
        let satrec = SatelliteJS.twoline2satrec(this.TLE1, this.TLE2);
        this.ID = satrec.satnum;
        this.SetTimeStampFromSatRec(satrec);
        const positionAndVelocity = SatelliteJS.propagate(satrec, new Date());
        if (positionAndVelocity.hasOwnProperty("position")) {
            const gmst = SatelliteJS.gstime(new Date());
            const position = SatelliteJS.eciToGeodetic(positionAndVelocity.position, gmst);
            this.Latitude = SatelliteJS.degreesLat(position.latitude);
            this.Longitude = SatelliteJS.degreesLong(position.longitude);
            this.Altitude = position.height.toString().split('.')[0];
        } else {
            this.isError = true;
        }

    }
    GetCartesion = () => {
        let cart = utils.mapPoint(this.Latitude, this.Longitude, this.Altitude * .5)
        this.SatX = cart.x;
        this.SatY = cart.y;
        this.SatZ = cart.z;
        return cart;
    }
}
export class CallOut {
    constructor(lat, lon, alt, id, town, desc, cc) {
        this.ID = id;
        this.Canvas = document.createElement('canvas');
        this.Canvas.width = 300
        this.Canvas.height = 150
        this.Canvas.classList.add('callout');
        this.ctx = this.Canvas.getContext("2d");
        this.Text;
        this.Text_Category;
        this.Latitude = lat;
        this.Longitude = lon;
        this.Altitude = alt;
        this.TimeStamp = new Date(Date.now());
        this.Town = town;
        this.Description = desc;
        this.Country = cc;
        this.CalX;
        this.CalY;
        this.CalZ;
        this.Category = 'Callout';
        this.Lock = false;
        this.DataSheet = document.createElement('canvas');
        this.fi = new TWEEN.Tween(this.Canvas.style)
            .to({
                opacity: 1
            }, 500)
        this.fo = new TWEEN.Tween(this.Canvas.style)
            .to({
                opacity: 0
            }, 500)
    }
    Create = (txt = 'None', txt_cat = 'None') => {
        // Erase what was on the canvas previously
        this.ctx.clearRect(0, 0, this.Canvas.width, this.Canvas.height)
        this.Text = txt;
        this.Text_Category = txt_cat;

        // target circle and underline
        this.ctx.strokeStyle = "#FFFFFF88";
        this.ctx.fillStyle = "#FFFFFF88";
        this.ctx.moveTo(10, 45);
        this.ctx.beginPath();
        this.ctx.arc(10, 45, 7, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.beginPath()
        this.ctx.arc(10, 45, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.lineTo(50, 25);
        this.ctx.lineTo(265, 25);
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.beginPath();

        // Title text bg
        this.ctx.fillStyle = "#FFFFFF12";
        this.ctx.fillRect(50, 5, 215, 20)

        // Title text
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.font = "15px Frank";
        this.ctx.fillText(this.Text, 55, 20);

        // TimeStamp
        this.ctx.font = "10px Frank";
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fillText(this.TimeStamp.toLocaleString(), 150, 37);

        // lat/lon section texts
        this.ctx.font = "8px Frank";
        this.ctx.fillStyle = "#FFFF00";
        this.ctx.fillText('Lat', 55, 50);
        this.ctx.fillText('Lon', 165, 50);

        // lat/lon sections outline boxes
        this.ctx.fillStyle = "#FFFFFF12";
        roundRect(this.ctx, 48, 40, 105, 40, 5, true);
        roundRect(this.ctx, 158, 40, 105, 40, 5, true);

        // lat/lon readings
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.font = "20px Frank";
        let lati = this.Latitude.toString();
        let long = this.Longitude.toString();
        if (lati.length > 9) {
            lati = lati.substring(0, 8)
        }
        if (long.length > 9) {
            long = long.substring(0, 8)
        }
        this.ctx.fillText(lati, 55, 70);
        this.ctx.fillText(long, 164, 70);

        if (this.Text_Category == 'Satellite') {
            // Under Line Greeble
            this.ctx.fillStyle = "#FFFFFF88";
            for (var i = 1; i <= 4; i++) {
                this.ctx.fillRect(40 + (i * 6) + 2, 28, 5, 10)
            }
            // Category
            this.ctx.font = "10px Frank";
            this.ctx.fillStyle = "#FFFF00";
            this.ctx.fillText(this.Text_Category, 75, 37);

            // After Category Greeble
            this.ctx.fillStyle = "#FFFFFF88";
            for (var i = 1; i <= 4; i++) {
                this.ctx.fillRect(115 + (i * 6) + 2, 28, 5, 10)
            }

            // Altitude
            this.ctx.font = "10px Frank";
            this.ctx.fillStyle = "#FFFF00";
            this.ctx.fillText('Alt', 55, 90);
            this.ctx.fillStyle = "#FFFFFF";
            this.ctx.fillText(this.Altitude, 75, 90);
            // NORAD
            this.ctx.font = "10px Frank";
            this.ctx.fillStyle = "#FFFF00";
            this.ctx.fillText('NORAD', 158, 90);
            this.ctx.fillStyle = "#FFFFFF";
            this.ctx.fillText(this.ID, 195, 90);
        } else if (this.Text_Category == 'BaseStation') {
            // Under Line Greeble
            this.ctx.fillStyle = "#FFFFFF88";
            for (var i = 1; i <= 3; i++) {
                this.ctx.fillRect(40 + (i * 6) + 2, 28, 5, 10)
            }

            // Category
            this.ctx.font = "10px Frank";
            this.ctx.fillStyle = "#FFFF00";
            this.ctx.fillText(this.Text_Category, 68, 37);

            // After Category Greeble
            this.ctx.fillStyle = "#FFFFFF88";
            for (var i = 1; i <= 3; i++) {
                this.ctx.fillRect(122 + (i * 6) + 2, 28, 5, 10)
            }
            // Country
            this.ctx.font = "10px Frank";
            this.ctx.fillStyle = "#FFFF00";
            this.ctx.fillText('Country', 55, 90);
            this.ctx.fillStyle = "#FFFFFF";
            this.ctx.fillText(this.Country, 100, 90);
        }
        this.Canvas.Category = this.Category;
        return this.Canvas;
    }
    GetCartesion = () => {
        let cart = utils.mapPoint(this.Latitude, this.Longitude, this.Altitude * .5)
        this.CalX = cart.x;
        this.CalY = cart.y;
        this.CalZ = cart.z;
        return cart;
    }
    FadeIn = () => {
        this.fi.start();
    }
    FadeOut = () => {
        this.fo.start();
        this.Canvas.style.opacity = 0;
    }
}
export class Flag {
    constructor(satname) {
        this.Canvas = document.createElement('canvas');
        this.Canvas.width = 800
        this.Canvas.height = 160
        this.ctx = this.Canvas.getContext("2d");
        this.Name = satname
    }
    Create = () => {
        this.ctx.clearRect(0, 0, this.Canvas.width, this.Canvas.height)
        this.ctx.beginPath();
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.moveTo(this.Canvas.width / 2, this.Canvas.height / 2);
        this.ctx.lineTo((this.Canvas.width / 2) + 50, (this.Canvas.height / 2) - 25);
        this.ctx.lineTo((this.Canvas.width / 2) + 230, (this.Canvas.height / 2) - 25);
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.font = "24px Frank";
        this.ctx.fillText(this.Name, (this.Canvas.width / 2) + 53, (this.Canvas.height / 2) - 35);
        return this.Canvas;
    }
}
export class Selected {
    constructor(x, y) {
        this.Canvas = document.createElement('canvas');
        this.Canvas.width = 350
        this.Canvas.height = 350
        this.ctx = this.Canvas.getContext("2d");
        this.x = x;
        this.y = y;
    }
    Create = () => {
        this.ctx.clearRect(0, 0, this.Canvas.width, this.Canvas.height)
        this.ctx.moveTo(10, 10);
        this.ctx.lineWidth = 40;
        this.ctx.beginPath();
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.stroke
        this.ctx.arc(this.Canvas.width / 2, this.Canvas.height / 2, 150, 0, Math.PI * 2);
        this.ctx.stroke();
        return this.Canvas;
    }
}
export class InfoPanel {
    constructor(category, itemID) {
        this.ID = itemID;
        this.Category = category;
        this.Container = document.createElement('div');
        this.Canvas = document.createElement('canvas');
        this.Canvas.width = 300;
        this.Canvas.height = 600;
        this.ctx = this.Canvas.getContext("2d");
        this.CanvasX;
        this.CanvasY;
    }
    Create = () => {
        this.ctx.clearRect(0, 0, this.Canvas.width, this.Canvas.height)
    }
}
export class SVGModel {
    constructor(lat, lon, alt) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext("2d");
        this.texture = new THREE.Texture(this.canvas)
        this.material;
        this.geometry;
        this.Model;
        this.Latitude = lat;
        this.Longitude = lon;
        this.Altitude = alt;
        this.CalX;
        this.CalY;
        this.CalZ;
    }
    CreateTexture = () => {
        this.ctx.fillStyle = "#FF0000";
        this.ctx.fillRect(0, 0, 10, 10);
    }
    Create = () => {
        this.CreateTexture();
        this.geometry = new THREE.PlaneGeometry(10, 10, 1, 1);
        this.material = new THREE.MeshBasicMaterial({
            depthTest: false,
            transparent: false
        });

        var mesh = new THREE.Mesh(this.geometry, this.material);
        mesh.tiltMultiplier = Math.PI / 2 * (1 - Math.abs(this.Latitude / 90));

        mesh.tiltDirection = (this.Latitude > 0 ? -1 : 1);
        mesh.lon = this.Longitude;
        this.GetCartesion();
        mesh.position.set(this.CalX, this.CalY, this.CalZ);

        mesh.rotation.z = -1 * (this.Latitude / 90) * Math.PI / 2;
        mesh.rotation.y = (this.Longitude / 180) * Math.PI

        this.Model = mesh;
        return this.Model;
    }
    GetCartesion = () => {
        let cart = utils.mapPoint(this.Latitude, this.Longitude, this.Altitude * .5)
        this.CalX = cart.x;
        this.CalY = cart.y;
        this.CalZ = cart.z;
        return cart;
    }
}