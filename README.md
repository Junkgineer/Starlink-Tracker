# starlink-tracker
A visualization of SpaceX's Starlink satellites and basestations.

![Tracker Home](https://github.com/Junkgineer/starlink-tracker/blob/main/images/tracker-home.png "Screenshot")

## Overview
This app is a basic satellite tracker written in pure JS. It has enhanced visuals using Google's [WebGL Globe](https://experiments.withgoogle.com/chrome/globe) for the earth, and [THREE.js](https://threejs.org/) for nearly all other rendered visuals.
Satellite locations are calculated from actual TLE data using [Satellite.js](https://github.com/shashwatak/satellite-js). A live version of this application can be seen [here](https://junkgineering.com/satellite).

## Installation
1. Clone the repo.
2. Run NPM install.
3. Host the site using your preferred method (for example, VS Code's 'Live Server' extension).

## Usage
- Click and drag the globe to rotate it.
- Hover over any satellite or basestation to see it's data:
    - Satellite Name.
    - Timestamp of locaton calculation.
    - Longitude and Latitude.
    - Altitude.
    - NORAD ID.
- Click on a satellite or basestation to mark it with a flag.
- If left idle, the globe will autorotate after 10 seconds.

## Notes
- The satellite locations are calculated via a static TLE document, and therefore are not likely to be HIGHLY accurate.
- The satellite locations themselves are not updated in real-time; they are calculated on load only.
