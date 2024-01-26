import * as THREE from "https://unpkg.com/three@0.117.1/build/three.module.js";

mapboxgl.accessToken =
  "pk.eyJ1IjoibHV1Y2NhYSIsImEiOiJja3dlcTJmeW4wNTl0Mm9udnpxeDA0ampnIn0.1CjRRUR8lGSRcBqDWd4U8g";

const bounds = [
  [0, 47], // Southwest coordinates
  [20, 55], // Northeast coordinates
];

const map = new mapboxgl.Map({
  container: "map", // container ID
  style: "mapbox://styles/luuccaa/clrulwatp008y01pdcy5jedmp", // style URL
  center: [10, 52], // starting position [lng, lat]
  zoom: 5, // starting zoom
  maxBounds: bounds,
});

map.on("load", (e) => {
  search("Hinterdupfingen");
  searchInput();
  rangeSelect();
});

/*
map.on("click", (e) => {
  // Set `bbox` as 5px reactangle area around clicked point.
  const bbox = [
    [e.point.x - 5, e.point.y - 5],
    [e.point.x + 5, e.point.y + 5],
  ];
  // Find features intersecting the bounding box.
  const selectedFeatures = map.queryRenderedFeatures(bbox, {});
  let displayedFeature = selectedFeatures[0];

  //Edge Case displayed Feature is undefined --> Interate through following features to find displayable feature
  if (typeof displayedFeature == "undefined") {
    for (let index = 0; index < selectedFeatures.length; index++) {
      let element = selectedFeatures[index];
      if (typeof element !== "undefined") {
        continue;
      }
      displayedFeature = element;
      break;
    }
    if (typeof displayedFeature == "undefined") {
      return;
    }
  }

  //Edge Case displayed Feature has no data --> Iterate through other features
  if (typeof displayedFeature.id == "undefined") {
    for (let index = 0; index < selectedFeatures.length; index++) {
      let element = selectedFeatures[index];
      console.log(index);
      if (typeof element.id == "undefined") {
        continue;
      }
      displayedFeature = element;
      break;
    }
    if (typeof displayedFeature.id == "undefined") {
      return;
    }
  }

  let content = document.createElement("div");
  let name = document.createElement("h1");
  let postcode = document.createElement("h2");

  name.innerText = selectedFeatures[0].properties.name;
  postcode.innerText = selectedFeatures[0].properties.postcode;

  content.append(name);
  content.append(postcode);

  let popup = new mapboxgl.Popup({ closeOnClick: true })
    .setLngLat([e.lngLat.lng, e.lngLat.lat])
    .setDOMContent(content)
    .addTo(map);
});
*/

const sceneCenter = mapboxgl.MercatorCoordinate.fromLngLat(
  { lng: 10, lat: 52 },
  0
);
const meter = sceneCenter.meterInMercatorCoordinateUnits();
const GROUP_ROTATION_MATRIX = new THREE.Matrix4().multiplyMatrices(
  new THREE.Matrix4().makeRotationX(Math.PI / 2),
  new THREE.Matrix4().makeRotationY(Math.PI)
);

function queryFeature(screenPoint, feature, minHeight, height) {
  const group = new THREE.Group();
  const { geometry } = feature;
  const metersGeom = transformGeometryToMeters(geometry, minHeight);
  const shape = geometryToShape(metersGeom);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height - minHeight,
    bevelEnabled: false,
  });
  const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
  mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, minHeight));
  group.add(mesh);
  group.applyMatrix4(GROUP_ROTATION_MATRIX);
  const scene = new THREE.Scene();
  scene.add(group);
  scene.updateMatrixWorld(true);

  const mouse = new THREE.Vector2();
  mouse.x = (screenPoint.x / map.transform.width) * 2 - 1;
  mouse.y = 1 - (screenPoint.y / map.transform.height) * 2;

  const { x, y, z } = sceneCenter;
  const scale = new THREE.Matrix4().makeScale(meter, meter, -meter);
  const rotation = new THREE.Matrix4().multiplyMatrices(
    new THREE.Matrix4().makeRotationX(-0.5 * Math.PI),
    new THREE.Matrix4().makeRotationY(Math.PI)
  );

  const cameraTransform = new THREE.Matrix4()
    .multiplyMatrices(scale, rotation)
    .setPosition(x, y, z);
  const camera = new THREE.PerspectiveCamera();
  const matrix = map.transform.mercatorMatrix;
  camera.projectionMatrix = new THREE.Matrix4()
    .fromArray(matrix)
    .multiply(cameraTransform);

  const camInverseProjection = new THREE.Matrix4().getInverse(
    camera.projectionMatrix
  );
  const cameraPosition = new THREE.Vector3().applyMatrix4(camInverseProjection);
  const mousePosition = new THREE.Vector3(mouse.x, mouse.y, 1).applyMatrix4(
    camInverseProjection
  );
  const viewDirection = mousePosition.clone().sub(cameraPosition).normalize();

  const raycaster = new THREE.Raycaster();
  raycaster.near = -1;
  raycaster.far = 1e6;
  raycaster.set(cameraPosition, viewDirection);

  const intersects = raycaster.intersectObjects(scene.children, true);
  if (intersects.length === 0) {
    return null;
  }

  const mp = pointToMercatorCoordinate(intersects[0].point);
  const { lat, lng } = mp.toLngLat();
  return { lat, lng, altitude: mp.toAltitude() };
}

function pointToMercatorCoordinate(point) {
  const c = sceneCenter;
  const { x, y, z } = point;
  return new mapboxgl.MercatorCoordinate(
    c.x - x * meter,
    c.y - z * meter,
    c.z + y * meter
  );
}

function isNestedArray(x) {
  return x.length > 0 && Array.isArray(x[0]);
}

function transformCoordArray(coords, fn) {
  return isNestedArray(coords)
    ? coords.map((c) => transformCoordArray(c, fn))
    : fn(coords);
}

function transformGeometry(g, fn) {
  return {
    type: g.type,
    coordinates: transformCoordArray(g.coordinates, fn),
  };
}

function transformGeometryToMeters(g, altitude) {
  const { x: cx, y: cy, z: cz } = sceneCenter;
  return transformGeometry(g, (lngLat) => {
    const { x, y, z } = mapboxgl.MercatorCoordinate.fromLngLat(
      lngLat,
      altitude
    );
    return [(x - cx) / meter, -(y - cy) / meter, (z - cz) / meter];
  });
}

function drawLineString(xys, path) {
  if (xys.length > 0) {
    const [x, y] = xys[0];
    path.moveTo(x, y);
  }

  for (const [x, y] of xys.slice(1)) {
    path.lineTo(x, y);
  }
}

/** Convert a GeoJSON geometry to a Three.js shape. */
export function geometryToShape(g) {
  const shape = new THREE.Shape();
  const coords = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const polygon of coords) {
    drawLineString(polygon[0], shape);
    shape.holes = polygon
      .slice(1)
      .map((ring) => drawLineString(ring, new THREE.Path()));
  }
  return shape;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function scale(number, inMin, inMax, outMin, outMax) {
  return ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

map.on("click", (e) => {
  const { x, y } = e.point;
  console.log("screen x, y =", x, y);
  const clickedFeatures = map.queryRenderedFeatures(e.point);
  if (clickedFeatures.length) {
    const f = clickedFeatures[0];

    if (f.layer.type === "fill-extrusion") {
      console.log("clicked a fill extrusion");
      const { properties } = f;
      const { layer } = f;

      let base_height = layer.paint["fill-extrusion-base"];
      if (!base_height) {
        base_height = 0;
      }
      let height = layer.paint["fill-extrusion-height"];

      const point3d = queryFeature(e.point, f, base_height, height);

      if (point3d) {
        console.log("@", point3d);
      }

      colorClicked(properties);
      //createPopup(properties, point3d);
      createInfoBox(properties);
    } else {
      search("Hinterdupfingen");
    }
  }
});

function colorClicked(properties) {
  map.setFilter("plz selected", ["==", ["get", "name"], properties.name]);
}

function createPopup(properties, point3d) {
  let content = document.createElement("div");
  let name = document.createElement("h1");
  let postcode = document.createElement("h2");
  let elevation = document.createElement("h2");

  name.innerText = properties.name;
  postcode.innerText = properties.postcode;
  elevation.innerText = properties.elevation;

  content.append(name);
  content.append(postcode);
  content.append(elevation);

  let popup = new mapboxgl.Popup({ closeOnClick: true })
    .setLngLat([point3d.lng, point3d.lat])
    .setDOMContent(content)
    .addTo(map);

  offsetPopup(popup, point3d);

  map.on("pitch", () => {
    offsetPopup(popup, point3d);
  });
}

function offsetPopup(popup, point3d) {
  let pitch = map.getPitch();
  let { altitude } = point3d;
  let offset = scale(pitch, 0, 90, 0, 500);
  popup.setOffset([0, -offset]);
}

function createInfoBox(properties) {
  Array.from(document.querySelectorAll(".infobox")).forEach((infobox) => {
    infobox.remove();
  });
  let content = document.createElement("div");
  let name = document.createElement("h1");
  let postcode = document.createElement("h2");
  let population = document.createElement("h2");

  name.innerText = properties.name;
  postcode.innerText = `PLZ: ${properties.postCodeString}`;

  if (properties.einwohner_number) {
    population.innerText = `Einwohner*innen 
    pro PLZ-Bereich: ${properties.einwohner_number}`;
  } else {
    population.innerText = `Einwohner*innen 
    pro PLZ-Bereich: Keine Daten verfügbar`;
  }

  content.append(name);
  content.append(postcode);
  content.append(population);

  content.classList.add("infobox");
  document.querySelector(".sidebar").append(content);
}

function searchInput() {
  const searchFiled = document.querySelector("input");
  searchFiled.addEventListener("input", () => {
    const query = searchFiled.value;
    if (query.length == 0) {
      search("Hinterdupfingen");
    } else {
      search(query);
    }
  });
}

function search(query) {
  const filterQuery = ["in", query, ["get", "name"]];
  const filterEmpty = ["!=", "", ["get", "name"]];
  const filters = ["all", filterQuery, filterEmpty];

  map.setFilter("plz selected", filters);
}

function rangeSelect() {
  const legende = document.querySelector(".legende");
  const ranges = Array.from(legende.children[0].children);

  ranges.forEach((range) => {
    range.addEventListener("click", () => {
      const selected = range.classList.contains("selected");
      console.log(selected);
      Array.from(document.querySelectorAll(".selected")).forEach((element) => {
        element.classList.remove("selected");
      });
      if (selected) {
        map.setFilter("plz", ["!=", ["get", "name"], "Hinterdupfingen"]);
      } else {
        range.classList.toggle("selected");

        const rangeNumber = range.innerText.charAt(0);

        const getPLZ = ["get", "postCodeString"];
        const slice = ["slice", getPLZ, 0, 1];
        const toString = ["to-string", slice];

        const filter = ["in", rangeNumber, toString];

        map.setFilter("plz", filter);
      }
    });
  });
}
