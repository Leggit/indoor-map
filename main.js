import ImageLayer from "ol/layer/Image.js";
import Map from "ol/Map.js";
import Projection from "ol/proj/Projection.js";
import Static from "ol/source/ImageStatic.js";
import View from "ol/View.js";
import Feature from "ol/Feature.js";
import { getCenter } from "ol/extent.js";
import { Vector as VectorSource } from "ol/source.js";
import { Vector as VectorLayer } from "ol/layer.js";
import { Circle, Geometry } from "ol/geom";
import { Fill, Stroke, Style } from "ol/style";
import Overlay from "ol/Overlay.js";
import Select from "ol/interaction/Select.js";
import { desks } from "./data";

async function setup() {
  const image = await loadFloorImage("office_floorplan.png");

  const extent = [0, 0, image.width, image.height];
  const projection = new Projection({
    code: "xkcd-image",
    units: "pixels",
    extent: extent,
  });

  const map = new Map({
    layers: [
      new ImageLayer({
        source: new Static({
          url: "",
          projection: projection,
          imageExtent: extent,
          imageLoadFunction: (i) => (i.getImage().src = image.src),
        }),
      }),
    ],
    target: "map",
    view: new View({
      projection: projection,
      center: getCenter(extent),
      zoom: 1,
      minZoom: 1,
      maxZoom: 3,
    }),
  });

  const deskLayer = createDeskLayer(map);

  setupPointerMoveHandler(map);
  setupDeskSelectionHandler(map, deskLayer);

  map.addLayer(deskLayer);
}

function createDeskLayer(map) {
  const deskFeatures = desks.map(
    (desk, index) =>
      new Feature({
        deskId: index + 1,
        status: desk.status,
        geometry: new Circle(desk.position, 15),
      })
  );
  const source = new VectorSource({ wrapX: false, features: deskFeatures });

  const vectorLayer = new VectorLayer({
    source: source,
    style: (feature) =>
      feature.get("status") === "Available"
        ? new Style({
            stroke: new Stroke({
              color: "green",
              width: 2,
            }),
            fill: new Fill({
              color: "rgba(0,255,0,0.2)",
            }),
          })
        : new Style({
            stroke: new Stroke({
              color: "grey",
              width: 2,
            }),
            fill: new Fill({
              color: "rgba(128,128,128,0.5)",
            }),
          }),
  });

  return vectorLayer;
}

function setupPointerMoveHandler(map) {
  map.on("pointermove", (event) => {
    const [feature] = map.getFeaturesAtPixel(event.pixel);
    const cursor =
      feature?.get("status") === "Available" ? "pointer" : "not-allowed";
    if (feature && cursor) {
      map.getViewport().style.cursor = cursor;
    } else {
      map.getViewport().style.cursor = "default";
    }
  });
}

function setupDeskSelectionHandler(map, layer) {
  const popup = new Overlay({
    element: document.getElementById("popup"),
  });
  map.addOverlay(popup);

  const select = new Select({
    layers: [layer],
  });

  select.on("select", (evt) => {
    const element = popup.getElement();
    let popover = bootstrap.Popover.getInstance(element);
    if (popover) {
      popover.dispose();
    }

    if (evt.selected[0] && evt.selected[0].get("status") === "Available") {
      popup.setPosition(evt.selected[0].getGeometry().getCenter());
      popover = new bootstrap.Popover(element, {
        sanitize: false,
        animation: false,
        container: element,
        content: "<button class='btn btn-primary'>Reserve now</button>",
        html: true,
        placement: "top",
        title: `Desk #${evt.selected[0].get("deskId")} is available`,
      });
      popover.show();
    } else {
      select.getFeatures().clear();
    }
  });

  map.addInteraction(select);
}

async function loadFloorImage(floorImageSrc) {
  const floorImage = new Image();
  floorImage.src = floorImageSrc;
  return new Promise((resolve) => {
    floorImage.onload = () => resolve(floorImage);
  });
}

setup();
