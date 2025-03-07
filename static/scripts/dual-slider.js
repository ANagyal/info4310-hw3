function createSlider(divSelector, svgSelector, extent) {
	const width = 250;
	const height = 40;
	const margin = { x: 10, y: 0 };

	const svg = d3
		.select(divSelector)
		.append("svg")
		.attr("id", `${svgSelector}`)
		.attr("class", "slider-d3")
		.attr("width", width)
		.attr("height", height);

	const scale = d3
		.scaleLinear()
		.domain(extent)
		.range([margin.x, width - margin.x]);

	const minMax = { min: extent[0], max: extent[1] };

	const track = svg
		.append("line")
		.attr("x1", margin.x)
		.attr("x2", width - margin.x)
		.attr("y1", height / 4 + 5)
		.attr("y2", height / 4 + 5)
		.attr("stroke", "#797979")
		.attr("stroke-width", 4);

	const minHandle = svg
		.append("circle")
		.attr("id", `${svgSelector}-min-handle`)
		.attr("r", 8)
		.attr("fill", "white")
		.style("stroke", "#BEBEBE")
		.style("stroke-width", "1px")
		.attr("cy", height / 4 + 5)
		.call(
			d3.drag().on("drag", function (event) {
				const newValue = Math.min(
					minMax.max - 1,
					Math.max(extent[0], scale.invert(event.x))
				);
				minMax.min = newValue;
				updateHandles();
			})
		);

	const maxHandle = svg
		.append("circle")
		.attr("id", `${svgSelector}-max-handle`)
		.attr("r", 8)
		.attr("fill", "white")
		.style("stroke", "#BEBEBE")
		.style("stroke-width", "1px")
		.attr("cy", height / 4 + 5)
		.call(
			d3.drag().on("drag", function (event) {
				const newValue = Math.max(
					minMax.min + 1,
					Math.min(extent[1], scale.invert(event.x))
				);
				minMax.max = newValue;
				updateHandles();
			})
		);

	const minLabel = svg
		.append("text")
		.attr("id", `${svgSelector}-min-label`)
		.attr("text-anchor", "start")
		.attr("y", height / 4 + 25)
		.style("font-size", "10pt")
		.text(minMax.min);

	const maxLabel = svg
		.append("text")
		.attr("id", `${svgSelector}-max-label`)
		.attr("text-anchor", "end")
		.attr("y", height / 4 + 25)
		.style("font-size", "10pt")
		.text(minMax.max);

	function updateHandles() {
		minMax.min = Math.max(extent[0], Math.min(minMax.min, extent[1] - 1));
		minMax.max = Math.min(extent[1], Math.max(minMax.max, extent[0] + 1));

		svg.select(`#${svgSelector}-min-handle`).attr("cx", scale(minMax.min));
		svg.select(`#${svgSelector}-max-handle`).attr("cx", scale(minMax.max));
		svg
			.select(`#${svgSelector}-min-label`)
			.attr("x", scale(minMax.min) - 5)
			.text(Math.round(minMax.min));
		svg
			.select(`#${svgSelector}-max-label`)
			.attr("x", scale(minMax.max) + 5)
			.text(Math.round(minMax.max));
		svg.select("#range-label").text(`Range: ${minMax.min} - ${minMax.max}`);
	}

	updateHandles();
}
