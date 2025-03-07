const svg = d3.select("#map");
const width = svg.attr("width");
const height = svg.attr("height");

const margins = 10;
const mapWidth = width - 2 * margins;
const mapHeight = height - 2 * margins;

const map = svg
	.append("g")
	.attr("id", "drawings")
	.attr("transform", `translate(${margins},${margins})`);
const annotations = svg
	.append("g")
	.attr("id", "annotations")
	.attr("transform", `translate(${margins},${margins})`);

const tooltip = d3
	.select("body")
	.append("div")
	.attr("class", "tooltip")
	.style("position", "absolute")
	.style("background", "white")
	.style("border", "1px solid black")
	.style("border-radius", "5px")
	.style("display", "none")
	.style("pointer-events", "auto")
	.style("width", "fit-content")
	.style("height", "fit-content")
	.style("display", "flex")
	.style("flex-direction", "column");

const requestData = async function () {
	const data = await d3.csv("datasets/zillow_pittsburgh.csv", d3.autoType);

	// Pre-processing the dates + creating a new
	data.forEach((d) => {
		const dateParse = d3.timeParse("%d/%m/%y");
		if (d["Last Sold Date"]) {
			d["Last Sold Date"] = dateParse(d["Last Sold Date"]);

			const year = d["Last Sold Date"].getFullYear();

			d["Delta Value"] = d["Sale Amount"] - d["Last Sold Price"];
			d["Delta Value per Year"] = d["Delta Value"] / (new Date().getFullYear() - year);
			d["Percent Change in Value"] = (d["Sale Amount"] / d["Last Sold Price"]) * 100;
		} else {
			d["Delta Value"] = null;
			d["Delta Value per Year"] = null;
			d["Percent Change in Value"] = null;
		}
	});

	return data;
};

const filterData = function (
	data = [],
	bath = [],
	bed = [],
	hood = new Set(),
	type = new Set(),
	year = null,
	rent = [],
	price = []
) {
	let filteredData = [];
	if (bath.length) {
		filteredData = data.filter((d) => d.Bathroom >= bath[0] && d.Bathroom <= bath[1]);
	}
	if (bed.length) {
		filteredData = filteredData.filter((d) => d.Bedroom >= bed[0] && d.Bedroom <= bed[1]);
	}
	if (hood.size) {
		filteredData = filteredData.filter((d) => hood.has(d.Neighborhood));
	}
	if (type.size) {
		filteredData = filteredData.filter((d) => type.has(d["Property Type"]));
	}
	if (year) {
		filteredData = filteredData.filter((d) => d["Year Built"] >= year);
	}
	if (rent.length) {
		filteredData = filteredData.filter(
			(d) => d["Rent Amount"] >= rent[0] && d["Rent Amount"] <= rent[1]
		);
	}
	if (price.length) {
		filteredData = filteredData.filter(
			(d) => d["Sale Amount"] >= rent[0] && d["Sale Amount"] <= rent[1]
		);
	}
	return filteredData.length ? filteredData : null;
};

const drawMap = async function () {
	const pitt = await d3.json("datasets/pittsburgh_neighborhoods.json");
	console.log(pitt);

	const hoods = topojson.feature(pitt, pitt.objects.Neighborhoods_);
	const hoodsMesh = topojson.mesh(pitt, pitt.objects.Neighborhoods_);
	const projections = d3.geoMercator().fitSize([mapWidth, mapHeight], hoods);
	const path = d3.geoPath().projection(projections);

	const sizeScale = d3.scaleLinear(
		d3.extent(data, (d) => d["Lot Size (Sq.Ft.)"]),
		[2, 5]
	);
	const ageScale = d3.scaleSequentialLog(
		d3.extent(data, (d) => d["Sale Amount"]),
		d3.interpolateGreens
	);

	const categoricalColors = [
		"#f4a460",
		"#ffd700",
		"#d8bfd8",
		"#dc143c",
		"#6b8e23",
		"#deb887",
		"#20b2aa",
		"#9932cc",
		"#ffffe0",
		"#0000ff",
		"#a9a9a9",
		"#191970",
		"#ffffff",
		"#add8e6",
		"#00ff7f",
		"#fffacd",
		"#fff8dc",
		"#e0ffff",
		"#fa8072",
		"#ff8c00",
		"#556b2f",
		"#ffa500",
		"#2f4f4f",
		"#800080",
		"#adff2f",
		"#008b8b",
		"#fff0f5",
		"#6a5acd",
		"#00ff00",
		"#a52a2a",
		"#4682b4",
		"#b22222",
		"#663399",
		"#bdb76b",
		"#f0ffff",
		"#fff5ee",
		"#fffafa",
		"#ffff00",
		"#696969",
		"#ff7f50",
		"#8a2be2",
		"#ffc0cb",
		"#ff00ff",
		"#ff6347",
		"#808080",
		"#00fa9a",
		"#40e0d0",
		"#eee8aa",
		"#f0f8ff",
		"#d3d3d3",
		"#7cfc00",
		"#8b008b",
		"#ff1493",
		"#4b0082",
		"#a9a9a9",
		"#006400",
		"#b8860b",
		"#b0e0e6",
		"#faf0e6",
		"#f5deb3",
		"#1e90ff",
		"#d2691e",
		"#000080",
		"#9400d3",
		"#f08080",
		"#cd853f",
		"#228b22",
		"#48d1cc",
		"#afeeee",
		"#e9967a",
		"#800000",
		"#ffe4e1",
		"#f0e68c",
		"#2e8b57",
		"#778899",
		"#808080",
		"#f5f5dc",
		"#ff0000",
		"#f5fffa",
		"#dcdcdc",
		"#483d8b",
		"#b0c4de",
		"#87cefa",
		"#8fbc8f",
		"#db7093",
		"#000000",
		"#696969",
		"#fafad2",
		"#c71585",
		"#32cd32",
	];

	const neighborhoodGroups = map
		.selectAll("g.neighborhood")
		.data(hoods.features)
		.join("g")
		.attr("class", "neighborhood")
		.attr("id", (d) => `hood-${d.properties.hood.replace(/\s+/g, "-")}`);

	neighborhoodGroups
		.append("path")
		.attr("class", "hood")
		.attr("d", path)
		.style("fill", "grey")
		.on("mouseover", mouseIn)
		.on("mousemove", mouseMove)
		.on("mouseout", mouseOut);

	function jitter() {
		return d3.randomInt(-3, 3)();
	}

	data.forEach((house) => {
		const neighborhoodId = `hood-${house.Neighborhood.replace(/\s+/g, "-")}`;
		const neighborhoodGroup = d3.select(`#${neighborhoodId}`);

		if (!neighborhoodGroup.empty()) {
			neighborhoodGroup
				.append("circle")
				.attr("class", "home")
				.attr("cx", projections([+house.Longitude, +house.Latitude])[0] + jitter())
				.attr("cy", projections([+house.Longitude, +house.Latitude])[1] + jitter())
				.attr("r", sizeScale(house["Lot Size (Sq.Ft.)"]))
				.attr("fill", ageScale(house["Sale Amount"]));
		}
	});

	const hoodOutlines = map
		.append("path")
		.datum(hoodsMesh)
		.attr("class", "outline")
		.attr("d", path)
		.style("fill", "none")
		.style("stroke-width", 0.5)
		.style("stroke", "black");
};

function mouseMove(event) {
	tooltip.style("top", event.pageY + 10 + "px").style("left", event.pageX + 10 + "px");
}

function mouseIn(event, d) {
	const neighborhoodName = d.properties.hood;
	const housesInNeighborhood = data.filter(
		(house) => house.Neighborhood === neighborhoodName
	);

	if (housesInNeighborhood.length > 0) {
		let idx = 0;
		let commaFormatter = d3.format(",");

		function updateTooltip(index) {
			const house = housesInNeighborhood[index];

			tooltip.selectChildren("*").remove();

			const houseCard = tooltip
				.append("div")
				.attr("class", "house-cont")
				.style("display", "flex")
				.style("flex-direction", "column")
				.style("justify-content", "center")
				.style("align-items", "center")
				.style("margin", "5px")
				.style("padding", 0)
				.style("height", "fit-content");
			houseCard
				.append("img")
				.attr("src", `images/house - ${d3.randomInt(1, 26)()}.jpeg`)
				.attr("alt", "House Image")
				.style("width", "275px")
				.style("height", "auto");

			const dataCont = houseCard
				.append("div")
				.attr("class", "data-cont")
				.style("display", "flex")
				.style("flex-direction", "row")
				.style("justify-content", "space-between")
				.style("width", "100%")
				.style("padding", 0)
				.style("margin", 0);
			const controlCont = houseCard
				.append("div")
				.attr("class", "control-cont")
				.style("display", "flex")
				.style("flex-direction", "column")
				.style("justify-content", "center")
				.style("align-items", "center")
				.style("width", "fit-content")
				.style("height", "fit-content")
				.style("margin", 0)
				.style("padding", 0)
				.style("gap", "2.5px");

			const dataContLeft = dataCont
				.append("div")
				.attr("class", "data-cont left")
				.style("display", "flex")
				.style("flex-direction", "column")
				.style("justify-content", "start")
				.style("align-items", "start")
				.style("width", "fit-content")
				.style("gap", "2.5px");
			const dataContRight = dataCont
				.append("div")
				.attr("class", "data-cont right")
				.style("display", "flex")
				.style("flex-direction", "column")
				.style("justify-content", "start")
				.style("align-items", "end")
				.style("width", "fit-content");
			const navContainer = dataContRight
				.append("div")
				.attr("class", "house-cont right")
				.style("display", "flex")
				.style("flex-direction", "row")
				.style("justify-content", "end")
				.style("align-items", "center")
				.style("width", "fit-content");

			navContainer
				.append("h4")
				.text(`${idx + 1}/${housesInNeighborhood.length}`)
				.style("font-size", "14px")
				.style("margin", "0px 5%")
				.style("padding", 0)
				.style("color", "#00000080");

			dataContLeft
				.append("h2")
				.text(`${house["Street Address"]}`)
				.style("margin", 0)
				.style("padding", 0);
			dataContLeft
				.append("h3")
				.text(`${house.Neighborhood}, ${house.Zipcode}`)
				.style("margin", 0)
				.style("padding", 0);
			dataContLeft
				.append("h3")
				.text(`$${commaFormatter(house["Sale Amount"])}`)
				.style("margin", 0)
				.style("padding", 0);
			dataContLeft
				.append("h4")
				.html(
					`
					${house.Bedrooms}&nbsp;
					<img width="16" height="16" src="https://img.icons8.com/ios-glyphs/30/bed.png" alt="bed"/>,&nbsp;
					${house.Bathroom}&nbsp;
					<img width="16" height="16" src="https://img.icons8.com/ios-glyphs/30/shower-and-tub.png" alt="shower-and-tub"/>
					`
				)
				.style("display", "flex")
				.style("margin", "0")
				.style("padding", "0")
				.style("align-items", "center")
				.style("justify-content", "start");
			dataContLeft
				.append("h4")
				.text(`${commaFormatter(house["Lot Size (Sq.Ft.)"])} Sq.Ft.`)
				.style("margin", 0)
				.style("padding", 0);

			if (housesInNeighborhood.length > 1) {
				controlCont.style("padding", "5px 0px 0px 0px");
				dataCont
					.style("border-bottom", "1px solid #00000050")
					.style("padding", "5px 0px")
					.style("margin", 0);

				controlCont
					.append("h4")
					.html(
						`Press&nbsp;
					<img width="16" height="16" src="https://img.icons8.com/wired/64/left-arrow-key.png" alt="left-arrow-key"/>&nbsp;and&nbsp;
					<img width="16" height="16" src="https://img.icons8.com/wired/64/right-arrow-key.png" alt="right-arrow-key"/>&nbsp;to navigate`
					)
					.style("display", "flex")
					.style("align-items", "center")
					.style("justify-content", "center")
					.style("height", "fit-content")
					.style("color", "#00000080")
					.style("margin", 0)
					.style("padding", 0);

				controlCont
					.append("h4")
					.html(
						`Press&nbsp;
					<img width="16" height="16" src="https://img.icons8.com/ios/50/space-key.png" alt="spacebar-key"/>&nbsp;to compare`
					)
					.style("display", "flex")
					.style("align-items", "center")
					.style("justify-content", "center")
					.style("height", "fit-content")
					.style("color", "#00000080")
					.style("margin", 0)
					.style("padding", 0);

				d3.select("body").on("keydown", function (event) {
					event.preventDefault();
					if (event.key === "ArrowRight" && idx < housesInNeighborhood.length - 1) {
						idx++;
						updateTooltip(idx);
					} else if (event.key === "ArrowLeft" && idx > 0) {
						idx--;
						updateTooltip(idx);
					} else if (event.key === " ") {
						saved.has(housesInNeighborhood[index])
							? saved.delete(housesInNeighborhood[index])
							: saved.add(housesInNeighborhood[index]);
					}
				});
			}
		}

		updateTooltip(idx);

		tooltip
			.style("left", `${event.pageX + 10}px`)
			.style("top", `${event.pageY + 10}px`)
			.style("display", "flex");
	}
}

function mouseOut(event) {
	tooltip.style("display", "none");
}

function formatSliders() {
	const sliderData = [
		["#bed-cont", "bed-slider", d3.extent(data, (d) => d.Bedrooms)],
		["#bath-cont", "bath-slider", d3.extent(data, (d) => d.Bathroom)],
		["#size-cont", "size-slider", d3.extent(data, (d) => d["Finished Size (Sq.Ft.)"])],
		["#lot-size-cont", "lot-size-slider", d3.extent(data, (d) => d["Lot Size (Sq.Ft.)"])],
		["#rent-cont", "rent-slider", d3.extent(data, (d) => d["Rent Amount"])],
		["#price-cont", "price-slider", d3.extent(data, (d) => d["Sale Amount"])],
		["#tax-cont", "tax-slider", d3.extent(data, (d) => d["Tax Assessment Amt"])],
		["#room-cont", "room-slider", d3.extent(data, (d) => d["Total Rooms"])],
	];

	console.log(sliderData);

	sliderData.forEach((d) => {
		createSlider(d[0], d[1], d[2]);
	});
}

const data = await requestData();
const projections = drawMap();
const saved = new Set();
formatSliders();

console.log(data);

// d3.csv("datasets/zillow_pittsburgh.csv", d3.autoType).then((data) => {
// 	// Pre-processing the dates + creating a new
// 	data.forEach((d) => {
// 		const dateParse = d3.timeParse("%d/%m/%y");
// 		if (d["Last Sold Date"]) {
// 			d["Last Sold Date"] = dateParse(d["Last Sold Date"]);

// 			const year = d["Last Sold Date"].getFullYear();

// 			d["Delta Value"] = d["Sale Amount"] - d["Last Sold Price"];
// 			d["Delta Value per Year"] = d["Delta Value"] / (new Date().getFullYear() - year);
// 			d["Percent Change in Value"] = (d["Sale Amount"] / d["Last Sold Price"]) * 100;
// 		} else {
// 			d["Delta Value"] = null;
// 			d["Delta Value per Year"] = null;
// 			d["Percent Change in Value"] = null;
// 		}
// 	});

// 	const hood = d3
// 		.groups(data, (d) => d.Neighborhood)
// 		.sort((A, B) =>
// 			d3.descending(
// 				d3.mean(A[1], (a) => a["Sale Amount"]),
// 				d3.mean(B[1], (b) => b["Sale Amount"])
// 			)
// 		);
// 	console.log(hood);

// 	const zip = d3.groups(data, (d) => d.Zipcode);
// 	const pType = d3.groups(data, (d) => d["Property Type"]);
// 	const bath = d3.groups(data, (d) => d["Bathroom"]);
// 	const bed = d3.groups(data, (d) => d["Bedrooms"]);
// 	const tRooms = d3.groups(data, (d) => d["Total Rooms"]);
// 	console.log(zip);
// 	console.log(pType);
// 	console.log(bath);
// 	console.log(bed);
// 	console.log(tRooms);
// });
