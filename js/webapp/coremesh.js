import * as THREE from '../lib/THREE/three.module.js';

var geometry;
var imgDir = 'js/resources/';
var Shaders = {
    'earth': {
        uniforms: {
            'earthtexture': { type: 't', value: null }
        },
        vertexShader: [
            'varying vec3 vNormal;',
            'varying vec2 vUv;',
            'void main() {',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
            'vNormal = normalize( normalMatrix * normal );',
            'vUv = uv;',
            '}'
        ].join('\n'),
        fragmentShader: [
            'uniform sampler2D earthtexture;',
            'varying vec3 vNormal;',
            'varying vec2 vUv;',
            'void main() {',
            'vec3 diffuse = texture2D( earthtexture, vUv ).xyz;',
            'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
            'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
            'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
            '}'
        ].join('\n')
    },
    'atmosphere': {
        uniforms: {},
        vertexShader: [
            'varying vec3 vNormal;',
            'void main() {',
            'vNormal = normalize( normalMatrix * normal );',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
            '}'
        ].join('\n'),
        fragmentShader: [
            'varying vec3 vNormal;',
            'void main() {',
            'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
            'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
            '}'
        ].join('\n')
    },
    'selected': {
        uniforms: {},
        vertexShader: [
            'varying vec3 vNormal;',
            'void main() {',
            'vNormal = normalize( normalMatrix * normal * 0.25 );',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.5 );',
            '}'
        ].join('\n'),
        fragmentShader: [
            'varying vec3 vNormal;',
            'void main() {',
            'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 2.0 );',
            'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
            '}'
        ].join('\n')
    },
    'basicBloom': {
        uniforms: {
            'bloomtexture': { type: 't', value: null }
        },
        vertexShader: [
            'varying vec2 vUv;',
            'void main()',
            '{',
            '	vUv = uv;',
            '	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
            '}'
        ].join('\n'),
        fragmentShader: [
            'varying vec2 vUv;',
            'uniform sampler2D bloomtexture;',
            'void main() {',
            '	vec4 col = vec4(0);',
            // Current texture coordinate
            '	vec2 texel = vUv;',
            '	vec4 pixel = vec4(texture2D(bloomtexture, texel));',
            // Mean spread value
            '	float pixelWidth = 0.1;',
            '   float pixelHeight = 0.1;',
            // Dim factor
            '   float dim = 0.75;',
            '	if (pixel.a < 1.0) {',
            // Glow is based on the alpha value
            '		float glow = pixel.a * ((pixelWidth + pixelHeight) / 2.0);',
            '		vec4 bloom = vec4(0);',	// The vector to contain the new, "bloomed" colour values
            // Apply a horrible version of "mean filter"
            // Horrible because GLSL needs constants for loop initializations
            '		bloom += (texture2D(bloomtexture, vec2(texel.x, texel.y)) - dim);',
            '		bloom += (texture2D(bloomtexture, vec2(texel.x - glow, texel.y - glow)) - dim);',
            '		bloom += (texture2D(bloomtexture, vec2(texel.x + glow, texel.y + glow)) - dim);',
            '		bloom += (texture2D(bloomtexture, vec2(texel.x + glow, texel.y - glow)) - dim);',
            '		bloom += (texture2D(bloomtexture, vec2(texel.x - glow, texel.y + glow)) - dim);',
            '		bloom += (texture2D(bloomtexture, vec2(texel.x + glow, texel.y)) - dim);',
            '		bloom += (texture2D(bloomtexture, vec2(texel.x - glow, texel.y)) - dim);',
            '		bloom += (texture2D(bloomtexture, vec2(texel.x, texel.y + glow)) - dim);',
            '		bloom += (texture2D(bloomtexture, vec2(texel.x, texel.y - glow)) - dim);',
            // Clamp the value between a 0.0 to 1.0 range
            '		bloom = clamp(bloom / 9.0, 0.0, 1.0);',
            '		col = pixel + bloom;',
            '	} else {',
            '		col = vec4(pixel.rgb, 1.0);',
            '	}',
            '	gl_FragColor = col;',
            '}'
        ].join('\n')
    },
    'basicBloom2': {
        uniforms: {},
        vertexShader: [
            'varying vec2 vUv;',
            'void main()',
            '{',
            '	vUv = uv;',
            '	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
            '}'
        ].join('\n'),
        fragmentShader: [
            'varying vec2 vUv;',
            'uniform sampler2D albedo;',
            'void main() {',
            '	vec4 col = vec4(0);',
            // Current texture coordinate
            '	vec2 texel = vUv;',
            '	vec4 pixel = vec4(texture2D(albedo, texel));',
            // Mean spread value
            '	float pixelWidth = 0.1;',
            '   float pixelHeight = 0.1;',
            // Dim factor
            '   float dim = 0.75;',
            '	if (pixel.a < 1.0) {',
            // Glow is based on the alpha value
            '		float glow = pixel.a * ((pixelWidth + pixelHeight) / 2.0);',
            '		vec4 bloom = vec4(0);',	// The vector to contain the new, "bloomed" colour values
            // Apply a horrible version of "mean filter"
            // Horrible because GLSL needs constants for loop initializations
            '		bloom += (texture2D(albedo, vec2(texel.x, texel.y)) - dim);',
            '		bloom += (texture2D(albedo, vec2(texel.x - glow, texel.y - glow)) - dim);',
            '		bloom += (texture2D(albedo, vec2(texel.x + glow, texel.y + glow)) - dim);',
            '		bloom += (texture2D(albedo, vec2(texel.x + glow, texel.y - glow)) - dim);',
            '		bloom += (texture2D(albedo, vec2(texel.x - glow, texel.y + glow)) - dim);',
            '		bloom += (texture2D(albedo, vec2(texel.x + glow, texel.y)) - dim);',
            '		bloom += (texture2D(albedo, vec2(texel.x - glow, texel.y)) - dim);',
            '		bloom += (texture2D(albedo, vec2(texel.x, texel.y + glow)) - dim);',
            '		bloom += (texture2D(albedo, vec2(texel.x, texel.y - glow)) - dim);',
            // Clamp the value between a 0.0 to 1.0 range
            '		bloom = clamp(bloom / 9.0, 0.0, 1.0);',
            '		col = pixel + bloom;',
            '	} else {',
            '		col = vec4(pixel.rgb, 1.0);',
            '	}',
            '	gl_FragColor = col;',
            '}'
        ].join('\n')
    }
};

function LineMesh() {
    const material = new THREE.LineBasicMaterial({ color: 0x0000ff });

    const points = [];
    points.push(new THREE.Vector3(- 210, 200, 200));
    points.push(new THREE.Vector3(200, 210, 200));
    points.push(new THREE.Vector3(210, 200, 200));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    return line;
}
function EarthMesh() {
    geometry = new THREE.SphereGeometry(200, 40, 30);

    let shader = Shaders['earth'];
    let uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    uniforms['earthtexture'].value = new THREE.TextureLoader().load(imgDir + 'world.jpg');
    let material = new THREE.ShaderMaterial({

        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader

    });

    let mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    mesh.Category = 'globe' 
    // mesh.layers.enable( 0 );
    return mesh;
}
function AtmosphereMesh() {
    let shader = Shaders['atmosphere'];
    let uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    let material = new THREE.ShaderMaterial({

        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true

    });

    let mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(1.1, 1.1, 1.1);
    mesh.Category = 'atmosphere'
    // mesh.layers.enable( 0 );
    return mesh;
}
function HexEarth(scene) {
    var hexsphere = new Hexasphere(30, 25, .95);
    for (var i = 0; i < hexsphere.tiles.length; i++) {
        var t = hexsphere.tiles[i];
        var latLon = t.getLatLon(hexsphere.radius);

        const points = [];
        for (var j = 0; j < t.boundary.length; j++) {
            var bp = t.boundary[j];
            //geometry.vertices.push(new THREE.Vector3(bp.x, bp.y, bp.z)); // THREE.Geometry was removed. Use THREE.BufferGeometry in it's place.
            points.push(new THREE.Vector3(bp.x, bp.y, bp.z))
        }

        // geometry.faces.push(new THREE.Face3(0,1,2));
        // geometry.faces.push(new THREE.Face3(0,2,3));
        // geometry.faces.push(new THREE.Face3(0,3,4));

        var indices = [];
        indices.push(new THREE.Vector3(0, 1, 2))
        indices.push(new THREE.Vector3(0, 2, 3))
        indices.push(new THREE.Vector3(0, 3, 4))

        if (points.length > 5) {
            points.push(new THREE.Vector3(0, 4, 5));
        }

        var geometry = new THREE.BufferGeometry().setFromPoints(points)
        geometry.setIndex(indices);
        geometry.computeVertexNormals()

        let material = new THREE.MeshBasicMaterial({ color: 0x83f52c, transparent: false })
        material.opacity = 0.3;
        var mesh = new THREE.Mesh(geometry, material.clone());
        // scene.add(mesh);
        hexsphere.tiles[i].mesh = mesh;

        let seenTiles = {};
        let currentTiles = hexsphere.tiles.slice().splice(0, 12);
        console.log(currentTiles)
        currentTiles.forEach(function (item) {
            seenTiles[item.toString()] = 1;
            console.log(item.mesh.material.opacity)
            item.mesh.material.opacity = 1;
        });

        return mesh;
    }
}
function PointMesh() {
    geometry = new THREE.BoxGeometry(0.75, 0.75, 1);
    geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

    point = new THREE.Mesh(geometry);
    return point;
}
function BaseStationObj() {
    const loader = new THREE.OBJLoader();
    var obj = loader.load('resources/obj/Base_Station_Radome.obj');
    return obj;
}
function SelectedMesh() {
    let geometry = new THREE.SphereGeometry(2, 32, 32);
    let material = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: .5
    });
    let model = new THREE.Mesh(geometry, material);
    return model;
}
function FakeBloom() {
    var bloom = new THREE.Group();

    for (var i = 0; i < 1; i += 0.2) {
        var sphere = new THREE.Mesh(
            new THREE.SphereGeometry(1.5 + (0.1 + i * i / 2), 32, 32),
            new THREE.MeshLambertMaterial({
                color: i == 0 ? 'white' : 'yellow',
                transparent: true,
                opacity: i == 0 ? 0.1 : 1 - Math.pow(i, 0.1)
            })
        );
        // console.log(`GROWTH: ${(0.1 + i * i / 2)} | OPACITY: ${1 - Math.pow(i, 0.1)}`)
        bloom.add(sphere);
    }
    return bloom;
}
function SelectedMeshShader() {
    const uniforms = {
        'albedo': { type: 't', value: null }
    };
    uniforms['albedo'].value = new THREE.TextureLoader().load(imgDir + 'bloom.png');
    const vertexShader = [
        'varying vec2 vUv;',
        'void main()',
        '{',
        '	vUv = uv;',
        '	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
    ].join('\n');
    const fragmentShader = [
        'varying vec2 vUv;',
        'uniform sampler2D albedo;',
        'void main() {',
        '	vec4 col = vec4(0);',
        // Current texture coordinate
        '	vec2 texel = vUv;',
        '	vec4 pixel = vec4(texture2D(albedo, texel));',
        // Mean spread value
        '	float pixelWidth = 0.1;',
        '   float pixelHeight = 0.1;',
        // Dim factor
        '   float dim = 0.75;',
        '	if (pixel.a < 1.0) {',
        // Glow is based on the alpha value
        '		float glow = pixel.a * ((pixelWidth + pixelHeight) / 2.0);',
        '		vec4 bloom = vec4(0);',	// The vector to contain the new, "bloomed" colour values
        // Apply a horrible version of "mean filter"
        // Horrible because GLSL needs constants for loop initializations
        '		bloom += (texture2D(albedo, vec2(texel.x, texel.y)) - dim);',
        '		bloom += (texture2D(albedo, vec2(texel.x - glow, texel.y - glow)) - dim);',
        '		bloom += (texture2D(albedo, vec2(texel.x + glow, texel.y + glow)) - dim);',
        '		bloom += (texture2D(albedo, vec2(texel.x + glow, texel.y - glow)) - dim);',
        '		bloom += (texture2D(albedo, vec2(texel.x - glow, texel.y + glow)) - dim);',
        '		bloom += (texture2D(albedo, vec2(texel.x + glow, texel.y)) - dim);',
        '		bloom += (texture2D(albedo, vec2(texel.x - glow, texel.y)) - dim);',
        '		bloom += (texture2D(albedo, vec2(texel.x, texel.y + glow)) - dim);',
        '		bloom += (texture2D(albedo, vec2(texel.x, texel.y - glow)) - dim);',
        // Clamp the value between a 0.0 to 1.0 range
        '		bloom = clamp(bloom / 9.0, 0.0, 1.0);',
        '		col = pixel + bloom;',
        '	} else {',
        '		col = vec4(pixel.rgb, 1.0);',
        '	}',
        '	gl_FragColor = col;',
        '}'
    ].join('\n');
    let geometry = new THREE.SphereGeometry(2, 32, 32);
    // let uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    // uniforms['bloomtexture'].value = new THREE.TextureLoader().load(imgDir + 'bloom.png');

    let material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.DoubleSide, //THREE.DoubleSide THREE.BackSide
        blending: THREE.AdditiveBlending,
        transparent: true,
        uniformsNeedUpdate: true
    });
    let model = new THREE.Mesh(geometry, material);
    model.rotation.y = Math.PI / 2;
    // mesh.scale.set( 1,1,1 );
    model.Category = 'Selected'
    // model.needsUpdate = true;
    return model;
}
export { EarthMesh, AtmosphereMesh, HexEarth, PointMesh, BaseStationObj, FakeBloom, SelectedMesh, SelectedMeshShader, LineMesh }
