import { Style, Stroke, Fill, Text } from "ol/style";

const WHITE = {
  boundaries: "#adadad",
  earth: "white",
  water: "#dcdcdc",
  roads: "#ebebeb",
  landuse: "#fcfcfc",
  label: "#555555",
  label_halo: "white",
};

const BLACK = {
  boundaries: "#707070",
  earth: "#141414",
  water: "#333333",
  roads: "#292929",
  landuse: "#181818",
  label: "#eeeeee",
  label_halo: "black",
};

const getText = (feature) => {
  const kind = feature.get("pmap:kind");
  if (kind === "locality") {
    return feature.get("name:en");
  }
  return (feature.get("name:en") || "").toUpperCase();
};

const getWeight = (feature) => {
  if (feature.get("pmap:kind") === "country") {
    return 800;
  }
  return 500;
};

const getFontSize = (feature) => {
  if (feature.get("pmap:kind") === "locality") {
    if (feature.get("pmap:min_zoom") < 6) {
      return 12;
    }
    return 9;
  }
  return 11;
};

export const basemapStyleFunction = function (view, colorMode: string) {
  const theme = colorMode === "light" ? WHITE : BLACK;

  return function (feature, resolution) {
    const zoom = view.getZoomForResolution(resolution);
    const layerName = feature.get("layer");

    switch (layerName) {
      case "boundaries":
        return new Style({
          stroke: new Stroke({
            color: theme.boundaries,
            width: feature.get("pmap:min_admin_level") <= 2 ? 1 : 0.5,
            lineDash: [2, 2],
          }),
        });
      case "earth":
        return new Style({
          fill: new Fill({
            color: theme.earth,
          }),
        });
      case "roads":
        return new Style({
          stroke: new Stroke({
            color: theme.roads,
            width: (zoom > 14 ? 2 : 1)
          }),
        });
      // case "landuse":
      //   return new Style({
      //     fill: new Fill({
      //       color: theme.landuse,
      //     }),
      //   });
      case "water":
        return new Style({
          fill: new Fill({
            color: theme.water,
          }),
        });
      case "places":
      case "physical_point":
        const italic = layerName === "physical_point" ? "italic" : "";
        const fontSize = 10;
        return new Style({
          text: new Text({
            font: `${italic} ${getWeight(feature)} ${getFontSize(
              feature,
            )}px monospace`,
            fill: new Fill({
              color: theme.label,
            }),
            stroke: new Stroke({
              color: theme.label_halo,
              width: 4,
            }),
            text: getText(feature),
          }),
        });
      default:
        return null;
    }
  };
};
