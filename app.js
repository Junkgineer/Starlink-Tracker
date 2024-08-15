const fs = require('fs')
const https = require('https')
const http = require('http')
const request = require('request');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers')
const satellite = require('satellite.js');
const moment = require('moment');
const exp = require('constants');

/**
 * The host, file, and port of where to fetch
 * the prod satellite location data from.
 */
const data_host = 'satellitemap.space';
const data_file = '/json/starposA.json';
const data_port = 443;

/**
 * The host, file, and port of where to fetch
 * the test satellite location data from.
 */
 const test_data_host = '127.0.0.1';
 const test_data_port = 5501;
 const test_data_file = '/data/testsatdata.json';
 
 var verbose = false;
 var recalc_interval = 10; //minutes
 var hourly_api_max = 1000;
 var api_reset_minutes = 60;
 var transactions_count = 0;
 var completed = [];
 var remaining = hourly_api_max - 1;
 var max_data_age = 30; //days
 var untracked = [];
 var expired = [];
 var test_mode = false;
 
 const monthRanges = [
    {month: "Jan", start: 1, end: 31},
    {month: "Feb", start: 32, end: 59},
    {month: "Mar", start: 60, end: 90},
    {month: "Apr", start: 91, end: 120},
    {month: "May", start: 121, end: 151},
    {month: "Jun", start: 152, end: 181},
    {month: "Jul", start: 182, end: 212},
    {month: "Aug", start: 213, end: 243},
    {month: "Sep", start: 244, end: 273},
    {month: "Oct", start: 274, end: 304},
    {month: "Nov", start: 305, end: 334},
    {month: "Dec", start: 335, end: 365}
]
 /**
 * Command line argument definitions, parsing, and processing.
 */
const argv = yargs(hideBin(process.argv))
.scriptName('app')
.usage('$0 <cmd> [args]')
.command('test', 'Run app using test data only (will not call API).', (yargs) => {
  return yargs
})
.option('interval', {
    alias: 'i',
    type: 'number',
    default: 10,
    describe: 'The number of minutes between each recalculation.'
})
.boolean('verbose')
.alias('verbose', ['v'])
.describe('verbose', 'Application system messages written to stdout.')
.help()
.alias('help', 'h').argv;

if (argv.verbose) {
verbose = true;
}

history_size = argv.history;
recalc_interval = argv.interval;
verbose ? process.stdout.write(`${getTime()} | Recalculation interval set to [${argv.interval}] minutes (${recalc_interval*60000} ms).\n`) : null;

if (argv._.includes('test')) {
  test_mode = true;
  verbose ? process.stdout.write(`${getTime()} | Using local [test] data.\n`) : null;
} else {
  verbose ? process.stdout.write(`${getTime()} | Using fetched [prod] data.\n`) : null;
}

/**
 * Calculate the initial satellite start and destination positions,
 * as well as the recalculation timer and the data check timer.
 */
 (async() => {
    var data;
    var result;
    try {
        getBatch()
        .then(function(data) {
            process.stdout.write(`sat_data length: ${data.sats.length}\n`);
            writeFinal(data)
            .then(
                function(result) {
                    process.stdout.write(`END OF WRITE FINAL: ${result} \n`);
                    console.log("END OF LINE")
                }
            )

        }
      );
    // data = await getBatch();
    // result = await writeFinal(data);
    process.stdout.write(`END OF WRITE FINAL: ${result} \n`);

    //   var dest_time = moment(dte).add(recalc_interval, 'm').toDate();
    } catch(err) {
      verbose ? process.stdout.write(err) : null;
    }
    // setInterval(run, recalc_interval * 60000);
    // setInterval(resetApiLimits, api_reset_minutes * 60000);
  })();

async function tleJulianToGregorian(tle_julian){


    // console.log(`day: ${day} float_day: ${float_day} hour: ${hour} hour_float: ${hour_float} minutes: ${minutes}`);
    return fullDate;
    
}
async function writeFinal(sat_data) {
    
    // console.log(`sat_data length: ${sat_data.sats.length}`)
    fs.writeFileSync('./data/output_test.json', JSON.stringify(sat_data));
    fs.readFile('./data/positions.json','utf8', function(err, data){
        pos_data = JSON.parse(data);
        for (var si = 0; si < sat_data.sats.length; si++){
            for (var di = 0; di < pos_data.sats.length; di++){
                if (sat_data.sats[si].id == pos_data.sats[di].id){
                    pos_data.sats[di].lat = sat_data.sats[si].lat;
                    pos_data.sats[di].lng = sat_data.sats[si].lng;
                    pos_data.sats[di].epoch = sat_data.sats[si].epoch;
                    pos_data.sats[di].time = sat_data.sats[si].time;
                    console.log(`pos_data: ${pos_data.sats[si].time} sat_data: ${sat_data.sats[si].time}`)
                    pos_data.sats[di].alt = sat_data.sats[si].alt;
                    pos_data.sats[di].periapsis = sat_data.sats[si].periapsis;
                    pos_data.sats[di].latd = sat_data.sats[si].latd;
                    pos_data.sats[di].lngd = sat_data.sats[si].lngd;
                    pos_data.sats[di].illum = sat_data.sats[si].illum;
                    pos_data.sats[di].raan = sat_data.sats[si].raan;
                    pos_data.sats[di].age = sat_data.sats[si].age;
                    pos_data.sats[di].timestamp = sat_data.sats[si].timestamp;
                }
            }
        }
        fs.writeFileSync('./data/positions_update.json', JSON.stringify(pos_data));
        norad_data.completed.ids.push(...ids);
        fs.writeFileSync('./data/completed.json', JSON.stringify(norad_data.completed));
        process.stdout.write(`${sat_data.sats.length} satellites updated...\n`)
        return "Final Write Complete"
    })
}
async function getBatch() {
    console.log("Getting batch...");
    // let norad_list = fs.readFileSync('./data/norad_list.json')
    let norad_data;
    fs.readFile('./data/norad_list.json','utf8',function(err, data){
        norad_data = JSON.parse(data);

        fs.readFile('./data/completed.json','utf8',function(err, data){
            norad_data.completed = JSON.parse(data);
    
            let ids = [];
            for (var i = 0; i < norad_data.ids.length; i++) {
                if (!norad_data.completed.ids.includes(norad_data.ids[i]) && ids.length <= 1) {
                    ids.push(norad_data.ids[i])
                }
            }
            // norad_data.batch = ids;
            // fs.writeFileSync('./data/output_test.json', JSON.stringify(norad_data));

            let sat_data = {"stamp": new Date() / 1000, "sats": []};
            norad_data["sats"] = [];
            if (ids.length > hourly_api_max - transactions_count){
                verbose ? process.stdout.write(`${getTime()} | (1/2) WARNING: The given fetch list appears to exceed the amount of remaining allowable API transactions!\n`) : null;
                erbose ? process.stdout.write(`${getTime()} | (2/2) Fetch list length: ${ids.length} Transaction Count: ${transactions_count}\n`) : null;
            }
            if (test_mode) {
                for (let i = 0; i < 4; i++) {
                    verbose ? process.stdout.write(`${getTime()} | TEST MODE: Notional fetch https://api.n2yo.com/rest/v1/satellite/tle/${ids[i]}?apiKey=CPBLEL-3C7JN5-2D7W8Z-4TVN\n`) : null;
                }
                verbose ? process.stdout.write(`${getTime()} | TEST MODE: ${ids.length} notional fetches ...\n`) : null;
            } else if (transactions_count == hourly_api_max) {
                verbose ? process.stdout.write(`${getTime()} | ERROR: API limit reached (${hourly_api_max} per hour)\n`) : null;
                return;
            } else {
                for (let i=0; i < ids.length; i++) {
                    try {

                        let nsat = await (async() => {
                            request(`https://api.n2yo.com/rest/v1/satellite/tle/${ids[i]}?apiKey=CPBLEL-3C7JN5-2D7W8Z-4TVN`, { json: true }, (err, res, body) => {
                                if (err) { return console.log(err); }
                                if (body.error){
                                    verbose ? process.stdout.write(`${getTime()} | ERROR: ${body.error}\n`) : null;
                                    transactions_count = hourly_api_max;
                                    remaining = -1;
                                    return
                                } else {
                                    try {
                                        var tle_record = {
                                            "id": body.info.satid,
                                            "name": body.info.satname,
                                            "tle": body.tle
                                        }
                                    } catch(err) {
                                        verbose ? process.stdout.write(`ERROR: Occured on ${ids[i]}\n`) : null;
                                        verbose ? process.stdout.write(err) : null;
                                        return
                                    }
                                    var tle_1 = tle_record.tle.split('\r\n')[0];
                                    var tle_2 = tle_record.tle.split('\r\n')[1];
                                    if (tle_1 == undefined || tle_2 == undefined) {
                                        console.log('ERROR tle_1 or tle_2 on ID: '+ body.info.satid)
                                    } else {
                                        var tle_trim = tle_1.replace("   ", " ");
                                        tle_trim = tle_trim.replace("  ", " ");
                                        var satrec = satellite.twoline2satrec(tle_1, tle_2);
                                        var sattime = new Date();
                                        var positionAndVelocity = satellite.propagate(satrec, sattime);
                                        var positionEci = positionAndVelocity.position;
                                        var velocityEci = positionAndVelocity.velocity;
                                        var gmst = satellite.gstime(new Date());
                                        var positionGd = satellite.eciToGeodetic(positionEci, gmst)
                                        var longitude = positionGd.longitude;
                                        var latitude = positionGd.latitude;
                                        var altitude = positionGd.height;
                                        var longitudeDeg = satellite.degreesLong(longitude);
                                        var latitudeDeg  = satellite.degreesLat(latitude);

                                        const tle_julian = tle_trim.split(" ")[3];
                                        const year = tle_julian.substring(0,2);
                                        const julianDay = parseFloat(tle_julian.substring(2));
                                        var month;
                                        var day;
                                        var hour;
                                        var minutes;
                                        var hour_float;
                                        var day_float;
                                        for (var m = 0; m < 12; m++){
                                            if (julianDay < monthRanges[m].end) {
                                                month = monthRanges[m].month;
                                                day = parseInt(julianDay - monthRanges[m].start);
                                                day_float = julianDay - monthRanges[m].start
                                                hour = parseInt(24 * ((julianDay - monthRanges[m].start) - day));
                                                hour_float = 24 * ((julianDay - monthRanges[m].start) - day)
                                                minutes = parseInt(60 * (hour_float - hour));
                                                break;
                                            }
                                        }
                                        if (minutes < 10){
                                            minutes = `0${minutes}`;
                                        }
                                        if (hour < 10){
                                            hour = `0${hour}`;
                                        }
                                        const greg_time = `${day} ${month} 20${year} ${hour}:${minutes}`;
                                        // console.log(greg_time)
                                        let sat = {
                                            "id": body.info.satid,
                                            "name": body.info.satname,
                                            "time": greg_time,
                                            "tle1": tle_1,
                                            "tle2": tle_2,
                                            "position": positionEci,
                                            "velocity": velocityEci,
                                            "gmst": gmst,
                                            "lat": latitude,
                                            "lng": longitude,
                                            "latd": latitudeDeg,
                                            "lngd": longitudeDeg,
                                            "alt": altitude,
                                            "timestamp": sattime
                                        }
                                        return sat
                                        // norad_data.sats.push(sat);
                                        // console.log(`pushed: ${JSON.stringify(sat)}`)
                                    }
                                }
                            });

                        })();
                        norad_data.sats.push(nsat);
                    } catch(err) {
                        verbose ? process.stdout.write(err + '\n') : null;
                    }
                };
                
                // return Promise.resolve(norad_data);
                return norad_data;
            }
        })
    })
    // return norad_data;
}