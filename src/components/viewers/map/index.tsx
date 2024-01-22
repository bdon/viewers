import { FileProps, ViewerMetadata } from "../interfaces";

import { Box, Flex, Text, Link } from "theme-ui";
import { useRef } from "react";
import { useState } from "react";
import { useEffect } from "react";
import { useThemeUI } from "theme-ui";

import Overlay from "ol/Overlay.js";
import Map from "ol/Map";
import View from "ol/View";
import { useGeographic } from "ol/proj";
import GeoJSON from "ol/format/GeoJSON.js";
import VectorSource from "ol/source/Vector";
import VectorTile from "ol/layer/VectorTile";
import VectorLayer from "ol/layer/Vector.js";
import { PMTilesVectorSource } from "ol-pmtiles";
import { Style, Stroke, Fill } from "ol/style";
import { basemapStyleFunction } from "./basemap";

export const viewerMetadata: ViewerMetadata = {
	title: "Map Viewer",
	description: "A map viewer.",
	compatibilityCheck: (props: FileProps) => {
		if (props.filename.toLowerCase().endsWith(".pmtiles")) {
			return true;
		}

		if (props.filename.toLowerCase().endsWith(".geojson")) {
			return true;
		}

		return false;
	},
	viewer: MapViewer,
};

enum DataSourceType {
	PMTILES,
	GEOJSON,
}

export function MapViewer(props: FileProps) {
	const { url, filename, contentType, size } = props;
	const { colorMode } = useThemeUI();

	let dataSource: DataSourceType;

	if (filename.toLowerCase().endsWith(".pmtiles")) {
		dataSource = DataSourceType.PMTILES;
	}

	if (filename.toLowerCase().endsWith(".geojson")) {
		dataSource = DataSourceType.GEOJSON;
	}

	const mapElement = useRef();
	const popupRef = useRef();
	const [map, setMap] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const [selectedFeature, setSelectedFeature] = useState(null);

	useEffect(() => {
		let source;
		let layer;
		if (dataSource == DataSourceType.PMTILES) {
			source = new PMTilesVectorSource({
				url: url,
			});

			source.on("tileloaderror", (e) => {
				setError(true);
			});

			layer = new VectorTile({
				declutter: true,
				source: source,
			});
		}

		if (dataSource == DataSourceType.GEOJSON) {
			source = new VectorSource({
				url: url,
				format: new GeoJSON(),
			});

			source.on("featuresloadstart", (e) => {
				setLoading(true);
			});

			source.on("featuresloadend", (e) => {
				setLoading(false);
				m.getView().fit(source.getExtent());
			});

			source.on("featuresloaderror", (e) => {
				setError(true);
			});

			layer = new VectorLayer({
				declutter: true,
				source: source,
			});
		}

		useGeographic();

		const displayFeatureInfo = function (pixel) {
			layer.getFeatures(pixel).then(function (features) {
				const feature = features.length ? features[0] : undefined;
				if (features.length) {
					var props = [];
					Object.keys(feature.getProperties()).forEach((k, i) => {
						props.push([k, feature.getProperties()[k]]);
					});
					setSelectedFeature(props);
				} else {
					overlay.setPosition(undefined);
					setSelectedFeature(null);
				}
			});
		};

		const overlay = new Overlay({
			element: popupRef.current,
			autoPan: {
				animation: {
					duration: 250,
				},
			},
		});

		const m = new Map({
			target: mapElement.current,
			controls: [],
			layers: [
				new VectorTile({
					declutter: true,
					source: new PMTilesVectorSource({
						attributions: [
							"<a href='https://openstreetmap.org/copyright'>© OpenStreetMap</a>",
						],
						url: "https://data.source.coop/protomaps/openstreetmap/tiles/v3.pmtiles",
					}),
				}),
				layer,
			],
			overlays: [overlay],
			view: new View({
				center: [0, 0],
				zoom: 0,
			}),
		});

		m.on("click", function (evt) {
			const coordinate = evt.coordinate;
			displayFeatureInfo(evt.pixel);
			overlay.setPosition(coordinate);
		});

		setMap(m);

		return () => m.setTarget(null);
	}, []);

	useEffect(() => {
		if (map) {
			const stroke =
				colorMode === "light" ? "rgba(0,0,0,1.0)" : "rgba(255,255,255,255,255)";
			const fill =
				colorMode === "light" ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.5)";
			map
				.getLayers()
				.item(0)
				.setStyle(basemapStyleFunction(map.getView(), colorMode));
			map
				.getLayers()
				.item(1)
				.setStyle(
					new Style({
						stroke: new Stroke({
							color: stroke,
							width: 1,
						}),
						fill: new Fill({
							color: fill,
						}),
					}),
				);
		}
	}, [map, colorMode]);

	return (
		<>
			<Box
				sx={{
					width: "100%",
					height: "50vh",
					position: "relative",
					backgroundColor: "background",
					borderColor: "primary",
					borderWidth: 4,
					borderStyle: "solid",
				}}
				ref={mapElement}
				className="map-container"
			>
				<Box
					sx={{
						position: "absolute",
						bottom: 0,
						right: 0,
						zIndex: 1000,
						margin: 2,
					}}
				>
					<Link
						sx={{
							color: "text",
							textDecoration: "none",
							textTransform: "uppercase",
							fontFamily: "mono",
							fontSize: 0,
						}}
						href="https://openstreetmap.org/copyright"
						target="_blank"
					>
						© OpenStreetMap
					</Link>
				</Box>
				<Box sx={{ position: "absolute", zIndex: 998, top: 2, left: 2 }}>
					<Box
						ref={popupRef}
						sx={{
							backgroundColor: "background",
							color: "text",
							fontFamily: "mono",
							fontSize: 0,
							padding: 1,
							borderWidth: 2,
							borderStyle: "solid",
							borderColor: "primary",
							opacity: 0.5,
						}}
					>
						{selectedFeature ? (
							selectedFeature.map((k, i) => {
								return (
									<Box key={`prop-${i}`}>
										{k[0]}:{k[1]}
									</Box>
								);
							})
						) : (
							<></>
						)}
					</Box>
					<Flex sx={{ flexDirection: "column", gap: 1 }}>
						<Flex
							sx={{
								backgroundColor: "background",
								fontFamily: "mono",
								color: "text",
								fontSize: 3,
								textAlign: "center",
								cursor: "pointer",
								width: "25px",
								height: "25px",
								userSelect: "none",
								borderColor: "text",
								borderWidth: 4,
								borderStyle: "solid",
								justifyContent: "center",
								alignItems: "last baseline",
							}}
							onClick={(e) => {
								map.getView().setZoom(map.getView().getZoom() + 1);
							}}
						>
							<Text>+</Text>
						</Flex>
						<Flex
							sx={{
								backgroundColor: "background",
								fontFamily: "mono",
								color: "text",
								fontSize: 3,
								textAlign: "center",
								cursor: "pointer",
								width: "25px",
								height: "25px",
								userSelect: "none",
								borderColor: "text",
								borderWidth: 4,
								borderStyle: "solid",
								justifyContent: "center",
								alignItems: "end",
							}}
							onClick={(e) => {
								map.getView().setZoom(map.getView().getZoom() - 1);
							}}
						>
							<Text>-</Text>
						</Flex>
					</Flex>
				</Box>
				<Box
					sx={{
						position: "absolute",
						opacity: "0.8",
						justifyContent: "center",
						alignItems: "center",
						zIndex: 999,
						left: 1,
						right: 1,
						top: 1,
						bottom: 1,
						backgroundColor: "background",
						display: loading || error ? "flex" : "none",
					}}
				>
					<Text
						sx={{
							fontFamily: "mono",
							fontSize: 5,
							clipPath: !error ? "inset(0 3ch 0 0)" : null,
							animation: !error ? "l 1.5s steps(4) infinite" : null,
						}}
					>
						{error ? "Error Loading File" : "Loading..."}
					</Text>
				</Box>
			</Box>
		</>
	);
}
