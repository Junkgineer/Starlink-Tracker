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
var hourly_api_max = 200;
var api_reset_minutes = 60;
var transactions_count = 0;
var remaining = hourly_api_max - 1;
var max_data_age = 30; //days
var untracked = [];
var expired = [];
var test_mode = false;

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
  var dte;
  try {
    // await(initialize());
    // await (dataCheck())

    await(dte = new Date())
    
    await(data = calculatePositions(dte, './data/positions_2.json'));
    
    var dest_time = moment(dte).add(recalc_interval, 'm').toDate();
    
    await(data = calculatePositions(dest_time, './data/positions_1.json'));
  } catch(err) {
    verbose ? process.stdout.write(err) : null;
  }
  // setInterval(run, recalc_interval * 60000);
  // setInterval(resetApiLimits, api_reset_minutes * 60000);
})();

/**
 * Main application loop. Removes the oldest data file,
 * initiates the shifting of the other data files,
 * and then initiates the fetching of the latest data.
 */
 async function run(){
  var data;
  var dte;
  try {
    await (dte = new Date())
    fs.renameSync(`./data/positions_1.json`, `./data/positions_2.json`)
    var dest_time = moment(dte).add(recalc_interval, 'm').toDate();
    await(data = calculatePositions(dest_time, './data/positions_1.json'));
  } catch(err) {
    verbose ? process.stdout.write(err) : null;
  }
}
async function initialize() {
  let config = {"stamp": new Date() / 1000, "missing": [], "included": []};
  let id_json;
  let id_list;
  try {
    id_json = fs.readFileSync('./data/norad_list.json');
    id_list = JSON.parse(id_json);
    verbose ? process.stdout.write(`${getTime()} | NORAD satellite list count: ${id_list.ids.length}\n`) : null;
    config.missing = id_list.ids;
  } catch(err) {
    verbose ? process.stdout.write(err) : null;
    return;
  }
  let sat_data = {"stamp": new Date().getTime() / 1000, "sats": []};
  ex = fs.existsSync(`./data/tle_baseline.json`);
  if (!ex) {
    verbose ? process.stdout.write(`${getTime()} | Getting baseline position data for: ./data/tle_baseline.json\n`) : null;
    console.log(id_list.ids.length, remaining)
    if (id_list.ids.length > remaining) {
      let ids_slice = id_list.ids.slice(0, remaining);
      console.log(ids_slice.length, remaining)
      fs.writeFileSync('./data/tle_baseline.json', JSON.stringify(sat_data));
      await(sat_data = pullTleData(ids_slice));
      for (let i=0; i < sat_data.length; i++) {
        config.included.push(sat_data.sats[i].id)
      }
      for (let i=0; i < config.included.length; i++) {
        if (config.missing.includes(config.included[i])) {
          var ind = config.missing.indexOf(config.included[i]);
          if (ind > -1) {
            config.missing.splice(ind, 1);
          }
        }
      }
    } else {
      await(sat_data = pullTleData(id_list));
    }
    fs.writeFileSync('./data/config.json', JSON.stringify(config));
  }
}
async function resetApiLimits() {
  transactions_count = 0;
  remaining = hourly_api_max - 1;
  try {
    await(dataCheck());
  } catch(err) {
    verbose ? process.stdout.write(err) : null;
  }  
  
}
/**
 * This function handles all the maintainence and
 * integrity checks for the baseline data. It's pretty
 * heavy on file reads, but since it's only run once an
 * hour, it's better than maintaining a larger memory
 * footprint for the other 59.99 minutes.
 */
async function dataCheck() {
  let id_json;
  let id_list;
  try {
    id_json = fs.readFileSync('./data/norad_list.json');
    id_list = JSON.parse(id_json);
    verbose ? process.stdout.write(`${getTime()} | NORAD satellite list count: ${id_list.ids.length}\n`) : null;
  } catch(err) {
    verbose ? process.stdout.write(err) : null;
    return;
  }
  let sat_list;
  try {
    let baseline_json = fs.readFileSync('./data/tle_baseline.json')
    sat_list = JSON.parse(baseline_json);
  } catch(err) {

  }

  // Check to see if we're tracking all the satellites on
  // the NORAD list. This helps manage the API constraints.
  // We also check for the age of the data, and add any
  // out of date records to the 'expired' array to be refreshed.
  // The timestamp of each record is one we created at the time
  // of the fetch, rather than the timestamp on the record itself
  // at the source. Some records may not be being updated at
  // the API source. We don't want to keep calling them
  // expired, and instead just check on them at regular intervals.
  
  try {
    let tracked = [];
    untracked = [];
    for (let i=0; i < sat_list.sats.length; i++){
      tracked.push(sat_list.sats[i].id)
      let timestamp = new Date(sat_list.sats[i].timestamp)
      let max_age = moment(timestamp).add(max_data_age, 'days').toDate();
      if (new Date() > max_age) {
        expired.push(sat_list.sats[i].id)
      }
    }
    verbose ? process.stdout.write(`${getTime()} | Expired satellite records: ${expired.length}\n`) : null;
    // Satellites not in sat_list will be added to an untracked array
    // if we've not exceeded our API budget. If we have, it will simply
    // add them once the budget has reset.
    for (let i=0; i < id_list.ids.length; i++) {
      if (!tracked.includes(id_list.ids[i])){
        untracked.push(id_list.ids[i]);
      }
    }
    verbose ? process.stdout.write(`${getTime()} | There are ${id_list.ids.length} satellites and ${untracked.length} are untracked.\n`) : null;

    if (untracked.length > 0) {
      if (untracked.length > remaining) {
        let update_unt = untracked.slice(0, remaining);
        // await(pullTleData(update_unt));
        pullTleData(update_unt)
      } else {
        pullTleData(untracked)
      }
    }

    // If we have remaining budget in our API, we now update any 
    // expired records we can.
    if (expired.length > 0) {
      if (expired.length > remaining) {
        let update_exp = expired.slice(0, remaining);
        // await(pullTleData(update_exp));
        pullTleData(update_exp)
      } else {
        pullTleData(expired)
      }
    }

  } catch(err) {
    verbose ? process.stdout.write(err) : null;
  }
}

/**
 * This function handles the actual movement of the satellites.
 * It writes ./data/positions_1.json, and ./data/positions_2.json,
 * which are read by the front-end and used as destination and
 * source movement locations, respectively.
 */
async function calculatePositions(datetime, filename) {
  var sat_data_2 = {"stamp": Math.floor(new Date().getTime() / 1000), "sats": []};
  let sat_list;
  try {
    let pull_file = './data/tle_baseline.json'
    // ex = fs.existsSync(`./data/positions_1.json`);
    // if (ex) {
    //   // positions_1.json is the last calculated positions of the satellites.
    //   // If it exists, use it instead of recalculating from the baseline.
    //   verbose ? process.stdout.write(`${getTime()} | Calculating ${filename} from last stored satellite positions.\n`) : null;
    //   pull_file = `./data/positions_1.json`;
    // } else {
    //   verbose ? process.stdout.write(`${getTime()} | Calculating ${filename} from baseline satellite positions.\n`) : null;
    // }
    let sat_json = fs.readFileSync(pull_file)
    sat_list = JSON.parse(sat_json);
  } catch(err) {
    verbose ? process.stdout.write(err) : null;
  }
  for (let i = 0; i < sat_list.sats.length; i++){
    var satrec = satellite.twoline2satrec(sat_list.sats[i].tle1, sat_list.sats[i].tle2);
    var positionAndVelocity = satellite.propagate(satrec, datetime);
    var positionEci = positionAndVelocity.position;
    var velocityEci = positionAndVelocity.velocity;
    var gmst = satellite.gstime(datetime);
    var positionGd = satellite.eciToGeodetic(positionEci, gmst)
    var longitude = positionGd.longitude;
    var latitude = positionGd.latitude;
    var altitude = positionGd.height;
    var longitudeDeg = satellite.degreesLong(longitude);
    var latitudeDeg  = satellite.degreesLat(latitude);
    var sat = {
      "id": sat_list.sats[i].id,
      "name": sat_list.sats[i].name,
      "tle1": sat_list.sats[i].tle1,
      "tle2": sat_list.sats[i].tle2,
      "position": positionAndVelocity.position,
      "velocity": positionAndVelocity.velocity,
      "gmst": gmst,
      "lat": latitude,
      "lng": longitude,
      "latd": latitudeDeg,
      "lngd": longitudeDeg,
      "alt": altitude,
      "timestamp": datetime.getTime() / 1000
    }
    sat_data_2.sats.push(sat);
    // console.log(`sat: ${sat.name}`)
  }
  // console.log('Writing positions_2.json')
  fs.writeFileSync(filename, JSON.stringify(sat_data_2));
}
/**
 * Calls the n2yo.com API to get the most recent location data, 
 * and writes it to tl_baseline.json where it can be opened later.
 * The location data can be recalculated for each satellite 
 * for any given time, so the API can be called less often.
 * The calculatePositions() function uses the baseline file 
 * managed here to calculate ./data/positions_1.json, and 
 * ./data/positions_2.json
 */
async function pullTleData(ids) {
  let sat_data = {"stamp": new Date() / 1000, "sats": []};
  let baseline_json = fs.readFileSync('./data/tle_baseline.json')
  let baseline_data = JSON.parse(baseline_json);
  let included = [];
  if (ids.length > hourly_api_max - transactions_count){
    verbose ? process.stdout.write(`${getTime()} | (1/2) WARNING: The given fetch list appears to exceed the amount of remaining allowable API transactions!\n`) : null;
    verbose ? process.stdout.write(`${getTime()} | (2/2) Fetch list length: ${ids.length} Transaction Count: ${transactions_count}\n`) : null;
  }
  if (test_mode) {
    for (let i = 0; i < 4; i++) {
      verbose ? process.stdout.write(`${getTime()} | TEST MODE: Notional fetch https://api.n2yo.com/rest/v1/satellite/tle/${ids[i]}?apiKey=CPBLEL-3C7JN5-2D7W8Z-4TVN\n`) : null;
    }
    verbose ? process.stdout.write(`${getTime()} | TEST MODE: ${ids.length} notional fetches ...\n`) : null;
  } else if (transactions_count == hourly_api_max){
    verbose ? process.stdout.write(`${getTime()} | ERROR: API limit reached (${hourly_api_max} per hour)\n`) : null;
    return;
  } 
  else {
    for (let i=0; i < ids.length; i++) {
      try {
        await request(`https://api.n2yo.com/rest/v1/satellite/tle/${ids[i]}?apiKey=CPBLEL-3C7JN5-2D7W8Z-4TVN`, { json: true }, (err, res, body) => {
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
            if (tle_1 == undefined || tle_2 == undefined){
              console.log('ERROR tle_1 or tle_2 on ID: '+ body.info.satid)
            } else {
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
              var sat = {
                "id": body.info.satid,
                "name": body.info.satname,
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
              sat_data.sats.push(sat);
              if (i == ids.length - 1) {
                // Update the baseline records
                for (let si = 0; si < sat_data.sats.length; si++) {
                  for (let bi = 0; bi < baseline_data.sats.length; bi++) {
                    if (sat_data.sats[si].id == baseline_data.sats[bi].id) {
                      baseline_data.sats[bi] = sat_data.sats[si];
                      included.push(sat_data.sats[si].id)
                    }
                  }
                }
                // Add any new records not already contained in the baseline data.
                for (let si = 0; si < sat_data.sats.length; si++) {
                  if (!included.includes(sat_data.sats[si].id)) {
                    baseline_data.sats.push(sat_data.sats[si]);
                  }
                }
                transactions_count = body.info.transactionscount;
                remaining = hourly_api_max - transactions_count - 1; // 'remaining' is used for array indices elsewhere, so it's zero-based.
                fs.writeFileSync('./data/tle_baseline.json', JSON.stringify(sat_data));
                verbose ? process.stdout.write(`${getTime()} | Current transaction count after fetch: ${transactions_count}\n`) : null;
                return baseline_data;
              }
            }
          }
        });
      } catch(err) {
        verbose ? process.stdout.write(err) : null;
      }
    };
  }
}

/**
 * Returns the current time in HH:MM.SS as a string.
 *
 * @return {number} x raised to the n-th power.
 */
function getTime(){
  let date_ob = new Date();
  return `${date_ob.toLocaleDateString()} ${date_ob.toLocaleTimeString()}`;
}
