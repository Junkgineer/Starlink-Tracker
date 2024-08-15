import { Globe, GlobeSettings } from "./js/webapp/globe.js"

// Updated TLE data can be found at: https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle
var starlinkTLE = './data/NORAD_tle.txt'
var basestation_data = './data/basestations.json'
var globeSettings;
var globe;
var data;
var loading;
var satDisplayed = 0;
var groundDisplayed = 0;

(function App() {
    const StarlinkTrack = function () {
        console.log(`Last data calculation: ${localStorage.getItem('time')}`);
        loading = document.getElementById('loading');
        var container = document.getElementById('container');

        // We use GlobeSettings to manage the runtime elements, and then pass
        //  it to the Globe instance.
        globeSettings = new GlobeSettings(container);
        globeSettings.Constellation.DOMElements.satCountElement = document.getElementById('satCount');
        globeSettings.Constellation.DOMElements.baseCountElement = document.getElementById('baseCount');
        globeSettings.Constellation.DOMElements.timeElement = document.getElementById('currentTime');
        globeSettings.Constellation.DOMElements.dateElement = document.getElementById('currentDate');
        globeSettings.Constellation.LiveTrack = true;
        globeSettings.IdleRotate = true;

        // Initialize the Globe with the settings and instances in GlobeSettings.
        globe = new Globe(globeSettings);
        globe.init();
        TWEEN.start();

        // Now we populate the Constellation with the fetched satellites.
        loadSatellites();
    }
    const loadSatellites = function () {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', starlinkTLE, true);
        xhr.onreadystatechange = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    data = xhr.responseText.split('\n')
                    var entries = data.length / 3;
                    console.log('Entries:', entries, 'Lines:', data.length)
                    for (var i = 0; i < data.length; i += 3) { //data.length
                        satDisplayed++;
                        let name = data[i].trim();
                        let tle1 = data[i + 1];
                        let tle2 = data[i + 2]
                        let liveupdate = false;
                        let lighting = false;
                        globe.GlobeSettings.Constellation.AddSatellite(name, 0, tle1, tle2, liveupdate, lighting)
                    }
                    // runGlobeAnimation();
                    loadBasestations();
                }
            }
        };
        xhr.send(null);
    }
    const loadBasestations = function () {
        //BaseStations
        var xhr = new XMLHttpRequest();
        xhr.open('GET', basestation_data, true);
        xhr.onreadystatechange = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    data = JSON.parse(xhr.responseText);
                    window.data = data;
                    for (var i = 0; i < data.basestations.length; i++) {
                        groundDisplayed++;
                        globe.GlobeSettings.Constellation.AddBasestation(data.basestations[i].lat, data.basestations[i].lng, data.basestations[i].town, data.basestations[i].cc, data.basestations[i].desc, i, data.basestations[i].town, true)
                    }
                    console.log('Displaying', groundDisplayed, 'basestations.')
                    // globe.basestationmodels = globe.Constellation.BasestationModels;


                    runGlobeAnimation();
                    // globe.animate();
                }
            }
        };
        xhr.send(null);
    }

    const runGlobeAnimation = function () {
        globe.begin();
        console.log('Loaded', globe.GlobeSettings.Constellation.HitBoxes.children.length, 'hitboxes')
        console.log('Displaying', globe.GlobeSettings.Constellation.TLESatellites.length, 'satellites.')
        console.log('Displaying', globe.GlobeSettings.Constellation.Basestations.length, 'basestations.')
        console.log('Removed', globe.GlobeSettings.Constellation.TLESatelliteError.length, 'satellite records due to errors.')

        loading.remove();
        localStorage.setItem('time', new Date(Date.now()).toISOString());
    }
    StarlinkTrack();
})()